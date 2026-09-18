import random
import re
import uuid
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from pymongo.errors import DuplicateKeyError

from auth_utils import CurrentUser, create_access_token, hash_password, verify_password
from db import users_col
from models import LoginRequest, RegisterRequest, user_public

router = APIRouter(prefix="/auth", tags=["auth"])

# Emergent-managed Google OAuth session lookup.
EMERGENT_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"


async def touch_streak(doc: dict) -> dict:
    """Consecutive-day streak: +1 if last active yesterday, reset to 1 otherwise."""
    today = datetime.now(timezone.utc).date()
    last = doc.get("last_active_date")
    if last == today.isoformat():
        return doc
    if last == (today - timedelta(days=1)).isoformat():
        streak = (doc.get("streak_count") or 0) + 1
    else:
        streak = 1
    updates = {"streak_count": streak, "last_active_date": today.isoformat()}
    await users_col.update_one({"_id": doc["_id"]}, {"$set": updates})
    doc.update(updates)
    return doc


async def generate_username(name: str | None) -> str:
    """Unique auto-assigned username: lowercase name + random digits."""
    base = re.sub(r"[^a-z0-9]", "", (name or "user").lower())[:12] or "user"
    for _ in range(20):
        candidate = f"{base}{random.randint(100, 9999)}"
        if not await users_col.find_one({"username": candidate}):
            return candidate
    return f"user{uuid.uuid4().hex[:8]}"


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest):
    user_id = str(uuid.uuid4())
    doc = {
        "_id": user_id,
        "email": body.email.lower(),
        "password_hash": hash_password(body.password),
        "name": body.name.strip(),
        "username": await generate_username(body.name),
        "username_changed_at": None,
        "bio": None,
        "country": None,
        "avatar_url": None,
        "native_language": None,
        "learning_language": None,
        "proficiency": None,
        "streak_count": 1,
        "coins": 1000,
        "last_active_date": datetime.now(timezone.utc).date().isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        await users_col.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(status_code=400, detail="Email already registered")
    return {"token": create_access_token(user_id), "user": user_public(doc)}


@router.post("/login")
async def login(body: LoginRequest):
    doc = await users_col.find_one({"email": body.email.lower()})
    if not doc or not verify_password(body.password, doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    if doc.get("banned"):
        raise HTTPException(status_code=403, detail="Your account has been banned.")
    doc = await touch_streak(doc)
    if doc.get("is_admin"):
        # Admins get short-lived, versioned session tokens (see auth_utils).
        token = create_access_token(
            doc["_id"], admin=True, admin_ver=int(doc.get("admin_session_version", 0))
        )
        return {"token": token, "user": user_public(doc)}
    return {"token": create_access_token(doc["_id"]), "user": user_public(doc)}


@router.get("/me")
async def me(current_user: CurrentUser):
    current_user = await touch_streak(current_user)
    return user_public(current_user)


# ── Google OAuth (Emergent-managed) ─────────────────────────────────────── #
class GoogleSessionIn(BaseModel):
    session_id: str


@router.post("/google")
async def google_login(body: GoogleSessionIn):
    """Exchange an Emergent OAuth ``session_id`` for a LinguaConnect JWT.

    The Emergent auth widget hands the frontend a one-time ``session_id``
    after Google finishes. We look that up server-side, upsert/find the
    matching user, and mint a normal JWT so downstream endpoints keep using
    the same `Authorization: Bearer` pattern as email/password flows.
    """
    session_id = (body.session_id or "").strip()
    if not session_id:
        raise HTTPException(400, "session_id required")

    # 1. Resolve session with Emergent
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                EMERGENT_SESSION_URL,
                headers={"X-Session-ID": session_id},
            )
    except httpx.HTTPError as exc:
        raise HTTPException(502, f"Auth provider unreachable: {exc}") from exc

    if resp.status_code != 200:
        raise HTTPException(401, "Invalid or expired Google session")

    data = resp.json() or {}
    email = (data.get("email") or "").lower().strip()
    if not email:
        raise HTTPException(400, "Google account missing an email address")

    name = (data.get("name") or "").strip() or email.split("@")[0]
    picture = data.get("picture")

    # 2. Upsert user — never duplicate on repeat Google logins.
    existing = await users_col.find_one({"email": email})
    if existing:
        if existing.get("banned"):
            raise HTTPException(403, "Your account has been banned.")
        # Backfill missing google metadata so profile stays complete.
        updates: dict = {"is_google": True}
        if picture and not existing.get("avatar_url"):
            updates["avatar_url"] = picture
        if name and not existing.get("name"):
            updates["name"] = name
        if updates:
            await users_col.update_one({"_id": existing["_id"]}, {"$set": updates})
            existing.update(updates)
        doc = await touch_streak(existing)
    else:
        user_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        doc = {
            "_id": user_id,
            "email": email,
            # No usable password for Google-only accounts — set a random hash
            # so any legacy email/password login attempt fails gracefully.
            "password_hash": hash_password(uuid.uuid4().hex),
            "name": name,
            "username": await generate_username(name),
            "username_changed_at": None,
            "bio": None,
            "country": None,
            "avatar_url": picture,
            "native_language": None,
            "learning_language": None,
            "proficiency": None,
            "streak_count": 1,
            "coins": 1000,
            "is_google": True,
            "last_active_date": now.date().isoformat(),
            "created_at": now.isoformat(),
        }
        try:
            await users_col.insert_one(doc)
        except DuplicateKeyError:
            # Rare race: another request just created this user.
            doc = await users_col.find_one({"email": email})
            if not doc:
                raise HTTPException(500, "Auth race — please retry")

    return {"token": create_access_token(doc["_id"]), "user": user_public(doc)}
