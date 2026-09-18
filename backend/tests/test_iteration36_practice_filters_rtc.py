"""Iteration 36 targeted regression for practice filters + call countdown guards.

# Module: practice partners filters validation/casefold/no-injection behavior
# Module: availability-stored filters applied in direct call + random matching
# Module: rtc authoritative expires_at, 45s no-answer expiry, 30s connecting expiry
"""

from __future__ import annotations

import asyncio
import json
import os
import time
from urllib.parse import quote, urlparse

import pytest
import requests
import websockets
from dotenv import load_dotenv


load_dotenv("/app/frontend/.env")

BASE_URL = (os.environ.get("EXPO_BACKEND_URL") or "").strip().strip("'").rstrip("/")
QA1_EMAIL = "qa_tester_b40dc299@linguatest.com"
QA2_EMAIL = "qa_guest_removal_67403793@linguatest.com"
QA_PASSWORD = "QATest2026!"


def _base() -> str:
    if not BASE_URL:
        pytest.skip("EXPO_BACKEND_URL missing; cannot run public endpoint tests")
    return BASE_URL


def _hdr(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _ws_url(base_url: str, token: str) -> str:
    p = urlparse(base_url)
    scheme = "wss" if p.scheme == "https" else "ws"
    return f"{scheme}://{p.netloc}/api/ws?token={token}"


def _login(session: requests.Session, email: str, password: str) -> tuple[str, dict]:
    res = session.post(
        f"{_base()}/api/auth/login",
        json={"email": email, "password": password},
        timeout=30,
    )
    assert res.status_code == 200, f"login failed for {email}: {res.status_code} {res.text[:160]}"
    data = res.json()
    return data["token"], data["user"]


def _recv_type(payload: str) -> str:
    try:
        return json.loads(payload).get("type", "")
    except Exception:
        return ""


@pytest.fixture(scope="module")
def state() -> dict:
    s = requests.Session()
    base = _base()
    t1, u1 = _login(s, QA1_EMAIL, QA_PASSWORD)
    t2, u2 = _login(s, QA2_EMAIL, QA_PASSWORD)
    me1 = s.get(f"{base}/api/auth/me", headers=_hdr(t1), timeout=30)
    me2 = s.get(f"{base}/api/auth/me", headers=_hdr(t2), timeout=30)
    assert me1.status_code == 200 and me2.status_code == 200
    st = {
        "s": s,
        "base": base,
        "qa1": {"token": t1, "user": u1, "orig": me1.json()},
        "qa2": {"token": t2, "user": u2, "orig": me2.json()},
    }
    yield st

    for t in (t1, t2):
        try:
            s.delete(f"{base}/api/rtc/practice/queue", headers=_hdr(t), timeout=20)
        except Exception:
            pass
        try:
            s.put(
                f"{base}/api/rtc/practice/availability",
                json={"available": False, "language": "en"},
                headers=_hdr(t),
                timeout=20,
            )
        except Exception:
            pass

    for key in ("qa1", "qa2"):
        token = st[key]["token"]
        orig = st[key]["orig"]
        payload = {
            "native_language": orig.get("native_language"),
            "learning_language": orig.get("learning_language"),
            "learning_languages": orig.get("learning_languages"),
            "gender": orig.get("gender"),
            "proficiency": orig.get("proficiency"),
            "proficiencies": orig.get("proficiencies") or {},
        }
        try:
            s.put(f"{base}/api/users/me", json=payload, headers=_hdr(token), timeout=30)
        except Exception:
            pass


class TestPracticeFiltersAndMatching:
    def test_partners_filters_validation_casefold_and_literal_country_match(self, state):
        s = state["s"]
        base = state["base"]
        t1 = state["qa1"]["token"]
        t2 = state["qa2"]["token"]

        qa2_country = (state["qa2"]["orig"].get("country") or "").strip()
        if not qa2_country:
            pytest.skip("QA2 has no country set; country filter cannot be validated")

        for t in (t1, t2):
            s.put(
                f"{base}/api/rtc/practice/availability",
                json={"available": True, "language": "all", "filters": {}},
                headers=_hdr(t),
                timeout=30,
            )

        clean = s.get(f"{base}/api/rtc/practice/partners?language=all", headers=_hdr(t1), timeout=30)
        assert clean.status_code == 200

        padded = quote(f"  {qa2_country.upper()}  ")
        res_country = s.get(
            f"{base}/api/rtc/practice/partners?language=all&country={padded}",
            headers=_hdr(t1),
            timeout=30,
        )
        assert res_country.status_code == 200
        ids = {p["id"] for p in res_country.json().get("partners", [])}
        assert state["qa2"]["user"]["id"] in ids

        inj = quote(f"{qa2_country}' OR 1=1 --")
        res_inj = s.get(
            f"{base}/api/rtc/practice/partners?language=all&country={inj}",
            headers=_hdr(t1),
            timeout=30,
        )
        assert res_inj.status_code == 200
        inj_ids = {p["id"] for p in res_inj.json().get("partners", [])}
        assert state["qa2"]["user"]["id"] not in inj_ids

        for key, value in (
            ("native_language", "xx"),
            ("gender", "alien"),
            ("age_group", "1-2"),
            ("level", "Expert"),
        ):
            invalid = s.get(
                f"{base}/api/rtc/practice/partners?language=all&{key}={quote(value)}",
                headers=_hdr(t1),
                timeout=30,
            )
            assert invalid.status_code == 422, f"{key}={value} should be rejected"

    def test_direct_call_rechecks_stored_availability_filters(self, state):
        s = state["s"]
        base = state["base"]
        t1 = state["qa1"]["token"]
        t2 = state["qa2"]["token"]
        qa2_id = state["qa2"]["user"]["id"]

        async def _case():
            async with websockets.connect(_ws_url(base, t1)), websockets.connect(_ws_url(base, t2)):
                await asyncio.sleep(0.2)
                a1 = s.put(
                    f"{base}/api/rtc/practice/availability",
                    json={
                        "available": True,
                        "language": "all",
                        "filters": {"country": "Neverland", "native_language": "", "gender": "", "age_group": "", "level": "", "has_avatar": False},
                    },
                    headers=_hdr(t1),
                    timeout=30,
                )
                a2 = s.put(
                    f"{base}/api/rtc/practice/availability",
                    json={"available": True, "language": "all", "filters": {}},
                    headers=_hdr(t2),
                    timeout=30,
                )
                assert a1.status_code == 200 and a2.status_code == 200

                blocked = s.post(
                    f"{base}/api/rtc/practice/call",
                    json={"receiver_id": qa2_id},
                    headers=_hdr(t1),
                    timeout=30,
                )
                assert blocked.status_code == 409

                relax = s.put(
                    f"{base}/api/rtc/practice/availability",
                    json={"available": True, "language": "all", "filters": {}},
                    headers=_hdr(t1),
                    timeout=30,
                )
                assert relax.status_code == 200

                ok = s.post(
                    f"{base}/api/rtc/practice/call",
                    json={"receiver_id": qa2_id},
                    headers=_hdr(t1),
                    timeout=30,
                )
                assert ok.status_code == 200
                data = ok.json()
                assert data.get("call_id") and data.get("expires_at")
                end = s.post(
                    f"{base}/api/rtc/calls/{data['call_id']}/status",
                    json={"status": "CANCELLED"},
                    headers=_hdr(t1),
                    timeout=30,
                )
                assert end.status_code == 200

        asyncio.run(_case())

    def test_random_match_enforces_both_sides_preferences(self, state):
        s = state["s"]
        base = state["base"]
        t1 = state["qa1"]["token"]
        t2 = state["qa2"]["token"]

        # deterministic native languages for preference checks
        set1 = s.put(
            f"{base}/api/users/me",
            json={"native_language": "en", "learning_language": "es", "learning_languages": ["es"]},
            headers=_hdr(t1),
            timeout=30,
        )
        set2 = s.put(
            f"{base}/api/users/me",
            json={"native_language": "de", "learning_language": "fr", "learning_languages": ["fr"]},
            headers=_hdr(t2),
            timeout=30,
        )
        assert set1.status_code == 200 and set2.status_code == 200

        async def _case():
            async with websockets.connect(_ws_url(base, t1)), websockets.connect(_ws_url(base, t2)):
                await asyncio.sleep(0.2)
                # mismatch on caller-side preferences => no pair
                s.put(
                    f"{base}/api/rtc/practice/availability",
                    json={"available": True, "language": "all", "filters": {"country": "", "native_language": "bn", "gender": "", "age_group": "", "level": "", "has_avatar": False}},
                    headers=_hdr(t1),
                    timeout=30,
                )
                s.put(
                    f"{base}/api/rtc/practice/availability",
                    json={"available": True, "language": "all", "filters": {"country": "", "native_language": "en", "gender": "", "age_group": "", "level": "", "has_avatar": False}},
                    headers=_hdr(t2),
                    timeout=30,
                )
                first = s.post(f"{base}/api/rtc/practice/queue", headers=_hdr(t1), timeout=30)
                second = s.post(f"{base}/api/rtc/practice/queue", headers=_hdr(t2), timeout=30)
                assert first.status_code == 200 and second.status_code == 200
                assert first.json().get("state") == "searching"
                assert second.json().get("state") == "searching"

                s.delete(f"{base}/api/rtc/practice/queue", headers=_hdr(t1), timeout=30)
                s.delete(f"{base}/api/rtc/practice/queue", headers=_hdr(t2), timeout=30)

                # compatible both sides => match
                s.put(
                    f"{base}/api/rtc/practice/availability",
                    json={"available": True, "language": "all", "filters": {}},
                    headers=_hdr(t1),
                    timeout=30,
                )
                s.put(
                    f"{base}/api/rtc/practice/availability",
                    json={"available": True, "language": "all", "filters": {"country": "", "native_language": "en", "gender": "", "age_group": "", "level": "", "has_avatar": False}},
                    headers=_hdr(t2),
                    timeout=30,
                )
                q1 = s.post(f"{base}/api/rtc/practice/queue", headers=_hdr(t1), timeout=30)
                q2 = s.post(f"{base}/api/rtc/practice/queue", headers=_hdr(t2), timeout=30)
                assert q1.status_code == 200 and q2.status_code == 200
                matched = q2.json() if q2.json().get("state") == "matched" else q1.json()
                assert matched.get("state") == "matched"
                assert matched.get("expires_at") and matched.get("call_id")
                assert 30000 <= matched["expires_at"] - int(time.time() * 1000) <= 50000

                end = s.post(
                    f"{base}/api/rtc/calls/{matched['call_id']}/status",
                    json={"status": "CANCELLED"},
                    headers=_hdr(t1),
                    timeout=30,
                )
                assert end.status_code == 200

        asyncio.run(_case())


class TestRtcCountdownAndAnswerRules:
    def test_calls_endpoint_sets_authoritative_expires_at_and_45s_no_answer(self, state):
        s = state["s"]
        base = state["base"]
        t1 = state["qa1"]["token"]
        t2 = state["qa2"]["token"]
        id2 = state["qa2"]["user"]["id"]

        async def _case():
            async with websockets.connect(_ws_url(base, t1)) as ws1, websockets.connect(_ws_url(base, t2)) as ws2:
                await asyncio.sleep(0.2)
                start = s.post(
                    f"{base}/api/rtc/calls",
                    json={"receiver_id": id2},
                    headers=_hdr(t1),
                    timeout=30,
                )
                assert start.status_code == 201, start.text
                data = start.json()
                call_id = data["call_id"]
                expires_at = data["expires_at"]
                delta = expires_at - int(time.time() * 1000)
                assert 35000 <= delta <= 50000

                await ws1.send(
                    json.dumps(
                        {
                            "type": "call_offer",
                            "to": id2,
                            "call_id": call_id,
                            "sdp": {"type": "offer", "sdp": "v=0"},
                        }
                    )
                )

                offer = await asyncio.wait_for(ws2.recv(), timeout=5)
                assert _recv_type(offer) == "call_offer"

                caller_end = None
                callee_end = None
                deadline = asyncio.get_running_loop().time() + 53
                while asyncio.get_running_loop().time() < deadline and (not caller_end or not callee_end):
                    if not caller_end:
                        try:
                            msg = await asyncio.wait_for(ws1.recv(), timeout=1.2)
                            if _recv_type(msg) == "call_end":
                                caller_end = msg
                        except asyncio.TimeoutError:
                            pass
                    if not callee_end:
                        try:
                            msg = await asyncio.wait_for(ws2.recv(), timeout=1.2)
                            if _recv_type(msg) == "call_end":
                                callee_end = msg
                        except asyncio.TimeoutError:
                            pass

                assert caller_end and callee_end, "both sides should receive call_end for no-answer"
                assert "no_answer" in caller_end or "no_answer" in callee_end

        asyncio.run(_case())

    def test_connecting_deadline_30s_after_accept_without_media_ready(self, state):
        s = state["s"]
        base = state["base"]
        t1 = state["qa1"]["token"]
        t2 = state["qa2"]["token"]
        id1 = state["qa1"]["user"]["id"]
        id2 = state["qa2"]["user"]["id"]

        async def _case():
            async with websockets.connect(_ws_url(base, t1)) as ws1, websockets.connect(_ws_url(base, t2)) as ws2:
                await asyncio.sleep(0.2)
                start = s.post(
                    f"{base}/api/rtc/calls",
                    json={"receiver_id": id2},
                    headers=_hdr(t1),
                    timeout=30,
                )
                assert start.status_code == 201
                call_id = start.json()["call_id"]

                await ws1.send(json.dumps({"type": "call_offer", "to": id2, "call_id": call_id, "sdp": {"type": "offer", "sdp": "v=0"}}))
                _ = await asyncio.wait_for(ws2.recv(), timeout=5)

                await ws2.send(json.dumps({"type": "call_answer", "to": id1, "call_id": call_id, "sdp": {"type": "answer", "sdp": "v=0"}}))
                ans = await asyncio.wait_for(ws1.recv(), timeout=5)
                assert _recv_type(ans) == "call_answer"

                end_seen = None
                deadline = asyncio.get_running_loop().time() + 38
                while asyncio.get_running_loop().time() < deadline and not end_seen:
                    try:
                        msg = await asyncio.wait_for(ws1.recv(), timeout=1.2)
                        if _recv_type(msg) == "call_end" and "connection_failed" in msg:
                            end_seen = msg
                            break
                    except asyncio.TimeoutError:
                        pass

                assert end_seen, "expected connection_failed call_end after ~30s without media_ready"

        asyncio.run(_case())

    def test_call_answer_receiver_only_before_accept_then_both_allowed(self, state):
        s = state["s"]
        base = state["base"]
        t1 = state["qa1"]["token"]
        t2 = state["qa2"]["token"]
        id1 = state["qa1"]["user"]["id"]
        id2 = state["qa2"]["user"]["id"]

        async def _case():
            async with websockets.connect(_ws_url(base, t1)) as ws1, websockets.connect(_ws_url(base, t2)) as ws2:
                await asyncio.sleep(0.2)
                start = s.post(
                    f"{base}/api/rtc/calls",
                    json={"receiver_id": id2},
                    headers=_hdr(t1),
                    timeout=30,
                )
                assert start.status_code == 201
                call_id = start.json()["call_id"]

                await ws1.send(json.dumps({"type": "call_offer", "to": id2, "call_id": call_id, "sdp": {"type": "offer", "sdp": "v=0"}}))
                _ = await asyncio.wait_for(ws2.recv(), timeout=5)

                # caller answer before acceptance should be ignored
                await ws1.send(json.dumps({"type": "call_answer", "to": id2, "call_id": call_id, "sdp": {"type": "answer", "sdp": "v=0"}}))
                pre_accept_leaked = False
                try:
                    msg = await asyncio.wait_for(ws2.recv(), timeout=1.3)
                    pre_accept_leaked = _recv_type(msg) == "call_answer"
                except asyncio.TimeoutError:
                    pre_accept_leaked = False
                assert pre_accept_leaked is False

                # receiver first answer should pass
                await ws2.send(json.dumps({"type": "call_answer", "to": id1, "call_id": call_id, "sdp": {"type": "answer", "sdp": "v=0"}}))
                first = await asyncio.wait_for(ws1.recv(), timeout=5)
                assert _recv_type(first) == "call_answer"

                # after accepted, caller answer (renegotiation) should pass
                await ws1.send(json.dumps({"type": "call_answer", "to": id2, "call_id": call_id, "sdp": {"type": "answer", "sdp": "v=1"}}))
                second = await asyncio.wait_for(ws2.recv(), timeout=5)
                assert _recv_type(second) == "call_answer"

                await ws1.send(json.dumps({"type": "call_end", "to": id2, "call_id": call_id}))

        asyncio.run(_case())
