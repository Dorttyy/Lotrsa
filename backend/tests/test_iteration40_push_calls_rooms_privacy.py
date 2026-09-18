"""Iteration 40 targeted backend verification.

# Module: push registration guardrails + non-blocking push failures
# Module: calling/ringing ownership + incoming-offer privacy
# Module: room hand/invite privacy + private stage-reject events
"""

from __future__ import annotations

import asyncio
import json
import os
import re
import uuid
from urllib.parse import urlparse

import pytest
import requests
import websockets
from dotenv import load_dotenv


load_dotenv("/app/frontend/.env")

BASE_URL = (os.environ.get("EXPO_BACKEND_URL") or "").strip().strip("'").rstrip("/")
QA1_EMAIL = "qa_tester_b40dc299@linguatest.com"
QA2_EMAIL = "qa_guest_removal_67403793@linguatest.com"
QA_PASSWORD = "QATest2026!"
ADMIN_EMAIL = "admin@lingua.app"


def _admin_password_from_memory() -> str:
    path = "/app/memory/test_credentials.md"
    if not os.path.exists(path):
        return ""
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    m = re.search(r"\|\s*Preview admin\s*\|\s*admin@lingua\.app\s*\|\s*([^|]+)\|", text)
    return (m.group(1).strip() if m else "")


ADMIN_PASSWORD = _admin_password_from_memory()


def _require_base() -> str:
    if not BASE_URL:
        pytest.skip("EXPO_BACKEND_URL missing")
    return BASE_URL


def _hdr(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _ws_url(base_url: str, token: str) -> str:
    p = urlparse(base_url)
    scheme = "wss" if p.scheme == "https" else "ws"
    return f"{scheme}://{p.netloc}/api/ws?token={token}"


def _login(session: requests.Session, email: str, password: str) -> tuple[str, dict]:
    res = session.post(
        f"{_require_base()}/api/auth/login",
        json={"email": email, "password": password},
        timeout=30,
    )
    assert res.status_code == 200, f"login failed for {email}: {res.status_code} {res.text[:180]}"
    body = res.json()
    assert body.get("token")
    assert body.get("user", {}).get("id")
    return body["token"], body["user"]


@pytest.fixture(scope="module")
def st() -> dict:
    if not ADMIN_PASSWORD:
        pytest.skip("Admin password not found in /app/memory/test_credentials.md")
    s = requests.Session()
    base = _require_base()
    t1, u1 = _login(s, QA1_EMAIL, QA_PASSWORD)
    t2, u2 = _login(s, QA2_EMAIL, QA_PASSWORD)
    ta, ua = _login(s, ADMIN_EMAIL, ADMIN_PASSWORD)
    data = {
        "s": s,
        "base": base,
        "qa1": {"token": t1, "user": u1},
        "qa2": {"token": t2, "user": u2},
        "admin": {"token": ta, "user": ua},
        "rooms": [],
        "calls": [],
    }
    yield data
    for rid in data["rooms"]:
        for token in (t1, t2, ta):
            try:
                s.post(f"{base}/api/rooms/{rid}/end", headers=_hdr(token), timeout=10)
            except Exception:
                pass
    for cid in data["calls"]:
        for token in (t1, t2, ta):
            try:
                s.post(
                    f"{base}/api/rtc/calls/{cid}/status",
                    json={"status": "CANCELLED"},
                    headers=_hdr(token),
                    timeout=10,
                )
            except Exception:
                pass


def _create_room(st: dict, title: str) -> dict:
    res = st["s"].post(
        f"{st['base']}/api/rooms",
        json={"title": title, "language": "en"},
        headers=_hdr(st["qa1"]["token"]),
        timeout=30,
    )
    assert res.status_code == 201, res.text
    room = res.json()
    st["rooms"].append(room["id"])
    return room


class TestPush:
    def test_register_push_placeholder_returns_503_not_fake_200(self, st):
        res = st["s"].post(
            f"{st['base']}/api/register-push",
            json={
                "user_id": st["qa2"]["user"]["id"],  # spoof attempt; backend must ignore
                "platform": "android",
                "device_token": "a" * 24,
            },
            headers=_hdr(st["qa1"]["token"]),
            timeout=30,
        )
        assert res.status_code == 503

    def test_register_push_validates_platform_and_token_length(self, st):
        bad_platform = st["s"].post(
            f"{st['base']}/api/register-push",
            json={"user_id": "x", "platform": "web", "device_token": "a" * 24},
            headers=_hdr(st["qa1"]["token"]),
            timeout=30,
        )
        assert bad_platform.status_code == 422
        short_token = st["s"].post(
            f"{st['base']}/api/register-push",
            json={"user_id": "x", "platform": "ios", "device_token": "short"},
            headers=_hdr(st["qa1"]["token"]),
            timeout=30,
        )
        assert short_token.status_code == 422

    def test_chat_message_persists_even_when_push_unconfigured(self, st):
        conv = st["s"].post(
            f"{st['base']}/api/chats",
            json={"partner_id": st["qa2"]["user"]["id"]},
            headers=_hdr(st["qa1"]["token"]),
            timeout=30,
        )
        assert conv.status_code == 200
        cid = conv.json()["id"]
        text = f"TEST_iter40_push_nonblocking_{uuid.uuid4().hex[:8]}"
        msg = st["s"].post(
            f"{st['base']}/api/chats/{cid}/messages",
            json={"text": text},
            headers=_hdr(st["qa1"]["token"]),
            timeout=30,
        )
        assert msg.status_code == 201, msg.text
        mid = msg.json().get("id")
        assert mid and msg.json().get("text") == text
        msgs = st["s"].get(
            f"{st['base']}/api/chats/{cid}/messages",
            headers=_hdr(st["qa2"]["token"]),
            timeout=30,
        )
        assert msgs.status_code == 200
        assert any(m.get("id") == mid and m.get("text") == text for m in msgs.json())


class TestCalls:
    def test_captions_routes_unregistered_intentional_404(self, st):
        c1 = st["s"].get(
            f"{st['base']}/api/rtc/calls/not-real/captions",
            headers=_hdr(st["qa1"]["token"]),
            timeout=30,
        )
        c2 = st["s"].post(
            f"{st['base']}/api/rtc/calls/not-real/audio",
            data=b"\x00" * 100,
            headers={**_hdr(st["qa1"]["token"]), "Content-Type": "application/octet-stream"},
            timeout=30,
        )
        assert c1.status_code == 404
        assert c2.status_code == 404

    def test_offline_offer_returns_call_unavailable(self, st):
        async def _case():
            create = st["s"].post(
                f"{st['base']}/api/rtc/calls",
                json={"receiver_id": st["admin"]["user"]["id"]},
                headers=_hdr(st["qa1"]["token"]),
                timeout=30,
            )
            if create.status_code == 409:
                pytest.skip(f"Call precondition blocked: {create.text}")
            assert create.status_code == 201, create.text
            call_id = create.json()["call_id"]
            st["calls"].append(call_id)
            async with websockets.connect(_ws_url(st["base"], st["qa1"]["token"])) as ws1:
                await ws1.send(json.dumps({
                    "type": "call_offer",
                    "to": st["admin"]["user"]["id"],
                    "call_id": call_id,
                    "sdp": {"type": "offer", "sdp": "v=0"},
                }))
                evt = json.loads(await asyncio.wait_for(ws1.recv(), timeout=6))
                assert evt.get("type") == "call_unavailable"
                assert evt.get("call_id") == call_id

        asyncio.run(_case())

    def test_incoming_visibility_and_ringing_ownership(self, st):
        async def _case():
            receiver_key = None
            create = None
            for candidate in ("qa2", "admin"):
                attempt = st["s"].post(
                    f"{st['base']}/api/rtc/calls",
                    json={"receiver_id": st[candidate]["user"]["id"]},
                    headers=_hdr(st["qa1"]["token"]),
                    timeout=30,
                )
                if attempt.status_code == 201:
                    receiver_key = candidate
                    create = attempt
                    break
            if create is None:
                pytest.skip("Could not create call for visibility test (all candidate receivers busy)")

            call_id = create.json()["call_id"]
            st["calls"].append(call_id)
            receiver = st[receiver_key]
            outsider = st["admin"] if receiver_key == "qa2" else st["qa2"]
            async with websockets.connect(_ws_url(st["base"], st["qa1"]["token"])) as ws1, websockets.connect(
                _ws_url(st["base"], receiver["token"])
            ) as ws2:
                await ws1.send(json.dumps({
                    "type": "call_offer",
                    "to": receiver["user"]["id"],
                    "call_id": call_id,
                    "sdp": {"type": "offer", "sdp": "v=0"},
                }))
                offer = json.loads(await asyncio.wait_for(ws2.recv(), timeout=6))
                assert offer.get("type") == "call_offer"
                mine = st["s"].get(f"{st['base']}/api/rtc/incoming", headers=_hdr(receiver["token"]), timeout=30)
                caller_view = st["s"].get(f"{st['base']}/api/rtc/incoming", headers=_hdr(st["qa1"]["token"]), timeout=30)
                outsider_view = st["s"].get(f"{st['base']}/api/rtc/incoming", headers=_hdr(outsider["token"]), timeout=30)
                assert any(o.get("call_id") == call_id for o in mine.json().get("offers", []))
                assert not any(o.get("call_id") == call_id for o in caller_view.json().get("offers", []))
                assert not any(o.get("call_id") == call_id for o in outsider_view.json().get("offers", []))

                # Invalid ownership: caller cannot emit call_ringing.
                await ws1.send(json.dumps({"type": "call_ringing", "to": receiver["user"]["id"], "call_id": call_id}))
                with pytest.raises(asyncio.TimeoutError):
                    await asyncio.wait_for(ws2.recv(), timeout=1.2)

                # Valid ownership: receiver call_ringing reaches caller.
                await ws2.send(json.dumps({"type": "call_ringing", "to": st["qa1"]["user"]["id"], "call_id": call_id}))
                ringing = json.loads(await asyncio.wait_for(ws1.recv(), timeout=5))
                assert ringing.get("type") == "call_ringing"
                assert ringing.get("call_id") == call_id

        asyncio.run(_case())


class TestRoomsPrivacy:
    def test_hand_and_invitation_visibility_and_private_reject_events(self, st):
        async def _case():
            room = _create_room(st, f"TEST_iter40_privacy_{uuid.uuid4().hex[:6]}")
            rid = room["id"]
            j2 = st["s"].post(f"{st['base']}/api/rooms/{rid}/join", headers=_hdr(st["qa2"]["token"]), timeout=30)
            ja = st["s"].post(f"{st['base']}/api/rooms/{rid}/join", headers=_hdr(st["admin"]["token"]), timeout=30)
            assert j2.status_code == 200 and ja.status_code == 200

            # Join messages should appear once per join in room chat stream.
            msgs = st["s"].get(f"{st['base']}/api/rooms/{rid}/messages", headers=_hdr(st["qa1"]["token"]), timeout=30)
            assert msgs.status_code == 200
            q2_join = f"{st['qa2']['user']['name']} joined the room"
            ad_join = f"{st['admin']['user']['name']} joined the room"
            assert sum(1 for m in msgs.json() if m.get("type") == "system" and m.get("text") == q2_join) == 1
            assert sum(1 for m in msgs.json() if m.get("type") == "system" and m.get("text") == ad_join) == 1

            hand = st["s"].post(f"{st['base']}/api/rooms/{rid}/hand", headers=_hdr(st["qa2"]["token"]), timeout=30)
            assert hand.status_code == 200 and hand.json().get("hand_raised") is True

            host_view = st["s"].get(f"{st['base']}/api/rooms/{rid}", headers=_hdr(st["qa1"]["token"]), timeout=30).json()
            self_view = st["s"].get(f"{st['base']}/api/rooms/{rid}", headers=_hdr(st["qa2"]["token"]), timeout=30).json()
            outsider_view = st["s"].get(f"{st['base']}/api/rooms/{rid}", headers=_hdr(st["admin"]["token"]), timeout=30).json()

            def member(doc: dict, uid: str) -> dict:
                return next(m for m in doc["members"] if m["id"] == uid)

            q2_id = st["qa2"]["user"]["id"]
            assert member(host_view, q2_id).get("hand_raised") is True
            assert member(self_view, q2_id).get("hand_raised") is True
            assert member(outsider_view, q2_id).get("hand_raised") is False

            inv = st["s"].post(
                f"{st['base']}/api/rooms/{rid}/stage/invite",
                json={"user_id": q2_id},
                headers=_hdr(st["qa1"]["token"]),
                timeout=30,
            )
            assert inv.status_code == 200, inv.text

            host_after_inv = st["s"].get(f"{st['base']}/api/rooms/{rid}", headers=_hdr(st["qa1"]["token"]), timeout=30).json()
            self_after_inv = st["s"].get(f"{st['base']}/api/rooms/{rid}", headers=_hdr(st["qa2"]["token"]), timeout=30).json()
            outsider_after_inv = st["s"].get(f"{st['base']}/api/rooms/{rid}", headers=_hdr(st["admin"]["token"]), timeout=30).json()
            assert member(host_after_inv, q2_id).get("stage_invited") is True
            assert member(self_after_inv, q2_id).get("stage_invited") is True
            assert member(outsider_after_inv, q2_id).get("stage_invited") is False

            invitation = st["s"].get(
                f"{st['base']}/api/rooms/{rid}/stage/invitation",
                headers=_hdr(st["qa2"]["token"]),
                timeout=30,
            )
            invitation_id = (invitation.json().get("invitation") or {}).get("id")
            assert invitation_id

            async with websockets.connect(_ws_url(st["base"], st["qa1"]["token"])) as ws_host, websockets.connect(
                _ws_url(st["base"], st["admin"]["token"])
            ) as ws_admin, websockets.connect(_ws_url(st["base"], st["qa2"]["token"])) as ws_q2:
                reject = st["s"].post(
                    f"{st['base']}/api/rooms/{rid}/stage/respond",
                    json={"invitation_id": invitation_id, "accept": False},
                    headers=_hdr(st["qa2"]["token"]),
                    timeout=30,
                )
                assert reject.status_code == 200

                # Host (manager) receives invitation result.
                seen_host = False
                for _ in range(5):
                    evt = json.loads(await asyncio.wait_for(ws_host.recv(), timeout=4))
                    if evt.get("type") == "room_invitation_result" and evt.get("room_id") == rid:
                        seen_host = True
                        break
                assert seen_host

                # Uninvolved listener must not receive manager-private invitation result payload.
                leaked = False
                try:
                    for _ in range(3):
                        evt = json.loads(await asyncio.wait_for(ws_admin.recv(), timeout=1.2))
                        if evt.get("type") == "room_invitation_result" and evt.get("room_id") == rid:
                            leaked = True
                            break
                except asyncio.TimeoutError:
                    pass
                assert leaked is False

                # Request reject should privately notify requester.
                # Toggle until we reach raised=True (state may already be true/false
                # based on prior room actions in this same test).
                hand2 = st["s"].post(f"{st['base']}/api/rooms/{rid}/hand", headers=_hdr(st["qa2"]["token"]), timeout=30)
                assert hand2.status_code == 200
                if hand2.json().get("hand_raised") is not True:
                    hand2_retry = st["s"].post(f"{st['base']}/api/rooms/{rid}/hand", headers=_hdr(st["qa2"]["token"]), timeout=30)
                    assert hand2_retry.status_code == 200
                    assert hand2_retry.json().get("hand_raised") is True
                dis = st["s"].post(
                    f"{st['base']}/api/rooms/{rid}/hand/dismiss",
                    json={"user_id": q2_id},
                    headers=_hdr(st["qa1"]["token"]),
                    timeout=30,
                )
                assert dis.status_code == 200
                got_private = False
                for _ in range(6):
                    evt = json.loads(await asyncio.wait_for(ws_q2.recv(), timeout=4))
                    if evt.get("type") == "room_stage_request_rejected" and evt.get("room_id") == rid:
                        got_private = True
                        break
                assert got_private

        asyncio.run(_case())
