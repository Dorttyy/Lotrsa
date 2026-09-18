"""Shared WebRTC plumbing: ICE server config, signaling rate limits and
authenticated call-session bookkeeping.

Media never touches the server — only signaling does. Call sessions are kept
in memory for fast per-signal validation (ICE candidates arrive in bursts) and
mirrored into MongoDB for call history.
"""

import asyncio
import os
import time
import uuid
from datetime import datetime, timezone
from dotenv import load_dotenv

from db import calls_col, rooms_col

load_dotenv()
session_lock = asyncio.Lock()
RING_TIMEOUT_SECONDS = 45
PRACTICE_MAX_SECONDS = 600
_expiry_tasks: set[asyncio.Task] = set()


def schedule_expiry(call_id: str, *, connecting: bool = False):
    async def expire():
        await asyncio.sleep(30 if connecting else RING_TIMEOUT_SECONDS)
        s = session(call_id)
        if not s or s["status"] != RINGING:
            return
        if not connecting and s.get("accepted"):
            return
        from ws_manager import manager
        status = FAILED if connecting else MISSED
        await finish(call_id, status)
        await manager.broadcast([s["caller"], s["receiver"]], {
            "type": "call_end", "call_id": call_id,
            "reason": "connection_failed" if connecting else "no_answer",
        })
    task = asyncio.create_task(expire())
    _expiry_tasks.add(task)
    task.add_done_callback(_expiry_tasks.discard)

# --------------------------------------------------------------------------- #
# ICE configuration (STUN + TURN) — always sourced from the environment so no
# TURN credential is ever hardcoded in the client bundle.
# --------------------------------------------------------------------------- #
DEFAULT_STUN = "stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302"


def ice_servers() -> list[dict]:
    servers: list[dict] = []
    stun = os.environ.get("WEBRTC_STUN_SERVERS", DEFAULT_STUN)
    for url in [u.strip() for u in stun.split(",") if u.strip()]:
        servers.append({"urls": url})
    turn = os.environ.get("WEBRTC_TURN_SERVER", "")
    turn_urls = [u.strip() for u in turn.split(",") if u.strip()]
    if turn_urls:
        servers.append(
            {
                "urls": turn_urls,
                "username": os.environ.get("WEBRTC_TURN_USERNAME", ""),
                "credential": os.environ.get("WEBRTC_TURN_CREDENTIAL", ""),
            }
        )
    return servers


# --------------------------------------------------------------------------- #
# Rate limiting (sliding window, per user + action)
# --------------------------------------------------------------------------- #
class RateLimiter:
    def __init__(self) -> None:
        self._hits: dict[str, list[float]] = {}

    def allow(self, key: str, limit: int, window: float) -> bool:
        now = time.monotonic()
        hits = [t for t in self._hits.get(key, []) if now - t < window]
        if len(hits) >= limit:
            self._hits[key] = hits
            return False
        hits.append(now)
        self._hits[key] = hits
        return True


limiter = RateLimiter()

# Limits: call requests, signaling messages, room create/join.
CALL_REQUEST_LIMIT = (10, 60.0)
SIGNAL_LIMIT = (400, 10.0)
ROOM_ACTION_LIMIT = (20, 60.0)


# --------------------------------------------------------------------------- #
# Call sessions
# --------------------------------------------------------------------------- #
RINGING = "RINGING"
CONNECTED = "CONNECTED"
COMPLETED = "COMPLETED"
MISSED = "MISSED"
REJECTED = "REJECTED"
CANCELLED = "CANCELLED"
FAILED = "FAILED"

TERMINAL = {COMPLETED, MISSED, REJECTED, CANCELLED, FAILED}

# call_id -> {caller, receiver, status, created_at, connected_at}
_sessions: dict[str, dict] = {}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def create_session(caller_id: str, receiver_id: str, *, practice: bool = False) -> str:
    call_id = str(uuid.uuid4())
    _sessions[call_id] = {
        "caller": caller_id,
        "practice": practice,
        "receiver": receiver_id,
        "status": RINGING,
        "created": time.monotonic(),
        "connected_at": None,
        "accepted": False,
        "media_ready": set(),
        "caption_consent": {},
        "expires_at": int((time.time() + RING_TIMEOUT_SECONDS) * 1000),
    }
    if not practice:
        await calls_col.insert_one(
        {
            "_id": call_id,
            "caller_id": caller_id,
            "receiver_id": receiver_id,
            "kind": "AUDIO",
            "status": RINGING,
            "started_at": _now_iso(),
            "connected_at": None,
            "ended_at": None,
            "duration_ms": None,
        }
    )
    _prune()
    schedule_expiry(call_id)
    return call_id


def _prune() -> None:
    """Drop sessions older than 2h so the in-memory map can't grow unbounded."""
    cutoff = time.monotonic() - 7200
    for cid, s in list(_sessions.items()):
        if s["created"] < cutoff:
            _sessions.pop(cid, None)


def session(call_id: str) -> dict | None:
    return _sessions.get(call_id)


def pending_offers(user_id: str) -> list[dict]:
    now = time.time() * 1000
    return [{**s["offer"], "queued_ice": s.get("early_ice", [])} for s in _sessions.values()
            if s["receiver"] == user_id and s["status"] == RINGING and not s.get("accepted")
            and s.get("expires_at", 0) > now and s.get("offer")]


async def push_call_once(call_id: str):
    s = session(call_id)
    if not s or not s.get("offer") or s.get("push_attempted"):
        return
    s["push_attempted"] = True
    try:
        from routes.push import send_push
        await send_push([s["receiver"]], {
            "title": "Incoming audio call", "message": "Someone is calling you. Open the app to answer.",
            "action_url": f"/incoming-call?call_id={call_id}",
        }, idempotency_key=f"call:{call_id}")
    except Exception:
        import logging
        logging.getLogger(__name__).warning("Incoming call push unavailable; live signaling remains active.")


def pending_random_calls(user_id: str) -> list[tuple[str, str]]:
    return [(cid, s["receiver"] if user_id == s["caller"] else s["caller"])
            for cid, s in _sessions.items()
            if s["status"] == RINGING and not s.get("accepted") and s.get("random_match")
            and user_id in (s["caller"], s["receiver"])]


async def busy(user_id: str) -> bool:
    """Release abandoned ringing reservations; never match a live call twice."""
    for cid, s in list(_sessions.items()):
        if s["status"] == RINGING and time.monotonic() - s["created"] > 60:
            await finish(cid, MISSED)
        if s["status"] not in TERMINAL and user_id in (s["caller"], s["receiver"]):
            return True
    return bool(await rooms_col.find_one(
        {"is_live": True, f"members.{user_id}": {"$exists": True}}, {"_id": 1}
    ))


async def media_ready(call_id: str, user_id: str) -> None:
    s = session(call_id)
    if not s or s["status"] in TERMINAL or not s.get("accepted"):
        return
    s["media_ready"].add(user_id)
    if len(s["media_ready"]) == 2:
        await mark_connected(call_id)


def is_participant(call_id: str, user_id: str, target_id: str) -> bool:
    """The signal is only relayed when both ends are the two authenticated
    participants of a live (non-terminal) session."""
    s = _sessions.get(call_id)
    if not s or s["status"] in TERMINAL:
        return False
    pair = {s["caller"], s["receiver"]}
    return user_id in pair and target_id in pair and user_id != target_id


async def mark_connected(call_id: str) -> None:
    s = _sessions.get(call_id)
    if not s or s["status"] != RINGING:
        return
    s["status"] = CONNECTED
    s["connected_at"] = time.monotonic()
    if s.get("practice"):
        s["ends_at"] = int((time.time() + PRACTICE_MAX_SECONDS) * 1000)
        from ws_manager import manager
        await manager.broadcast([s["caller"], s["receiver"]], {
            "type": "call_connected", "call_id": call_id, "ends_at": s["ends_at"],
        })
        task = asyncio.create_task(expire_practice(call_id))
        _expiry_tasks.add(task)
        task.add_done_callback(_expiry_tasks.discard)
        return
    await calls_col.update_one(
        {"_id": call_id},
        {"$set": {"status": CONNECTED, "connected_at": _now_iso()}},
    )


async def finish(call_id: str, status: str | None = None) -> None:
    """Close out a session. When `status` is omitted it is derived from whether
    the call ever connected (COMPLETED vs MISSED)."""
    s = _sessions.get(call_id)
    if not s or s["status"] in TERMINAL:
        return
    connected_at = s.get("connected_at")
    final = status or (COMPLETED if connected_at else MISSED)
    duration_ms = int((time.monotonic() - connected_at) * 1000) if connected_at else None
    s["status"] = final
    s.pop("offer", None)
    s.pop("early_ice", None)
    if s.get("practice"):
        # Discovery calls are ephemeral: no calls document, chat message,
        # notification or persistent call history. Release all metadata now.
        _sessions.pop(call_id, None)
        return
    await calls_col.update_one(
        {"_id": call_id},
        {
            "$set": {
                "status": final,
                "ended_at": _now_iso(),
                "duration_ms": duration_ms,
            }
        },
    )


async def expire_practice(call_id: str):
    await asyncio.sleep(PRACTICE_MAX_SECONDS)
    s = session(call_id)
    if not s or s["status"] != CONNECTED or not s.get("practice"):
        return
    from ws_manager import manager
    await finish(call_id, COMPLETED)
    await manager.broadcast([s["caller"], s["receiver"]], {
        "type": "call_end", "call_id": call_id, "reason": "duration_limit",
    })


# --------------------------------------------------------------------------- #
# Voice-room membership validation (cached — ICE arrives in bursts)
# --------------------------------------------------------------------------- #
_room_cache: dict[str, tuple[float, set[str]]] = {}
ROOM_CACHE_TTL = 5.0


async def room_members(room_id: str) -> set[str]:
    cached = _room_cache.get(room_id)
    now = time.monotonic()
    if cached and now - cached[0] < ROOM_CACHE_TTL:
        return cached[1]
    doc = await rooms_col.find_one({"_id": room_id}, {"members": 1, "is_live": 1})
    ids: set[str] = set()
    if doc and doc.get("is_live", True):
        ids = set((doc.get("members") or {}).keys())
    _room_cache[room_id] = (now, ids)
    return ids


async def both_in_room(room_id: str, a: str, b: str) -> bool:
    ids = await room_members(room_id)
    return a in ids and b in ids


def invalidate_room(room_id: str) -> None:
    """Drop the membership cache so a fresh join can signal immediately."""
    _room_cache.pop(room_id, None)
