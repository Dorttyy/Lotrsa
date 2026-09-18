import os
from typing import Literal

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from auth_utils import CurrentUser

load_dotenv()

PUSH_BASE_URL = "https://integrations.emergentagent.com"
PUSH_KEY = os.environ.get("EMERGENT_PUSH_KEY", "placeholder")

_client = httpx.AsyncClient(
    base_url=PUSH_BASE_URL,
    headers={"X-Push-Key": PUSH_KEY},
    timeout=10.0,
)

router = APIRouter(tags=["push"])


class RegisterPushBody(BaseModel):
    user_id: str
    platform: Literal["android", "ios"]
    device_token: str = Field(min_length=10, max_length=4096)


@router.post("/register-push", status_code=201)
async def register_push(body: RegisterPushBody, current_user: CurrentUser):
    # Always register against the authenticated user, never a spoofed id.
    payload = body.model_dump()
    payload["user_id"] = current_user["_id"]
    if not PUSH_KEY or PUSH_KEY == "placeholder":
        raise HTTPException(503, "Push delivery is awaiting the native build's server credentials.")
    try:
        resp = await _client.post("/api/v1/push/users/register", json=payload)
    except httpx.RequestError:
        raise HTTPException(503, "Notification registration is temporarily unavailable.")
    if resp.status_code == 401:
        raise HTTPException(status_code=500, detail="EMERGENT_PUSH_KEY missing or invalid")
    if resp.status_code >= 500:
        raise HTTPException(status_code=502, detail="Push provider unavailable")
    if resp.status_code >= 400:
        raise HTTPException(502, "Notification registration was not accepted.")
    return {"status": "registered"}


async def send_push(
    recipients: list[str],
    data: dict,
    idempotency_key: str | None = None,
) -> None:
    """Relay a push to one or more user ids via the Emergent push service.
    Callers MUST wrap this in try/except — a push failure must never block
    the primary operation (sending a message, following a user, etc.)."""
    if not recipients:
        return
    recipients = list(dict.fromkeys(recipients))
    if not PUSH_KEY or PUSH_KEY == "placeholder":
        raise HTTPException(503, "Push delivery is not configured yet.")
    if len(recipients) > 100:
        for offset in range(0, len(recipients), 100):
            await send_push(recipients[offset:offset + 100], data,
                            f"{idempotency_key}:{offset}" if idempotency_key else None)
        return
    if "title" not in data or "message" not in data:
        raise ValueError("data must include title and message")
    payload: dict = {"recipients": recipients, "data": data}
    if idempotency_key:
        payload["$idempotency_key"] = idempotency_key
    resp = await _client.post("/api/v1/push/trigger", json=payload)
    if resp.status_code == 401:
        raise HTTPException(status_code=500, detail="EMERGENT_PUSH_KEY missing or invalid")
    if resp.status_code >= 500:
        raise HTTPException(status_code=502, detail="Push provider unavailable")
    resp.raise_for_status()
