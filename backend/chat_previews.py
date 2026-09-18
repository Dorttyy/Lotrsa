"""Typed inbox previews without changing stored message text or history."""

from pydantic import BaseModel

from db import messages_col


class MessagePreview(BaseModel):
    text: str
    sender_id: str | None
    created_at: str
    type: str = "text"
    call_status: str | None = None
    duration_ms: int | None = None
    room_id: str | None = None


def message_preview(message: dict, text: str | None = None) -> dict:
    """Explicit fields only: never copy a Mongo document into the response."""
    return MessagePreview(
        text=message.get("text", "") if text is None else text,
        sender_id=message.get("sender_id"),
        created_at=message["created_at"],
        type=message.get("type", "text"),
        call_status=message.get("call_status"),
        duration_ms=message.get("duration_ms"),
        room_id=message.get("room_id"),
    ).model_dump(exclude_none=True)


async def hydrate_legacy_previews(conversations: list[dict]) -> None:
    """Enrich old snapshots in ONE query, without backfills or guessing from emoji.

    Match the snapshot's exact timestamp/sender; don't resurrect cleared history
    or substitute some unrelated message after a recall. Only in-memory response
    documents are changed, never the saved conversation or message.
    """
    legacy = [c for c in conversations if c.get("last_message")
              and not c["last_message"].get("type")]
    if not legacy:
        return
    matches = [{"conversation_id": c["_id"],
                "created_at": c["last_message"].get("created_at"),
                "sender_id": c["last_message"].get("sender_id")} for c in legacy]
    cursor = messages_col.find({"$or": matches}, {
        "_id": 0, "conversation_id": 1, "created_at": 1, "sender_id": 1,
        "text": 1, "type": 1, "call_status": 1, "duration_ms": 1, "room_id": 1,
    })
    by_snapshot = {(m["conversation_id"], m["created_at"], m.get("sender_id")): m
                   async for m in cursor}
    for conversation in legacy:
        snapshot = conversation["last_message"]
        message = by_snapshot.get((conversation["_id"], snapshot.get("created_at"),
                                   snapshot.get("sender_id")))
        if message:
            conversation["last_message"] = message_preview(message, snapshot.get("text", ""))