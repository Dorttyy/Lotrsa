"""Iteration 50 backend verification.

# Module: message reaction toggle/replace semantics for one user
# Module: multi-user reaction count integrity and persistence
"""

from __future__ import annotations

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
    assert match is not None, f"message {message_id} not found in conversation"
    return match


@pytest.fixture(scope="module")
def st() -> dict:
    session = requests.Session()
    qa1_token, qa1_id = _login(session, QA1_EMAIL)
    qa2_token, qa2_id = _login(session, QA2_EMAIL)

    text = f"TEST_iter50_reaction_seed_{uuid.uuid4().hex[:8]}"
    create = session.post(
        f"{_require_base()}/api/chats/{CONVERSATION_ID}/messages",
        headers=_hdr(qa1_token),
        json={"text": text},
        timeout=30,
    )
    assert create.status_code == 201, create.text
    created = create.json()
    message_id = created["id"]

    state = {
        "s": session,
        "base": _require_base(),
        "qa1": {"token": qa1_token, "id": qa1_id},
        "qa2": {"token": qa2_token, "id": qa2_id},
        "msg_id": message_id,
    }

    yield state

    session.post(
        f"{_require_base()}/api/chats/{CONVERSATION_ID}/messages/delete",
        headers=_hdr(qa1_token),
        json={"ids": [message_id]},
        timeout=30,
    )


class TestReactionFlow:
    def test_add_reaction_and_verify_persistence(self, st):
        react = st["s"].post(
            f"{st['base']}/api/chats/{CONVERSATION_ID}/messages/{st['msg_id']}/react",
            headers=_hdr(st["qa1"]["token"]),
            json={"emoji": "❤️"},
            timeout=30,
        )
        assert react.status_code == 200, react.text
        body = react.json()
        hearts = next((r for r in body.get("reactions", []) if r.get("emoji") == "❤️"), None)
        assert hearts and st["qa1"]["id"] in hearts.get("user_ids", []), body

        listed = st["s"].get(
            f"{st['base']}/api/chats/{CONVERSATION_ID}/messages",
            headers=_hdr(st["qa1"]["token"]),
            timeout=30,
        )
        assert listed.status_code == 200, listed.text
        msg = _find_message(listed.json(), st["msg_id"])
        persisted = next((r for r in msg.get("reactions", []) if r.get("emoji") == "❤️"), None)
        assert persisted and persisted.get("count") == 1, msg

    def test_replace_reaction_same_user_no_duplicate(self, st):
        replace = st["s"].post(
            f"{st['base']}/api/chats/{CONVERSATION_ID}/messages/{st['msg_id']}/react",
            headers=_hdr(st["qa1"]["token"]),
            json={"emoji": "😂"},
            timeout=30,
        )
        assert replace.status_code == 200, replace.text
        body = replace.json()
        emojis = [r.get("emoji") for r in body.get("reactions", []) if st["qa1"]["id"] in (r.get("user_ids") or [])]
        assert emojis == ["😂"], body

    def test_same_reaction_toggles_off(self, st):
        remove = st["s"].post(
            f"{st['base']}/api/chats/{CONVERSATION_ID}/messages/{st['msg_id']}/react",
            headers=_hdr(st["qa1"]["token"]),
            json={"emoji": "😂"},
            timeout=30,
        )
        assert remove.status_code == 200, remove.text
        body = remove.json()
        assert all(st["qa1"]["id"] not in (r.get("user_ids") or []) for r in body.get("reactions", [])), body

    def test_two_user_same_emoji_count_increments(self, st):
        one = st["s"].post(
            f"{st['base']}/api/chats/{CONVERSATION_ID}/messages/{st['msg_id']}/react",
            headers=_hdr(st["qa1"]["token"]),
            json={"emoji": "😮"},
            timeout=30,
        )
        assert one.status_code == 200, one.text

        two = st["s"].post(
            f"{st['base']}/api/chats/{CONVERSATION_ID}/messages/{st['msg_id']}/react",
            headers=_hdr(st["qa2"]["token"]),
            json={"emoji": "😮"},
            timeout=30,
        )
        assert two.status_code == 200, two.text
        body = two.json()
        wow = next((r for r in body.get("reactions", []) if r.get("emoji") == "😮"), None)
        assert wow and wow.get("count") == 2, body

    def test_remove_one_user_keeps_other_user_reaction(self, st):
        off_qa1 = st["s"].post(
            f"{st['base']}/api/chats/{CONVERSATION_ID}/messages/{st['msg_id']}/react",
            headers=_hdr(st["qa1"]["token"]),
            json={"emoji": "😮"},
            timeout=30,
        )
        assert off_qa1.status_code == 200, off_qa1.text
        body = off_qa1.json()
        wow = next((r for r in body.get("reactions", []) if r.get("emoji") == "😮"), None)
        assert wow and wow.get("count") == 1 and wow.get("user_ids") == [st["qa2"]["id"]], body

    def test_persistence_after_relogin(self, st):
        fresh = requests.Session()
        qa2_token, _ = _login(fresh, QA2_EMAIL)
        listed = fresh.get(
            f"{st['base']}/api/chats/{CONVERSATION_ID}/messages",
            headers=_hdr(qa2_token),
            timeout=30,
        )
        assert listed.status_code == 200, listed.text
        msg = _find_message(listed.json(), st["msg_id"])
        wow = next((r for r in msg.get("reactions", []) if r.get("emoji") == "😮"), None)
        assert wow and wow.get("count") == 1 and st["qa2"]["id"] in wow.get("user_ids", []), msg
