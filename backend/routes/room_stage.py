"""Consensual stage invitations and host moderation; atomic membership guards."""
import time
import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from auth_utils import CurrentUser
from db import rooms_col
from models import RoomUserAction, user_card
from routes.rooms import broadcast_room, get_live_room
from ws_manager import manager
from room_permissions import can_manage, require_manager, manager_query, protect_member

router = APIRouter(prefix="/rooms", tags=["room stage"])


class InvitationResponse(BaseModel):
    invitation_id: str
    accept: bool


async def updated(room_id, query, fields):
    result = await rooms_col.update_one({"_id": room_id, "is_live": True, **query}, fields)
    if not result.matched_count:
        raise HTTPException(409, "The room or member changed. Please try again.")
    await broadcast_room(await get_live_room(room_id))


@router.post("/{room_id}/stage/invite")
async def invite_to_stage(room_id: str, body: RoomUserAction, me: CurrentUser):
    doc = await get_live_room(room_id)
    require_manager(doc, me["_id"])
    protect_member(doc, me["_id"], body.user_id)
    member = doc["members"].get(body.user_id)
    if not member or member["role"] != "listener":
        raise HTTPException(409, "Choose a member in the audience.")
    existing = member.get("stage_invite") or {}
    if existing.get("expires_at", 0) > time.time() * 1000 and existing.get("from") == me["_id"]:
        raise HTTPException(409, "This member already has a pending invitation.")
    invitation = {"id": str(uuid.uuid4()), "from": me["_id"], "expires_at": int((time.time() + 60) * 1000)}
    await updated(room_id, {**manager_query(me["_id"]), f"members.{body.user_id}.role": "listener"},
                  {"$set": {f"members.{body.user_id}.stage_invite": invitation}})
    await manager.send_to_user(body.user_id, {"type": "room_stage_invite", "room_id": room_id,
                                             "invitation": invitation, "host": user_card(me)})
    return {"ok": True}


@router.get("/{room_id}/stage/invitation")
async def current_invitation(room_id: str, me: CurrentUser):
    doc = await get_live_room(room_id)
    member = doc["members"].get(me["_id"])
    if not member:
        raise HTTPException(403, "Join this room first.")
    invite = member.get("stage_invite")
    if not invite or member["role"] != "listener" or not can_manage(doc, invite["from"]) or invite["expires_at"] <= time.time() * 1000:
        return {"invitation": None}
    return {"invitation": invite}


@router.post("/{room_id}/stage/respond")
async def respond_to_invitation(room_id: str, body: InvitationResponse, me: CurrentUser):
    doc = await get_live_room(room_id)
    uid = me["_id"]
    member = doc["members"].get(uid)
    if not member:
        raise HTTPException(403, "Join this room first.")
    invite = member.get("stage_invite") or {}
    if (member["role"] != "listener" or invite.get("id") != body.invitation_id
            or not can_manage(doc, invite.get("from")) or invite.get("expires_at", 0) <= time.time() * 1000):
        raise HTTPException(409, "This invitation is no longer available.")
    fields = {"$unset": {f"members.{uid}.stage_invite": ""}}
    if body.accept:
        fields["$set"] = {f"members.{uid}.role": "speaker", f"members.{uid}.mic_on": True,
                          f"members.{uid}.hand_raised": False}
    await updated(room_id, {**manager_query(invite["from"]), f"members.{uid}.role": "listener",
                           f"members.{uid}.stage_invite.id": body.invitation_id}, fields)
    managers = [uid for uid in doc["members"] if can_manage(doc, uid)]
    await manager.broadcast(managers, {"type": "room_invitation_result", "room_id": room_id,
        "kind": "stage", "accepted": body.accept, "user_id": uid, "name": me.get("name", "Member")})
    return {"ok": True, "accepted": body.accept}


@router.post("/{room_id}/stage/leave")
async def leave_stage(room_id: str, me: CurrentUser):
    doc = await get_live_room(room_id)
    uid = me["_id"]
    if uid == doc["host_id"]:
        raise HTTPException(400, "The host must transfer hosting or end the room.")
    await updated(room_id, {f"members.{uid}.role": "speaker"}, {"$set": {
        f"members.{uid}.role": "listener", f"members.{uid}.mic_on": False,
        f"members.{uid}.hand_raised": False}, "$unset": {f"members.{uid}.stage_invite": ""}})
    return {"ok": True}


@router.post("/{room_id}/stage/mute")
async def host_mute(room_id: str, body: RoomUserAction, me: CurrentUser):
    doc = await get_live_room(room_id)
    require_manager(doc, me["_id"])
    protect_member(doc, me["_id"], body.user_id)
    if body.user_id == me["_id"]:
        raise HTTPException(400, "Use your microphone control.")
    # Host can mute, never remotely force someone else's microphone on.
    await updated(room_id, {**manager_query(me["_id"]), f"members.{body.user_id}.role": "speaker"},
                  {"$set": {f"members.{body.user_id}.mic_on": False}})
    await manager.send_to_user(body.user_id, {"type": "room_host_muted", "room_id": room_id})
    return {"ok": True}