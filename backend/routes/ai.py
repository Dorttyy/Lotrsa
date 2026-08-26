import json
import logging
import os
import uuid
import base64 as b64mod
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from auth_utils import CurrentUser
from config_utils import get_app_config
from db import audio_col, media_col, users_col
from models import CorrectRequest, TranscribeRequest, TranslateRequest, _vip_active

router = APIRouter(prefix="/ai", tags=["ai"])
logger = logging.getLogger(__name__)

EMERGENT_LLM_KEY = os.environ["EMERGENT_LLM_KEY"]

# Safety net when a language *name* is sent instead of an ISO code.
NAME_TO_CODE = {
    "english": "en", "spanish": "es", "french": "fr", "german": "de",
    "italian": "it", "portuguese": "pt", "russian": "ru", "japanese": "ja",
    "korean": "ko", "chinese": "zh", "arabic": "ar", "hindi": "hi",
    "bengali": "bn", "turkish": "tr", "vietnamese": "vi", "thai": "th",
    "indonesian": "id", "dutch": "nl", "polish": "pl", "urdu": "ur",
}


async def _google_translate(text: str, target: str) -> str:
    """Free Google Translate endpoint (no API key needed)."""
    params = {"client": "gtx", "sl": "auto", "tl": target, "dt": "t", "q": text}
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(
            "https://translate.googleapis.com/translate_a/single", params=params
        )
        r.raise_for_status()
        data = r.json()
    return "".join(seg[0] for seg in data[0] if seg and seg[0]).strip()


async def run_llm(system_message: str, text: str) -> str:
    from emergentintegrations.llm.chat import LlmChat, StreamDone, TextDelta, UserMessage

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"lingua-{uuid.uuid4()}",
        system_message=system_message,
    ).with_model("openai", "gpt-5.2")
    parts: list[str] = []
    async for event in chat.stream_message(UserMessage(text=text)):
        if isinstance(event, TextDelta):
            parts.append(event.content)
        elif isinstance(event, StreamDone):
            break
    return "".join(parts).strip()


def parse_json_response(raw: str) -> dict | None:
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("```")[1]
        if cleaned.startswith("json"):
            cleaned = cleaned[4:]
    try:
        return json.loads(cleaned.strip())
    except (json.JSONDecodeError, IndexError):
        return None


async def run_llm_image(system_message: str, text: str, image_base64: str) -> str:
    """LLM call that also attaches an image (vision) — used by AI Vocab and
    Extract-text-&-translate on photo messages."""
    from emergentintegrations.llm.chat import (
        ImageContent,
        LlmChat,
        StreamDone,
        TextDelta,
        UserMessage,
    )

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"lingua-img-{uuid.uuid4()}",
        system_message=system_message,
    ).with_model("openai", "gpt-5.2")
    msg = UserMessage(
        text=text, file_contents=[ImageContent(image_base64=image_base64)]
    )
    parts: list[str] = []
    async for event in chat.stream_message(msg):
        if isinstance(event, TextDelta):
            parts.append(event.content)
        elif isinstance(event, StreamDone):
            break
    return "".join(parts).strip()


class ImageAiRequest(BaseModel):
    media_id: str
    target_language: str | None = None
    # AI-lens language overrides (VIP feature in the UI)
    learning_language: str | None = None
    native_language: str | None = None


def _user_langs(current_user: dict) -> tuple[str, str]:
    """(learning, native) language codes with sensible fallbacks."""
    learning = (
        (current_user.get("learning_languages") or [None])[0]
        or current_user.get("learning_language")
        or "en"
    )
    native = current_user.get("native_language") or "en"
    return learning, native


async def _load_image_b64(media_id: str) -> str:
    media = await media_col.find_one({"_id": media_id})
    if not media:
        raise HTTPException(status_code=404, detail="Image not found")
    return b64mod.b64encode(media["data"]).decode()


@router.post("/image-lens")
async def image_lens(body: ImageAiRequest, current_user: CurrentUser):
    """AI Lens: identify THE main object in a photo as a flashcard —
    native word + learning word + pronunciation + meanings + example."""
    # Free users get 3 lens scans per day; VIP is unlimited.
    if not _vip_active(current_user):
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        usage = current_user.get("lens_usage") or {}
        count = usage.get("count", 0) if usage.get("date") == today else 0
        if count >= 3:
            raise HTTPException(
                status_code=403,
                detail="Free users get 3 AI Vocab scans per day — upgrade to VIP for unlimited scans.",
            )
        await users_col.update_one(
            {"_id": current_user["_id"]},
            {"$set": {"lens_usage": {"date": today, "count": count + 1}}},
        )
    img = await _load_image_b64(body.media_id)
    learning, native = _user_langs(current_user)
    if body.learning_language:
        learning = body.learning_language
    if body.native_language:
        native = body.native_language
    system = (
        "You are an AI camera lens inside a language-learning app. "
        "Identify the single most prominent object/concept in the photo."
    )
    prompt = (
        f"Identify the MAIN object in this image. Reply with STRICT JSON only:\n"
        '{"native_word": "<object name in language ' + native + '>", '
        '"learning_word": "<object name in language ' + learning + '>", '
        '"pron": "<IPA or romanized pronunciation of native_word>", '
        '"pos": "<part-of-speech + 1-3 meanings in ' + learning + ", e.g. 'n. penguin; n. path'>\", "
        '"example_native": "<one short example sentence using the word, in ' + native + '>", '
        '"example_learning": "<the same sentence in ' + learning + '>"}'
    )
    try:
        raw = await run_llm_image(system, prompt, img)
    except Exception:
        logger.exception("image-lens LLM failure")
        raise HTTPException(status_code=502, detail="AI is unavailable right now")
    data = parse_json_response(raw)
    if not data or not data.get("native_word"):
        raise HTTPException(status_code=502, detail="AI returned an unexpected answer")
    return {
        "native_word": str(data.get("native_word", "")).strip(),
        "learning_word": str(data.get("learning_word", "")).strip(),
        "pron": str(data.get("pron", "")).strip(),
        "pos": str(data.get("pos", "")).strip(),
        "example_native": str(data.get("example_native", "")).strip(),
        "example_learning": str(data.get("example_learning", "")).strip(),
        "native_language": native,
        "learning_language": learning,
    }


@router.post("/image-vocab")
async def image_vocab(body: ImageAiRequest, current_user: CurrentUser):
    """AI Vocab: identify useful vocabulary for objects/actions in a photo."""
    img = await _load_image_b64(body.media_id)
    learning, native = _user_langs(current_user)
    system = (
        "You are a vocabulary coach inside a language-exchange app. "
        "Given a photo, pick the most useful words a learner should know."
    )
    prompt = (
        f"Look at this image. List 5-8 practical vocabulary words (things, actions or "
        f"descriptions visible in the image) in the language with ISO code '{learning}'. "
        f"For each add a translation into the language with ISO code '{native}'. "
        'Reply with STRICT JSON only: {"words": [{"word": "...", "translation": "..."}]}'
    )
    try:
        raw = await run_llm_image(system, prompt, img)
    except Exception:
        logger.exception("image-vocab LLM failure")
        raise HTTPException(status_code=502, detail="AI is unavailable right now")
    data = parse_json_response(raw)
    if not data or not isinstance(data.get("words"), list):
        raise HTTPException(status_code=502, detail="AI returned an unexpected answer")
    words = [
        {
            "word": str(w.get("word", "")).strip(),
            "translation": str(w.get("translation", "")).strip(),
        }
        for w in data["words"]
        if isinstance(w, dict) and w.get("word")
    ][:8]
    return {"words": words}


@router.post("/image-text")
async def image_text(body: ImageAiRequest, current_user: CurrentUser):
    """Extract text & translate: OCR any text in the photo and translate it."""
    img = await _load_image_b64(body.media_id)
    _, native = _user_langs(current_user)
    target = (body.target_language or native or "en").strip()
    if len(target) > 3:
        target = NAME_TO_CODE.get(target.lower(), "en")
    system = "You are an OCR + translation engine inside a language-exchange app."
    prompt = (
        "Extract ALL readable text from this image exactly as written. Then translate "
        f"it into the language with ISO code '{target}'. If the image contains no text, "
        'return an empty string for both fields. Reply with STRICT JSON only: '
        '{"text": "...", "translation": "..."}'
    )
    try:
        raw = await run_llm_image(system, prompt, img)
    except Exception:
        logger.exception("image-text LLM failure")
        raise HTTPException(status_code=502, detail="AI is unavailable right now")
    data = parse_json_response(raw)
    if data is None:
        raise HTTPException(status_code=502, detail="AI returned an unexpected answer")
    return {
        "text": str(data.get("text", "")).strip(),
        "translation": str(data.get("translation", "")).strip(),
    }


@router.post("/translate")
async def translate(body: TranslateRequest, current_user: CurrentUser):
    target = (body.target_language or "en").strip()
    if len(target) > 3:
        target = NAME_TO_CODE.get(target.lower(), "en")
    # Translation is unlimited and free for everyone: it runs on the free
    # Google endpoint (no API key, no cost), so there is nothing to meter.
    remaining = None
    try:
        translated = await _google_translate(body.text, target)
    except Exception:
        # Fallback: LLM translation if the free endpoint is unavailable.
        system = (
            "You are a translation engine for a language exchange app. "
            f"Translate the user's message into the language with ISO code '{target}'. "
            "Reply with ONLY the translated text, nothing else."
        )
        try:
            translated = await run_llm(system, body.text)
        except Exception as e:
            logger.exception("Translation failed")
            raise HTTPException(status_code=502, detail=f"Translation failed: {e}")
    return {"translated": translated, "target_language": target, "remaining": remaining}


@router.post("/correct")
async def correct(body: CorrectRequest, current_user: CurrentUser):
    lang_hint = f" The text is written in {body.language}." if body.language else ""
    system = (
        "You are a friendly language tutor in a language exchange app. "
        f"Correct grammar, spelling and word-choice mistakes in the user's text.{lang_hint} "
        'Respond with ONLY valid JSON: {"corrected": "<corrected text in the same language>", '
        '"explanation": "<one or two short sentences in English explaining the main fixes, '
        "or 'Looks perfect!' if there is nothing to fix>\"}"
    )
    try:
        raw = await run_llm(system, body.text)
    except Exception as e:
        logger.exception("Correction failed")
        raise HTTPException(status_code=502, detail=f"Correction failed: {e}")
    parsed = parse_json_response(raw)
    if parsed and "corrected" in parsed:
        return {"corrected": parsed["corrected"], "explanation": parsed.get("explanation", "")}
    return {"corrected": raw, "explanation": ""}


# --- Free on-device speech-to-text (faster-whisper, no API key) ---
_whisper_model = None


def _get_whisper():
    """Lazily load a tiny CPU Whisper model (int8). Cached across requests."""
    global _whisper_model
    if _whisper_model is None:
        from faster_whisper import WhisperModel

        _whisper_model = WhisperModel("tiny", device="cpu", compute_type="int8")
    return _whisper_model


@router.post("/transcribe")
async def transcribe(body: TranscribeRequest, current_user: CurrentUser):
    """Transcribe a stored voice message to text using a local Whisper model."""
    import asyncio
    import os
    import tempfile

    doc = await audio_col.find_one({"_id": body.audio_id})
    if not doc or not doc.get("data"):
        raise HTTPException(status_code=404, detail="Voice message not found.")
    mime = doc.get("mime", "audio/m4a")
    suffix = ".webm" if "webm" in mime else (".mp3" if "mp3" in mime or "mpeg" in mime else ".m4a")
    data = doc["data"]
    # motor stores bytes as-is; ensure raw bytes
    if not isinstance(data, (bytes, bytearray)):
        data = bytes(data)

    def _run() -> str:
        tmp_path = None
        try:
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
                f.write(data)
                tmp_path = f.name
            model = _get_whisper()
            lang = body.language if (body.language and len(body.language) == 2) else None
            segments, _info = model.transcribe(tmp_path, beam_size=1, language=lang)
            return " ".join(seg.text.strip() for seg in segments).strip()
        finally:
            if tmp_path and os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except OSError:
                    pass

    try:
        text = await asyncio.to_thread(_run)
    except Exception as e:
        logger.exception("Transcription failed")
        raise HTTPException(status_code=502, detail=f"Transcription failed: {e}")
    return {"text": text}
