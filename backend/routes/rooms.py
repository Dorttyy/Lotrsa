import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from auth_utils import CurrentUser
from db import db, follows_col, moments_col, room_messages_col, rooms_col, users_col
from chat_previews import MessagePreview
from models import (
    RoomCreate,
    RoomGiftCreate,
    RoomMessageCreate,
    RoomRoleUpdate,
    RoomUserAction,
    user_card,
)
import rtc_core
import room_time
from room_time_clock import RoomTimeAllowance
from ws_manager import manager
from room_permissions import can_manage, require_manager, manager_query, protect_member

router = APIRouter(prefix="/rooms", tags=["rooms"])

# Simple emoji gift catalog for voice rooms — prices in coins.
GIFT_CATALOG = [
    {"id": "rose", "emoji": "🌹", "name": "Rose", "price": 10},
    {"id": "heart", "emoji": "💖", "name": "Heart", "price": 20},
    {"id": "star", "emoji": "⭐", "name": "Star", "price": 30},
    {"id": "crown", "emoji": "👑", "name": "Crown", "price": 100},
]
GIFT_MAP = {g["id"]: g for g in GIFT_CATALOG}


@router.get("/gift-catalog")
async def gift_catalog(current_user: CurrentUser):
    return {"coins": current_user.get("coins", 0), "gifts": GIFT_CATALOG}


def _message_public(d: dict) -> dict:
    return {
        "id": d["_id"],
        "room_id": d["room_id"],
        "sender": d.get("sender"),
        "text": d["text"],
        "type": d.get("type", "text"),
        "gift": d.get("gift"),
        "created_at": d["created_at"],
    }


# ── Study-room Pomodoro ─────────────────────────────────────────────────────
POMODORO_FOCUS_MIN = 25
POMODORO_BREAK_MIN = 5


def _pomodoro_defaults() -> dict:
    return {
        "phase": "focus",
        "focus_min": POMODORO_FOCUS_MIN,
        "break_min": POMODORO_BREAK_MIN,
        "running": False,
        "remaining_sec": POMODORO_FOCUS_MIN * 60,
        "ends_at": None,
    }


def _phase_sec(p: dict, phase: str) -> int:
    return (p["break_min"] if phase == "break" else p["focus_min"]) * 60


async def _normalize_pomodoro(doc: dict) -> dict | None:
    """Lazily roll a running timer over focus→break→focus phases so clients
    always read a consistent state. Persists only when a rollover happened."""
    p = doc.get("pomodoro")
    if not p:
        return None
    if not p.get("running") or not p.get("ends_at"):
        return p
    now = datetime.now(timezone.utc)
    ends = datetime.fromisoformat(p["ends_at"])
    changed = False
    while now >= ends:
        p["phase"] = "break" if p["phase"] == "focus" else "focus"
        ends = ends + timedelta(seconds=_phase_sec(p, p["phase"]))
        changed = True
    if changed:
        p["ends_at"] = ends.isoformat()
        await rooms_col.update_one({"_id": doc["_id"]}, {"$set": {"pomodoro": p}})
    return p


def room_view(detail: dict, doc: dict, viewer_id: str | None) -> dict:
    manage = bool(viewer_id and can_manage(doc, viewer_id))
    return {**detail, "members": [{**member,
        "hand_raised": member.get("hand_raised", False) if manage or member["id"] == viewer_id else False,
        "stage_invited": member.get("stage_invited", False) if manage or member["id"] == viewer_id else False,
        "moderator_invited": member.get("moderator_invited", False) if manage or member["id"] == viewer_id else False,
    } for member in detail["members"]]}


async def room_detail(doc: dict, viewer_id: str | None = None) -> dict:
    member_ids = list(doc.get("members", {}).keys())
    gift_totals = doc.get("gift_totals") or {}
    gifter_totals = doc.get("gifter_totals") or {}
    # Include gifters/recipients who may have already left the room.
    fetch_ids = list({doc["host_id"], *member_ids, *doc.get("moderators", []), *gift_totals.keys(), *gifter_totals.keys()})
    user_docs = await users_col.find({"_id": {"$in": fetch_ids}}).to_list(200)
    users_by_id = {u["_id"]: u for u in user_docs}
    members = []
    for uid, m in doc.get("members", {}).items():
        u = users_by_id.get(uid)
        if u:
            invitation = m.get("stage_invite") or {}
            members.append({**user_card(u), "role": m["role"], "mic_on": m["mic_on"], "hand_raised": m["hand_raised"],
                            "is_moderator": uid in doc.get("moderators", []),
                            "moderator_invited": (m.get("moderator_invite") or {}).get("expires_at", 0) > datetime.now(timezone.utc).timestamp() * 1000,
                            "stage_invited": bool(invitation and can_manage(doc, invitation.get("from")) and invitation.get("expires_at", 0) > datetime.now(timezone.utc).timestamp() * 1000)})
    host = users_by_id.get(doc["host_id"])
    # "most_gifted" = the room's most celebrated members — ranked by gifts
    # they RECEIVED (not sent), shown with a crown badge in the room UI.
    most_gifted = []
    for uid, coins in sorted(gift_totals.items(), key=lambda kv: kv[1], reverse=True)[:2]:
        u = users_by_id.get(uid)
        if u and coins > 0:
            most_gifted.append({**user_card(u), "coins": coins})
    # "top_gifters" = ranked list of who SENT the most gift coins in this
    # room — shown beside the room menu (ranks 1/2/3).
    top_gifters = []
    for uid, coins in sorted(gifter_totals.items(), key=lambda kv: kv[1], reverse=True)[:3]:
        u = users_by_id.get(uid)
        if u and coins > 0:
            top_gifters.append({**user_card(u), "coins": coins})
    detail = {
        "id": doc["_id"],
        "title": doc["title"],
        "language": doc["language"],
        "languages": doc.get("languages") or [doc["language"]],
        "topic": doc.get("topic"),
        "mode": doc.get("mode", "chat"),
        "is_private": bool(doc.get("is_private")),
        "background": doc.get("background"),
        "announcement": doc.get("announcement"),
        "host": user_card(host) if host else None,
        "host_present": doc["host_id"] in doc.get("members", {}),
        "moderators": doc.get("moderators", []),
        "moderator_members": [user_card(users_by_id[uid]) for uid in doc.get("moderators", []) if uid in users_by_id],
        "host_level": max(1, (host or {}).get("streak_count") or 1),
        "is_live": doc["is_live"],
        "members": members,
        "member_count": len(members),
        "chat_muted": bool(doc.get("chat_muted")),
        "pomodoro": await _normalize_pomodoro(doc),
        "most_gifted": most_gifted,
        "top_gifters": top_gifters,
        "created_at": doc["created_at"],
    }
    return room_view(detail, doc, viewer_id)


def room_summary(doc: dict, host: dict | None, user_map: dict | None = None) -> dict:
    user_map = user_map or {}
    member_ids = list(doc.get("members", {}).keys())
    preview = [user_card(user_map[uid]) for uid in member_ids[:4] if uid in user_map]
    return {
        "id": doc["_id"],
        "title": doc["title"],
        "language": doc["language"],
        "languages": doc.get("languages") or [doc["language"]],
        "topic": doc.get("topic"),
        "mode": doc.get("mode", "chat"),
        "is_private": bool(doc.get("is_private")),
        "background": doc.get("background"),
        "host": user_card(host) if host else None,
        "member_count": len(doc.get("members", {})),
        "members_preview": preview,
        "created_at": doc["created_at"],
    }


async def get_live_room(room_id: str) -> dict:
    doc = await rooms_col.find_one({"_id": room_id, "is_live": True})
    if not doc:
        raise HTTPException(status_code=404, detail="Room not found or has ended")
    return doc


async def broadcast_room(doc: dict, extra: dict | None = None):
    # Membership may have changed — let WebRTC signaling authorization see it
    # immediately instead of waiting for the cache TTL.
    rtc_core.invalidate_room(doc["_id"])
    detail = await room_detail(doc, doc["host_id"])
    for uid in list(doc.get("members", {})):
        event = {"type": "room_update", "room": room_view(detail, doc, uid)}
        if extra:
            event.update(extra)
        await manager.send_to_user(uid, event)


@router.get("")
async def list_rooms(current_user: CurrentUser):
    docs = (
        await rooms_col.find({"is_live": True, "is_private": {"$ne": True}})
        .sort("created_at", -1)
        .to_list(50)
    )
    preview_ids = {d["host_id"] for d in docs}
    for d in docs:
        preview_ids.update(list(d.get("members", {}).keys())[:5])
    users = (
        await users_col.find({"_id": {"$in": list(preview_ids)}}).to_list(len(preview_ids))
        if preview_ids
        else []
    )
    user_map = {u["_id"]: u for u in users}
    return [room_summary(d, user_map.get(d["host_id"]), user_map) for d in docs]


async def _share_room_to_moments(doc: dict, user_id: str, caption: str | None = None) -> None:
    text = caption or f"🎙️ Live voice room — join and chat: \"{doc['title']}\""
    moment_doc = {
        "_id": str(uuid.uuid4()),
        "user_id": user_id,
        "text": text,
        "image_id": None,
        "room_id": doc["_id"],
        "tags": ["voiceroom"],
        "likes": [],
        "comment_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await moments_col.insert_one(moment_doc)


class RoomShareToMomentsBody(BaseModel):
    text: Optional[str] = Field(default=None, max_length=500)


@router.post("/{room_id}/share-to-moments", status_code=201)
async def share_room_to_moments(
    room_id: str,
    body: RoomShareToMomentsBody | None = None,
    current_user: CurrentUser = None,
):
    """Anyone (host or audience) can share a live room to their own Moments
    feed with an optional caption. Private rooms are still off-limits."""
    doc = await get_live_room(room_id)
    if doc.get("is_private"):
        raise HTTPException(status_code=400, detail="Private rooms can't be shared")
    caption = None
    if body and body.text:
        caption = body.text.strip() or None
    await _share_room_to_moments(doc, current_user["_id"], caption=caption)
    return {"shared": True}


@router.post("", status_code=201)
@room_time.serialized
async def create_room(body: RoomCreate, current_user: CurrentUser):
    if not rtc_core.limiter.allow(
        f"room_create:{current_user['_id']}", *rtc_core.ROOM_ACTION_LIMIT
    ):
        raise HTTPException(
            status_code=429, detail="Too many rooms created. Please slow down."
        )
    # No daily room-count cap. All open rooms share the owner's time budget.
    await room_time.require_time(current_user, "host")
    languages = (body.languages or [body.language])[:2]
    doc = {
        "_id": str(uuid.uuid4()),
        "title": body.title.strip(),
        "language": languages[0],
        "languages": languages,
        "topic": (body.topic or "").strip() or None,
        "mode": body.mode,
        "is_private": body.is_private,
        "background": body.background,
        "announcement": (body.announcement or "").strip() or None,
        "host_id": current_user["_id"],
        "is_live": True,
        "members": {
            current_user["_id"]: {"role": "host", "mic_on": True, "hand_raised": False}
        },
        "chat_muted": False,
        "moderators": [],
        "gift_totals": {},
        "gifter_totals": {},
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    if body.mode == "study":
        doc["pomodoro"] = _pomodoro_defaults()
    doc["time_tracking_started_at"] = doc["created_at"]
    await room_time.leave_other_rooms(current_user["_id"], doc["_id"])
    await rooms_col.insert_one(doc)
    await room_time.register_room(doc)
    if body.share_to_moments and not body.is_private:
        await _share_room_to_moments(doc, current_user["_id"])
    if not body.is_private:
        await _notify_followers_of_room(doc, current_user)
    return await room_detail(doc, current_user["_id"])


voiceroom_notices_col = db["voiceroom_notices"]


async def _notify_followers_of_room(room_doc: dict, host: dict) -> None:
    """Drop a 'Voiceroom' notice for every follower of the host."""
    followers = await follows_col.find({"following_id": host["_id"]}).to_list(500)
    if not followers:
        return
    now = datetime.now(timezone.utc).isoformat()
    docs = [
        {
            "_id": str(uuid.uuid4()),
            "user_id": f["follower_id"],
            "room_id": room_doc["_id"],
            "host_id": host["_id"],
            "read": False,
            "created_at": now,
        }
        for f in followers
    ]
    await voiceroom_notices_col.insert_many(docs)
    for f in followers:
        await manager.send_to_user(
            f["follower_id"],
            {
                "type": "voiceroom_notice",
                "room_id": room_doc["_id"],
                "host_name": host.get("name"),
            },
        )


@router.get("/notices/unread")
async def voiceroom_notices_unread(current_user: CurrentUser):
    """Badge + typed preview for the read-only Voiceroom inbox row."""
    uid = current_user["_id"]
    unread = await voiceroom_notices_col.count_documents({"user_id": uid, "read": False})
    last = (
        await voiceroom_notices_col.find({"user_id": uid})
        .sort("created_at", -1)
        .to_list(1)
    )
    preview = None
    if last:
        preview = MessagePreview(
            text="Voiceroom", type="room", sender_id=last[0]["host_id"],
            room_id=last[0]["room_id"], created_at=last[0]["created_at"],
        ).model_dump(exclude_none=True)
    return {"unread": unread, "last": preview}


@router.get("/notices/list")
async def voiceroom_notices_list(current_user: CurrentUser):
    """Read-only Voiceroom feed: one card per notice, newest last.
    Room snapshot (live status / members) is computed at read time."""
    uid = current_user["_id"]
    docs = (
        await voiceroom_notices_col.find({"user_id": uid})
        .sort("created_at", -1)
        .to_list(100)
    )
    docs.reverse()
    room_ids = list({d["room_id"] for d in docs})
    rooms = await rooms_col.find({"_id": {"$in": room_ids}}).to_list(len(room_ids))
    rmap = {r["_id"]: r for r in rooms}
    host_ids = list({d["host_id"] for d in docs})
    hosts = await users_col.find({"_id": {"$in": host_ids}}).to_list(len(host_ids))
    hmap = {h["_id"]: h for h in hosts}
    out = []
    for d in docs:
        r = rmap.get(d["room_id"])
        h = hmap.get(d["host_id"])
        out.append(
            {
                "id": d["_id"],
                "created_at": d["created_at"],
                "room": {
                    "id": d["room_id"],
                    "title": (r or {}).get("title"),
                    "topic": (r or {}).get("topic"),
                    "language": (r or {}).get("language"),
                    "is_live": bool((r or {}).get("is_live")),
                    "member_count": len(((r or {}).get("members") or {})),
                },
                "host": user_card(h) if h else None,
            }
        )
    await voiceroom_notices_col.update_many(
        {"user_id": uid, "read": False}, {"$set": {"read": True}}
    )
    return out


@router.get("/time-allowance", response_model=RoomTimeAllowance)
@room_time.serialized
async def time_allowance(current_user: CurrentUser):
    await room_time.enforce_user(current_user)
    return await room_time.allowance(current_user)


@router.post("/{room_id}/heartbeat")
@room_time.serialized
async def room_heartbeat(room_id: str, current_user: CurrentUser):
    doc = await get_live_room(room_id)
    allowance = await room_time.heartbeat(doc, current_user)
    fresh = await get_live_room(room_id)
    if current_user["_id"] not in fresh.get("members", {}):
        raise HTTPException(403, "Your room session has ended. Check your daily time allowance.")
    return {"room": await room_detail(fresh, current_user["_id"]), "allowance": allowance.model_dump()}


@router.get("/{room_id}")
async def get_room(room_id: str, current_user: CurrentUser):
    doc = await get_live_room(room_id)
    return await room_detail(doc, current_user["_id"])


@router.post("/{room_id}/join")
@room_time.serialized
async def join_room(room_id: str, current_user: CurrentUser):
    if not rtc_core.limiter.allow(
        f"room_join:{current_user['_id']}", *rtc_core.ROOM_ACTION_LIMIT
    ):
        raise HTTPException(
            status_code=429, detail="Too many join attempts. Please slow down."
        )
    doc = await get_live_room(room_id)
    uid = current_user["_id"]
    if uid in doc.get("banned", []):
        raise HTTPException(
            status_code=403, detail="You have been removed from this room by the host"
        )
    await room_time.require_time(current_user, "host" if uid == doc["host_id"] else "listener")
    doc = await get_live_room(room_id)
    await room_time.leave_other_rooms(uid, room_id)
    if uid not in doc["members"]:
        doc["members"][uid] = {"role": "host" if uid == doc["host_id"] else "listener", "mic_on": False, "hand_raised": False,
                                "joined_at": datetime.now(timezone.utc).isoformat()}
        await rooms_col.update_one(
            {"_id": room_id}, {"$set": {f"members.{uid}": doc["members"][uid]}}
        )
        await room_time.register_room(doc)
        welcome = {
            "_id": str(uuid.uuid4()),
            "room_id": room_id,
            "sender": None,
            "text": f"{current_user.get('name', 'A new member')} joined the room",
            "type": "system",
            "gift": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await room_messages_col.insert_one(welcome)
        await broadcast_room(doc, {"joined": user_card(current_user)})
        await manager.broadcast(
            list(doc["members"].keys()),
            {"type": "room_message", "message": _message_public(welcome)},
        )
    await room_time.register_room(doc)
    return await room_detail(doc, current_user["_id"])


@router.post("/{room_id}/leave")
@room_time.serialized
async def leave_room(room_id: str, current_user: CurrentUser):
    await get_live_room(room_id)
    await room_time.remove_member(room_id, current_user["_id"])
    return {"ok": True}


@router.post("/{room_id}/end")
@room_time.serialized
async def end_room(room_id: str, current_user: CurrentUser):
    doc = await get_live_room(room_id)
    require_manager(doc, current_user["_id"])
    await room_time.close_room(room_id)
    return {"ok": True}


class RoomTitleUpdate(BaseModel):
    title: str = Field(min_length=1, max_length=80)


class RoomSettingsUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=80)
    topic: str | None = Field(default=None, max_length=40)
    announcement: str | None = Field(default=None, max_length=300)
    background: int | None = Field(default=None, ge=0, le=3)
    is_private: bool | None = None


@router.post("/{room_id}/settings")
async def update_room_settings(
    room_id: str, body: RoomSettingsUpdate, current_user: CurrentUser
):
    """Host edits room info (same fields as the create page); broadcasts update."""
    doc = await get_live_room(room_id)
    require_manager(doc, current_user["_id"])
    updates: dict = {}
    if body.title is not None and body.title.strip():
        updates["title"] = body.title.strip()
    if body.topic is not None:
        updates["topic"] = body.topic.strip() or None
    if body.announcement is not None:
        updates["announcement"] = body.announcement.strip() or None
    if body.background is not None:
        updates["background"] = body.background
    if body.is_private is not None:
        updates["is_private"] = body.is_private
    if updates:
        await rooms_col.update_one({"_id": room_id, **manager_query(current_user["_id"])}, {"$set": updates})
    doc = await rooms_col.find_one({"_id": room_id})
    await broadcast_room(doc)
    return {"ok": True}


@router.post("/{room_id}/title")
async def rename_room(room_id: str, body: RoomTitleUpdate, current_user: CurrentUser):
    """Host renames the live room; all members get a room_update broadcast."""
    doc = await get_live_room(room_id)
    require_manager(doc, current_user["_id"])
    await rooms_col.update_one(
        {"_id": room_id, **manager_query(current_user["_id"])}, {"$set": {"title": body.title.strip()}}
    )
    doc = await rooms_col.find_one({"_id": room_id})
    await broadcast_room(doc)
    return {"ok": True, "title": doc["title"]}


@router.post("/{room_id}/hand")
async def toggle_hand(room_id: str, current_user: CurrentUser):
    doc = await get_live_room(room_id)
    uid = current_user["_id"]
    member = doc["members"].get(uid)
    if not member:
        raise HTTPException(status_code=403, detail="Join the room first")
    if member["role"] != "listener":
        raise HTTPException(409, "You are already on stage.")
    member["hand_raised"] = not member["hand_raised"]
    await rooms_col.update_one(
        {"_id": room_id, "is_live": True, f"members.{uid}.role": "listener"}, {"$set": {f"members.{uid}.hand_raised": member["hand_raised"]}}
    )
    await broadcast_room(doc)
    return {"hand_raised": member["hand_raised"]}


@router.post("/{room_id}/mic")
async def toggle_mic(room_id: str, current_user: CurrentUser):
    doc = await get_live_room(room_id)
    uid = current_user["_id"]
    member = doc["members"].get(uid)
    if not member:
        raise HTTPException(status_code=403, detail="Join the room first")
    if member["role"] not in ("host", "speaker"):
        raise HTTPException(status_code=403, detail="Only speakers can use the mic")
    member["mic_on"] = not member["mic_on"]
    await rooms_col.update_one(
        {"_id": room_id, "is_live": True, f"members.{uid}.role": {"$in": ["speaker", "host"]}}, {"$set": {f"members.{uid}.mic_on": member["mic_on"]}}
    )
    await broadcast_room(doc)
    return {"mic_on": member["mic_on"]}


@router.post("/{room_id}/role")
async def change_role(room_id: str, body: RoomRoleUpdate, current_user: CurrentUser):
    doc = await get_live_room(room_id)
    require_manager(doc, current_user["_id"])
    protect_member(doc, current_user["_id"], body.user_id)
    member = doc["members"].get(body.user_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not in room")
    if body.user_id == doc["host_id"]:
        raise HTTPException(status_code=400, detail="Cannot change the host's role")
    if body.role == "speaker" and (member["role"] != "listener" or not member.get("hand_raised")):
        raise HTTPException(409, "Send an invitation first, or accept a raised-hand request.")
    condition = {"_id": room_id, "is_live": True, **manager_query(current_user["_id"]), f"members.{body.user_id}": {"$exists": True}}
    if body.role == "speaker":
        condition[f"members.{body.user_id}.hand_raised"] = True
        condition[f"members.{body.user_id}.role"] = "listener"
    member["role"] = body.role
    member["hand_raised"] = False
    member["mic_on"] = body.role == "speaker"
    member.pop("stage_invite", None)
    result = await rooms_col.update_one(
        condition, {"$set": {f"members.{body.user_id}": member}}
    )
    if not result.matched_count:
        raise HTTPException(409, "This stage request is no longer available.")
    await broadcast_room(await get_live_room(room_id))
    return {"ok": True}


@router.post("/{room_id}/transfer-host")
async def transfer_host(
    room_id: str, body: RoomUserAction, current_user: CurrentUser
):
    doc = await get_live_room(room_id)
    if doc["host_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Only the host can transfer the room")
    raise HTTPException(410, "Room ownership stays with its creator. Invite a moderator instead.")


@router.post("/{room_id}/kick")
@room_time.serialized
async def kick_member(room_id: str, body: RoomUserAction, current_user: CurrentUser):
    """Host removes (and bans) a member from the room — HelloTalk style."""
    doc = await get_live_room(room_id)
    require_manager(doc, current_user["_id"])
    protect_member(doc, current_user["_id"], body.user_id)
    if body.user_id == doc["host_id"]:
        raise HTTPException(status_code=400, detail="The host cannot be removed")
    if body.user_id in doc["members"]:
        await room_time.finish_intervals({"room_id": room_id, "user_id": body.user_id, "bucket": "listener"})
        doc["members"].pop(body.user_id)
        await rooms_col.update_one(
            {"_id": room_id, **manager_query(current_user["_id"])},
            {
                "$unset": {f"members.{body.user_id}": ""},
                "$addToSet": {"banned": body.user_id},
                "$pull": {"moderators": body.user_id},
            },
        )
        await manager.send_to_user(
            body.user_id, {"type": "room_kicked", "room_id": room_id, "reason": "removed", "message": "You have been removed from this room."}
        )
        await broadcast_room(doc)
    return {"ok": True}


@router.post("/{room_id}/hand/dismiss")
async def dismiss_hand(room_id: str, body: RoomUserAction, current_user: CurrentUser):
    """Host rejects a raise-hand request (lowers the member's hand)."""
    doc = await get_live_room(room_id)
    require_manager(doc, current_user["_id"])
    member = doc["members"].get(body.user_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not in room")
    member["hand_raised"] = False
    await rooms_col.update_one(
        {"_id": room_id, "is_live": True, **manager_query(current_user["_id"]), f"members.{body.user_id}.role": "listener"}, {"$set": {f"members.{body.user_id}.hand_raised": False}}
    )
    await broadcast_room(await get_live_room(room_id))
    await manager.send_to_user(body.user_id, {"type": "room_stage_request_rejected", "room_id": room_id})
    return {"ok": True}


@router.post("/{room_id}/chat-mute")
async def toggle_chat_mute(room_id: str, current_user: CurrentUser):
    """Host toggles muting text chat for everyone except the host."""
    doc = await get_live_room(room_id)
    require_manager(doc, current_user["_id"])
    muted = not doc.get("chat_muted")
    await rooms_col.update_one({"_id": room_id, **manager_query(current_user["_id"])}, {"$set": {"chat_muted": muted}})
    doc["chat_muted"] = muted
    await broadcast_room(doc)
    return {"chat_muted": muted}


class PomodoroActionIn(BaseModel):
    action: str = Field(pattern="^(start|pause|reset|skip)$")


@router.post("/{room_id}/pomodoro")
async def pomodoro_action(room_id: str, body: PomodoroActionIn, current_user: CurrentUser):
    """Host controls the shared study timer. Broadcasts a room_update."""
    doc = await get_live_room(room_id)
    require_manager(doc, current_user["_id"])
    p = await _normalize_pomodoro(doc) or _pomodoro_defaults()
    now = datetime.now(timezone.utc)
    if body.action == "start" and not p["running"]:
        remaining = p.get("remaining_sec") or _phase_sec(p, p["phase"])
        p["running"] = True
        p["ends_at"] = (now + timedelta(seconds=remaining)).isoformat()
        p["remaining_sec"] = None
    elif body.action == "pause" and p["running"]:
        ends = datetime.fromisoformat(p["ends_at"])
        p["remaining_sec"] = max(0, int((ends - now).total_seconds()))
        p["running"] = False
        p["ends_at"] = None
    elif body.action == "reset":
        p = _pomodoro_defaults()
    elif body.action == "skip":
        p["phase"] = "break" if p["phase"] == "focus" else "focus"
        dur = _phase_sec(p, p["phase"])
        if p["running"]:
            p["ends_at"] = (now + timedelta(seconds=dur)).isoformat()
        else:
            p["remaining_sec"] = dur
    await rooms_col.update_one({"_id": room_id, **manager_query(current_user["_id"])}, {"$set": {"pomodoro": p}})
    doc["pomodoro"] = p
    await broadcast_room(doc)
    return {"ok": True, "pomodoro": p}


@router.get("/{room_id}/messages")
async def list_room_messages(room_id: str, current_user: CurrentUser):
    docs = (
        await room_messages_col.find({"room_id": room_id})
        .sort("created_at", 1)
        .to_list(200)
    )
    return [_message_public(d) for d in docs]


@router.post("/{room_id}/messages", status_code=201)
async def send_room_message(room_id: str, body: RoomMessageCreate, current_user: CurrentUser):
    doc = await get_live_room(room_id)
    if current_user["_id"] not in doc["members"]:
        raise HTTPException(status_code=403, detail="Join the room first")
    if doc.get("chat_muted") and not can_manage(doc, current_user["_id"]):
        raise HTTPException(status_code=403, detail="Chat has been muted by the host")
    msg = {
        "_id": str(uuid.uuid4()),
        "room_id": room_id,
        "sender": user_card(current_user),
        "text": body.text,
        "type": "text",
        "gift": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await room_messages_col.insert_one(msg)
    public = _message_public(msg)
    await manager.broadcast(
        list(doc["members"].keys()), {"type": "room_message", "message": public}
    )
    return public


@router.post("/{room_id}/gift", status_code=201)
async def send_gift(room_id: str, body: RoomGiftCreate, current_user: CurrentUser):
    """Send an emoji gift to a member on stage — deducts coins and posts a room message."""
    doc = await get_live_room(room_id)
    if current_user["_id"] not in doc["members"]:
        raise HTTPException(status_code=403, detail="Join the room first")
    gift = GIFT_MAP.get(body.gift_id)
    if not gift:
        raise HTTPException(status_code=404, detail="Gift not found")
    receiver_member = doc["members"].get(body.to_user_id)
    if not receiver_member:
        raise HTTPException(status_code=404, detail="Recipient is not in this room")
    coins = current_user.get("coins", 0)
    if coins < gift["price"]:
        raise HTTPException(status_code=400, detail="Not enough coins for this gift")
    receiver = await users_col.find_one({"_id": body.to_user_id})
    receiver_name = receiver.get("name", "someone") if receiver else "someone"
    debited = await users_col.update_one(
        {"_id": current_user["_id"], "coins": {"$gte": gift["price"]}}, {"$inc": {"coins": -gift["price"]}}
    )
    if not debited.modified_count:
        raise HTTPException(400, "Not enough coins for this gift")
    wallet = await users_col.find_one({"_id": current_user["_id"]}, {"_id": 0, "coins": 1})
    new_coins = wallet["coins"]
    current_user["coins"] = new_coins
    await rooms_col.update_one(
        {"_id": room_id},
        # Track gifts by RECIPIENT — powers the room's "most_gifted" leaderboard —
        # and by SENDER — powers the header "top_gifters" ranks (1/2/3).
        {
            "$inc": {
                f"gift_totals.{body.to_user_id}": gift["price"],
                f"gifter_totals.{current_user['_id']}": gift["price"],
            }
        },
    )
    # Room earnings belong solely to its immutable owner. The selected member
    # is the on-screen gift recipient, never the financial beneficiary.
    beneficiary = doc["host_id"]
    diamonds = round(gift["price"] / 10, 2)
    await db["gift_ledger"].insert_one(
        {
            "_id": str(uuid.uuid4()),
            "from_id": current_user["_id"],
            "to_id": beneficiary,
            "room_id": room_id,
            "display_recipient_id": body.to_user_id,
            "emoji": gift["emoji"],
            "name": gift["name"],
            "price": gift["price"],
            "diamonds": diamonds,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    await users_col.update_one(
        {"_id": beneficiary}, {"$inc": {"diamonds": diamonds}}
    )
    await db["wallet_tx"].insert_one(
        {
            "_id": str(uuid.uuid4()),
            "user_id": beneficiary,
            "kind": "diamond",
            "amount": diamonds,
            "label": f"Room gift income: {gift['name']}",
            "room_id": room_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    msg = {
        "_id": str(uuid.uuid4()),
        "room_id": room_id,
        "sender": user_card(current_user),
        "text": f"sent a {gift['emoji']} {gift['name']} to {receiver_name}!",
        "type": "gift",
        "gift": {"emoji": gift["emoji"], "name": gift["name"], "to": receiver_name},
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await room_messages_col.insert_one(msg)
    public = _message_public(msg)
    fresh_doc = await get_live_room(room_id)
    await manager.broadcast(
        list(fresh_doc["members"].keys()), {"type": "room_message", "message": public}
    )
    await broadcast_room(fresh_doc)
    return {"coins": new_coins, "message": public}
