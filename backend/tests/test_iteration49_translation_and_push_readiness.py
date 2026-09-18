"""Iteration 49 backend verification.

# Module: real local translation API behavior, caching, and validation
# Module: translation language listing and source/provider metadata
# Module: push registration preview-readiness guardrails (placeholder key)
"""

from __future__ import annotations

import concurrent.futures
import os
import uuid

import pytest
import requests
from dotenv import load_dotenv


load_dotenv("/app/frontend/.env")

BASE_URL = (os.environ.get("EXPO_BACKEND_URL") or "").strip().strip("'").rstrip("/")
QA1_EMAIL = "qa_tester_b40dc299@linguatest.com"
QA2_EMAIL = "qa_guest_removal_67403793@linguatest.com"
QA_PASSWORD = "QATest2026!"


def _require_base() -> str:
    if not BASE_URL:
        pytest.skip("EXPO_BACKEND_URL missing")
    return BASE_URL


def _login(session: requests.Session, email: str, password: str) -> tuple[str, dict]:
    res = session.post(
        f"{_require_base()}/api/auth/login",
        json={"email": email, "password": password},
        timeout=30,
    )
    assert res.status_code == 200, f"login failed for {email}: {res.status_code} {res.text[:220]}"
    body = res.json()
    assert body.get("token")
    assert body.get("user", {}).get("id")
    return body["token"], body["user"]


def _hdr(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _translate(
    session: requests.Session,
    token: str,
    *,
    text: str,
    target: str,
    source: str = "auto",
    timeout: int = 90,
) -> requests.Response:
    return session.post(
        f"{_require_base()}/api/ai/translate",
        headers=_hdr(token),
        json={"text": text, "target_language": target, "source_language": source},
        timeout=timeout,
    )


@pytest.fixture(scope="module")
def st() -> dict:
    session = requests.Session()
    token1, user1 = _login(session, QA1_EMAIL, QA_PASSWORD)
    token2, user2 = _login(session, QA2_EMAIL, QA_PASSWORD)
    return {
        "s": session,
        "base": _require_base(),
        "qa1": {"token": token1, "user": user1},
        "qa2": {"token": token2, "user": user2},
    }


class TestTranslationCore:
    def test_no_httpx_import_in_local_translation_modules(self):
        for path in (
            "/app/backend/local_text_translation.py",
            "/app/backend/translation_service.py",
            "/app/backend/routes/ai.py",
        ):
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            assert "import httpx" not in content, f"unexpected httpx import in {path}"

    def test_supported_multilingual_translations_local_provider(self, st):
        cases = [
            ("Hello from Mello", "bn"),
            ("আমি আজ বাংলা লিখছি", "en"),
            ("How are you today?", "ja"),
            ("今日はいい天気です", "en"),
            ("I like traditional culture and noodles", "zh-CN"),
            ("I like traditional culture and noodles", "zh-TW"),
            ("Good evening", "ko"),
            ("Welcome to language practice", "ar"),
            ("We are testing translation quality", "hi"),
            ("Can we chat later tonight?", "ur"),
            ("I am learning every day", "es"),
            ("This app feels fast", "fr"),
            ("Please keep the exact logo", "de"),
            ("How was your weekend?", "pt-BR"),
        ]
        outputs: dict[str, str] = {}
        for text, target in cases:
            res = _translate(st["s"], st["qa1"]["token"], text=text, target=target)
            assert res.status_code == 200, f"{target}: {res.status_code} {res.text[:260]}"
            body = res.json()
            assert isinstance(body.get("translated"), str) and body["translated"].strip(), body
            assert body.get("provider") == "local-m2m100", body
            assert body.get("target_language") == target, body
            assert isinstance(body.get("source_language"), str) and body["source_language"], body
            outputs[target] = body["translated"]

        # Script distinction check between Simplified/Traditional output.
        assert outputs["zh-CN"] != outputs["zh-TW"], "zh-CN and zh-TW outputs should differ in script"

    def test_source_detection_sane_for_bn_and_ja(self, st):
        bn = _translate(st["s"], st["qa1"]["token"], text="আমি বাংলা বলি", target="en")
        assert bn.status_code == 200, bn.text
        bn_body = bn.json()
        assert bn_body.get("source_language") in {"bn", "as"}, bn_body

        ja = _translate(st["s"], st["qa1"]["token"], text="明日は学校へ行きます", target="en")
        assert ja.status_code == 200, ja.text
        ja_body = ja.json()
        assert ja_body.get("source_language") == "ja", ja_body

    def test_multiline_and_whitespace_preserved(self, st):
        text = "  First line\n\n    Second line with indent\nThird line"
        res = _translate(st["s"], st["qa1"]["token"], text=text, target="bn")
        assert res.status_code == 200, res.text
        translated = res.json()["translated"]
        assert "\n\n" in translated
        assert translated.startswith("  ")
        assert "\n    " in translated

    def test_long_input_not_silently_truncated(self, st):
        text = " ".join(["This is a longer sentence for chunking"] * 220)
        res = _translate(st["s"], st["qa1"]["token"], text=text, target="fr", timeout=120)
        assert res.status_code == 200, res.text
        translated = res.json()["translated"]
        assert translated.strip()
        assert len(translated) > 400

    def test_same_language_identity_valid(self, st):
        text = "No translation should alter this sentence."
        res = _translate(st["s"], st["qa1"]["token"], text=text, target="en", source="en")
        assert res.status_code == 200, res.text
        body = res.json()
        assert body["translated"] == text
        assert body["source_language"] == "en"

    def test_emoji_and_numbers_remain_valid(self, st):
        text = "Order #12345 is ready ✅🙂"
        res = _translate(st["s"], st["qa1"]["token"], text=text, target="es")
        assert res.status_code == 200, res.text
        translated = res.json()["translated"]
        assert "12345" in translated
        assert "✅" in translated or "🙂" in translated

    def test_unknown_or_unsupported_languages_passthrough_200_exact_text(self, st):
        text = "  నేను ప్రతిరోజు తెలుగు మాట్లాడతాను.\r\n🙂  "
        cases = [
            # Recognized but currently unsupported by local model => passthrough
            {"source": "auto", "target": "te"},
            {"source": "auto", "target": "eo"},
            # Unknown/invalid code or language-name input => passthrough
            {"source": "auto", "target": "xx"},
            {"source": "auto", "target": "Elvish"},
            {"source": "zz", "target": "en"},
            {"source": "Klingon", "target": "en"},
        ]
        for case in cases:
            res = _translate(
                st["s"],
                st["qa1"]["token"],
                text=text,
                target=case["target"],
                source=case["source"],
            )
            assert res.status_code == 200, f"{case}: {res.status_code} {res.text[:240]}"
            body = res.json()
            assert body["translated"] == text, body
            assert body.get("unchanged") is True, body
            assert body.get("provider") == "passthrough", body
            assert "detail" not in body, body

    def test_empty_text_returns_422(self, st):
        res = st["s"].post(
            f"{st['base']}/api/ai/translate",
            headers=_hdr(st["qa1"]["token"]),
            json={"text": "   ", "target_language": "bn", "source_language": "auto"},
            timeout=30,
        )
        assert res.status_code == 422, res.text

    def test_cache_true_on_repeat_same_user_and_not_shared_first_other_user(self, st):
        payload = {
            "text": f"Cache behavior verification sentence {uuid.uuid4().hex[:10]}",
            "target_language": "de",
            "source_language": "auto",
        }

        first_user_first = st["s"].post(
            f"{st['base']}/api/ai/translate", headers=_hdr(st["qa1"]["token"]), json=payload, timeout=90
        )
        assert first_user_first.status_code == 200, first_user_first.text
        b1 = first_user_first.json()
        assert b1.get("cached") is False, b1

        first_user_repeat = st["s"].post(
            f"{st['base']}/api/ai/translate", headers=_hdr(st["qa1"]["token"]), json=payload, timeout=90
        )
        assert first_user_repeat.status_code == 200, first_user_repeat.text
        b2 = first_user_repeat.json()
        assert b2.get("cached") is True, b2

        second_user_first = st["s"].post(
            f"{st['base']}/api/ai/translate", headers=_hdr(st["qa2"]["token"]), json=payload, timeout=90
        )
        assert second_user_first.status_code == 200, second_user_first.text
        b3 = second_user_first.json()
        assert b3.get("cached") is False, b3

    def test_dedup_concurrent_same_user_request(self, st):
        payload = {"text": "Concurrent dedup request for the same user", "target_language": "fr", "source_language": "auto"}

        def _run() -> requests.Response:
            return st["s"].post(
                f"{st['base']}/api/ai/translate",
                headers=_hdr(st["qa1"]["token"]),
                json=payload,
                timeout=90,
            )

        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            one = pool.submit(_run)
            two = pool.submit(_run)
            r1 = one.result()
            r2 = two.result()

        assert r1.status_code == 200, r1.text
        assert r2.status_code == 200, r2.text
        b1, b2 = r1.json(), r2.json()
        assert b1["translated"] == b2["translated"]
        assert b1["provider"] == "local-m2m100"
        assert b2["provider"] == "local-m2m100"

    def test_translation_languages_endpoint_includes_te_eo_catalog(self, st):
        res = st["s"].get(f"{st['base']}/api/ai/translation-languages", timeout=30)
        assert res.status_code == 200, res.text
        body = res.json()
        assert isinstance(body, list)
        codes = {item.get("code") for item in body if isinstance(item, dict)}
        assert "te" in codes
        assert "eo" in codes


class TestPushPreviewReadiness:
    def test_register_push_returns_503_with_placeholder_key(self, st):
        res = st["s"].post(
            f"{st['base']}/api/register-push",
            headers=_hdr(st["qa1"]["token"]),
            json={
                "user_id": st["qa2"]["user"]["id"],
                "platform": "android",
                "device_token": "x" * 24,
            },
            timeout=30,
        )
        assert res.status_code == 503, res.text
