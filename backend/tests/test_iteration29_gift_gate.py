"""Iteration 29 — Backend tests for:
 (A) Read receipts / partner_read_at
 (B) Gift-gated messaging (gift_gate, gift_gate_min)
 (C) Paid practice gate
 (D) PUT /api/users/me accepts new fields & user_public / user_card include them.
"""
import os
import time

import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get(
    "EXPO_BACKEND_URL"
)
if not BASE_URL:
    # fall back to frontend .env value
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
                BASE_URL = line.strip().split("=", 1)[1]
                break
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

MEI = {"email": "mei@demo.com", "password": "Demo1234!"}
DIEGO = {"email": "diego@demo.com", "password": "Demo1234!"}


def _login(session: requests.Session, creds: dict) -> dict:
    r = session.post(f"{API}/auth/login", json=creds, timeout=30)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    data = r.json()
    session.headers.update({"Authorization": f"Bearer {data['token']}"})
    return data


@pytest.fixture(scope="module")
def mei_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    _login(s, MEI)
    return s


@pytest.fixture(scope="module")
def diego_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    _login(s, DIEGO)
    return s


@pytest.fixture(scope="module")
def diego_id(diego_session):
    r = diego_session.get(f"{API}/auth/me", timeout=15)
    assert r.status_code == 200
    return r.json()["id"]


@pytest.fixture(scope="module")
def mei_id(mei_session):
    r = mei_session.get(f"{API}/auth/me", timeout=15)
    assert r.status_code == 200
    return r.json()["id"]


@pytest.fixture(scope="module")
def conversation(mei_session, diego_id):
    r = mei_session.post(f"{API}/chats", json={"partner_id": diego_id}, timeout=15)
    assert r.status_code == 200
    return r.json()


def _mongo_cleanup(mei_id: str, diego_id: str):
    """Directly clear residual gift/practice unlocks between test runs.
    Uses backend's Mongo config (motor is async, use pymongo for tests)."""
    try:
        import os as _os
        from urllib.parse import urlparse

        # Load backend/.env if MONGO_URL not in env
        mongo_url = _os.environ.get("MONGO_URL")
        db_name = _os.environ.get("DB_NAME")
        if not mongo_url or not db_name:
            with open("/app/backend/.env") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("MONGO_URL="):
                        mongo_url = line.split("=", 1)[1].strip('"').strip("'")
                    elif line.startswith("DB_NAME="):
                        db_name = line.split("=", 1)[1].strip('"').strip("'")
        if not mongo_url or not db_name:
            return
        from pymongo import MongoClient
        client = MongoClient(mongo_url)
        db = client[db_name]
        db.gift_unlocks.delete_many(
            {"buyer_id": mei_id, "partner_id": diego_id}
        )
        db.practice_unlocks.delete_many(
            {"buyer_id": mei_id, "partner_id": diego_id}
        )
        client.close()
    except Exception as e:
        print(f"mongo cleanup skipped: {e}")


@pytest.fixture(scope="module", autouse=True)
def _cleanup_diego_flags(diego_session, mei_id, diego_id):
    """Reset diego's gate flags + clear stale unlocks before + after tests."""
    _mongo_cleanup(mei_id, diego_id)
    diego_session.put(
        f"{API}/users/me",
        json={"paid_practice": False, "gift_gate": False},
        timeout=15,
    )
    yield
    _mongo_cleanup(mei_id, diego_id)
    diego_session.put(
        f"{API}/users/me",
        json={"paid_practice": False, "gift_gate": False},
        timeout=15,
    )


def _topup(session: requests.Session, coins_needed: int):
    """Top-up buyer coins if below coins_needed."""
    me = session.get(f"{API}/auth/me", timeout=15).json()
    if int(me.get("coins") or 0) >= coins_needed:
        return
    # Try common topup endpoint
    r = session.post(
        f"{API}/market/topup", json={"amount": max(500, coins_needed)}, timeout=15
    )
    if r.status_code >= 400:
        # try /coins/topup as alt
        r = session.post(
            f"{API}/market/topup", json={"coins": max(500, coins_needed)}, timeout=15
        )


# ----------------------------- (D) PUT /api/users/me --------------------------
class TestUsersMeGiftGateFields:
    def test_put_users_me_accepts_gift_gate(self, diego_session):
        r = diego_session.put(
            f"{API}/users/me",
            json={"gift_gate": True, "gift_gate_min": 20},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("gift_gate") is True
        assert body.get("gift_gate_min") == 20

    def test_gift_gate_min_bounds(self, diego_session):
        # Below 5 must reject
        r = diego_session.put(
            f"{API}/users/me", json={"gift_gate_min": 3}, timeout=15
        )
        assert r.status_code in (400, 422)
        # Above 1000 must reject
        r = diego_session.put(
            f"{API}/users/me", json={"gift_gate_min": 1500}, timeout=15
        )
        assert r.status_code in (400, 422)

    def test_user_card_includes_gift_gate(self, mei_session, diego_id):
        r = mei_session.get(f"{API}/users/{diego_id}", timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert "gift_gate" in body
        assert "gift_gate_min" in body
        assert body["gift_gate"] is True
        assert body["gift_gate_min"] == 20


# ----------------------------- (B) Gift Gate ----------------------------------
class TestGiftGate:
    def test_practice_status_reflects_gift_gate(self, mei_session, diego_id):
        r = mei_session.get(f"{API}/practice/status/{diego_id}", timeout=15)
        assert r.status_code == 200, r.text
        s = r.json()
        assert s["is_gift_gate"] is True
        assert s["gift_min"] == 20
        assert s["gift_unlocked"] is False

    def test_message_send_blocked_402(self, mei_session, conversation):
        r = mei_session.post(
            f"{API}/chats/{conversation['id']}/messages",
            json={"text": "hi"},
            timeout=15,
        )
        assert r.status_code == 402, r.text
        detail = r.json().get("detail", "")
        assert detail.startswith("gift_gate:"), detail

    def test_cheaper_gift_does_not_unlock(
        self, mei_session, conversation, diego_id
    ):
        _topup(mei_session, 10)
        r = mei_session.post(
            f"{API}/chats/{conversation['id']}/gift",
            json={"gift_id": "rose"},  # 10 coins < 20 min
            timeout=15,
        )
        # Should succeed as a gift (payment ok) but NOT unlock chat
        assert r.status_code == 201, r.text
        body = r.json()
        assert body.get("unlocked") is False
        # Confirm still gated
        s = mei_session.get(f"{API}/practice/status/{diego_id}", timeout=15).json()
        assert s["gift_unlocked"] is False
        r2 = mei_session.post(
            f"{API}/chats/{conversation['id']}/messages",
            json={"text": "still gated?"},
            timeout=15,
        )
        assert r2.status_code == 402

    def test_qualifying_gift_unlocks(
        self, mei_session, conversation, diego_id, diego_session
    ):
        _topup(mei_session, 20)
        me_before = mei_session.get(f"{API}/auth/me", timeout=15).json()
        diego_before = diego_session.get(f"{API}/auth/me", timeout=15).json()
        coins_before = int(me_before.get("coins") or 0)
        diego_coins_before = int(diego_before.get("coins") or 0)

        r = mei_session.post(
            f"{API}/chats/{conversation['id']}/gift",
            json={"gift_id": "heart"},  # 20 coins
            timeout=15,
        )
        assert r.status_code == 201, r.text
        body = r.json()
        assert body.get("unlocked") is True
        assert body.get("coins") == coins_before - 20

        # Partner received coins
        diego_after = diego_session.get(f"{API}/auth/me", timeout=15).json()
        assert int(diego_after["coins"]) == diego_coins_before + 20

        # Now messages send OK
        r2 = mei_session.post(
            f"{API}/chats/{conversation['id']}/messages",
            json={"text": "unlocked hello"},
            timeout=15,
        )
        assert r2.status_code == 201, r2.text

        # practice/status reflects unlock
        s = mei_session.get(f"{API}/practice/status/{diego_id}", timeout=15).json()
        assert s["gift_unlocked"] is True


# ----------------------------- (A) Read Receipts ------------------------------
class TestReadReceipts:
    def test_partner_read_at_updates(
        self, mei_session, diego_session, conversation, mei_id, diego_id
    ):
        # Ensure sending is unlocked (previous test already sent qualifying gift)
        # mei sends a new message
        send = mei_session.post(
            f"{API}/chats/{conversation['id']}/messages",
            json={"text": "TEST_ping for read receipt"},
            timeout=15,
        )
        assert send.status_code == 201, send.text
        sent_at = send.json()["created_at"]

        # diego finds the conversation (fetch by list to get id from diego's side)
        convs = diego_session.get(f"{API}/chats", timeout=15).json()
        diego_conv = next(
            (c for c in convs if c.get("partner", {}).get("id") == mei_id), None
        )
        assert diego_conv, "diego cannot see the conversation"

        # diego marks as read
        r = diego_session.post(
            f"{API}/chats/{diego_conv['id']}/read", timeout=15
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("ok") is True

        # small delay for storage
        time.sleep(0.5)

        # mei fetches conversation → partner_read_at should be >= sent_at
        r2 = mei_session.get(
            f"{API}/chats/{conversation['id']}", timeout=15
        )
        assert r2.status_code == 200
        data = r2.json()
        assert "partner_read_at" in data
        assert data["partner_read_at"] is not None
        assert data["partner_read_at"] >= sent_at, (
            f"partner_read_at {data['partner_read_at']} < sent_at {sent_at}"
        )


# ----------------------------- (C) Paid Practice Gate -------------------------
class TestPaidPracticeGate:
    def test_full_flow(
        self, mei_session, diego_session, conversation, diego_id, mei_id
    ):
        # Turn OFF gift gate to isolate the paid-practice gate
        r = diego_session.put(
            f"{API}/users/me",
            json={
                "paid_practice": True,
                "practice_rate": 50,
                "gift_gate": False,
            },
            timeout=15,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["paid_practice"] is True
        assert body["practice_rate"] == 50

        # Also invalidate any prior gift unlock by using a fresh buyer angle:
        # We ensure the gate applies — but note prior test used gift for chat unlock,
        # paid_practice is a separate gate. Even with gift unlock, paid practice
        # unlock is required.
        s = mei_session.get(f"{API}/practice/status/{diego_id}", timeout=15).json()
        assert s["is_paid_partner"] is True
        assert s["unlocked"] is False

        # Messages 402
        r2 = mei_session.post(
            f"{API}/chats/{conversation['id']}/messages",
            json={"text": "TEST_before unlock"},
            timeout=15,
        )
        assert r2.status_code == 402, r2.text

        # Unlock
        _topup(mei_session, 50)
        me_before = mei_session.get(f"{API}/auth/me", timeout=15).json()
        diego_before = diego_session.get(f"{API}/auth/me", timeout=15).json()
        coins_before = int(me_before.get("coins") or 0)
        diego_coins_before = int(diego_before.get("coins") or 0)

        r3 = mei_session.post(
            f"{API}/practice/unlock/{diego_id}", timeout=15
        )
        assert r3.status_code == 200, r3.text
        body3 = r3.json()
        assert body3.get("ok") is True
        assert body3.get("expires_at")
        assert body3.get("coins") == coins_before - 50

        # partner credited
        diego_after = diego_session.get(f"{API}/auth/me", timeout=15).json()
        assert int(diego_after["coins"]) == diego_coins_before + 50

        # Message now sends OK
        r4 = mei_session.post(
            f"{API}/chats/{conversation['id']}/messages",
            json={"text": "TEST_after unlock"},
            timeout=15,
        )
        assert r4.status_code == 201, r4.text
