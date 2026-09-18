"""Consensual, participant-only, per-listener native-language captions."""
import uuid

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

import caption_engine
import rtc_core
from auth_utils import CurrentUser
from db import users_col
from ws_manager import manager

router = APIRouter(prefix="/rtc/calls", tags=["local call captions"])


class Consent(BaseModel):
    enabled: bool


def member(call_id, uid):
    s = rtc_core.session(call_id)
    if not s or s["status"] in rtc_core.TERMINAL:
        raise HTTPException(404, "Call has ended.")
    if uid not in (s["caller"], s["receiver"]):
        raise HTTPException(403, "Not a participant of this call.")
    return s


def allowed(s):
    return (s["status"] == rtc_core.CONNECTED and
            all(s["caption_consent"].get(uid) for uid in (s["caller"], s["receiver"])))


@router.get("/{call_id}/captions")
async def caption_status(call_id: str, me: CurrentUser):
    s = member(call_id, me["_id"])
    target = me.get("native_language")
    return {"consented": bool(s["caption_consent"].get(me["_id"])),
            "active": allowed(s), "target_language": target,
            "available": caption_engine.ready() and target in caption_engine.SUPPORTED,
            "supported_languages": sorted(caption_engine.SUPPORTED)}


@router.put("/{call_id}/captions")
async def caption_consent(call_id: str, body: Consent, me: CurrentUser):
    s = member(call_id, me["_id"])
    if body.enabled and (not caption_engine.ready() or me.get("native_language") not in caption_engine.SUPPORTED):
        raise HTTPException(503, "Local captions are not available for your profile language yet.")
    s["caption_consent"][me["_id"]] = body.enabled
    s["caption_version"] = s.get("caption_version", 0) + 1
    await manager.broadcast([s["caller"], s["receiver"]],
                            {"type": "caption_consent", "call_id": call_id, "active": allowed(s)})
    return {"consented": body.enabled, "active": allowed(s)}


@router.post("/{call_id}/audio")
async def audio_chunk(call_id: str, request: Request, me: CurrentUser):
    uid = me["_id"]
    s = member(call_id, uid)
    if not allowed(s):
        raise HTTPException(403, "Both participants must consent in a connected call.")
    if not rtc_core.limiter.allow(f"caption:{uid}", 20, 60):
        raise HTTPException(429, "Caption audio is arriving too quickly.")
    if request.headers.get("content-type", "").split(";")[0] != "application/octet-stream":
        raise HTTPException(415, "Send mono PCM16 at 16000 Hz.")
    pcm = bytearray()
    async for part in request.stream():
        pcm.extend(part)
        if len(pcm) > 16000 * 2 * 6:
            raise HTTPException(413, "Audio segment exceeds six seconds.")
    if len(pcm) < 3200 or len(pcm) % 2:
        raise HTTPException(422, "Invalid PCM audio segment.")
    # Only IDs/native_language projected, with _id explicitly omitted after aliasing.
    docs = await users_col.find({"_id": {"$in": [s["caller"], s["receiver"]]}},
                                {"native_language": 1}).to_list(2)
    targets = {str(d["_id"]): d.get("native_language") for d in docs}
    if any(t not in caption_engine.SUPPORTED for t in targets.values()) or len(targets) != 2:
        raise HTTPException(422, "A participant's native language is not supported.")
    version = s.get("caption_version", 0)
    result = await caption_engine.infer(bytes(pcm), list(targets.values()))
    pcm.clear()
    if result and allowed(s) and s.get("caption_version", 0) == version:
        segment_id = str(uuid.uuid4())
        for listener, target in targets.items():
            if not allowed(s) or s.get("caption_version", 0) != version:
                break
            await manager.send_to_user(listener, {
                "type": "call_caption", "call_id": call_id, "id": segment_id,
                "speaker_id": uid, "target_language": target,
                "source_language": result["source_language"],
                "original": result["original"], "text": result["translations"][target],
            })
    return {"ok": True, "speech_detected": bool(result)}