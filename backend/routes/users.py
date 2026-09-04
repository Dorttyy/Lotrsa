import base64
import logging
import re
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from auth_utils import CurrentUser
from db import audio_col, follows_col, media_col, notifications_col, profile_visits_col, rooms_col, users_col
from models import AvatarUpload, UserUpdate, VoiceMessageCreate, _vip_active, apply_privacy, user_card, user_public
from routes.push import send_push
from ws_manager import manager

router = APIRouter(prefix="/users", tags=["users"])
logger = logging.getLogger(__name__)


@router.put("/me")
async def update_me(body: UserUpdate, current_user: CurrentUser):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    # If a birthday (YYYY-MM-DD) is provided, derive age from it — this is the
    # source of truth once set, so the "one-time-only" age lock also applies to
    # birthday.
    if "birthday" in updates:
        try:
            from datetime import date as _d
            b = _d.fromisoformat(updates["birthday"])
            today = _d.today()
            derived = (
                today.year
                - b.year
                - ((today.month, today.day) < (b.month, b.day))
            )
            if derived < 13 or derived > 120:
                raise HTTPException(status_code=400, detail="Age must be between 13 and 120.")
            updates["age"] = derived
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid birthday format. Expected YYYY-MM-DD.")
    # Country / age / birthday are set once at signup and cannot be changed
    # afterwards — these appear on the public profile.
    if current_user.get("country") and "country" in updates:
        updates.pop("country")
    if current_user.get("age") and "age" in updates and not current_user.get("age") == updates.get("age"):
        # Age already locked — but allow the derived one from birthday to still
        # match (idempotent). Otherwise, ignore.
        pass
    if current_user.get("age") and "age" in updates:
        # Age is locked once set — silently drop attempts to change it.
        # (Applies to both direct age and derived-from-birthday updates.)
        if current_user.get("age") != updates["age"]:
            updates.pop("age")
    if current_user.get("birthday") and "birthday" in updates:
        # Same lock for birthday: once stored, cannot be edited.
        if current_user.get("birthday") != updates["birthday"]:
            updates.pop("birthday")
    # Per-language proficiency is merged (not overwritten) so setting one
    # language's level never wipes out levels already set for others.
    if "proficiencies" in updates:
        merged = dict(current_user.get("proficiencies") or {})
        merged.update(updates["proficiencies"])
        updates["proficiencies"] = merged
    # Non-VIP users: 1 native + 1 learning language only (no extra teach languages).
    if not current_user.get("is_vip"):
        if updates.get("learning_languages") is not None:
            updates["learning_languages"] = updates["learning_languages"][:1]
            updates["learning_language"] = (
                updates["learning_languages"][0]
                if updates["learning_languages"]
                else None
            )
        if updates.get("teach_languages"):
            updates["teach_languages"] = []
    else:
        # VIP users: 1 native + up to 2 extra teaching languages.
        native = updates.get("native_language") or current_user.get("native_language")
        if updates.get("teach_languages") is not None:
            updates["teach_languages"] = [
                c for c in updates["teach_languages"] if c and c != native
            ][:2]
        elif "native_language" in updates and native in (
            current_user.get("teach_languages") or []
        ):
            # Changing native to a language already in teach list → drop it there.
            updates["teach_languages"] = [
                c for c in current_user["teach_languages"] if c != native
            ]
    if updates:
        await users_col.update_one({"_id": current_user["_id"]}, {"$set": updates})
        current_user.update(updates)
    return user_public(current_user)


@router.post("/me/check-in")
async def daily_check_in(current_user: CurrentUser):
    """Daily check-in reward: once per UTC day, award coins that scale with
    the user's streak (10 base + 5 per streak day, capped at +35 bonus)."""
    today = datetime.now(timezone.utc).date().isoformat()
    if current_user.get("last_checkin_date") == today:
        return {
            "already_checked_in": True,
            "coins_awarded": 0,
            "streak_count": current_user.get("streak_count") or 1,
            "coins": current_user.get("coins", 0),
        }
    streak = current_user.get("streak_count") or 1
    coins_awarded = 10 + min(streak, 7) * 5
    await users_col.update_one(
        {"_id": current_user["_id"]},
        {
            "$set": {"last_checkin_date": today},
            "$inc": {"coins": coins_awarded},
        },
    )
    new_coins = current_user.get("coins", 0) + coins_awarded
    return {
        "already_checked_in": False,
        "coins_awarded": coins_awarded,
        "streak_count": streak,
        "coins": new_coins,
    }


@router.post("/me/vip")
async def upgrade_vip(current_user: CurrentUser):
    """Free VIP upgrade (payment can be added later)."""
    await users_col.update_one(
        {"_id": current_user["_id"]}, {"$set": {"is_vip": True}}
    )
    current_user["is_vip"] = True
    return user_public(current_user)


@router.post("/me/avatar")
async def upload_avatar(body: AvatarUpload, current_user: CurrentUser):
    try:
        image_bytes = base64.b64decode(body.image_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image data")
    if len(image_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large (max 5MB)")
    media_id = str(uuid.uuid4())
    await media_col.insert_one({"_id": media_id, "data": image_bytes, "mime": body.mime})
    avatar_url = f"/api/media/{media_id}"
    await users_col.update_one(
        {"_id": current_user["_id"]}, {"$set": {"avatar_url": avatar_url}}
    )
    current_user["avatar_url"] = avatar_url
    return user_public(current_user)


@router.post("/me/cover")
async def upload_cover(body: AvatarUpload, current_user: CurrentUser):
    try:
        image_bytes = base64.b64decode(body.image_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image data")
    if len(image_bytes) > 6 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large (max 6MB)")
    media_id = str(uuid.uuid4())
    await media_col.insert_one({"_id": media_id, "data": image_bytes, "mime": body.mime})
    cover_url = f"/api/media/{media_id}"
    await users_col.update_one(
        {"_id": current_user["_id"]}, {"$set": {"cover_url": cover_url}}
    )
    current_user["cover_url"] = cover_url
    return user_public(current_user)


@router.post("/me/voice-bio")
async def upload_voice_bio(body: VoiceMessageCreate, current_user: CurrentUser):
    """Record a voice introduction for the profile bio (max ~60s / 3MB)."""
    try:
        audio_bytes = base64.b64decode(body.audio_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid audio data")
    if len(audio_bytes) > 3 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Audio too large (max 3MB)")
    audio_id = str(uuid.uuid4())
    await audio_col.insert_one(
        {"_id": audio_id, "data": audio_bytes, "mime": body.mime}
    )
    duration = min(int(body.duration_ms or 0), 60_000)
    await users_col.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"voice_bio_id": audio_id, "voice_bio_duration_ms": duration}},
    )
    current_user["voice_bio_id"] = audio_id
    current_user["voice_bio_duration_ms"] = duration
    return user_public(current_user)


@router.delete("/me/voice-bio")
async def delete_voice_bio(current_user: CurrentUser):
    """Remove the profile voice introduction."""
    old_id = current_user.get("voice_bio_id")
    if old_id:
        await audio_col.delete_one({"_id": old_id})
    await users_col.update_one(
        {"_id": current_user["_id"]},
        {"$unset": {"voice_bio_id": "", "voice_bio_duration_ms": ""}},
    )
    current_user.pop("voice_bio_id", None)
    current_user.pop("voice_bio_duration_ms", None)
    return user_public(current_user)


@router.get("/me/visitors")
async def my_visitors(current_user: CurrentUser):
    """Who visited my profile, most recent first (unique visitors)."""
    docs = (
        await profile_visits_col.find({"visited_user_id": current_user["_id"]})
        .sort("visited_at", -1)
        .to_list(100)
    )
    visitor_ids = [d["visitor_id"] for d in docs]
    users = await users_col.find({"_id": {"$in": visitor_ids}}).to_list(200)
    umap = {u["_id"]: u for u in users}
    visitors = []
    for d in docs:
        u = umap.get(d["visitor_id"])
        if u:
            card = user_card(u)
            card["visited_at"] = d["visited_at"]
            card["is_online"] = manager.is_online(u["_id"])
            visitors.append(apply_privacy(card, u))
    # Only VIP members can see WHO visited; free users get the count only.
    if not _vip_active(current_user):
        return {"count": len(visitors), "visitors": [], "vip_required": True}
    return {"count": len(visitors), "visitors": visitors, "vip_required": False}


@router.get("/me/visited")
async def my_visited(current_user: CurrentUser):
    """Profiles I have visited, most recent first."""
    docs = (
        await profile_visits_col.find({"visitor_id": current_user["_id"]})
        .sort("visited_at", -1)
        .to_list(100)
    )
    ids = [d["visited_user_id"] for d in docs]
    users = await users_col.find({"_id": {"$in": ids}}).to_list(200)
    umap = {u["_id"]: u for u in users}
    visited = []
    for d in docs:
        u = umap.get(d["visited_user_id"])
        if u:
            card = user_card(u)
            card["visited_at"] = d["visited_at"]
            card["is_online"] = manager.is_online(u["_id"])
            visited.append(apply_privacy(card, u))
    return {"count": len(visited), "visitors": visited}


async def _follow_cards(ids: list) -> list:
    users = await users_col.find({"_id": {"$in": ids}}).to_list(200)
    umap = {u["_id"]: u for u in users}
    cards = []
    for uid in ids:
        u = umap.get(uid)
        if u:
            card = user_card(u)
            card["is_online"] = manager.is_online(uid)
            cards.append(apply_privacy(card, u))
    return cards


@router.get("/me/followers")
async def my_followers(current_user: CurrentUser):
    docs = (
        await follows_col.find({"following_id": current_user["_id"]})
        .sort("created_at", -1)
        .to_list(200)
    )
    return await _follow_cards([d["follower_id"] for d in docs])


@router.get("/me/following")
async def my_following(current_user: CurrentUser):
    docs = (
        await follows_col.find({"follower_id": current_user["_id"]})
        .sort("created_at", -1)
        .to_list(200)
    )
    return await _follow_cards([d["following_id"] for d in docs])


@router.post("/{user_id}/follow")
async def toggle_follow(user_id: str, current_user: CurrentUser):
    if user_id == current_user["_id"]:
        raise HTTPException(status_code=400, detail="You cannot follow yourself")
    target = await users_col.find_one({"_id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    key = {"follower_id": current_user["_id"], "following_id": user_id}
    existing = await follows_col.find_one(key)
    if existing:
        await follows_col.delete_one(key)
        following = False
    else:
        await follows_col.insert_one(
            {
                "_id": str(uuid.uuid4()),
                **key,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        following = True
        await notifications_col.insert_one(
            {
                "_id": str(uuid.uuid4()),
                "user_id": user_id,
                "actor_id": current_user["_id"],
                "type": "follow",
                "moment_id": None,
                "text": None,
                "read": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        try:
            await send_push(
                recipients=[user_id],
                data={
                    "title": current_user.get("name") or "New follower",
                    "message": f"{current_user.get('name') or 'Someone'} started following you",
                },
            )
        except Exception as e:
            logger.warning(f"Push notification failed (non-blocking): {e}")
    followers_count = await follows_col.count_documents({"following_id": user_id})
    return {"following": following, "followers_count": followers_count}


@router.get("/partners")
async def list_partners(
    current_user: CurrentUser,
    language: str | None = None,
    search: str | None = None,
    min_age: int | None = None,
    max_age: int | None = None,
    location: str | None = None,
    gender: str | None = None,
    online_only: bool = False,
    paid_practice: bool = False,
):
    """Partners list. Default: users whose native language matches my learning
    language, or who are learning my native language. `language=all` shows everyone.
    Explicit search filters (age/location/gender/online_only) bypass matching.
    `paid_practice=true` shows only users offering coin-gated practice."""
    query: dict = {
        "_id": {"$ne": current_user["_id"]},
        "native_language": {"$ne": None},
    }
    # Paid Practice tab: only partners who offer coin-gated practice. This is a
    # standalone pool (ignores language-matching / other category filters).
    if paid_practice:
        query["paid_practice"] = True
        docs = (
            await users_col.find(query, {"password_hash": 0})
            .sort("created_at", -1)
            .to_list(100)
        )
        online_ids = manager.online_user_ids()
        cards = []
        for d in docs:
            card = user_card(d)
            card["is_online"] = d["_id"] in online_ids
            card["streak_count"] = int(d.get("streak_count") or 0)
            cards.append(apply_privacy(card, d))
        return cards
    explicit = bool(
        location or gender or search or online_only or min_age is not None or max_age is not None
    )
    if explicit:
        if min_age is not None or max_age is not None:
            age_q: dict = {}
            if min_age is not None:
                age_q["$gte"] = min_age
            if max_age is not None:
                age_q["$lte"] = max_age
            query["age"] = age_q
        if location:
            query["$or"] = [
                {"country": {"$regex": location, "$options": "i"}},
                {"city": {"$regex": location, "$options": "i"}},
            ]
        if gender in ("male", "female"):
            query["gender"] = gender
        if search:
            query["name"] = {"$regex": search, "$options": "i"}
    elif language and language != "all":
        query["$or"] = [
            {"native_language": language},
            {"teach_languages": language},
        ]
    elif language != "all":
        my_learning = current_user.get("learning_languages") or (
            [current_user["learning_language"]]
            if current_user.get("learning_language")
            else []
        )
        my_teach = [
            lg
            for lg in [
                current_user.get("native_language"),
                *(current_user.get("teach_languages") or []),
            ]
            if lg
        ]
        ors = []
        if my_learning:
            ors.append({"native_language": {"$in": my_learning}})
            ors.append({"teach_languages": {"$in": my_learning}})
        if my_teach:
            ors.append({"learning_language": {"$in": my_teach}})
            ors.append({"learning_languages": {"$in": my_teach}})
        if ors:
            # Boosted profiles are always discoverable (paid placement).
            ors.append(
                {"boost_until": {"$gt": datetime.now(timezone.utc).isoformat()}}
            )
            query["$or"] = ors
    docs = (
        await users_col.find(query, {"password_hash": 0})
        .sort("created_at", -1)
        .to_list(100)
    )
    online_ids = manager.online_user_ids()
    if online_only:
        docs = [d for d in docs if d["_id"] in online_ids]
    # Boosted profiles float to the top while their window is active.
    now_iso = datetime.now(timezone.utc).isoformat()
    docs.sort(key=lambda d: not ((d.get("boost_until") or "") > now_iso))
    cards = []
    for d in docs:
        card = user_card(d)
        card["boosted"] = (d.get("boost_until") or "") > now_iso
        card["is_online"] = d["_id"] in online_ids
        card["streak_count"] = int(d.get("streak_count") or 0)
        cards.append(apply_privacy(card, d))
    return cards


USERNAME_RE = re.compile(r"^[a-z0-9_.]{3,20}$")


class UsernameUpdate(BaseModel):
    username: str


@router.put("/me/username")
async def change_username(body: UsernameUpdate, current_user: CurrentUser):
    """Unique username — changeable only once per month."""
    uname = body.username.strip().lower()
    if not USERNAME_RE.match(uname):
        raise HTTPException(
            status_code=400,
            detail="Username must be 3-20 characters: lowercase letters, numbers, _ or .",
        )
    if uname == current_user.get("username"):
        return user_public(current_user)
    last = current_user.get("username_changed_at")
    if last:
        last_dt = datetime.fromisoformat(last)
        elapsed = datetime.now(timezone.utc) - last_dt
        if elapsed < timedelta(days=30):
            days_left = 30 - elapsed.days
            raise HTTPException(
                status_code=429,
                detail=f"You can change your username once a month. Try again in {days_left} day(s).",
            )
    if await users_col.find_one({"username": uname}):
        raise HTTPException(status_code=409, detail="This username is already taken.")
    updates = {
        "username": uname,
        "username_changed_at": datetime.now(timezone.utc).isoformat(),
    }
    await users_col.update_one({"_id": current_user["_id"]}, {"$set": updates})
    current_user.update(updates)
    return user_public(current_user)


@router.post("/{user_id}/hide-moments")
async def toggle_hide_moments(user_id: str, current_user: CurrentUser):
    """Toggle hiding a user's moments from my feed."""
    hidden = set(current_user.get("hidden_moment_users") or [])
    if user_id in hidden:
        hidden.discard(user_id)
        now_hidden = False
    else:
        hidden.add(user_id)
        now_hidden = True
    await users_col.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"hidden_moment_users": list(hidden)}},
    )
    return {"hidden": now_hidden}


@router.post("/{user_id}/block")
async def toggle_block(user_id: str, current_user: CurrentUser):
    """Toggle blocking a user (blocked users can't message me)."""
    blocked = set(current_user.get("blocked_users") or [])
    if user_id in blocked:
        blocked.discard(user_id)
        now_blocked = False
    else:
        blocked.add(user_id)
        now_blocked = True
    await users_col.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"blocked_users": list(blocked)}},
    )
    return {"blocked": now_blocked}


@router.get("/{user_id}")
async def get_user(user_id: str, current_user: CurrentUser):
    doc = await users_col.find_one({"_id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    if user_id != current_user["_id"]:
        visit_result = await profile_visits_col.update_one(
            {"visitor_id": current_user["_id"], "visited_user_id": user_id},
            {
                "$set": {"visited_at": datetime.now(timezone.utc).isoformat()},
                "$setOnInsert": {"_id": str(uuid.uuid4())},
            },
            upsert=True,
        )
        # Only notify on a *new* unique visitor, never on repeat views.
        if visit_result.upserted_id:
            await notifications_col.insert_one(
                {
                    "_id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "actor_id": current_user["_id"],
                    "type": "visit",
                    "moment_id": None,
                    "text": None,
                    "read": False,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
            )
            try:
                await send_push(
                    recipients=[user_id],
                    data={
                        "title": "New profile visitor",
                        "message": f"{current_user.get('name') or 'Someone'} viewed your profile",
                    },
                )
            except Exception as e:
                logger.warning(f"Push notification failed (non-blocking): {e}")
    public = user_public(doc)
    public.pop("email", None)
    public["is_online"] = manager.is_online(user_id)
    public.pop("privacy", None)
    if user_id != current_user["_id"]:
        apply_privacy(public, doc)
    public["followers_count"] = await follows_col.count_documents(
        {"following_id": user_id}
    )
    public["following_count"] = await follows_col.count_documents(
        {"follower_id": user_id}
    )
    live_room = await rooms_col.find_one(
        {"is_live": True, f"members.{user_id}": {"$exists": True}}
    )
    if live_room:
        public["in_voice_room"] = {
            "room_id": live_room["_id"],
            "name": live_room.get("title"),
            "title": live_room.get("title"),
            "language": live_room.get("language"),
        }
    public["is_following"] = bool(
        await follows_col.find_one(
            {"follower_id": current_user["_id"], "following_id": user_id}
        )
    )
    public["follows_me"] = bool(
        await follows_col.find_one(
            {"follower_id": user_id, "following_id": current_user["_id"]}
        )
    )
    return public
