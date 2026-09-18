import base64
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from auth_utils import CurrentUser
from config_utils import get_app_config
from db import audio_col, conversations_col, follows_col, gift_unlocks_col, media_col, messages_col, practice_unlocks_col, rooms_col, users_col
from db import db as _appdb

# Wallet collections (shared with the market/wallet feature) — chat gifts feed
# the recipient's earnings ledger just like room gifts do.
gift_ledger_col = _appdb["gift_ledger"]
wallet_tx_col = _appdb["wallet_tx"]
from models import (
    CallLogCreate,
    ConversationCreate,
    ImageMessageCreate,
    ManualCorrectionCreate,
    MessageCreate,
    MessageDeleteBody,
    MessageReactionCreate,
    MessageSaveBody,
    StickerCreate,
    VoiceMessageCreate,
    _vip_active,
    apply_privacy,
    user_card,
)
from routes.push import send_push
from ws_manager import manager

router = APIRouter(prefix="/chats", tags=["chats"])
logger = logging.getLogger(__name__)

# Chat gift catalog — coin prices shared with the gift-gate feature.
CHAT_GIFTS = {
    "rose": {"emoji": "🌹", "name": "Rose", "price": 10},
    "heart": {"emoji": "💖", "name": "Heart", "price": 20},
    "star": {"emoji": "⭐", "name": "Star", "price": 30},
    "crown": {"emoji": "👑", "name": "Crown", "price": 100},
    "diamond": {"emoji": "💎", "name": "Diamond", "price": 200},
}


class ChatGiftCreate(BaseModel):
    gift_id: str = Field(min_length=1, max_length=20)


async def _push_new_message(partner_id: str, muted: bool, sender_name: str, preview: str) -> None:
    """Best-effort push for a new chat message — never blocks message delivery."""
    if muted:
        return
    try:
        await send_push(
            recipients=[partner_id],
            data={"title": sender_name, "message": preview[:120]},
        )
    except Exception as e:
        logger.warning(f"Push notification failed (non-blocking): {e}")


async def _room_share_card(room_id: str | None) -> dict | None:
    """Live snapshot of a voice room for a chat card — matches the voice-tab
    list card shape exactly so every embedded room card looks identical:
    gradient background, LIVE bars, language flag, topic, host row and
    member preview. Computed at read-time so is_live is always accurate."""
    if not room_id:
        return None
    room_doc = await rooms_col.find_one({"_id": room_id})
    if not room_doc:
        return {"id": room_id, "is_live": False}
    host_id = room_doc.get("host_id")
    host_card = None
    if host_id:
        host_doc = await users_col.find_one({"_id": host_id})
        if host_doc:
            host_card = user_card(host_doc)
    member_ids = list(room_doc.get("members", {}).keys())
    preview_ids = member_ids[:4]
    preview_docs = (
        await users_col.find({"_id": {"$in": preview_ids}}).to_list(len(preview_ids))
        if preview_ids
        else []
    )
    members_preview = [user_card(u) for u in preview_docs]
    if not room_doc.get("is_live"):
        return {
            "id": room_id,
            "title": room_doc.get("title"),
            "topic": room_doc.get("topic"),
            "language": room_doc.get("language"),
            "background": room_doc.get("background"),
            "host": host_card,
            "members_preview": members_preview,
            "member_count": len(member_ids),
            "created_at": room_doc.get("created_at"),
            "is_live": False,
        }
    return {
        "id": room_doc["_id"],
        "title": room_doc["title"],
        "topic": room_doc.get("topic"),
        "mode": room_doc.get("mode", "chat"),
        "language": room_doc["language"],
        "languages": room_doc.get("languages") or [room_doc["language"]],
        "is_private": bool(room_doc.get("is_private")),
        "background": room_doc.get("background"),
        "member_count": len(member_ids),
        "members_preview": members_preview,
        "host": host_card,
        "created_at": room_doc.get("created_at"),
        "is_live": True,
    }


async def _reply_snapshot(conversation_id: str, reply_to_id: str | None) -> dict | None:
    """Build a compact snapshot of the message being replied to, stored on the
    new message so the quoted preview survives even if the original is edited or
    deleted later. Returns None when there's no valid reference."""
    if not reply_to_id:
        return None
    ref = await messages_col.find_one(
        {"_id": reply_to_id, "conversation_id": conversation_id}
    )
    if not ref:
        return None
    author = await users_col.find_one({"_id": ref["sender_id"]})
    rtype = ref.get("type", "text")
    if rtype == "voice":
        preview = "Voice message"
    elif rtype == "image":
        preview = "Photo"
    elif rtype == "room":
        preview = ref.get("text") or "Voice room"
    else:
        preview = ref.get("text", "")
    return {
        "id": ref["_id"],
        "author_id": ref["sender_id"],
        "author_name": (author or {}).get("name") or "User",
        "type": rtype,
        # Keep the whole quoted message so replies show it in full.
        "preview": (preview or "")[:2000],
        "duration_ms": ref.get("duration_ms"),
    }


def message_public(doc: dict) -> dict:
    reactions_raw = doc.get("reactions") or {}
    # {user_id: emoji} → aggregate as [{emoji, count, user_ids}] so the client
    # can render badges (with count) grouped by emoji.
    grouped: dict[str, dict] = {}
    for uid, emoji in reactions_raw.items():
        g = grouped.setdefault(emoji, {"emoji": emoji, "count": 0, "user_ids": []})
        g["count"] += 1
        g["user_ids"].append(uid)
    return {
        "id": doc["_id"],
        "conversation_id": doc["conversation_id"],
        "sender_id": doc["sender_id"],
        "text": doc.get("text", ""),
        "type": doc.get("type", "text"),
        "audio_id": doc.get("audio_id"),
        "image_id": doc.get("image_id"),
        "duration_ms": doc.get("duration_ms"),
        "room_id": doc.get("room_id"),
        "call_status": doc.get("call_status"),
        "sticker": doc.get("sticker"),
        "reactions": list(grouped.values()),
        "pinned": bool(doc.get("pinned", False)),
        "manual_correction": doc.get("manual_correction"),
        "transcript": doc.get("transcript"),
        "saved_by": doc.get("saved_by") or [],
        "practice_by": doc.get("practice_by") or [],
        "reply_to": doc.get("reply_to"),
        "created_at": doc["created_at"],
    }


async def message_public_async(doc: dict) -> dict:
    """Same as message_public but expands room card for `room` messages."""
    m = message_public(doc)
    if m.get("type") == "room" and m.get("room_id"):
        m["room"] = await _room_share_card(m["room_id"])
    return m


async def conversation_public(
    doc: dict, viewer_id: str, partner: dict | None = None
) -> dict:
    if doc.get("is_group"):
        member_docs = await users_col.find(
            {"_id": {"$in": doc["participant_ids"][:12]}}
        ).to_list(12)
        return {
            "id": doc["_id"],
            "is_group": True,
            "name": doc.get("name") or "Group Chat",
            "owner_id": doc.get("owner_id"),
            "member_count": len(doc["participant_ids"]),
            "member_ids": doc["participant_ids"],
            "members_preview": [user_card(u) for u in member_docs],
            "require_approval": bool(doc.get("require_approval")),
            "partner": None,
            "last_message": doc.get("last_message"),
            "unread": doc.get("unread", {}).get(viewer_id, 0),
            "muted": bool(doc.get("muted", {}).get(viewer_id)),
            "updated_at": doc.get("updated_at"),
        }
    partner_id = next((p for p in doc["participant_ids"] if p != viewer_id), viewer_id)
    if partner is None:
        partner = await users_col.find_one({"_id": partner_id})
    partner_card = None
    if partner:
        partner_card = user_card(partner)
        partner_card["is_online"] = manager.is_online(partner_id)
        apply_privacy(partner_card, partner)
    return {
        "id": doc["_id"],
        "partner": partner_card,
        "last_message": doc.get("last_message"),
        "unread": doc.get("unread", {}).get(viewer_id, 0),
        "muted": bool(doc.get("muted", {}).get(viewer_id)),
        # When the partner last read this conversation — used by the sender to
        # render a "Seen"/"Delivered" receipt under their latest message.
        "partner_read_at": doc.get("last_read", {}).get(partner_id),
        "updated_at": doc.get("updated_at"),
    }


async def ensure_not_blocked(current_user: dict, partner_id: str):
    """Blocked users can't message each other."""
    if partner_id in (current_user.get("blocked_users") or []):
        raise HTTPException(
            status_code=403,
            detail="You blocked this user. Unblock them to send messages.",
        )
    partner = await users_col.find_one({"_id": partner_id})
    if partner and current_user["_id"] in (partner.get("blocked_users") or []):
        raise HTTPException(status_code=403, detail="You can't message this user.")


async def ensure_practice_unlocked(current_user: dict, partner_id: str):
    """If the recipient is a paid-practice partner, the sender must hold an
    active (24h) unlock. Returns 402 so the client can show the unlock UI.
    The paid partner themselves can always reply (recipient wouldn't be paid)."""
    partner = await users_col.find_one(
        {"_id": partner_id}, {"paid_practice": 1, "practice_rate": 1}
    )
    if not partner or not partner.get("paid_practice"):
        return
    unlock = await practice_unlocks_col.find_one(
        {"buyer_id": current_user["_id"], "partner_id": partner_id}
    )
    now_iso = datetime.now(timezone.utc).isoformat()
    if unlock and unlock.get("expires_at", "") > now_iso:
        return
    rate = int(partner.get("practice_rate") or 50)
    raise HTTPException(
        status_code=402,
        detail=f"Unlock practice with this partner ({rate} coins) to send messages.",
    )


async def ensure_gift_unlocked(current_user: dict, partner_id: str):
    """If the recipient requires a gift before chatting, the sender must have
    already sent a qualifying gift (recorded as a gift unlock)."""
    partner = await users_col.find_one(
        {"_id": partner_id}, {"gift_gate": 1, "gift_gate_min": 1, "paid_practice": 1}
    )
    if not partner or not partner.get("gift_gate") or partner.get("paid_practice"):
        return
    unlock = await gift_unlocks_col.find_one(
        {"buyer_id": current_user["_id"], "partner_id": partner_id}
    )
    if unlock:
        return
    min_coins = int(partner.get("gift_gate_min") or 20)
    raise HTTPException(
        status_code=402,
        detail=f"gift_gate:Send a gift worth at least {min_coins} coins to start chatting.",
    )


async def ensure_can_message(current_user: dict, partner_id: str):
    """Combined message gate: paid-practice unlock + gift gate."""
    await ensure_practice_unlocked(current_user, partner_id)
    await ensure_gift_unlocked(current_user, partner_id)


async def get_owned_conversation(conversation_id: str, user_id: str) -> dict:
    doc = await conversations_col.find_one({"_id": conversation_id})
    if not doc or user_id not in doc["participant_ids"]:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return doc


@router.post("")
async def create_or_get_conversation(body: ConversationCreate, current_user: CurrentUser):
    if body.partner_id == current_user["_id"]:
        raise HTTPException(status_code=400, detail="Cannot chat with yourself")
    partner = await users_col.find_one({"_id": body.partner_id})
    if not partner:
        raise HTTPException(status_code=404, detail="User not found")
    await ensure_not_blocked(current_user, body.partner_id)
    existing = await conversations_col.find_one(
        {
            "participant_ids": {"$all": [current_user["_id"], body.partner_id]},
            "is_group": {"$ne": True},
        }
    )
    if existing:
        return await conversation_public(existing, current_user["_id"])
    # Daily new-partner caps (admin-configurable). Mutual follows are exempt.
    cfg = await get_app_config()
    is_vip = _vip_active(current_user)
    daily_cap = cfg["vip_new_chats_per_day"] if is_vip else cfg["free_new_chats_per_day"]
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    usage = current_user.get("new_chat_usage") or {}
    used_today = usage.get("count", 0) if usage.get("date") == today else 0
    counted = used_today < daily_cap
    if not counted:
        i_follow = await follows_col.find_one(
            {"follower_id": current_user["_id"], "following_id": body.partner_id}
        )
        follows_me = await follows_col.find_one(
            {"follower_id": body.partner_id, "following_id": current_user["_id"]}
        )
        if not (i_follow and follows_me):
            raise HTTPException(
                status_code=403,
                detail=(
                    f"Daily limit reached — you can start chats with {daily_cap} new people per day."
                    + ("" if is_vip else " Upgrade to VIP for 25 per day.")
                    + " Mutual follows can always chat."
                ),
            )
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "_id": str(uuid.uuid4()),
        "participant_ids": [current_user["_id"], body.partner_id],
        "last_message": None,
        "unread": {current_user["_id"]: 0, body.partner_id: 0},
        "created_at": now,
        "updated_at": now,
    }
    await conversations_col.insert_one(doc)
    if counted:
        await users_col.update_one(
            {"_id": current_user["_id"]},
            {"$set": {"new_chat_usage": {"date": today, "count": used_today + 1}}},
        )
    return await conversation_public(doc, current_user["_id"])


@router.get("")
async def list_conversations(current_user: CurrentUser):
    docs = (
        await conversations_col.find({"participant_ids": current_user["_id"]})
        .sort("updated_at", -1)
        .to_list(100)
    )
    uid = current_user["_id"]
    partner_ids = list(
        {next((p for p in d["participant_ids"] if p != uid), uid) for d in docs}
    )
    partners = (
        await users_col.find({"_id": {"$in": partner_ids}}).to_list(len(partner_ids))
        if partner_ids
        else []
    )
    partner_map = {u["_id"]: u for u in partners}
    results = [
        await conversation_public(
            d, uid, partner_map.get(next((p for p in d["participant_ids"] if p != uid), uid))
        )
        for d in docs
    ]
    # Attach live voice-room status to partners
    live_rooms = await rooms_col.find({"is_live": True}).to_list(100)
    room_map: dict = {}
    for r in live_rooms:
        for uid in (r.get("members") or {}).keys():
            room_map[uid] = {"room_id": r["_id"], "name": r.get("title"), "title": r.get("title"), "language": r.get("language")}
    for c in results:
        p = c.get("partner")
        if p and p.get("id") in room_map:
            p["in_voice_room"] = room_map[p["id"]]
    return results


@router.get("/{conversation_id}")
async def get_conversation(conversation_id: str, current_user: CurrentUser):
    doc = await get_owned_conversation(conversation_id, current_user["_id"])
    return await conversation_public(doc, current_user["_id"])


@router.get("/{conversation_id}/messages")
async def list_messages(conversation_id: str, current_user: CurrentUser):
    conv = await get_owned_conversation(conversation_id, current_user["_id"])
    docs = (
        await messages_col.find({"conversation_id": conversation_id})
        .sort("created_at", 1)
        .to_list(500)
    )
    out = [await message_public_async(d) for d in docs]
    if conv.get("is_group"):
        sender_ids = list({d["sender_id"] for d in docs if d.get("sender_id")})
        senders = await users_col.find({"_id": {"$in": sender_ids}}).to_list(
            len(sender_ids)
        )
        smap = {u["_id"]: user_card(u) for u in senders}
        for m in out:
            m["sender"] = smap.get(m.get("sender_id"))
    return out


class GroupCreate(BaseModel):
    member_ids: list[str] = Field(min_length=1, max_length=50)
    name: str | None = Field(default=None, max_length=80)


class GroupNameUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=80)


class GroupMembersBody(BaseModel):
    member_ids: list[str] = Field(min_length=1, max_length=50)


class GroupRemoveBody(BaseModel):
    user_id: str


async def _group_system_message(conversation_id: str, text: str) -> dict:
    doc = {
        "_id": str(uuid.uuid4()),
        "conversation_id": conversation_id,
        "sender_id": None,
        "text": text,
        "type": "system",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await messages_col.insert_one(doc)
    return message_public(doc)


@router.post("/group", status_code=201)
async def create_group_chat(body: GroupCreate, current_user: CurrentUser):
    """HelloTalk-style group chat: pick partners → instant group."""
    uid = current_user["_id"]
    member_ids = [m for m in dict.fromkeys(body.member_ids) if m != uid]
    members = await users_col.find({"_id": {"$in": member_ids}}).to_list(len(member_ids))
    if not members:
        raise HTTPException(status_code=400, detail="Pick at least one member")
    now = datetime.now(timezone.utc).isoformat()
    participant_ids = [uid] + [m["_id"] for m in members]
    names = [current_user.get("name") or "Me"] + [m.get("name") or "?" for m in members]
    name = body.name or ", ".join(n.split(" ")[0] for n in names[:4])
    doc = {
        "_id": str(uuid.uuid4()),
        "is_group": True,
        "name": name[:80],
        "owner_id": uid,
        "participant_ids": participant_ids,
        "last_message": None,
        "unread": {p: 0 for p in participant_ids},
        "created_at": now,
        "updated_at": now,
    }
    await conversations_col.insert_one(doc)
    invited = ", ".join(m.get("name") or "?" for m in members)
    sys_msg = await _group_system_message(
        doc["_id"],
        f"{current_user.get('name') or 'Someone'} invited {invited} to Group Chat",
    )
    for oid in participant_ids:
        if oid != uid:
            await manager.send_to_user(
                oid,
                {
                    "type": "new_message",
                    "conversation_id": doc["_id"],
                    "message": sys_msg,
                    "sender": user_card(current_user),
                },
            )
    return await conversation_public(doc, uid)


@router.post("/{conversation_id}/group/name")
async def rename_group(
    conversation_id: str, body: GroupNameUpdate, current_user: CurrentUser
):
    conv = await get_owned_conversation(conversation_id, current_user["_id"])
    if not conv.get("is_group"):
        raise HTTPException(status_code=400, detail="Not a group chat")
    await conversations_col.update_one(
        {"_id": conversation_id}, {"$set": {"name": body.name.strip()}}
    )
    await _group_system_message(
        conversation_id,
        f"{current_user.get('name') or 'Someone'} renamed the group to \"{body.name.strip()}\"",
    )
    return {"ok": True, "name": body.name.strip()}


@router.post("/{conversation_id}/group/add")
async def add_group_members(
    conversation_id: str, body: GroupMembersBody, current_user: CurrentUser
):
    conv = await get_owned_conversation(conversation_id, current_user["_id"])
    if not conv.get("is_group"):
        raise HTTPException(status_code=400, detail="Not a group chat")
    new_ids = [m for m in dict.fromkeys(body.member_ids) if m not in conv["participant_ids"]]
    members = await users_col.find({"_id": {"$in": new_ids}}).to_list(len(new_ids))
    if not members:
        return {"ok": True, "added": 0}
    await conversations_col.update_one(
        {"_id": conversation_id},
        {
            "$push": {"participant_ids": {"$each": [m["_id"] for m in members]}},
            "$set": {**{f"unread.{m['_id']}": 0 for m in members}},
        },
    )
    invited = ", ".join(m.get("name") or "?" for m in members)
    await _group_system_message(
        conversation_id,
        f"{current_user.get('name') or 'Someone'} invited {invited} to Group Chat",
    )
    return {"ok": True, "added": len(members)}


class GroupApprovalBody(BaseModel):
    require: bool


@router.post("/{conversation_id}/group/approval")
async def set_group_approval(
    conversation_id: str, body: GroupApprovalBody, current_user: CurrentUser
):
    conv = await get_owned_conversation(conversation_id, current_user["_id"])
    if not conv.get("is_group"):
        raise HTTPException(status_code=400, detail="Not a group chat")
    if conv.get("owner_id") != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Only the group owner can change this")
    await conversations_col.update_one(
        {"_id": conversation_id}, {"$set": {"require_approval": body.require}}
    )
    return {"ok": True, "require_approval": body.require}


@router.get("/{conversation_id}/group/members")
async def list_group_members(conversation_id: str, current_user: CurrentUser):
    conv = await get_owned_conversation(conversation_id, current_user["_id"])
    docs = await users_col.find({"_id": {"$in": conv["participant_ids"]}}).to_list(100)
    order = {p: i for i, p in enumerate(conv["participant_ids"])}
    docs.sort(key=lambda d: order.get(d["_id"], 99))
    return {
        "owner_id": conv.get("owner_id"),
        "members": [user_card(d) for d in docs],
    }


@router.post("/{conversation_id}/group/leave")
async def leave_group(conversation_id: str, current_user: CurrentUser):
    conv = await get_owned_conversation(conversation_id, current_user["_id"])
    if not conv.get("is_group"):
        raise HTTPException(status_code=400, detail="Not a group chat")
    remaining = [p for p in conv["participant_ids"] if p != current_user["_id"]]
    if not remaining:
        await conversations_col.delete_one({"_id": conversation_id})
        return {"ok": True}
    updates: dict = {"$pull": {"participant_ids": current_user["_id"]}}
    if conv.get("owner_id") == current_user["_id"]:
        updates["$set"] = {"owner_id": remaining[0]}
    await conversations_col.update_one({"_id": conversation_id}, updates)
    await _group_system_message(
        conversation_id, f"{current_user.get('name') or 'Someone'} left the group"
    )
    return {"ok": True}


@router.post("/{conversation_id}/group/remove")
async def remove_group_member(
    conversation_id: str, body: GroupRemoveBody, current_user: CurrentUser
):
    conv = await get_owned_conversation(conversation_id, current_user["_id"])
    if not conv.get("is_group"):
        raise HTTPException(status_code=400, detail="Not a group chat")
    if conv.get("owner_id") != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Only the group owner can remove members")
    if body.user_id not in conv["participant_ids"]:
        raise HTTPException(status_code=404, detail="Member not found")
    removed = await users_col.find_one({"_id": body.user_id})
    await conversations_col.update_one(
        {"_id": conversation_id}, {"$pull": {"participant_ids": body.user_id}}
    )
    await _group_system_message(
        conversation_id,
        f"{(removed or {}).get('name') or 'A member'} was removed from the group",
    )
    return {"ok": True}


async def _fanout_new_message(conv, conversation_id, current_user, msg, preview):
    """Deliver a new message to EVERY other participant (1:1 and groups)."""
    for oid in [p for p in conv["participant_ids"] if p != current_user["_id"]]:
        await manager.send_to_user(
            oid,
            {
                "type": "new_message",
                "conversation_id": conversation_id,
                "message": msg,
                "sender": user_card(current_user),
            },
        )
        await _push_new_message(
            oid,
            bool(conv.get("muted", {}).get(oid)),
            current_user.get("name") or "New message",
            preview,
        )


@router.post("/{conversation_id}/messages", status_code=201)
async def send_message(conversation_id: str, body: MessageCreate, current_user: CurrentUser):
    if current_user.get("restricted"):
        raise HTTPException(status_code=403, detail="Your account is restricted from sending messages.")
    conv = await get_owned_conversation(conversation_id, current_user["_id"])
    other_ids = [p for p in conv["participant_ids"] if p != current_user["_id"]]
    partner_id = other_ids[0]
    if not conv.get("is_group"):
        await ensure_not_blocked(current_user, partner_id)
        await ensure_can_message(current_user, partner_id)
    now = datetime.now(timezone.utc).isoformat()

    # A "room share" message drops a rich voice-room card into the chat. It
    # doesn't require any text body — the card itself tells the whole story.
    is_room_share = bool(body.room_id)
    if is_room_share:
        room_doc = await rooms_col.find_one({"_id": body.room_id})
        if not room_doc:
            raise HTTPException(status_code=404, detail="Voice room not found.")
        preview_text = f"🎙️ {room_doc.get('title') or 'Voice room'}"
        doc = {
            "_id": str(uuid.uuid4()),
            "conversation_id": conversation_id,
            "sender_id": current_user["_id"],
            "text": (body.text or "").strip() or preview_text,
            "type": "room",
            "room_id": body.room_id,
            "created_at": now,
        }
    else:
        text = (body.text or "").strip()
        if not text:
            raise HTTPException(status_code=400, detail="Message text is required.")
        doc = {
            "_id": str(uuid.uuid4()),
            "conversation_id": conversation_id,
            "sender_id": current_user["_id"],
            "text": text,
            "created_at": now,
        }

    await messages_col.insert_one(doc)
    reply = await _reply_snapshot(conversation_id, body.reply_to_id)
    if reply:
        doc["reply_to"] = reply
        await messages_col.update_one(
            {"_id": doc["_id"]}, {"$set": {"reply_to": reply}}
        )
    msg = await message_public_async(doc)
    preview = doc["text"]
    text_update: dict = {
        "$set": {
            "last_message": {"text": preview, "sender_id": current_user["_id"], "created_at": now},
            "updated_at": now,
        },
    }
    inc = {
        f"unread.{oid}": 1
        for oid in other_ids
        if not conv.get("muted", {}).get(oid)
    }
    if inc:
        text_update["$inc"] = inc
    await conversations_col.update_one({"_id": conversation_id}, text_update)
    await _fanout_new_message(conv, conversation_id, current_user, msg, preview)
    return msg


@router.post("/{conversation_id}/gift", status_code=201)
async def send_gift(
    conversation_id: str, body: ChatGiftCreate, current_user: CurrentUser
):
    """Send a coin gift to the chat partner. Deducts coins from the sender,
    credits the recipient, posts a gift bubble, and — if the recipient has a
    gift gate — unlocks messaging once a qualifying gift is sent."""
    conv = await get_owned_conversation(conversation_id, current_user["_id"])
    if conv.get("is_group"):
        raise HTTPException(status_code=400, detail="Gifts are for 1:1 chats only.")
    other_ids = [p for p in conv["participant_ids"] if p != current_user["_id"]]
    partner_id = other_ids[0]
    await ensure_not_blocked(current_user, partner_id)
    gift = CHAT_GIFTS.get(body.gift_id)
    if not gift:
        raise HTTPException(status_code=404, detail="Unknown gift.")
    price = gift["price"]
    coins = int(current_user.get("coins") or 0)
    if coins < price:
        raise HTTPException(
            status_code=402,
            detail=f"Not enough coins. This gift costs {price} coins.",
        )
    # Sender spends coins; the recipient EARNS diamonds (price/10) into their
    # wallet — the same model as room gifts — plus a permanent gift-ledger
    # entry and wallet transactions so every earning shows up in the Wallet.
    diamonds = round(price / 10, 2)
    tx_now = datetime.now(timezone.utc).isoformat()
    await users_col.update_one({"_id": current_user["_id"]}, {"$inc": {"coins": -price}})
    await users_col.update_one({"_id": partner_id}, {"$inc": {"diamonds": diamonds}})
    await gift_ledger_col.insert_one(
        {
            "_id": str(uuid.uuid4()),
            "from_id": current_user["_id"],
            "to_id": partner_id,
            "emoji": gift["emoji"],
            "name": gift["name"],
            "price": price,
            "diamonds": diamonds,
            "created_at": tx_now,
        }
    )
    await wallet_tx_col.insert_many(
        [
            {
                "_id": str(uuid.uuid4()),
                "user_id": partner_id,
                "kind": "diamond",
                "amount": diamonds,
                "label": f"Gift received {gift['emoji']} {gift['name']}",
                "created_at": tx_now,
            },
            {
                "_id": str(uuid.uuid4()),
                "user_id": current_user["_id"],
                "kind": "coin",
                "amount": -price,
                "label": f"Sent {gift['emoji']} {gift['name']}",
                "created_at": tx_now,
            },
        ]
    )

    partner = await users_col.find_one(
        {"_id": partner_id}, {"gift_gate": 1, "gift_gate_min": 1, "paid_practice": 1}
    )
    unlocked = False
    if partner and partner.get("gift_gate") and not partner.get("paid_practice"):
        if price >= int(partner.get("gift_gate_min") or 20):
            await gift_unlocks_col.update_one(
                {"buyer_id": current_user["_id"], "partner_id": partner_id},
                {
                    "$set": {
                        "buyer_id": current_user["_id"],
                        "partner_id": partner_id,
                        "gift_id": body.gift_id,
                        "price": price,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                    }
                },
                upsert=True,
            )
            unlocked = True

    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "_id": str(uuid.uuid4()),
        "conversation_id": conversation_id,
        "sender_id": current_user["_id"],
        "text": f"{gift['emoji']} {gift['name']}",
        "type": "gift",
        "gift_id": body.gift_id,
        "gift_emoji": gift["emoji"],
        "created_at": now,
    }
    await messages_col.insert_one(doc)
    msg = message_public(doc)
    preview = f"{gift['emoji']} {gift['name']}"
    gift_update: dict = {
        "$set": {
            "last_message": {"text": preview, "sender_id": current_user["_id"], "created_at": now},
            "updated_at": now,
        },
    }
    inc = {
        f"unread.{oid}": 1
        for oid in other_ids
        if not conv.get("muted", {}).get(oid)
    }
    if inc:
        gift_update["$inc"] = inc
    await conversations_col.update_one({"_id": conversation_id}, gift_update)
    await _fanout_new_message(conv, conversation_id, current_user, msg, preview)
    return {"ok": True, "message": msg, "coins": coins - price, "unlocked": unlocked}



@router.post("/{conversation_id}/call", status_code=status.HTTP_201_CREATED)
async def log_call(
    conversation_id: str, body: CallLogCreate, current_user: CurrentUser
):
    """Drop a call-event card into the chat (missed / outgoing / answered).
    Real-time calling isn't part of the MVP — this records the call outcome so
    it renders as a bubble in the conversation, just like WhatsApp/HelloTalk."""
    conv = await get_owned_conversation(conversation_id, current_user["_id"])
    other_ids = [p for p in conv["participant_ids"] if p != current_user["_id"]]
    partner_id = other_ids[0]
    now = datetime.now(timezone.utc).isoformat()
    status_val = body.status if body.status in {
        "missed",
        "outgoing",
        "incoming",
        "answered",
    } else "missed"
    kind_label = "Video Call" if body.kind == "video" else "Voice Call"
    doc = {
        "_id": str(uuid.uuid4()),
        "conversation_id": conversation_id,
        "sender_id": current_user["_id"],
        "text": kind_label,
        "type": "call",
        "call_status": status_val,
        "duration_ms": body.duration_ms,
        "created_at": now,
    }
    await messages_col.insert_one(doc)
    msg = await message_public_async(doc)
    if status_val == "missed":
        preview = "📞 Missed call"
    elif body.duration_ms:
        secs = max(1, round(body.duration_ms / 1000))
        preview = f"📞 Call · {secs // 60}:{secs % 60:02d}"
    else:
        preview = "📞 Call"
    call_update: dict = {
        "$set": {
            "last_message": {
                "text": preview,
                "sender_id": current_user["_id"],
                "created_at": now,
            },
            "updated_at": now,
        },
    }
    if status_val in {"missed", "incoming"} and not conv.get("muted", {}).get(
        partner_id
    ):
        call_update["$inc"] = {f"unread.{partner_id}": 1}
    await conversations_col.update_one({"_id": conversation_id}, call_update)
    for oid in other_ids:
        await manager.send_to_user(
            oid,
            {
                "type": "new_message",
                "conversation_id": conversation_id,
                "message": msg,
                "sender": user_card(current_user),
            },
        )
    return msg


@router.post("/{conversation_id}/sticker", status_code=status.HTTP_201_CREATED)
async def send_sticker(
    conversation_id: str, body: StickerCreate, current_user: CurrentUser
):
    """Send an animated sticker (referenced by its emoji codepoint)."""
    conv = await get_owned_conversation(conversation_id, current_user["_id"])
    other_ids = [p for p in conv["participant_ids"] if p != current_user["_id"]]
    partner_id = other_ids[0]
    if not conv.get("is_group"):
        await ensure_can_message(current_user, partner_id)
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "_id": str(uuid.uuid4()),
        "conversation_id": conversation_id,
        "sender_id": current_user["_id"],
        "text": "",
        "type": "sticker",
        "sticker": body.sticker.strip(),
        "created_at": now,
    }
    await messages_col.insert_one(doc)
    msg = await message_public_async(doc)
    sticker_update: dict = {
        "$set": {
            "last_message": {
                "text": "😊 Stickers",
                "sender_id": current_user["_id"],
                "created_at": now,
            },
            "updated_at": now,
        },
    }
    inc = {
        f"unread.{oid}": 1
        for oid in other_ids
        if not conv.get("muted", {}).get(oid)
    }
    if inc:
        sticker_update["$inc"] = inc
    await conversations_col.update_one({"_id": conversation_id}, sticker_update)
    for oid in other_ids:
        await manager.send_to_user(
            oid,
            {
                "type": "new_message",
                "conversation_id": conversation_id,
                "message": msg,
                "sender": user_card(current_user),
            },
        )
    return msg


@router.post("/{conversation_id}/messages/{message_id}/react")
async def toggle_reaction(
    conversation_id: str,
    message_id: str,
    body: MessageReactionCreate,
    current_user: CurrentUser,
):
    """Toggle a reaction emoji on a message. Sending the same emoji again clears
    it; a different emoji replaces the previous one. One reaction per user per
    message — HelloTalk/Instagram style."""
    await get_owned_conversation(conversation_id, current_user["_id"])
    msg_doc = await messages_col.find_one({"_id": message_id, "conversation_id": conversation_id})
    if not msg_doc:
        raise HTTPException(status_code=404, detail="Message not found.")
    reactions = dict(msg_doc.get("reactions") or {})
    uid = current_user["_id"]
    current = reactions.get(uid)
    if current == body.emoji:
        reactions.pop(uid, None)
    else:
        reactions[uid] = body.emoji
    await messages_col.update_one(
        {"_id": message_id}, {"$set": {"reactions": reactions}}
    )
    updated = {**msg_doc, "reactions": reactions}
    msg_out = await message_public_async(updated)
    # Notify partner in real-time so their bubble updates instantly.
    conv = await get_owned_conversation(conversation_id, current_user["_id"])
    other_ids = [p for p in conv["participant_ids"] if p != current_user["_id"]]
    if other_ids:
        for oid in other_ids:
            await manager.send_to_user(
                oid,
                {
                    "type": "message_reaction",
                "conversation_id": conversation_id,
                "message": msg_out,
            },
        )
    return msg_out


async def _notify_message_update(conversation_id: str, current_user: dict, msg_out: dict) -> None:
    """Push an updated message to the partner so pins/corrections/transcripts
    appear in real time on their side too."""
    conv = await conversations_col.find_one({"_id": conversation_id})
    if not conv:
        return
    for partner_id in [p for p in conv["participant_ids"] if p != current_user["_id"]]:
        await manager.send_to_user(
            partner_id,
            {
                "type": "message_update",
                "conversation_id": conversation_id,
                "message": msg_out,
            },
        )


@router.get("/saved/list")
async def list_saved_messages(current_user: CurrentUser, kind: str = "saved"):
    """The user's personal Saved / Practice message collection (across all chats)."""
    field = "practice_by" if kind == "practice" else "saved_by"
    docs = (
        await messages_col.find({field: current_user["_id"]})
        .sort("created_at", -1)
        .to_list(300)
    )
    return [await message_public_async(d) for d in docs]


@router.post("/{conversation_id}/messages/{message_id}/pin")
async def toggle_pin(conversation_id: str, message_id: str, current_user: CurrentUser):
    """Pin/unpin a message. Pins are shared — both participants see them."""
    await get_owned_conversation(conversation_id, current_user["_id"])
    msg_doc = await messages_col.find_one(
        {"_id": message_id, "conversation_id": conversation_id}
    )
    if not msg_doc:
        raise HTTPException(status_code=404, detail="Message not found.")
    pinned = not bool(msg_doc.get("pinned"))
    now = datetime.now(timezone.utc).isoformat()
    await messages_col.update_one(
        {"_id": message_id},
        {"$set": {"pinned": pinned, "pinned_at": now if pinned else None,
                  "pinned_by": current_user["_id"] if pinned else None}},
    )
    updated = {**msg_doc, "pinned": pinned}
    msg_out = await message_public_async(updated)
    await _notify_message_update(conversation_id, current_user, msg_out)
    return msg_out


@router.get("/{conversation_id}/pinned")
async def list_pinned(conversation_id: str, current_user: CurrentUser):
    """All pinned messages in a conversation (newest first)."""
    await get_owned_conversation(conversation_id, current_user["_id"])
    docs = (
        await messages_col.find({"conversation_id": conversation_id, "pinned": True})
        .sort("pinned_at", -1)
        .to_list(50)
    )
    return [await message_public_async(d) for d in docs]


@router.post("/{conversation_id}/messages/{message_id}/save")
async def toggle_save(
    conversation_id: str,
    message_id: str,
    body: MessageSaveBody,
    current_user: CurrentUser,
):
    """Toggle a message into the user's personal Saved (bookmark) or Practice list."""
    await get_owned_conversation(conversation_id, current_user["_id"])
    msg_doc = await messages_col.find_one(
        {"_id": message_id, "conversation_id": conversation_id}
    )
    if not msg_doc:
        raise HTTPException(status_code=404, detail="Message not found.")
    field = "practice_by" if body.kind == "practice" else "saved_by"
    uid = current_user["_id"]
    current = list(msg_doc.get(field) or [])
    if uid in current:
        op = {"$pull": {field: uid}}
        active = False
    else:
        op = {"$addToSet": {field: uid}}
        active = True
    await messages_col.update_one({"_id": message_id}, op)
    return {"ok": True, "kind": body.kind, "active": active}


@router.post("/{conversation_id}/messages/{message_id}/correction")
async def add_manual_correction(
    conversation_id: str,
    message_id: str,
    body: ManualCorrectionCreate,
    current_user: CurrentUser,
):
    """Attach the user's own hand-written correction to a message (HelloTalk style)."""
    await get_owned_conversation(conversation_id, current_user["_id"])
    msg_doc = await messages_col.find_one(
        {"_id": message_id, "conversation_id": conversation_id}
    )
    if not msg_doc:
        raise HTTPException(status_code=404, detail="Message not found.")
    correction = {
        "corrected": body.corrected.strip(),
        "note": (body.note or "").strip() or None,
        "by": current_user["_id"],
        "by_name": current_user.get("name") or "Someone",
        "at": datetime.now(timezone.utc).isoformat(),
    }
    await messages_col.update_one(
        {"_id": message_id}, {"$set": {"manual_correction": correction}}
    )
    updated = {**msg_doc, "manual_correction": correction}
    msg_out = await message_public_async(updated)
    await _notify_message_update(conversation_id, current_user, msg_out)
    return msg_out


@router.delete("/{conversation_id}/messages/{message_id}/correction")
async def remove_manual_correction(
    conversation_id: str, message_id: str, current_user: CurrentUser
):
    """Remove a manual correction the user previously added."""
    await get_owned_conversation(conversation_id, current_user["_id"])
    msg_doc = await messages_col.find_one(
        {"_id": message_id, "conversation_id": conversation_id}
    )
    if not msg_doc:
        raise HTTPException(status_code=404, detail="Message not found.")
    await messages_col.update_one(
        {"_id": message_id}, {"$unset": {"manual_correction": ""}}
    )
    updated = {**msg_doc}
    updated.pop("manual_correction", None)
    msg_out = await message_public_async(updated)
    await _notify_message_update(conversation_id, current_user, msg_out)
    return msg_out


@router.post("/{conversation_id}/messages/delete")
async def delete_messages(
    conversation_id: str, body: MessageDeleteBody, current_user: CurrentUser
):
    """Bulk-delete selected messages in a conversation (multi-select / recall)."""
    await get_owned_conversation(conversation_id, current_user["_id"])
    res = await messages_col.delete_many(
        {"_id": {"$in": body.ids}, "conversation_id": conversation_id}
    )
    # Notify the partner so recalled messages disappear on their side too.
    conv = await conversations_col.find_one({"_id": conversation_id})
    if conv:
        partner_id = next(
            (p for p in conv["participant_ids"] if p != current_user["_id"]), None
        )
        if partner_id:
            await manager.send_to_user(
                partner_id,
                {
                    "type": "messages_deleted",
                    "conversation_id": conversation_id,
                    "ids": body.ids,
                },
            )
    return {"ok": True, "deleted": res.deleted_count}


@router.post("/{conversation_id}/mute")
async def toggle_mute(conversation_id: str, current_user: CurrentUser):
    """Toggle message notifications (unread badge) from this conversation."""
    conv = await get_owned_conversation(conversation_id, current_user["_id"])
    muted = bool(conv.get("muted", {}).get(current_user["_id"]))
    await conversations_col.update_one(
        {"_id": conversation_id},
        {"$set": {f"muted.{current_user['_id']}": not muted}},
    )
    return {"muted": not muted}


@router.delete("/{conversation_id}/messages")
async def clear_history(conversation_id: str, current_user: CurrentUser):
    """Clear all messages in the conversation."""
    await get_owned_conversation(conversation_id, current_user["_id"])
    await messages_col.delete_many({"conversation_id": conversation_id})
    await conversations_col.update_one(
        {"_id": conversation_id},
        {"$set": {"last_message": None, "unread": {}}},
    )
    return {"ok": True}


@router.post("/{conversation_id}/voice", status_code=201)
async def send_voice_message(
    conversation_id: str, body: VoiceMessageCreate, current_user: CurrentUser
):
    conv = await get_owned_conversation(conversation_id, current_user["_id"])
    other_ids = [p for p in conv["participant_ids"] if p != current_user["_id"]]
    partner_id = other_ids[0]
    if not conv.get("is_group"):
        await ensure_can_message(current_user, partner_id)
    try:
        audio_bytes = base64.b64decode(body.audio_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid audio data")
    if len(audio_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Audio too large (max 10MB)")
    audio_id = str(uuid.uuid4())
    await audio_col.insert_one({"_id": audio_id, "data": audio_bytes, "mime": body.mime})
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "_id": str(uuid.uuid4()),
        "conversation_id": conversation_id,
        "sender_id": current_user["_id"],
        "text": "Voice message",
        "type": "voice",
        "audio_id": audio_id,
        "duration_ms": body.duration_ms,
        "created_at": now,
    }
    await messages_col.insert_one(doc)
    reply = await _reply_snapshot(conversation_id, body.reply_to_id)
    if reply:
        doc["reply_to"] = reply
        await messages_col.update_one(
            {"_id": doc["_id"]}, {"$set": {"reply_to": reply}}
        )
    msg = message_public(doc)
    voice_update: dict = {
        "$set": {
            "last_message": {"text": f"🔊 {max(1, round((body.duration_ms or 1000) / 1000))}s", "sender_id": current_user["_id"], "created_at": now},
            "updated_at": now,
        },
    }
    inc = {
        f"unread.{oid}": 1
        for oid in other_ids
        if not conv.get("muted", {}).get(oid)
    }
    if inc:
        voice_update["$inc"] = inc
    await conversations_col.update_one({"_id": conversation_id}, voice_update)
    await _fanout_new_message(conv, conversation_id, current_user, msg, "🎤 Voice message")
    return msg


@router.post("/{conversation_id}/image", status_code=201)
async def send_image_message(
    conversation_id: str, body: ImageMessageCreate, current_user: CurrentUser
):
    conv = await get_owned_conversation(conversation_id, current_user["_id"])
    other_ids = [p for p in conv["participant_ids"] if p != current_user["_id"]]
    partner_id = other_ids[0]
    if not conv.get("is_group"):
        await ensure_can_message(current_user, partner_id)
    try:
        image_bytes = base64.b64decode(body.image_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image data")
    if len(image_bytes) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large (max 8MB)")
    media_id = str(uuid.uuid4())
    await media_col.insert_one({"_id": media_id, "data": image_bytes, "mime": body.mime})
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "_id": str(uuid.uuid4()),
        "conversation_id": conversation_id,
        "sender_id": current_user["_id"],
        "text": "Photo",
        "type": "image",
        "image_id": media_id,
        "created_at": now,
    }
    await messages_col.insert_one(doc)
    msg = message_public(doc)
    image_update: dict = {
        "$set": {
            "last_message": {"text": "📷 Photo", "sender_id": current_user["_id"], "created_at": now},
            "updated_at": now,
        },
    }
    inc = {
        f"unread.{oid}": 1
        for oid in other_ids
        if not conv.get("muted", {}).get(oid)
    }
    if inc:
        image_update["$inc"] = inc
    await conversations_col.update_one({"_id": conversation_id}, image_update)
    await _fanout_new_message(conv, conversation_id, current_user, msg, "📷 Photo")
    return msg


@router.post("/{conversation_id}/read")
async def mark_read(conversation_id: str, current_user: CurrentUser):
    conv = await get_owned_conversation(conversation_id, current_user["_id"])
    now = datetime.now(timezone.utc).isoformat()
    await conversations_col.update_one(
        {"_id": conversation_id},
        {
            "$set": {
                f"unread.{current_user['_id']}": 0,
                f"last_read.{current_user['_id']}": now,
            }
        },
    )
    # Tell the other participant(s) so their "Seen" receipt updates in real time.
    for oid in [p for p in conv["participant_ids"] if p != current_user["_id"]]:
        await manager.send_to_user(
            oid,
            {
                "type": "messages_read",
                "conversation_id": conversation_id,
                "reader_id": current_user["_id"],
                "read_at": now,
            },
        )
    return {"ok": True}
