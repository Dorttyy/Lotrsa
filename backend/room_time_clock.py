"""UTC daily room-time arithmetic. Only server-recorded intervals are counted."""
from datetime import datetime, timedelta, timezone
from typing import Literal

from pydantic import BaseModel

DAILY_SECONDS = 2 * 60 * 60
DISCONNECT_GRACE_SECONDS = 75
Bucket = Literal["host", "listener"]


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def parse_time(value: str) -> datetime:
    result = datetime.fromisoformat(value)
    return result.replace(tzinfo=timezone.utc) if result.tzinfo is None else result.astimezone(timezone.utc)


def day_bounds(now: datetime) -> tuple[datetime, datetime]:
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    return start, start + timedelta(days=1)


def interval_end(row: dict, now: datetime) -> datetime:
    end = min(now, parse_time(row["ended_at"])) if row.get("ended_at") else now
    if row["bucket"] == "listener":
        end = min(end, parse_time(row["last_seen_at"]) + timedelta(seconds=DISCONNECT_GRACE_SECONDS))
    return end


def used_seconds(rows: list[dict], bucket: Bucket, now: datetime, *, free_since: datetime | None = None) -> float:
    start, tomorrow = day_bounds(now)
    total = 0.0
    for row in rows:
        if row["bucket"] != bucket:
            continue
        left = max(start, parse_time(row["started_at"]), free_since or start)
        right = min(tomorrow, interval_end(row, now))
        total += max(0, (right - left).total_seconds())
    return total


class TimeBucket(BaseModel):
    used_seconds: float
    remaining_seconds: float | None
    active_rooms: int
    deadline_at: str | None = None


class RoomTimeAllowance(BaseModel):
    date: str
    timezone: str = "UTC"
    resets_at: str
    server_time: str
    is_unlimited: bool
    limit_seconds: int | None
    host: TimeBucket
    listener: TimeBucket


def allowance_from(rows: list[dict], unlimited: bool, now: datetime, free_since: datetime | None = None) -> RoomTimeAllowance:
    _, tomorrow = day_bounds(now)
    buckets = {}
    for bucket in ("host", "listener"):
        used = used_seconds(rows, bucket, now, free_since=free_since)
        count = sum(1 for r in rows if r["bucket"] == bucket and not r.get("ended_at") and interval_end(r, now) >= now)
        left = None if unlimited else max(0.0, DAILY_SECONDS - used)
        deadline = now + timedelta(seconds=left / count) if left is not None and count else None
        # A new UTC day renews each budget; don't end a room at yesterday's estimate.
        buckets[bucket] = TimeBucket(used_seconds=round(used, 3), remaining_seconds=None if left is None else round(left, 3),
                                    active_rooms=count, deadline_at=deadline.isoformat() if deadline and deadline < tomorrow else None)
    return RoomTimeAllowance(date=now.date().isoformat(), resets_at=tomorrow.isoformat(), server_time=now.isoformat(),
                             is_unlimited=unlimited, limit_seconds=None if unlimited else DAILY_SECONDS, **buckets)