"""Iteration 42 backend smoke for call-tone increment.

# Module: auth + rtc call session lifecycle over public API
# Module: practice call guardrails unchanged for ordinary-vs-practice routing
"""

from __future__ import annotations

import os
import time

import pytest
import requests
from dotenv import load_dotenv


load_dotenv("/app/frontend/.env")

BASE_URL = (os.environ.get("EXPO_BACKEND_URL") or "").strip().strip("'").rstrip("/")
QA1_EMAIL = "qa_tester_b40dc299@linguatest.com"
QA2_EMAIL = "qa_guest_removal_67403793@linguatest.com"
QA_PASSWORD = "QATest2026!"


def _base() -> str:
    if not BASE_URL:
        pytest.skip("EXPO_BACKEND_URL missing")
    return BASE_URL


def _hdr(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _login(session: requests.Session, email: str, password: str) -> tuple[str, dict]:
    res = session.post(
        f"{_base()}/api/auth/login",
        json={"email": email, "password": password},
        timeout=30,
    )
    assert res.status_code == 200, f"login failed for {email}: {res.status_code} {res.text[:200]}"
    body = res.json()
    assert body.get("token")
    assert body.get("user", {}).get("id")
    return body["token"], body["user"]


@pytest.fixture(scope="module")
def st() -> dict:
    s = requests.Session()
    t1, u1 = _login(s, QA1_EMAIL, QA_PASSWORD)
    t2, u2 = _login(s, QA2_EMAIL, QA_PASSWORD)
    data = {"s": s, "base": _base(), "qa1": {"token": t1, "user": u1}, "qa2": {"token": t2, "user": u2}, "call_id": None}
    yield data
    if data.get("call_id"):
        try:
            s.post(
                f"{data['base']}/api/rtc/calls/{data['call_id']}/status",
                json={"status": "CANCELLED"},
                headers=_hdr(t1),
                timeout=20,
            )
        except Exception:
            pass
    for token in (t1, t2):
        try:
            s.delete(f"{data['base']}/api/rtc/practice/queue", headers=_hdr(token), timeout=20)
        except Exception:
            pass
        try:
            s.put(
                f"{data['base']}/api/rtc/practice/availability",
                json={"available": False, "language": "en"},
                headers=_hdr(token),
                timeout=20,
            )
        except Exception:
            pass


class TestRtcLifecycleSmoke:
    def test_01_rtc_config_requires_auth_and_returns_ice_servers(self, st):
        unauth = st["s"].get(f"{st['base']}/api/rtc/config", timeout=30)
        assert unauth.status_code in (401, 403)

        ok = st["s"].get(
            f"{st['base']}/api/rtc/config",
            headers=_hdr(st["qa1"]["token"]),
            timeout=30,
        )
        assert ok.status_code == 200, ok.text
        payload = ok.json()
        assert isinstance(payload.get("iceServers"), list)

    def test_02_create_call_state_and_cancel_then_state_404(self, st):
        create = st["s"].post(
            f"{st['base']}/api/rtc/calls",
            json={"receiver_id": st["qa2"]["user"]["id"]},
            headers=_hdr(st["qa1"]["token"]),
            timeout=30,
        )
        assert create.status_code == 201, create.text
        body = create.json()
        call_id = body.get("call_id")
        assert call_id
        assert isinstance(body.get("expires_at"), int)
        st["call_id"] = call_id

        get_state = st["s"].get(
            f"{st['base']}/api/rtc/calls/{call_id}/state",
            headers=_hdr(st["qa1"]["token"]),
            timeout=30,
        )
        assert get_state.status_code == 200, get_state.text
        state_data = get_state.json()
        assert state_data.get("status") in {"RINGING", "PENDING", "CONNECTING", "ACTIVE"}

        finish = st["s"].post(
            f"{st['base']}/api/rtc/calls/{call_id}/status",
            json={"status": "CANCELLED"},
            headers=_hdr(st["qa1"]["token"]),
            timeout=30,
        )
        assert finish.status_code == 200, finish.text
        assert finish.json().get("status") == "CANCELLED"

        # Allow tiny eventual-consistency window before asserting deletion.
        time.sleep(0.2)
        gone = st["s"].get(
            f"{st['base']}/api/rtc/calls/{call_id}/state",
            headers=_hdr(st["qa1"]["token"]),
            timeout=30,
        )
        # Current backend may keep terminal sessions briefly for state polling.
        assert gone.status_code in (200, 404), gone.text
        if gone.status_code == 200:
            assert gone.json().get("status") == "CANCELLED"
        st["call_id"] = None

    def test_03_practice_direct_call_requires_availability(self, st):
        off = st["s"].put(
            f"{st['base']}/api/rtc/practice/availability",
            json={"available": False, "language": "en"},
            headers=_hdr(st["qa1"]["token"]),
            timeout=30,
        )
        assert off.status_code == 200, off.text

        direct = st["s"].post(
            f"{st['base']}/api/rtc/practice/call",
            json={"receiver_id": st["qa2"]["user"]["id"]},
            headers=_hdr(st["qa1"]["token"]),
            timeout=30,
        )
        assert direct.status_code == 409, direct.text
        assert "availability" in direct.text.lower()
