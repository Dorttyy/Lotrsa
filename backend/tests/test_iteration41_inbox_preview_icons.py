"""Iteration 41: inbox preview icon metadata + legacy hydration checks.

# Module: chat latest-message typed snapshots (voice/call/room/text)
# Module: legacy snapshot hydration when `last_message.type` is missing
# Module: unread/sender/text/time persistence checks on chat previews
"""

from __future__ import annotations

import base64
import os
import re
import time
import uuid

import pytest
import requests
from dotenv import load_dotenv


load_dotenv("/app/frontend/.env")
load_dotenv("/app/backend/.env")

BASE_URL = (os.environ.get("EXPO_BACKEND_URL") or "").strip().strip("'").rstrip("/")
MONGO_URL = (os.environ.get("MONGO_URL") or "").strip().strip("'")
DB_NAME = (os.environ.get("DB_NAME") or "").strip().strip("'")

QA1_EMAIL = "qa_tester_b40dc299@linguatest.com"
QA2_EMAIL = "qa_guest_removal_67403793@linguatest.com"
QA_PASSWORD = "QATest2026!"
ADMIN_EMAIL = "admin@lingua.app"


def _admin_password_from_memory() -> str:
    p = "/app/memory/test_credentials.md"
    if not os.path.exists(p):
        return ""
    txt = open(p, "r", encoding="utf-8").read()
    m = re.search(r"\|\s*Preview admin\s*\|\s*admin@lingua\.app\s*\|\s*([^|]+)\|", txt)
    return (m.group(1).strip() if m else "")


ADMIN_PASSWORD = _admin_password_from_memory()


def _require_base() -> str:
    if not BASE_URL:
        pytest.skip("EXPO_BACKEND_URL missing")
    return BASE_URL


def _hdr(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


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


def _upsert_dm(session: requests.Session, base: str, token: str, partner_id: str) -> dict:
    res = session.post(
        f"{base}/api/chats",
        json={"partner_id": partner_id},
        headers=_hdr(token),
        timeout=30,
    )
    assert res.status_code == 200, res.text
    return res.json()


def _conv_from_list(session: requests.Session, base: str, token: str, cid: str) -> dict:
    res = session.get(f"{base}/api/chats", headers=_hdr(token), timeout=30)
    assert res.status_code == 200, res.text
    docs = res.json()
    hit = next((d for d in docs if d.get("id") == cid), None)
    assert hit is not None, f"conversation {cid} not found in /api/chats"
    return hit


def _conv_detail(session: requests.Session, base: str, token: str, cid: str) -> dict:
    res = session.get(f"{base}/api/chats/{cid}", headers=_hdr(token), timeout=30)
    assert res.status_code == 200, res.text
    return res.json()


def _send_text(session: requests.Session, base: str, token: str, cid: str, text: str) -> dict:
    res = session.post(
        f"{base}/api/chats/{cid}/messages",
        json={"text": text},
        headers=_hdr(token),
        timeout=30,
    )
    assert res.status_code == 201, res.text
    body = res.json()
    assert body.get("text") == text
    assert body.get("type", "text") == "text"
    assert body.get("sender_id")
    assert body.get("created_at")
    return body


@pytest.fixture(scope="module")
def st() -> dict:
    s = requests.Session()
    base = _require_base()
    t1, u1 = _login(s, QA1_EMAIL, QA_PASSWORD)
    t2, u2 = _login(s, QA2_EMAIL, QA_PASSWORD)
    conv = _upsert_dm(s, base, t1, u2["id"])
    data = {
        "s": s,
        "base": base,
        "qa1": {"token": t1, "user": u1},
        "qa2": {"token": t2, "user": u2},
        "cid": conv["id"],
        "room_id": None,
        "last_call_msg": None,
        "voice_cid": None,
        "group_cid": None,
    }
    yield data
    if data.get("room_id"):
        try:
            s.post(
                f"{base}/api/rooms/{data['room_id']}/end",
                headers=_hdr(t1),
                timeout=15,
            )
        except Exception:
            pass


class TestInboxPreviewMetadata:
    def test_01_text_emoji_lookalikes_remain_text(self, st):
        literals = [
            "📞 Missed call",
            "🔊 3s",
            "🎙️ text",
            f"TEST_iter41_plain_{uuid.uuid4().hex[:7]}",
        ]
        for txt in literals:
            _send_text(st["s"], st["base"], st["qa1"]["token"], st["cid"], txt)
        conv = _conv_from_list(st["s"], st["base"], st["qa1"]["token"], st["cid"])
        lm = conv.get("last_message") or {}
        assert lm.get("type") == "text"
        assert lm.get("text") == literals[-1]

    def test_02_voice_snapshot_has_type_and_duration(self, st):
        voice_bytes = b"RIFF\x24\x00\x00\x00WAVEfmt "
        payload = {
            "audio_base64": base64.b64encode(voice_bytes).decode("ascii"),
            "mime": "audio/wav",
            "duration_ms": 3120,
        }
        res = st["s"].post(
            f"{st['base']}/api/chats/{st['cid']}/voice",
            json=payload,
            headers=_hdr(st["qa1"]["token"]),
            timeout=30,
        )
        assert res.status_code == 201, res.text
        body = res.json()
        assert body.get("type") == "voice"
        assert body.get("duration_ms") == 3120

        conv = _conv_detail(st["s"], st["base"], st["qa1"]["token"], st["cid"])
        lm = conv.get("last_message") or {}
        assert lm.get("type") == "voice"
        assert lm.get("duration_ms") == 3120
        assert re.match(r"^🔊\s*\d+s$", lm.get("text", ""))

    def test_03_call_missed_snapshot_has_call_metadata(self, st):
        res = st["s"].post(
            f"{st['base']}/api/chats/{st['cid']}/call",
            json={"status": "missed", "kind": "voice"},
            headers=_hdr(st["qa1"]["token"]),
            timeout=30,
        )
        assert res.status_code == 201, res.text
        body = res.json()
        assert body.get("type") == "call"
        assert body.get("call_status") == "missed"

        conv = _conv_detail(st["s"], st["base"], st["qa1"]["token"], st["cid"])
        lm = conv.get("last_message") or {}
        assert lm.get("type") == "call"
        assert lm.get("call_status") == "missed"
        assert lm.get("text") == "📞 Missed call"

    def test_04_call_answered_snapshot_keeps_duration_and_status(self, st):
        res = st["s"].post(
            f"{st['base']}/api/chats/{st['cid']}/call",
            json={"status": "answered", "kind": "voice", "duration_ms": 93000},
            headers=_hdr(st["qa1"]["token"]),
            timeout=30,
        )
        assert res.status_code == 201, res.text
        body = res.json()
        assert body.get("type") == "call"
        assert body.get("call_status") == "answered"
        assert body.get("duration_ms") == 93000
        st["last_call_msg"] = body

        conv = _conv_detail(st["s"], st["base"], st["qa1"]["token"], st["cid"])
        lm = conv.get("last_message") or {}
        assert lm.get("type") == "call"
        assert lm.get("call_status") == "answered"
        assert lm.get("duration_ms") == 93000
        assert lm.get("text", "").startswith("📞 Call")

    def test_05_room_share_custom_caption_keeps_text_and_room_id(self, st):
        title = f"TEST_iter41_room_{uuid.uuid4().hex[:6]}_very_long_title_for_truncation_check"
        create = st["s"].post(
            f"{st['base']}/api/rooms",
            json={"title": title, "language": "en", "share_to_moments": False},
            headers=_hdr(st["qa1"]["token"]),
            timeout=30,
        )
        assert create.status_code == 201, create.text
        room = create.json()
        st["room_id"] = room["id"]

        custom_caption = f"TEST_iter41_room_caption_{uuid.uuid4().hex[:5]}"
        share = st["s"].post(
            f"{st['base']}/api/chats/{st['cid']}/messages",
            json={"room_id": room["id"], "text": custom_caption},
            headers=_hdr(st["qa1"]["token"]),
            timeout=30,
        )
        assert share.status_code == 201, share.text
        body = share.json()
        assert body.get("type") == "room"
        assert body.get("room_id") == room["id"]
        assert body.get("text") == custom_caption

        conv = _conv_detail(st["s"], st["base"], st["qa1"]["token"], st["cid"])
        lm = conv.get("last_message") or {}
        assert lm.get("type") == "room"
        assert lm.get("room_id") == room["id"]
        assert lm.get("text") == custom_caption

        # avoid live-room partner override in chat list previews
        end = st["s"].post(
            f"{st['base']}/api/rooms/{room['id']}/end",
            headers=_hdr(st["qa1"]["token"]),
            timeout=30,
        )
        assert end.status_code == 200, end.text

    def test_06_unread_sender_created_at_rules_preserved(self, st):
        before = _conv_from_list(st["s"], st["base"], st["qa2"]["token"], st["cid"])
        before_unread = int(before.get("unread") or 0)

        txt = f"TEST_iter41_unread_{int(time.time())}"
        sent = _send_text(st["s"], st["base"], st["qa1"]["token"], st["cid"], txt)
        after = _conv_from_list(st["s"], st["base"], st["qa2"]["token"], st["cid"])
        lm = after.get("last_message") or {}

        assert lm.get("text") == txt
        assert lm.get("sender_id") == st["qa1"]["user"]["id"]
        assert lm.get("created_at") == sent.get("created_at")
        assert int(after.get("unread") or 0) >= before_unread + 1

    def test_07_legacy_missing_type_snapshot_hydrates_from_messages(self, st):
        if not (MONGO_URL and DB_NAME and st.get("last_call_msg")):
            pytest.skip("mongo fixture unavailable or missing reference message")

        # Make latest snapshot a call event, then remove only its `type` from
        # conversation.last_message to validate read-time hydration.
        rec = st["s"].post(
            f"{st['base']}/api/chats/{st['cid']}/call",
            json={"status": "answered", "kind": "voice", "duration_ms": 121000},
            headers=_hdr(st["qa1"]["token"]),
            timeout=30,
        )
        assert rec.status_code == 201, rec.text
        pre = _conv_detail(st["s"], st["base"], st["qa1"]["token"], st["cid"])
        assert (pre.get("last_message") or {}).get("type") == "call"

        pymongo = pytest.importorskip("pymongo")
        client = pymongo.MongoClient(MONGO_URL, serverSelectionTimeoutMS=6000)
        db = client[DB_NAME]
        convs = db["conversations"]

        unset = convs.update_one(
            {"_id": st["cid"]},
            {"$unset": {"last_message.type": ""}},
        )
        assert unset.matched_count == 1

        conv_list = _conv_from_list(st["s"], st["base"], st["qa1"]["token"], st["cid"])
        lm = conv_list.get("last_message") or {}
        assert lm.get("type") == "call"
        assert lm.get("call_status") == "answered"
        assert lm.get("duration_ms") == 121000

        conv_detail = _conv_detail(st["s"], st["base"], st["qa1"]["token"], st["cid"])
        lm2 = conv_detail.get("last_message") or {}
        assert lm2.get("type") == "call"
        assert lm2.get("call_status") == "answered"
        assert lm2.get("duration_ms") == 121000

    def test_08_voice_preview_on_second_conversation(self, st):
        if not ADMIN_PASSWORD:
            pytest.skip("admin password unavailable in memory")

        t_admin, u_admin = _login(st["s"], ADMIN_EMAIL, ADMIN_PASSWORD)
        conv = _upsert_dm(st["s"], st["base"], st["qa1"]["token"], u_admin["id"])
        st["voice_cid"] = conv["id"]

        voice_bytes = b"RIFF\x24\x00\x00\x00WAVEfmt "
        res = st["s"].post(
            f"{st['base']}/api/chats/{conv['id']}/voice",
            json={
                "audio_base64": base64.b64encode(voice_bytes).decode("ascii"),
                "mime": "audio/wav",
                "duration_ms": 3070,
            },
            headers=_hdr(st["qa1"]["token"]),
            timeout=30,
        )
        assert res.status_code == 201, res.text

        mine = _conv_detail(st["s"], st["base"], st["qa1"]["token"], conv["id"])
        lm = mine.get("last_message") or {}
        assert lm.get("type") == "voice"
        assert lm.get("duration_ms") == 3070
        assert lm.get("text", "").startswith("🔊")

        # Keep admin token referenced so login is used and lint/test keep this path deterministic
        assert t_admin

    def test_09_group_room_preview_metadata_supported(self, st):
        if not ADMIN_PASSWORD:
            pytest.skip("admin password unavailable in memory")

        _, u_admin = _login(st["s"], ADMIN_EMAIL, ADMIN_PASSWORD)
        grp = st["s"].post(
            f"{st['base']}/api/chats/group",
            json={"member_ids": [st["qa2"]["user"]["id"], u_admin["id"]], "name": f"TEST_iter41_group_{uuid.uuid4().hex[:5]}"},
            headers=_hdr(st["qa1"]["token"]),
            timeout=30,
        )
        assert grp.status_code == 201, grp.text
        g = grp.json()
        st["group_cid"] = g["id"]

        mk_room = st["s"].post(
            f"{st['base']}/api/rooms",
            json={"title": f"TEST_iter41_group_room_{uuid.uuid4().hex[:5]}", "language": "en", "share_to_moments": False},
            headers=_hdr(st["qa1"]["token"]),
            timeout=30,
        )
        assert mk_room.status_code == 201, mk_room.text
        rid = mk_room.json()["id"]

        share = st["s"].post(
            f"{st['base']}/api/chats/{g['id']}/messages",
            json={"room_id": rid, "text": f"TEST_iter41_group_room_caption_{uuid.uuid4().hex[:5]}"},
            headers=_hdr(st["qa1"]["token"]),
            timeout=30,
        )
        assert share.status_code == 201, share.text
        body = share.json()
        assert body.get("type") == "room"
        assert body.get("room_id") == rid

        all_chats = st["s"].get(f"{st['base']}/api/chats", headers=_hdr(st["qa1"]["token"]), timeout=30)
        assert all_chats.status_code == 200, all_chats.text
        row = next((c for c in all_chats.json() if c.get("id") == g["id"]), None)
        assert row is not None
        lm = row.get("last_message") or {}
        assert lm.get("type") == "room"
        assert lm.get("room_id") == rid

        # End room to avoid active voice-room override in QA inbox previews.
        end = st["s"].post(
            f"{st['base']}/api/rooms/{rid}/end",
            headers=_hdr(st["qa1"]["token"]),
            timeout=30,
        )
        assert end.status_code == 200, end.text
