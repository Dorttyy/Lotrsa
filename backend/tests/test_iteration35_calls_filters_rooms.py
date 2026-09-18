"""Iteration 35 regression tests for practice-call filters + voice-room RTC guards.

# Module: practice availability language filters (All + non-All), queue matching/cancel
# Module: practice call guards (self, non-opted-in, blocked)
# Module: room WebRTC signaling membership guards (joined peers only; kicked/ended revokes)
"""

from __future__ import annotations

import asyncio
import json
import os
from urllib.parse import urlparse

import pytest
import requests
import websockets
from dotenv import load_dotenv


load_dotenv("/app/frontend/.env")
load_dotenv("/app/backend/.env")


BASE_URL = (os.environ.get("EXPO_BACKEND_URL") or "").strip().strip("'").rstrip("/")
QA1_EMAIL = "qa_tester_b40dc299@linguatest.com"
QA2_EMAIL = "qa_guest_removal_67403793@linguatest.com"
QA_PASSWORD = "QATest2026!"
ADMIN_EMAIL = "admin@lingua.app"
ADMIN_PASSWORD = (os.environ.get("ADMIN_PASSWORD") or "").strip().strip("'")


def _require_base_url() -> str:
    if not BASE_URL:
        pytest.skip("EXPO_BACKEND_URL missing; cannot run public endpoint tests")
    return BASE_URL


def _ws_url(base_url: str, token: str) -> str:
    parsed = urlparse(base_url)
    scheme = "wss" if parsed.scheme == "https" else "ws"
    return f"{scheme}://{parsed.netloc}/api/ws?token={token}"


def _hdr(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _login(session: requests.Session, email: str, password: str) -> tuple[str, dict]:
    res = session.post(
        f"{_require_base_url()}/api/auth/login",
        json={"email": email, "password": password},
        timeout=30,
    )
    assert res.status_code == 200, f"login failed for {email}: {res.status_code} {res.text[:200]}"
    data = res.json()
    return data["token"], data["user"]


@pytest.fixture(scope="module")
def state() -> dict:
    if not ADMIN_PASSWORD:
        pytest.skip("ADMIN_PASSWORD missing; cannot run outsider room relay checks")

    session = requests.Session()
    base = _require_base_url()

    qa1_token, qa1_user = _login(session, QA1_EMAIL, QA_PASSWORD)
    qa2_token, qa2_user = _login(session, QA2_EMAIL, QA_PASSWORD)
    admin_token, admin_user = _login(session, ADMIN_EMAIL, ADMIN_PASSWORD)

    qa1_me = session.get(f"{base}/api/auth/me", headers=_hdr(qa1_token), timeout=30)
    qa2_me = session.get(f"{base}/api/auth/me", headers=_hdr(qa2_token), timeout=30)
    assert qa1_me.status_code == 200 and qa2_me.status_code == 200

    tracker = {
        "session": session,
        "base": base,
        "qa1": {"token": qa1_token, "user": qa1_user, "orig": qa1_me.json()},
        "qa2": {"token": qa2_token, "user": qa2_user, "orig": qa2_me.json()},
        "admin": {"token": admin_token, "user": admin_user},
        "created_rooms": [],
    }
    yield tracker

    # cleanup availability/queue
    for token in (qa1_token, qa2_token):
        try:
            session.delete(f"{base}/api/rtc/practice/queue", headers=_hdr(token), timeout=20)
        except Exception:
            pass
        try:
            session.put(
                f"{base}/api/rtc/practice/availability",
                json={"available": False, "language": "en"},
                headers=_hdr(token),
                timeout=20,
            )
        except Exception:
            pass

    # unblock both directions if any test toggled block
    try:
        me = session.get(f"{base}/api/auth/me", headers=_hdr(qa1_token), timeout=20).json()
        if tracker["qa2"]["user"]["id"] in set(me.get("blocked_users") or []):
            session.post(
                f"{base}/api/users/{tracker['qa2']['user']['id']}/block",
                headers=_hdr(qa1_token),
                timeout=20,
            )
    except Exception:
        pass

    # end any created rooms
    for rid in tracker["created_rooms"]:
        try:
            session.post(f"{base}/api/rooms/{rid}/end", headers=_hdr(qa1_token), timeout=20)
        except Exception:
            pass

    # restore profiles
    for key in ("qa1", "qa2"):
        token = tracker[key]["token"]
        orig = tracker[key]["orig"]
        payload = {
            "native_language": orig.get("native_language"),
            "learning_language": orig.get("learning_language"),
            "learning_languages": orig.get("learning_languages"),
        }
        try:
            session.put(f"{base}/api/users/me", json=payload, headers=_hdr(token), timeout=30)
        except Exception:
            pass


class TestPracticeAllFilters:
    """Practice filters + queue behavior for new 'All + saved learning languages' scope."""

    def test_all_lists_cross_language_partner_but_nonall_filter_excludes(self, state):
        async def _case():
            s = state["session"]
            base = state["base"]
            t1 = state["qa1"]["token"]
            t2 = state["qa2"]["token"]
            id2 = state["qa2"]["user"]["id"]

            # QA1 saved-learning sample for frontend/backend parity: [es, fr, bn]
            set_qa1 = s.put(
                f"{base}/api/users/me",
                json={"native_language": "en", "learning_language": "es", "learning_languages": ["es", "fr", "bn"]},
                headers=_hdr(t1),
                timeout=30,
            )
            set_qa2 = s.put(
                f"{base}/api/users/me",
                json={"native_language": "de", "learning_language": "fr", "learning_languages": ["fr"]},
                headers=_hdr(t2),
                timeout=30,
            )
            assert set_qa1.status_code == 200 and set_qa2.status_code == 200

            async with websockets.connect(_ws_url(base, t1)), websockets.connect(_ws_url(base, t2)):
                await asyncio.sleep(0.2)
                a1 = s.put(
                    f"{base}/api/rtc/practice/availability",
                    json={"available": True, "language": "all"},
                    headers=_hdr(t1),
                    timeout=30,
                )
                a2 = s.put(
                    f"{base}/api/rtc/practice/availability",
                    json={"available": True, "language": "de"},
                    headers=_hdr(t2),
                    timeout=30,
                )
                assert a1.status_code == 200 and a2.status_code == 200

                all_list = s.get(f"{base}/api/rtc/practice/partners?language=all", headers=_hdr(t1), timeout=30)
                es_list = s.get(f"{base}/api/rtc/practice/partners?language=es", headers=_hdr(t1), timeout=30)
                assert all_list.status_code == 200 and es_list.status_code == 200

                all_ids = {p["id"] for p in all_list.json().get("partners", [])}
                es_ids = {p["id"] for p in es_list.json().get("partners", [])}
                assert id2 in all_ids, f"QA2 must appear under language=all. got={all_ids}"
                assert id2 not in es_ids, f"QA2(de) must not appear under es filter. got={es_ids}"

        asyncio.run(_case())

    def test_random_all_matches_with_different_queued_language(self, state):
        async def _case():
            s = state["session"]
            base = state["base"]
            t1 = state["qa1"]["token"]
            t2 = state["qa2"]["token"]

            async with websockets.connect(_ws_url(base, t1)), websockets.connect(_ws_url(base, t2)):
                await asyncio.sleep(0.2)
                assert s.put(
                    f"{base}/api/rtc/practice/availability",
                    json={"available": True, "language": "all"},
                    headers=_hdr(t1),
                    timeout=30,
                ).status_code == 200
                assert s.put(
                    f"{base}/api/rtc/practice/availability",
                    json={"available": True, "language": "de"},
                    headers=_hdr(t2),
                    timeout=30,
                ).status_code == 200

                first = s.post(f"{base}/api/rtc/practice/queue", headers=_hdr(t1), timeout=30)
                assert first.status_code == 200 and first.json().get("state") == "searching"

                second = s.post(f"{base}/api/rtc/practice/queue", headers=_hdr(t2), timeout=30)
                assert second.status_code == 200
                data = second.json()
                assert data.get("state") == "matched" and data.get("call_id"), data

                cancel_status = s.post(
                    f"{base}/api/rtc/calls/{data['call_id']}/status",
                    json={"status": "CANCELLED"},
                    headers=_hdr(t1),
                    timeout=30,
                )
                assert cancel_status.status_code == 200

        asyncio.run(_case())

    def test_delete_queue_cancels_pending_random_reservation_and_invalidates_signaling(self, state):
        async def _case():
            s = state["session"]
            base = state["base"]
            t1 = state["qa1"]["token"]
            t2 = state["qa2"]["token"]
            id2 = state["qa2"]["user"]["id"]

            async with websockets.connect(_ws_url(base, t1)) as ws1, websockets.connect(_ws_url(base, t2)) as ws2:
                await asyncio.sleep(0.2)
                assert s.put(
                    f"{base}/api/rtc/practice/availability",
                    json={"available": True, "language": "all"},
                    headers=_hdr(t1),
                    timeout=30,
                ).status_code == 200
                assert s.put(
                    f"{base}/api/rtc/practice/availability",
                    json={"available": True, "language": "de"},
                    headers=_hdr(t2),
                    timeout=30,
                ).status_code == 200

                assert s.post(f"{base}/api/rtc/practice/queue", headers=_hdr(t1), timeout=30).json()["state"] == "searching"
                matched = s.post(f"{base}/api/rtc/practice/queue", headers=_hdr(t2), timeout=30).json()
                assert matched.get("state") == "matched" and matched.get("call_id")
                call_id = matched["call_id"]

                cancelled = s.delete(f"{base}/api/rtc/practice/queue", headers=_hdr(t1), timeout=30)
                assert cancelled.status_code == 200 and cancelled.json().get("ok") is True

                # Reservation was ended by delete queue => call signaling now invalid.
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
                got_invalid = False
                end_by = asyncio.get_running_loop().time() + 4
                while asyncio.get_running_loop().time() < end_by:
                    msg = await asyncio.wait_for(ws1.recv(), timeout=1)
                    if "call_invalid" in msg:
                        got_invalid = True
                        break
                assert got_invalid, "expected call_invalid after queue cancellation finalized reservation"

                # peer should receive call_end broadcast from cancellation path
                got_end = False
                end_by = asyncio.get_running_loop().time() + 4
                while asyncio.get_running_loop().time() < end_by:
                    try:
                        peer_msg = await asyncio.wait_for(ws2.recv(), timeout=1)
                    except asyncio.TimeoutError:
                        continue
                    if "call_end" in peer_msg and call_id in peer_msg:
                        got_end = True
                        break
                assert got_end, "expected peer call_end broadcast on queue delete"

        asyncio.run(_case())


class TestPracticeGuards:
    """Practice guardrails: self/non-opt-in/blocked."""

    def test_direct_call_requires_opt_in_and_blocks_self(self, state):
        async def _case():
            s = state["session"]
            base = state["base"]
            t1 = state["qa1"]["token"]
            t2 = state["qa2"]["token"]
            id1 = state["qa1"]["user"]["id"]
            id2 = state["qa2"]["user"]["id"]

            async with websockets.connect(_ws_url(base, t1)), websockets.connect(_ws_url(base, t2)):
                await asyncio.sleep(0.2)
                assert s.put(
                    f"{base}/api/rtc/practice/availability",
                    json={"available": True, "language": "en"},
                    headers=_hdr(t1),
                    timeout=30,
                ).status_code == 200
                assert s.put(
                    f"{base}/api/rtc/practice/availability",
                    json={"available": False, "language": "en"},
                    headers=_hdr(t2),
                    timeout=30,
                ).status_code == 200

                not_opted = s.post(
                    f"{base}/api/rtc/practice/call",
                    json={"receiver_id": id2},
                    headers=_hdr(t1),
                    timeout=30,
                )
                assert not_opted.status_code == 409

                self_call = s.post(
                    f"{base}/api/rtc/practice/call",
                    json={"receiver_id": id1},
                    headers=_hdr(t1),
                    timeout=30,
                )
                assert self_call.status_code == 400

        asyncio.run(_case())

    def test_blocked_user_hidden_from_practice_partner_and_call(self, state):
        async def _case():
            s = state["session"]
            base = state["base"]
            t1 = state["qa1"]["token"]
            t2 = state["qa2"]["token"]
            id2 = state["qa2"]["user"]["id"]

            # block qa2 from qa1 side
            block = s.post(f"{base}/api/users/{id2}/block", headers=_hdr(t1), timeout=30)
            assert block.status_code == 200 and block.json().get("blocked") is True

            async with websockets.connect(_ws_url(base, t1)), websockets.connect(_ws_url(base, t2)):
                await asyncio.sleep(0.2)
                assert s.put(
                    f"{base}/api/rtc/practice/availability",
                    json={"available": True, "language": "en"},
                    headers=_hdr(t1),
                    timeout=30,
                ).status_code == 200
                assert s.put(
                    f"{base}/api/rtc/practice/availability",
                    json={"available": True, "language": "en"},
                    headers=_hdr(t2),
                    timeout=30,
                ).status_code == 200

                partners = s.get(f"{base}/api/rtc/practice/partners?language=en", headers=_hdr(t1), timeout=30)
                assert partners.status_code == 200
                ids = {p["id"] for p in partners.json().get("partners", [])}
                assert id2 not in ids, f"blocked user should not appear in partner list, got={ids}"

                direct = s.post(
                    f"{base}/api/rtc/practice/call",
                    json={"receiver_id": id2},
                    headers=_hdr(t1),
                    timeout=30,
                )
                assert direct.status_code == 409

            # unblock back (toggle endpoint)
            unblock = s.post(f"{base}/api/users/{id2}/block", headers=_hdr(t1), timeout=30)
            assert unblock.status_code == 200 and unblock.json().get("blocked") is False

        asyncio.run(_case())


class TestVoiceRoomRelayMembership:
    """Voice-room RTC relay should only pass between active room members."""

    def test_room_rtc_relay_allows_joined_peer_blocks_outsider_and_revokes_after_kick_end(self, state):
        async def _case():
            s = state["session"]
            base = state["base"]
            t1 = state["qa1"]["token"]
            t2 = state["qa2"]["token"]
            ta = state["admin"]["token"]
            id1 = state["qa1"]["user"]["id"]
            id2 = state["qa2"]["user"]["id"]

            create = s.post(
                f"{base}/api/rooms",
                json={"title": "TEST_iter35 relay", "language": "en"},
                headers=_hdr(t1),
                timeout=30,
            )
            assert create.status_code == 201, create.text
            room = create.json()
            room_id = room["id"]
            state["created_rooms"].append(room_id)

            joined = s.post(f"{base}/api/rooms/{room_id}/join", headers=_hdr(t2), timeout=30)
            assert joined.status_code == 200

            async with websockets.connect(_ws_url(base, t1)) as ws1, websockets.connect(_ws_url(base, t2)) as ws2, websockets.connect(_ws_url(base, ta)) as wsa:
                await asyncio.sleep(0.2)

                # joined peer relay should pass (qa2 -> qa1)
                await ws2.send(
                    json.dumps(
                        {
                            "type": "rtc_offer",
                            "to": id1,
                            "room_id": room_id,
                            "sdp": {"type": "offer", "sdp": "v=0"},
                        }
                    )
                )
                msg_for_host = await asyncio.wait_for(ws1.recv(), timeout=4)
                assert "rtc_offer" in msg_for_host and room_id in msg_for_host

                # outsider relay should be blocked (admin not in room)
                await wsa.send(
                    json.dumps(
                        {
                            "type": "rtc_offer",
                            "to": id1,
                            "room_id": room_id,
                            "sdp": {"type": "offer", "sdp": "v=0"},
                        }
                    )
                )
                blocked = False
                try:
                    unexpected = await asyncio.wait_for(ws1.recv(), timeout=1.5)
                    blocked = "rtc_offer" in unexpected and '"from":"' + state["admin"]["user"]["id"] + '"' in unexpected
                except asyncio.TimeoutError:
                    blocked = False
                assert blocked is False, "outsider rtc_offer should not relay to room members"

                # kick qa2 => relay should stop for qa2 immediately
                kicked = s.post(
                    f"{base}/api/rooms/{room_id}/kick",
                    json={"user_id": id2},
                    headers=_hdr(t1),
                    timeout=30,
                )
                assert kicked.status_code == 200

                await ws2.send(
                    json.dumps(
                        {
                            "type": "rtc_offer",
                            "to": id1,
                            "room_id": room_id,
                            "sdp": {"type": "offer", "sdp": "v=0"},
                        }
                    )
                )
                blocked_after_kick = False
                try:
                    unexpected2 = await asyncio.wait_for(ws1.recv(), timeout=1.5)
                    blocked_after_kick = "rtc_offer" in unexpected2 and '"from":"' + id2 + '"' in unexpected2
                except asyncio.TimeoutError:
                    blocked_after_kick = False
                assert blocked_after_kick is False, "kicked member rtc_offer should not relay"

                # end room => any rtc signal should stop relaying
                ended = s.post(f"{base}/api/rooms/{room_id}/end", headers=_hdr(t1), timeout=30)
                assert ended.status_code == 200

                await ws1.send(
                    json.dumps(
                        {
                            "type": "rtc_offer",
                            "to": id2,
                            "room_id": room_id,
                            "sdp": {"type": "offer", "sdp": "v=0"},
                        }
                    )
                )
                blocked_after_end = False
                try:
                    unexpected3 = await asyncio.wait_for(ws2.recv(), timeout=1.5)
                    blocked_after_end = "rtc_offer" in unexpected3 and '"from":"' + id1 + '"' in unexpected3
                except asyncio.TimeoutError:
                    blocked_after_end = False
                assert blocked_after_end is False, "rtc relay should stop after room end"

        asyncio.run(_case())
