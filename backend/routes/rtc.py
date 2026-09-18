"""WebRTC support endpoints: ICE configuration + authenticated call sessions.

The client never invents a callId: it asks the server to open a session, the
server authorizes the pair (block list / ban / self-call / rate limit) and every
subsequent signaling frame is validated against that session.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

import rtc_core
from auth_utils import CurrentUser
from db import users_col
from models import user_card
from ws_manager import manager

router = APIRouter(prefix="/rtc", tags=["rtc"])


class CallStart(BaseModel):
    receiver_id: str


class CallStatusUpdate(BaseModel):
    status: str


@router.get("/config")
async def rtc_config(current_user: CurrentUser):
    """ICE servers (STUN + TURN) for the authenticated client."""
    return {"iceServers": rtc_core.ice_servers()}


@router.post("/calls", status_code=201)
async def start_call(body: CallStart, current_user: CurrentUser):
    caller_id = current_user["_id"]
    if body.receiver_id == caller_id:
        raise HTTPException(status_code=400, detail="You can't call yourself.")
    if not rtc_core.limiter.allow(
        f"call:{caller_id}", *rtc_core.CALL_REQUEST_LIMIT
    ):
        raise HTTPException(
            status_code=429, detail="Too many call attempts. Please wait a moment."
        )
    receiver = await users_col.find_one({"_id": body.receiver_id})
    if not receiver:
        raise HTTPException(status_code=404, detail="User not found")
    if receiver.get("banned"):
        raise HTTPException(status_code=403, detail="This user is unavailable.")
    if caller_id in set(receiver.get("blocked_users") or []):
        raise HTTPException(status_code=403, detail="You can't call this user.")
    if body.receiver_id in set(current_user.get("blocked_users") or []):
        raise HTTPException(
            status_code=403, detail="Unblock this user to start a call."
        )
    async with rtc_core.session_lock:
        if await rtc_core.busy(caller_id) or await rtc_core.busy(body.receiver_id):
            raise HTTPException(409, "One of you is already in a call or voice room.")
        call_id = await rtc_core.create_session(caller_id, body.receiver_id)
    return {
        "call_id": call_id,
        "expires_at": rtc_core.session(call_id)["expires_at"],
        "receiver_online": manager.is_online(body.receiver_id),
        "receiver": user_card(receiver),
        "iceServers": rtc_core.ice_servers(),
    }


@router.post("/calls/{call_id}/status")
async def update_call_status(
    call_id: str, body: CallStatusUpdate, current_user: CurrentUser
):
    """Finalize a call session (COMPLETED / MISSED / REJECTED / CANCELLED /
    FAILED). Only the two participants may write to it."""
    s = rtc_core.session(call_id)
    if not s:
        raise HTTPException(status_code=404, detail="Call session not found")
    if current_user["_id"] not in (s["caller"], s["receiver"]):
        raise HTTPException(status_code=403, detail="Not a participant of this call")
    status_val = body.status.upper()
    if status_val not in rtc_core.TERMINAL:
        raise HTTPException(status_code=400, detail="Invalid call status")
    await rtc_core.finish(call_id, status_val)
    peer = s["receiver"] if current_user["_id"] == s["caller"] else s["caller"]
    await manager.send_to_user(peer, {"type": "call_end", "call_id": call_id,
                                      "from": current_user["_id"]})
    return {"ok": True, "status": status_val}
