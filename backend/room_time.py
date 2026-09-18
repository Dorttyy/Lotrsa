"""Persistent, idempotent room-time ledger; enforcement runs without client timers.

The app's room/signaling worker is single-process. Lifecycle endpoints and the
watchdog share a lock; partial unique Mongo indexes protect duplicate intervals.
Open owned rooms consume hosting time even while their owner is away. Non-host
members (listeners, speakers and moderators) consume the separate listener pool.
"""
import asyncio
import logging
import uuid
from functools import wraps

from fastapi import HTTPException

from db import db, rooms_col, users_col
from models import _vip_active
from room_time_clock import (Bucket, DAILY_SECONDS, RoomTimeAllowance, allowance_from,
                             day_bounds, interval_end, parse_time, utcnow)
from ws_manager import manager
import rtc_core

ledger = db["room_time_intervals"]
warnings = db["room_time_warnings"]
lock = asyncio.Lock()
log = logging.getLogger(__name__)


def serialized(function):
    @wraps(function)
    async def wrapped(*args, **kwargs):
        async with lock:
            return await function(*args, **kwargs)
    return wrapped


async def initialize():
    await ledger.create_index([("user_id", 1), ("started_at", 1), ("ended_at", 1)])
    await ledger.create_index([("room_id", 1), ("user_id", 1), ("bucket", 1)], unique=True,
                              partialFilterExpression={"ended_at": None}, name="one_open_room_time_interval")
    await ledger.create_index("ended_at")
    # Existing rooms start under the new policy now, never retroactively.
    async for room in rooms_col.find({"is_live": True}):
        await register_room(room)


async def begin(room_id: str, user_id: str, bucket: Bucket, started_at: str | None = None):
    now = utcnow().isoformat()
    await ledger.update_one({"room_id": room_id, "user_id": user_id, "bucket": bucket, "ended_at": None},
                            {"$setOnInsert": {"_id": str(uuid.uuid4()), "started_at": started_at or now, "last_seen_at": now}}, upsert=True)


async def register_room(room: dict):
    await begin(room["_id"], room["host_id"], "host", room.get("time_tracking_started_at"))
    for uid, member in room.get("members", {}).items():
        if uid != room["host_id"]:
            await begin(room["_id"], uid, "listener", member.get("joined_at"))


async def finish_intervals(query: dict, at=None):
    now = at or utcnow()
    async for row in ledger.find({**query, "ended_at": None}):
        end = max(parse_time(row["started_at"]), interval_end(row, now))
        await ledger.update_one({"_id": row["_id"], "ended_at": None}, {"$set": {"ended_at": end.isoformat()}})


async def allowance(user: dict, now=None) -> RoomTimeAllowance:
    now = now or utcnow()
    midnight, tomorrow = day_bounds(now)
    rows = await ledger.find({"user_id": user["_id"], "started_at": {"$lt": tomorrow.isoformat()},
                              "$or": [{"ended_at": None}, {"ended_at": {"$gt": midnight.isoformat()}}]},
                             {"_id": 0}).to_list(None)
    # Expired VIP time does not consume the newly free account's allowance.
    free_since = None
    if user.get("is_vip") and user.get("vip_expires_at"):
        free_since = parse_time(user["vip_expires_at"])
    return allowance_from(rows, _vip_active(user), now, free_since)


async def require_time(user: dict, bucket: Bucket):
    await enforce_user(user)
    value = await allowance(user)
    if not value.is_unlimited and getattr(value, bucket).remaining_seconds <= 0:
        label = "hosting" if bucket == "host" else "listening/speaking"
        raise HTTPException(403, f"Your daily 2-hour {label} allowance is used up. It resets at 00:00 UTC.")


async def close_room(room_id: str, reason: str | None = None, message: str | None = None):
    room = await rooms_col.find_one({"_id": room_id, "is_live": True})
    if not room:
        await finish_intervals({"room_id": room_id})
        return
    await rooms_col.update_one({"_id": room_id, "is_live": True}, {"$set": {"is_live": False}})
    await finish_intervals({"room_id": room_id})
    rtc_core.invalidate_room(room_id)
    await manager.broadcast(list(set(room.get("members", {})) | {room["host_id"]}),
                            {"type": "room_ended", "room_id": room_id, "reason": reason, "message": message})


async def remove_member(room_id: str, uid: str, reason: str | None = None, message: str | None = None):
    room = await rooms_col.find_one({"_id": room_id, "is_live": True, f"members.{uid}": {"$exists": True}})
    await finish_intervals({"room_id": room_id, "user_id": uid, "bucket": "listener"})
    if not room:
        return
    await rooms_col.update_one({"_id": room_id}, {"$unset": {f"members.{uid}": ""}})
    room["members"].pop(uid, None)
    await manager.send_to_user(uid, {"type": "room_left", "room_id": room_id, "reason": reason, "message": message})
    if not room["members"]:
        await close_room(room_id)
    else:
        from routes.rooms import broadcast_room
        await broadcast_room(room)


async def leave_other_rooms(uid: str, target_room: str):
    async for room in rooms_col.find({"_id": {"$ne": target_room}, "is_live": True, f"members.{uid}": {"$exists": True}}, {"_id": 1}):
        await remove_member(room["_id"], uid, reason="switched")


async def enforce_user(user: dict):
    value = await allowance(user)
    if value.is_unlimited:
        return
    for bucket in ("host", "listener"):
        budget = getattr(value, bucket)
        active = await ledger.find({"user_id": user["_id"], "bucket": bucket, "ended_at": None}, {"_id": 0, "room_id": 1}).to_list(None)
        if budget.remaining_seconds <= 0:
            for row in active:
                if bucket == "host":
                    await close_room(row["room_id"], "daily_host_limit", "The host's daily 2-hour hosting allowance is used up. This Voiceroom has ended.")
                else:
                    await remove_member(row["room_id"], user["_id"], "daily_listener_limit", "Your daily 2-hour listening/speaking allowance is used up. It resets at 00:00 UTC.")
        elif active and budget.remaining_seconds <= 1800 and manager.is_online(user["_id"]):
            # Warn only while physically a member of a relevant live room, not
            # on the lobby or just because an owned room remains open elsewhere.
            eligible = await rooms_col.find({"_id": {"$in": [row["room_id"] for row in active]},
                "is_live": True, f"members.{user['_id']}": {"$exists": True}}, {"_id": 1}).to_list(None)
            if not eligible:
                continue
            key = f"{value.date}:{user['_id']}:{bucket}:30min"
            result = await warnings.update_one({"_id": key}, {"$setOnInsert": {"created_at": value.server_time}}, upsert=True)
            if result.upserted_id:
                label = "hosting" if bucket == "host" else "listening/speaking"
                await manager.send_to_user(user["_id"], {"type": "room_time_warning", "bucket": bucket,
                    "room_ids": [room["_id"] for room in eligible],
                    "message": f"Less than 30 minutes of today's free {label} time remain."})


async def heartbeat(room: dict, user: dict):
    uid = user["_id"]
    if uid not in room.get("members", {}):
        raise HTTPException(403, "You are no longer in this Voiceroom.")
    await register_room(room)
    await enforce_user(user)
    if uid != room["host_id"]:
        await ledger.update_one({"room_id": room["_id"], "user_id": uid, "bucket": "listener", "ended_at": None},
                                {"$set": {"last_seen_at": utcnow().isoformat()}})
    # The owner can reach their cap while away from their still-open room.
    owner = await users_col.find_one({"_id": room["host_id"]})
    if owner and uid != owner["_id"]:
        await enforce_user(owner)
    return await allowance(user)


async def sweep():
    now = utcnow()
    active = await ledger.find({"ended_at": None}).to_list(None)
    # Preserve actual background audio while its authenticated socket is alive.
    online = {r["user_id"] for r in active if r["bucket"] == "listener" and manager.is_online(r["user_id"])}
    if online:
        await ledger.update_many({"ended_at": None, "bucket": "listener", "user_id": {"$in": list(online)}},
                                 {"$set": {"last_seen_at": now.isoformat()}})
    for row in active:
        room = await rooms_col.find_one({"_id": row["room_id"], "is_live": True}, {"_id": 0, "members": 1})
        if not room:
            await finish_intervals({"room_id": row["room_id"]})
        elif row["bucket"] == "listener" and row["user_id"] not in online and interval_end(row, now) < now:
            await remove_member(row["room_id"], row["user_id"], "disconnected", "The room connection was lost. You can rejoin with your remaining daily time.")
    ids = list({row["user_id"] for row in active})
    async for user in users_col.find({"_id": {"$in": ids}}):
        await enforce_user(user)


async def watchdog():
    while True:
        try:
            async with lock:
                await sweep()
        except Exception:
            log.exception("Room-time enforcement will retry")
        await asyncio.sleep(1)