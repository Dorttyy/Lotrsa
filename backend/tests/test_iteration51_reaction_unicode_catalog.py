"""Iteration 51 backend verification.

# Module: MessageReactionCreate validator accepts full emojibase catalog (+ skins)
# Module: Reaction API rejects invalid payloads and persists complex ZWJ emoji toggles
"""

from __future__ import annotations

import json
import os
import sys
import uuid
from pathlib import Path

import pytest
import requests
from dotenv import load_dotenv

sys.path.append("/app/backend")

from models import MessageReactionCreate


load_dotenv("/app/frontend/.env")

BASE_URL = (os.environ.get("EXPO_BACKEND_URL") or "").strip().strip("'").rstrip("/")
QA1_EMAIL = "qa_tester_b40dc299@linguatest.com"
QA2_EMAIL = "qa_guest_removal_67403793@linguatest.com"
QA_PASSWORD = "QATest2026!"
CONVERSATION_ID = "98ea1271-de38-4a76-8be9-c24210657858"


def _require_base() -> str:
    if not BASE_URL:
        pytest.skip("EXPO_BACKEND_URL missing")
    return BASE_URL


def _login(session: requests.Session, email: str) -> tuple[str, str]:
    res = session.post(
        f"{_require_base()}/api/auth/login",
        json={"email": email, "password": QA_PASSWORD},
        timeout=30,
    )
    assert res.status_code == 200, f"login failed for {email}: {res.status_code} {res.text[:220]}"
    body = res.json()
    return body["token"], body["user"]["id"]


def _hdr(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _find_message(messages: list[dict], message_id: str) -> dict:
    match = next((m for m in messages if m.get("id") == message_id), None)
    assert match is not None, f"message {message_id} not found"
    return match


def _load_catalog_emojis() -> list[str]:
    compact_path = Path("/app/frontend/node_modules/emojibase-data/en/compact.json")
    if not compact_path.exists():
        pytest.skip("emojibase compact.json not found in frontend/node_modules")
    rows = json.loads(compact_path.read_text(encoding="utf-8"))
    out: list[str] = []
    for item in rows:
        if item.get("unicode"):
            out.append(item["unicode"])
        for skin in item.get("skins") or []:
            if skin.get("unicode"):
                out.append(skin["unicode"])
    return out


@pytest.fixture(scope="module")
def st() -> dict:
    session = requests.Session()
    qa1_token, qa1_id = _login(session, QA1_EMAIL)
    qa2_token, qa2_id = _login(session, QA2_EMAIL)

    text = f"TEST_iter51_reaction_unicode_{uuid.uuid4().hex[:8]}"
    create = session.post(
        f"{_require_base()}/api/chats/{CONVERSATION_ID}/messages",
        headers=_hdr(qa1_token),
        json={"text": text},
        timeout=30,
    )
    assert create.status_code == 201, create.text
    msg_id = create.json()["id"]

    yield {
        "s": session,
        "base": _require_base(),
        "msg_id": msg_id,
        "qa1": {"token": qa1_token, "id": qa1_id},
        "qa2": {"token": qa2_token, "id": qa2_id},
    }

    session.post(
        f"{_require_base()}/api/chats/{CONVERSATION_ID}/messages/delete",
        headers=_hdr(qa1_token),
        json={"ids": [msg_id]},
        timeout=30,
    )


class TestReactionUnicodeCatalog:
    def test_model_validator_accepts_full_emojibase_catalog_with_skins(self):
        emojis = _load_catalog_emojis()
        assert len(emojis) >= 3979, f"expected >=3979 variants, got {len(emojis)}"
        for emoji in emojis:
            model = MessageReactionCreate(emoji=emoji)
            assert model.emoji == emoji

    def test_api_rejects_invalid_reaction_inputs(self, st):
        invalid_values = ["", "hello", "🙂🙂"]
        for bad in invalid_values:
            res = st["s"].post(
                f"{st['base']}/api/chats/{CONVERSATION_ID}/messages/{st['msg_id']}/react",
                headers=_hdr(st["qa1"]["token"]),
                json={"emoji": bad},
                timeout=30,
            )
            assert res.status_code == 422, f"expected 422 for {bad!r}, got {res.status_code} {res.text[:180]}"

    def test_api_accepts_complex_zwj_skin_reactions_and_toggle_persists(self, st):
        # Complex examples often >8 code points in scalar terms, but one grapheme cluster.
        family = "👨‍👩‍👧‍👦"
        kiss = "👩🏽‍❤️‍💋‍👨🏿"

        add_family = st["s"].post(
            f"{st['base']}/api/chats/{CONVERSATION_ID}/messages/{st['msg_id']}/react",
            headers=_hdr(st["qa1"]["token"]),
            json={"emoji": family},
            timeout=30,
        )
        assert add_family.status_code == 200, add_family.text

        replace_with_kiss = st["s"].post(
            f"{st['base']}/api/chats/{CONVERSATION_ID}/messages/{st['msg_id']}/react",
            headers=_hdr(st["qa1"]["token"]),
            json={"emoji": kiss},
            timeout=30,
        )
        assert replace_with_kiss.status_code == 200, replace_with_kiss.text

        qa2_add_kiss = st["s"].post(
            f"{st['base']}/api/chats/{CONVERSATION_ID}/messages/{st['msg_id']}/react",
            headers=_hdr(st["qa2"]["token"]),
            json={"emoji": kiss},
            timeout=30,
        )
        assert qa2_add_kiss.status_code == 200, qa2_add_kiss.text
        body = qa2_add_kiss.json()
        grouped = next((r for r in body.get("reactions", []) if r.get("emoji") == kiss), None)
        assert grouped and grouped.get("count") == 2, body

        listed = st["s"].get(
            f"{st['base']}/api/chats/{CONVERSATION_ID}/messages",
            headers=_hdr(st["qa1"]["token"]),
            timeout=30,
        )
        assert listed.status_code == 200, listed.text
        msg = _find_message(listed.json(), st["msg_id"])
        persisted = next((r for r in msg.get("reactions", []) if r.get("emoji") == kiss), None)
        assert persisted and persisted.get("count") == 2, msg

        qa1_remove = st["s"].post(
            f"{st['base']}/api/chats/{CONVERSATION_ID}/messages/{st['msg_id']}/react",
            headers=_hdr(st["qa1"]["token"]),
            json={"emoji": kiss},
            timeout=30,
        )
        assert qa1_remove.status_code == 200, qa1_remove.text
        removed_body = qa1_remove.json()
        left = next((r for r in removed_body.get("reactions", []) if r.get("emoji") == kiss), None)
        assert left and left.get("count") == 1 and st["qa2"]["id"] in left.get("user_ids", []), removed_body
