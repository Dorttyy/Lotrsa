"""Free, explicitly opted-in call discovery. Ephemeral presence, no fake users.

Single signaling worker, like rtc_core. For multi-worker hosting replace both
presence and RTC session storage with a shared broker before scaling workers.
"""
import random
import time

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

import rtc_core
from auth_utils import CurrentUser
from db import users_col
from models import user_card
from ws_manager import manager
from practice_filters import PracticeFilters, matches_filters

router = APIRouter(prefix="/rtc/practice", tags=["free practice calls"])
LANGUAGES = set("en es fr de it pt zh ja ko ru ar hi bn tr nl pl sv vi th id el".split())
presence: dict[str, dict] = {}
queue: dict[str, float] = {}


class Availability(BaseModel):
    available: bool
    language: str = Field(min_length=2, max_length=8)
    filters: PracticeFilters = Field(default_factory=PracticeFilters)


class PartnerCall(BaseModel):
    receiver_id: str = Field(min_length=1, max_length=80)


def prune():
    now = time.monotonic()
    for uid, p in list(presence.items()):
        if p["expires"] < now or not manager.is_online(uid):
            presence.pop(uid, None)
            queue.pop(uid, None)
    for uid, expires in list(queue.items()):
        if expires < now:
            queue.pop(uid, None)


def compatible(me: dict, peer: dict, language: str) -> bool:
    if peer.get("banned") or peer.get("restricted"):
        return False
    if peer["_id"] in (me.get("blocked_users") or []):
        return False
    if me["_id"] in (peer.get("blocked_users") or []):
        return False
    entry = presence.get(peer["_id"])
    return bool(entry and (language == "all" or entry["language"] == "all" or entry["language"] == language or
                (peer.get("native_language") == language and
                 entry["language"] == me.get("native_language"))))


@router.put("/availability")
async def availability(body: Availability, me: CurrentUser):
    uid = me["_id"]
    prune()
    if not body.available:
        presence.pop(uid, None)
        queue.pop(uid, None)
        return {"available": False}
    if not me.get("native_language") or body.language not in LANGUAGES | {"all"}:
        raise HTTPException(400, "Choose your profile native and practice languages first.")
    if me.get("restricted"):
        raise HTTPException(403, "Practice calling is unavailable for this account.")
    if not manager.is_online(uid):
        raise HTTPException(409, "Connecting to calls. Please try again in a moment.")
    presence[uid] = {"language": body.language, "filters": body.filters.model_dump(), "expires": time.monotonic() + 40}
    return {"available": True}


@router.get("/partners")
async def partners(me: CurrentUser, language: str, filters: PracticeFilters = Depends()):
    prune()
    ids = list(set(presence) - {me["_id"]})
    result = []
    # UUID _ids are strings, serialized through user_card, never returned raw.
    docs = await users_col.find({"_id": {"$in": ids}}, {"password_hash": 0}).to_list(200)
    for peer in docs:
        if (compatible(me, peer, language) and matches_filters(peer, filters.model_dump(), language)
                and not await rtc_core.busy(peer["_id"])):
            result.append({**user_card(peer), "practice_language": presence[peer["_id"]]["language"]})
    return {"partners": result, "available": me["_id"] in presence}


async def reserve(me: dict, peer: dict, random_match: bool = False):
    uid, pid = me["_id"], peer["_id"]
    if not rtc_core.limiter.allow(f"call:{uid}", *rtc_core.CALL_REQUEST_LIMIT):
        raise HTTPException(429, "Please wait before requesting another call.")
    if await rtc_core.busy(uid):
        raise HTTPException(409, "Leave your current call or voice room before starting another.")
    if await rtc_core.busy(pid):
        raise HTTPException(409, "This partner is no longer available.")
    cid = await rtc_core.create_session(uid, pid)
    rtc_core.session(cid)["practice"] = True
    rtc_core.session(cid)["random_match"] = random_match
    queue.pop(uid, None)
    queue.pop(pid, None)
    return {"state": "matched", "call_id": cid, "partner": user_card(peer), "expires_at": rtc_core.session(cid)["expires_at"]}


@router.post("/call")
async def direct_call(body: PartnerCall, me: CurrentUser):
    async with rtc_core.session_lock:
        prune()
        own = presence.get(me["_id"])
        if not own:
            raise HTTPException(409, "Turn on availability before calling.")
        if body.receiver_id == me["_id"]:
            raise HTTPException(400, "You cannot call yourself.")
        peer = await users_col.find_one({"_id": body.receiver_id}, {"password_hash": 0})
        if not peer or not compatible(me, peer, own["language"]) or not matches_filters(peer, own.get("filters", {}), own["language"]):
            raise HTTPException(409, "This partner is no longer available.")
        return await reserve(me, peer)


@router.post("/queue")
async def random_partner(me: CurrentUser):
    async with rtc_core.session_lock:
        prune()
        uid = me["_id"]
        own = presence.get(uid)
        if not own:
            raise HTTPException(409, "Turn on availability to find a partner.")
        if await rtc_core.busy(uid):
            queue.pop(uid, None)
            return {"state": "incoming"}
        candidates = list(set(queue) - {uid})
        random.shuffle(candidates)
        for pid in candidates:
            peer = await users_col.find_one({"_id": pid}, {"password_hash": 0})
            other = presence.get(pid, {})
            if (peer and compatible(me, peer, own["language"])
                    and matches_filters(peer, own.get("filters", {}), own["language"])
                    and matches_filters(me, other.get("filters", {}), other.get("language", "all"))
                    and not await rtc_core.busy(pid)):
                return await reserve(me, peer, random_match=True)
        queue.setdefault(uid, time.monotonic() + 120)
        return {"state": "searching"}


@router.delete("/queue")
async def cancel_queue(me: CurrentUser):
    async with rtc_core.session_lock:
        queue.pop(me["_id"], None)
        for cid, peer in rtc_core.pending_random_calls(me["_id"]):
            await rtc_core.finish(cid, rtc_core.CANCELLED)
            await manager.broadcast([me["_id"], peer],
                                    {"type": "call_end", "call_id": cid, "from": me["_id"]})
    return {"ok": True}