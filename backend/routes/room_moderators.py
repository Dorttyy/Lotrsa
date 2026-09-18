"""Moderator is a permission, never room ownership or automatic stage placement."""
import time
import uuid

from fastapi import APIRouter, HTTPException

from auth_utils import CurrentUser
from db import rooms_col
from models import RoomUserAction, user_card
from routes.rooms import broadcast_room, get_live_room
from routes.room_stage import InvitationResponse
from ws_manager import manager
from room_permissions import can_manage

router = APIRouter(prefix="/rooms", tags=["room moderators"])


@router.post("/{room_id}/moderators/invite")
async def invite_moderator(room_id: str, body: RoomUserAction, me: CurrentUser):
    doc = await get_live_room(room_id)
    if doc["host_id"] != me["_id"]:
        raise HTTPException(403, "Only the owner can appoint moderators.")
    member = doc["members"].get(body.user_id)
    if not member or body.user_id == doc["host_id"] or body.user_id in doc.get("moderators", []):
        raise HTTPException(409, "Choose a room member who is not already a moderator.")
    if (member.get("moderator_invite") or {}).get("expires_at", 0) > time.time() * 1000:
        raise HTTPException(409, "This member already has an invitation.")
    invite = {"id": str(uuid.uuid4()), "from": me["_id"], "expires_at": int((time.time() + 60) * 1000)}
    result = await rooms_col.update_one({"_id": room_id, "is_live": True, "host_id": me["_id"], f"members.{body.user_id}": {"$exists": True}, "moderators": {"$ne": body.user_id}}, {"$set": {f"members.{body.user_id}.moderator_invite": invite}})
    if not result.matched_count:
        raise HTTPException(409, "Room membership changed. Please try again.")
    await broadcast_room(await get_live_room(room_id))
    await manager.send_to_user(body.user_id, {"type": "room_moderator_invite", "room_id": room_id, "invitation": invite, "host": user_card(me)})
    return {"ok": True}


@router.get("/{room_id}/moderators/invitation")
async def my_invitation(room_id: str, me: CurrentUser):
    doc = await get_live_room(room_id)
    member = doc["members"].get(me["_id"])
    if not member:
        raise HTTPException(403, "Join the room first.")
    invite = member.get("moderator_invite") or {}
    valid = invite.get("from") == doc["host_id"] and invite.get("expires_at", 0) > time.time() * 1000 and me["_id"] not in doc.get("moderators", [])
    return {"invitation": invite if valid else None}


@router.post("/{room_id}/moderators/respond")
async def respond(room_id: str, body: InvitationResponse, me: CurrentUser):
    doc = await get_live_room(room_id)
    uid = me["_id"]
    member = doc["members"].get(uid)
    if not member:
        raise HTTPException(403, "Join the room first.")
    invite = member.get("moderator_invite") or {}
    if invite.get("id") != body.invitation_id or invite.get("from") != doc["host_id"] or invite.get("expires_at", 0) <= time.time() * 1000:
        raise HTTPException(409, "This moderator invitation has expired or was withdrawn.")
    fields = {"$unset": {f"members.{uid}.moderator_invite": ""}}
    if body.accept:
        fields["$addToSet"] = {"moderators": uid}
    result = await rooms_col.update_one({"_id": room_id, "is_live": True, "host_id": invite["from"], f"members.{uid}.moderator_invite.id": body.invitation_id}, fields)
    if not result.matched_count:
        raise HTTPException(409, "This invitation is no longer available.")
    await broadcast_room(await get_live_room(room_id))
    managers = [member_id for member_id in doc["members"] if can_manage(doc, member_id)]
    await manager.broadcast(managers, {"type": "room_invitation_result", "room_id": room_id,
        "kind": "moderator", "accepted": body.accept, "user_id": uid, "name": me.get("name", "Member")})
    return {"ok": True, "accepted": body.accept}


@router.post("/{room_id}/moderators/remove")
async def remove(room_id: str, body: RoomUserAction, me: CurrentUser):
    doc = await get_live_room(room_id)
    if doc["host_id"] != me["_id"]:
        raise HTTPException(403, "Only the owner can remove moderators.")
    await rooms_col.update_one({"_id": room_id, "is_live": True, "host_id": me["_id"]}, {
        "$pull": {"moderators": body.user_id}, "$unset": {f"members.{body.user_id}.moderator_invite": ""}})
    await broadcast_room(await get_live_room(room_id))
    return {"ok": True}