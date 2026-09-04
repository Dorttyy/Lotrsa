from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1, max_length=60)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    country: Optional[str] = None
    avatar_url: Optional[str] = None
    native_language: Optional[str] = None
    learning_language: Optional[str] = None
    proficiency: Optional[str] = None
    teach_languages: Optional[list[str]] = Field(default=None, max_length=2)
    learning_languages: Optional[list[str]] = Field(default=None, max_length=3)
    age: Optional[int] = Field(default=None, ge=13, le=120)
    interests: Optional[list[str]] = Field(default=None, max_length=20)
    gender: Optional[str] = Field(default=None, pattern="^(male|female)$")
    privacy: Optional[dict] = None
    # Per-language proficiency, e.g. {"es": "Intermediate", "fr": "Beginner"}
    proficiencies: Optional[dict[str, str]] = None
    # Extended HelloTalk-style profile fields (all optional)
    places_to_go: Optional[str] = Field(default=None, max_length=120)
    mbti: Optional[str] = Field(default=None, max_length=8)
    blood_type: Optional[str] = Field(default=None, max_length=4)
    hometown: Optional[str] = Field(default=None, max_length=80)
    occupation: Optional[str] = Field(default=None, max_length=80)
    school: Optional[str] = Field(default=None, max_length=80)
    birthday: Optional[str] = Field(default=None, max_length=10)
    cover_url: Optional[str] = None
    # Paid Practice: offer coin-gated practice conversations to other users.
    paid_practice: Optional[bool] = None
    practice_rate: Optional[int] = Field(default=None, ge=5, le=1000)
    # Gift Gate: require an incoming gift (min coins) before a stranger can chat.
    gift_gate: Optional[bool] = None
    gift_gate_min: Optional[int] = Field(default=None, ge=5, le=1000)


class AvatarUpload(BaseModel):
    image_base64: str = Field(min_length=1)
    mime: str = "image/jpeg"


class MessageCreate(BaseModel):
    text: str = Field(default="", max_length=2000)
    room_id: Optional[str] = None
    reply_to_id: Optional[str] = None


class CallLogCreate(BaseModel):
    # missed | outgoing | incoming | answered
    status: str = Field(default="missed", max_length=20)
    duration_ms: Optional[int] = None
    kind: str = Field(default="voice", max_length=10)  # voice | video


class StickerCreate(BaseModel):
    # emoji codepoint(s), e.g. "1f602" (maps to a Noto animated sticker)
    sticker: str = Field(min_length=1, max_length=40)


class MessageReactionCreate(BaseModel):
    emoji: str = Field(min_length=1, max_length=8)


class ConversationCreate(BaseModel):
    partner_id: str


class PollOption(BaseModel):
    text: str = Field(min_length=1, max_length=60)


class PollCreate(BaseModel):
    question: Optional[str] = Field(default=None, max_length=200)
    options: list[PollOption] = Field(min_length=2, max_length=4)


class MomentCreate(BaseModel):
    text: str = Field(default="", max_length=1000)
    image_base64: Optional[str] = None
    mime: str = "image/jpeg"
    audio_base64: Optional[str] = None
    audio_mime: str = "audio/m4a"
    audio_duration_ms: Optional[int] = None
    tags: Optional[list[str]] = Field(default=None, max_length=8)
    poll: Optional[PollCreate] = None


class PollVoteBody(BaseModel):
    option_index: int = Field(ge=0, le=3)


class CommentCreate(BaseModel):
    text: str = Field(default="", max_length=500)
    audio_base64: Optional[str] = None
    audio_mime: str = "audio/m4a"
    audio_duration_ms: Optional[int] = None
    reply_to: Optional[str] = None


class TranslateRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    target_language: str


class CorrectRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    language: Optional[str] = None


class VoiceMessageCreate(BaseModel):
    audio_base64: str = Field(min_length=1)
    mime: str = "audio/m4a"
    duration_ms: int = 0
    reply_to_id: Optional[str] = None


class ImageMessageCreate(BaseModel):
    image_base64: str = Field(min_length=1)
    mime: str = "image/jpeg"


class ManualCorrectionCreate(BaseModel):
    """A user's own hand-written correction of a message."""
    corrected: str = Field(min_length=1, max_length=2000)
    note: Optional[str] = Field(default=None, max_length=500)


class MessageSaveBody(BaseModel):
    """Toggle a message into the user's personal 'saved' or 'practice' list."""
    kind: str = Field(default="saved", pattern="^(saved|practice)$")


class MessageDeleteBody(BaseModel):
    """Bulk-delete selected messages (multi-select)."""
    ids: list[str] = Field(min_length=1, max_length=200)


class TranscribeRequest(BaseModel):
    """Transcribe a stored voice message to text (speech-to-text)."""
    audio_id: str = Field(min_length=1)
    language: Optional[str] = None


class RoomCreate(BaseModel):
    title: str = Field(min_length=1, max_length=80)
    language: str = Field(min_length=2, max_length=8)
    languages: Optional[list[str]] = Field(default=None, max_length=2)
    topic: Optional[str] = Field(default=None, max_length=40)
    mode: str = Field(default="chat", pattern="^(chat|music|study)$")
    is_private: bool = False
    background: Optional[int] = Field(default=None, ge=0, le=3)
    share_to_moments: bool = False
    announcement: Optional[str] = Field(default=None, max_length=300)


class RoomRoleUpdate(BaseModel):
    user_id: str
    role: str = Field(pattern="^(speaker|listener)$")


class RoomUserAction(BaseModel):
    user_id: str


class RoomMessageCreate(BaseModel):
    text: str = Field(min_length=1, max_length=500)


class RoomGiftCreate(BaseModel):
    to_user_id: str
    gift_id: str


def _learning_list(doc: dict) -> list:
    ll = doc.get("learning_languages")
    if ll:
        return ll
    return [doc["learning_language"]] if doc.get("learning_language") else []


def _active_item(item: dict | None) -> dict | None:
    if not item:
        return None
    exp = item.get("expires_at")
    if exp and exp < datetime.now(timezone.utc).isoformat():
        return None
    return item


def _vip_active(doc: dict) -> bool:
    if not doc.get("is_vip"):
        return False
    exp = doc.get("vip_expires_at")
    return not exp or exp > datetime.now(timezone.utc).isoformat()


def apply_privacy(card: dict, doc: dict) -> dict:
    """Strip fields the user chose to hide (viewed by others)."""
    p = doc.get("privacy") or {}
    if not p.get("show_age", True):
        card["age"] = None
    if not p.get("show_gender", True):
        card["gender"] = None
    if not p.get("show_interests", True):
        card["interests"] = []
    if not p.get("show_country", True):
        card["country"] = None
    if not p.get("show_online", True):
        card["is_online"] = False
    return card


def user_public(doc: dict) -> dict:
    return {
        "id": doc["_id"],
        "email": doc.get("email"),
        "name": doc.get("name"),
        "username": doc.get("username"),
        "username_changed_at": doc.get("username_changed_at"),
        "bio": doc.get("bio"),
        "country": doc.get("country"),
        "avatar_url": doc.get("avatar_url"),
        "native_language": doc.get("native_language"),
        "learning_language": doc.get("learning_language"),
        "proficiency": doc.get("proficiency"),
        "proficiencies": doc.get("proficiencies") or {},
        "teach_languages": doc.get("teach_languages") or [],
        "learning_languages": _learning_list(doc),
        "age": doc.get("age"),
        "interests": doc.get("interests") or [],
        "gender": doc.get("gender"),
        "is_vip": _vip_active(doc),
        "vip_tier": doc.get("vip_tier"),
        "is_admin": bool(doc.get("is_admin")),
        "active_badge": _active_item(doc.get("active_badge")),
        "active_frame": _active_item(doc.get("active_frame")),
        "coins": doc.get("coins", 0),
        "privacy": doc.get("privacy") or {},
        "hidden_moment_users": doc.get("hidden_moment_users") or [],
        "blocked_users": doc.get("blocked_users") or [],
        "streak_count": doc.get("streak_count", 0),
        "created_at": doc.get("created_at"),
        "places_to_go": doc.get("places_to_go"),
        "mbti": doc.get("mbti"),
        "blood_type": doc.get("blood_type"),
        "hometown": doc.get("hometown"),
        "occupation": doc.get("occupation"),
        "school": doc.get("school"),
        "birthday": doc.get("birthday"),
        "cover_url": doc.get("cover_url"),
        "voice_bio_id": doc.get("voice_bio_id"),
        "voice_bio_duration_ms": doc.get("voice_bio_duration_ms"),
        "is_guest": bool(doc.get("is_guest")),
        "paid_practice": bool(doc.get("paid_practice")),
        "practice_rate": int(doc.get("practice_rate") or 50),
        "gift_gate": bool(doc.get("gift_gate")),
        "gift_gate_min": int(doc.get("gift_gate_min") or 20),
    }


def user_card(doc: dict) -> dict:
    """Lightweight user info embedded in lists/messages."""
    return {
        "id": doc["_id"],
        "name": doc.get("name"),
        "username": doc.get("username"),
        "avatar_url": doc.get("avatar_url"),
        "country": doc.get("country"),
        "native_language": doc.get("native_language"),
        "learning_language": doc.get("learning_language"),
        "proficiency": doc.get("proficiency"),
        "proficiencies": doc.get("proficiencies") or {},
        "teach_languages": doc.get("teach_languages") or [],
        "learning_languages": _learning_list(doc),
        "age": doc.get("age"),
        "interests": doc.get("interests") or [],
        "gender": doc.get("gender"),
        "is_vip": _vip_active(doc),
        "vip_tier": doc.get("vip_tier"),
        "active_badge": _active_item(doc.get("active_badge")),
        "active_frame": _active_item(doc.get("active_frame")),
        "bio": doc.get("bio"),
        "paid_practice": bool(doc.get("paid_practice")),
        "practice_rate": int(doc.get("practice_rate") or 50),
        "gift_gate": bool(doc.get("gift_gate")),
        "gift_gate_min": int(doc.get("gift_gate_min") or 20),
    }
