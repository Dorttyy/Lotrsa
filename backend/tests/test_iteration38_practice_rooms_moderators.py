"""Iteration 38 targeted backend verification.

# Module: practice-call privacy + 600s timer start conditions
# Module: stage consent flows + moderation constraints
# Module: owner-away invariants + owner-only room gift income
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
import time
import uuid
from urllib.parse import urlparse

import pytest
import requests
import websockets
from dotenv import load_dotenv
from pymongo import MongoClient


load_dotenv("/app/frontend/.env")
load_dotenv("/app/backend/.env")
if "/app/backend" not in sys.path:
    sys.path.append("/app/backend")

BASE_URL = (os.environ.get("EXPO_BACKEND_URL") or "").strip().strip("'").rstrip("/")
MONGO_URL = (os.environ.get("MONGO_URL") or "").strip().strip("'")
DB_NAME = (os.environ.get("DB_NAME") or "").strip().strip("'")

QA1_EMAIL = "qa_tester_b40dc299@linguatest.com"
QA2_EMAIL = "qa_guest_removal_67403793@linguatest.com"
QA_PASSWORD = "QATest2026!"
ADMIN_EMAIL = "admin@lingua.app"
ADMIN_PASSWORD = (os.environ.get("ADMIN_PASSWORD") or "").strip().strip("'")


def _base() -> str:
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
        f"{_base()}/api/auth/login",
        json={"email": email, "password": password},
        timeout=30,
    )
    assert res.status_code == 200, f"login failed for {email}: {res.status_code} {res.text[:180]}"
    data = res.json()
    assert data.get("token")
    assert data.get("user", {}).get("id")
    return data["token"], data["user"]


@pytest.fixture(scope="module")
def state() -> dict:
    if not ADMIN_PASSWORD:
        pytest.skip("ADMIN_PASSWORD missing")
    if not MONGO_URL or not DB_NAME:
        pytest.skip("Mongo env missing")

    s = requests.Session()
    base = _base()
    t1, u1 = _login(s, QA1_EMAIL, QA_PASSWORD)
    t2, u2 = _login(s, QA2_EMAIL, QA_PASSWORD)
    ta, ua = _login(s, ADMIN_EMAIL, ADMIN_PASSWORD)

    mongo = MongoClient(MONGO_URL)
    db = mongo[DB_NAME]
    users = db["users"]

    tracked = {
        "s": s,
        "base": base,
        "qa1": {"token": t1, "user": u1},
        "qa2": {"token": t2, "user": u2},
        "admin": {"token": ta, "user": ua},
        "db": db,
        "orig_balances": {
            u1["id"]: users.find_one({"_id": u1["id"]}, {"coins": 1, "diamonds": 1}) or {},
            u2["id"]: users.find_one({"_id": u2["id"]}, {"coins": 1, "diamonds": 1}) or {},
            ua["id"]: users.find_one({"_id": ua["id"]}, {"coins": 1, "diamonds": 1}) or {},
        },
        "created_rooms": [],
    }

    # Safe fixture top-up for deterministic room gift test.
    users.update_one({"_id": u2["id"]}, {"$set": {"coins": 5000}})

    yield tracked

    for rid in tracked["created_rooms"]:
        try:
            s.post(f"{base}/api/rooms/{rid}/end", headers=_hdr(t1), timeout=20)
        except Exception:
            pass

    # Restore balances.
    for uid, bal in tracked["orig_balances"].items():
        patch = {
            "coins": int(bal.get("coins", 0) or 0),
            "diamonds": float(bal.get("diamonds", 0) or 0),
        }
        users.update_one({"_id": uid}, {"$set": patch})

    mongo.close()


def _create_room(st: dict, title: str) -> dict:
    s, base, t1 = st["s"], st["base"], st["qa1"]["token"]
    res = s.post(
        f"{base}/api/rooms",
        json={"title": title, "language": "en"},
        headers=_hdr(t1),
        timeout=30,
    )
    assert res.status_code == 201, res.text
    room = res.json()
    st["created_rooms"].append(room["id"])
    return room


def _join(st: dict, room_id: str, token: str) -> dict:
    res = st["s"].post(f"{st['base']}/api/rooms/{room_id}/join", headers=_hdr(token), timeout=30)
    assert res.status_code == 200, res.text
    return res.json()


class TestPracticePrivacyAndTimer:
    def test_practice_call_sets_ends_at_only_after_both_media_ready_and_keeps_calls_collection_clean(self, state):
        async def _case():
            s = state["s"]
            base = state["base"]
            t1 = state["qa1"]["token"]
            t2 = state["qa2"]["token"]
            id1 = state["qa1"]["user"]["id"]
            id2 = state["qa2"]["user"]["id"]

            async with websockets.connect(_ws_url(base, t1)) as ws1, websockets.connect(_ws_url(base, t2)) as ws2:
                await asyncio.sleep(0.2)

                for token in (t1, t2):
                    av = s.put(
                        f"{base}/api/rtc/practice/availability",
                        json={"available": True, "language": "all", "filters": {}},
                        headers=_hdr(token),
                        timeout=30,
                    )
                    assert av.status_code == 200

                call = s.post(
                    f"{base}/api/rtc/practice/call",
                    json={"receiver_id": id2},
                    headers=_hdr(t1),
                    timeout=30,
                )
                assert call.status_code == 200, call.text
                cid = call.json()["call_id"]

                st0 = s.get(f"{base}/api/rtc/calls/{cid}/state", headers=_hdr(t1), timeout=30)
                assert st0.status_code == 200
                d0 = st0.json()
                assert d0["practice"] is True
                assert d0["status"] == "RINGING"
                assert d0.get("ends_at") is None

                await ws1.send(json.dumps({"type": "call_offer", "to": id2, "call_id": cid, "sdp": {"type": "offer", "sdp": "v=0"}}))
                offer = await asyncio.wait_for(ws2.recv(), timeout=5)
                assert json.loads(offer).get("type") == "call_offer"

                await ws2.send(json.dumps({"type": "call_answer", "to": id1, "call_id": cid, "sdp": {"type": "answer", "sdp": "v=0"}}))
                answer = await asyncio.wait_for(ws1.recv(), timeout=5)
                assert json.loads(answer).get("type") == "call_answer"

                # call_answer alone must NOT start 600s timer
                pre_ready = s.get(f"{base}/api/rtc/calls/{cid}/state", headers=_hdr(t1), timeout=30)
                assert pre_ready.status_code == 200
                assert pre_ready.json().get("ends_at") is None

                await ws1.send(json.dumps({"type": "call_media_ready", "to": id2, "call_id": cid}))
                await ws2.send(json.dumps({"type": "call_media_ready", "to": id1, "call_id": cid}))
                await asyncio.sleep(0.35)

                active = s.get(f"{base}/api/rtc/calls/{cid}/state", headers=_hdr(t1), timeout=30)
                assert active.status_code == 200
                ad = active.json()
                assert ad["status"] == "CONNECTED"
                assert isinstance(ad.get("ends_at"), int)
                delta = ad["ends_at"] - int(time.time() * 1000)
                assert 585000 <= delta <= 610000, f"expected ~600000ms, got {delta}"

                # End and verify ephemeral session removed.
                await ws1.send(json.dumps({"type": "call_end", "to": id2, "call_id": cid}))
                await asyncio.sleep(0.25)

                st_after = s.get(f"{base}/api/rtc/calls/{cid}/state", headers=_hdr(t1), timeout=30)
                assert st_after.status_code == 404

                # Privacy contract: no persistent calls document for practice.
                calls_doc = state["db"]["calls"].find_one({"_id": cid})
                assert calls_doc is None

                for token in (t1, t2):
                    s.delete(f"{base}/api/rtc/practice/queue", headers=_hdr(token), timeout=20)
                    s.put(
                        f"{base}/api/rtc/practice/availability",
                        json={"available": False, "language": "all"},
                        headers=_hdr(token),
                        timeout=20,
                    )

        asyncio.run(_case())

    def test_unit_expire_practice_broadcasts_duration_limit_and_clears_session(self, monkeypatch):
        import rtc_core

        sent: list[dict] = []

        class _Mgr:
            async def broadcast(self, users, payload):
                sent.append({"users": users, "payload": payload})

        async def _fast_sleep(_):
            return None

        monkeypatch.setattr("asyncio.sleep", _fast_sleep)
        monkeypatch.setattr("ws_manager.manager", _Mgr())

        cid = "TEST_practice_expire_" + uuid.uuid4().hex
        rtc_core._sessions[cid] = {
            "caller": "u1",
            "receiver": "u2",
            "status": rtc_core.CONNECTED,
            "created": time.monotonic(),
            "connected_at": time.monotonic() - 1,
            "accepted": True,
            "media_ready": {"u1", "u2"},
            "practice": True,
        }

        asyncio.run(rtc_core.expire_practice(cid))
        assert rtc_core.session(cid) is None
        assert sent, "duration_limit broadcast expected"
        assert sent[-1]["payload"]["reason"] == "duration_limit"


class TestRoomStageAndModerators:
    def test_moderator_invite_reject_then_accept_preserves_role_and_sets_badge(self, state):
        room = _create_room(state, "TEST_iter38_mod_invite")
        rid = room["id"]
        _join(state, rid, state["qa2"]["token"])

        invite = state["s"].post(
            f"{state['base']}/api/rooms/{rid}/moderators/invite",
            json={"user_id": state["qa2"]["user"]["id"]},
            headers=_hdr(state["qa1"]["token"]),
            timeout=30,
        )
        assert invite.status_code == 200, invite.text

        pending = state["s"].get(
            f"{state['base']}/api/rooms/{rid}/moderators/invitation",
            headers=_hdr(state["qa2"]["token"]),
            timeout=30,
        )
        assert pending.status_code == 200
        inv_id = (pending.json().get("invitation") or {}).get("id")
        assert inv_id

        reject = state["s"].post(
            f"{state['base']}/api/rooms/{rid}/moderators/respond",
            json={"invitation_id": inv_id, "accept": False},
            headers=_hdr(state["qa2"]["token"]),
            timeout=30,
        )
        assert reject.status_code == 200
        r1 = state["s"].get(f"{state['base']}/api/rooms/{rid}", headers=_hdr(state["qa1"]["token"]), timeout=30).json()
        assert state["qa2"]["user"]["id"] not in (r1.get("moderators") or [])

        invite2 = state["s"].post(
            f"{state['base']}/api/rooms/{rid}/moderators/invite",
            json={"user_id": state["qa2"]["user"]["id"]},
            headers=_hdr(state["qa1"]["token"]),
            timeout=30,
        )
        assert invite2.status_code == 200
        inv2 = state["s"].get(
            f"{state['base']}/api/rooms/{rid}/moderators/invitation",
            headers=_hdr(state["qa2"]["token"]),
            timeout=30,
        ).json()["invitation"]["id"]
        accept = state["s"].post(
            f"{state['base']}/api/rooms/{rid}/moderators/respond",
            json={"invitation_id": inv2, "accept": True},
            headers=_hdr(state["qa2"]["token"]),
            timeout=30,
        )
        assert accept.status_code == 200

        r2 = state["s"].get(f"{state['base']}/api/rooms/{rid}", headers=_hdr(state["qa1"]["token"]), timeout=30).json()
        assert state["qa2"]["user"]["id"] in (r2.get("moderators") or [])
        qa2_member = next(m for m in r2["members"] if m["id"] == state["qa2"]["user"]["id"])
        assert qa2_member["role"] == "listener"
        assert qa2_member["mic_on"] is False

    def test_moderator_authority_and_hierarchy_restrictions(self, state):
        room = _create_room(state, "TEST_iter38_mod_hierarchy")
        rid = room["id"]
        _join(state, rid, state["qa2"]["token"])
        _join(state, rid, state["admin"]["token"])

        # Owner appoint qa2 moderator.
        inv = state["s"].post(
            f"{state['base']}/api/rooms/{rid}/moderators/invite",
            json={"user_id": state["qa2"]["user"]["id"]},
            headers=_hdr(state["qa1"]["token"]),
            timeout=30,
        )
        assert inv.status_code == 200
        inv_id = state["s"].get(
            f"{state['base']}/api/rooms/{rid}/moderators/invitation",
            headers=_hdr(state["qa2"]["token"]),
            timeout=30,
        ).json()["invitation"]["id"]
        assert state["s"].post(
            f"{state['base']}/api/rooms/{rid}/moderators/respond",
            json={"invitation_id": inv_id, "accept": True},
            headers=_hdr(state["qa2"]["token"]),
            timeout=30,
        ).status_code == 200

        # Moderator cannot appoint another moderator.
        mod_invite = state["s"].post(
            f"{state['base']}/api/rooms/{rid}/moderators/invite",
            json={"user_id": state["admin"]["user"]["id"]},
            headers=_hdr(state["qa2"]["token"]),
            timeout=30,
        )
        assert mod_invite.status_code == 403

        # Owner appoint admin moderator too.
        inv2 = state["s"].post(
            f"{state['base']}/api/rooms/{rid}/moderators/invite",
            json={"user_id": state["admin"]["user"]["id"]},
            headers=_hdr(state["qa1"]["token"]),
            timeout=30,
        )
        assert inv2.status_code == 200
        inv2_id = state["s"].get(
            f"{state['base']}/api/rooms/{rid}/moderators/invitation",
            headers=_hdr(state["admin"]["token"]),
            timeout=30,
        ).json()["invitation"]["id"]
        assert state["s"].post(
            f"{state['base']}/api/rooms/{rid}/moderators/respond",
            json={"invitation_id": inv2_id, "accept": True},
            headers=_hdr(state["admin"]["token"]),
            timeout=30,
        ).status_code == 200

        # Moderator cannot moderate another moderator.
        deny_other_mod = state["s"].post(
            f"{state['base']}/api/rooms/{rid}/stage/invite",
            json={"user_id": state["admin"]["user"]["id"]},
            headers=_hdr(state["qa2"]["token"]),
            timeout=30,
        )
        assert deny_other_mod.status_code == 403

        # Moderator cannot transfer ownership.
        transfer = state["s"].post(
            f"{state['base']}/api/rooms/{rid}/transfer-host",
            json={"user_id": state["admin"]["user"]["id"]},
            headers=_hdr(state["qa2"]["token"]),
            timeout=30,
        )
        assert transfer.status_code == 403

    def test_stage_invite_accept_reject_and_forced_promotion_block(self, state):
        room = _create_room(state, "TEST_iter38_stage_flow")
        rid = room["id"]
        _join(state, rid, state["qa2"]["token"])
        _join(state, rid, state["admin"]["token"])

        # Owner makes qa2 moderator.
        assert state["s"].post(
            f"{state['base']}/api/rooms/{rid}/moderators/invite",
            json={"user_id": state["qa2"]["user"]["id"]},
            headers=_hdr(state["qa1"]["token"]),
            timeout=30,
        ).status_code == 200
        inv = state["s"].get(
            f"{state['base']}/api/rooms/{rid}/moderators/invitation",
            headers=_hdr(state["qa2"]["token"]),
            timeout=30,
        ).json()["invitation"]["id"]
        assert state["s"].post(
            f"{state['base']}/api/rooms/{rid}/moderators/respond",
            json={"invitation_id": inv, "accept": True},
            headers=_hdr(state["qa2"]["token"]),
            timeout=30,
        ).status_code == 200

        # Forced speaker without hand/invite must fail.
        forced = state["s"].post(
            f"{state['base']}/api/rooms/{rid}/role",
            json={"user_id": state["admin"]["user"]["id"], "role": "speaker"},
            headers=_hdr(state["qa1"]["token"]),
            timeout=30,
        )
        assert forced.status_code == 409

        # Moderator invite admin to stage; admin rejects.
        inv_stage = state["s"].post(
            f"{state['base']}/api/rooms/{rid}/stage/invite",
            json={"user_id": state["admin"]["user"]["id"]},
            headers=_hdr(state["qa2"]["token"]),
            timeout=30,
        )
        assert inv_stage.status_code == 200
        stage_id = state["s"].get(
            f"{state['base']}/api/rooms/{rid}/stage/invitation",
            headers=_hdr(state["admin"]["token"]),
            timeout=30,
        ).json()["invitation"]["id"]
        reject = state["s"].post(
            f"{state['base']}/api/rooms/{rid}/stage/respond",
            json={"invitation_id": stage_id, "accept": False},
            headers=_hdr(state["admin"]["token"]),
            timeout=30,
        )
        assert reject.status_code == 200
        rd = state["s"].get(f"{state['base']}/api/rooms/{rid}", headers=_hdr(state["qa1"]["token"]), timeout=30).json()
        admin_m = next(m for m in rd["members"] if m["id"] == state["admin"]["user"]["id"])
        assert admin_m["role"] == "listener"

        # Re-invite, accept to become speaker.
        assert state["s"].post(
            f"{state['base']}/api/rooms/{rid}/stage/invite",
            json={"user_id": state["admin"]["user"]["id"]},
            headers=_hdr(state["qa2"]["token"]),
            timeout=30,
        ).status_code == 200
        stage_id2 = state["s"].get(
            f"{state['base']}/api/rooms/{rid}/stage/invitation",
            headers=_hdr(state["admin"]["token"]),
            timeout=30,
        ).json()["invitation"]["id"]
        assert state["s"].post(
            f"{state['base']}/api/rooms/{rid}/stage/respond",
            json={"invitation_id": stage_id2, "accept": True},
            headers=_hdr(state["admin"]["token"]),
            timeout=30,
        ).status_code == 200

        # Host/mod can mute but not remote unmute.
        muted = state["s"].post(
            f"{state['base']}/api/rooms/{rid}/stage/mute",
            json={"user_id": state["admin"]["user"]["id"]},
            headers=_hdr(state["qa2"]["token"]),
            timeout=30,
        )
        assert muted.status_code == 200
        after_mute = state["s"].get(f"{state['base']}/api/rooms/{rid}", headers=_hdr(state["qa1"]["token"]), timeout=30).json()
        am = next(m for m in after_mute["members"] if m["id"] == state["admin"]["user"]["id"])
        assert am["mic_on"] is False

        # Demote speaker to listener.
        demote = state["s"].post(
            f"{state['base']}/api/rooms/{rid}/role",
            json={"user_id": state["admin"]["user"]["id"], "role": "listener"},
            headers=_hdr(state["qa2"]["token"]),
            timeout=30,
        )
        assert demote.status_code == 200
        rd2 = state["s"].get(f"{state['base']}/api/rooms/{rid}", headers=_hdr(state["qa1"]["token"]), timeout=30).json()
        am2 = next(m for m in rd2["members"] if m["id"] == state["admin"]["user"]["id"])
        assert am2["role"] == "listener"
        assert am2["mic_on"] is False

    def test_owner_leave_rejoin_keeps_host_identity_and_moderator_can_end(self, state):
        room = _create_room(state, "TEST_iter38_owner_away")
        rid = room["id"]
        _join(state, rid, state["qa2"]["token"])

        # owner appoint qa2 moderator
        assert state["s"].post(
            f"{state['base']}/api/rooms/{rid}/moderators/invite",
            json={"user_id": state["qa2"]["user"]["id"]},
            headers=_hdr(state["qa1"]["token"]),
            timeout=30,
        ).status_code == 200
        inv = state["s"].get(
            f"{state['base']}/api/rooms/{rid}/moderators/invitation",
            headers=_hdr(state["qa2"]["token"]),
            timeout=30,
        ).json()["invitation"]["id"]
        assert state["s"].post(
            f"{state['base']}/api/rooms/{rid}/moderators/respond",
            json={"invitation_id": inv, "accept": True},
            headers=_hdr(state["qa2"]["token"]),
            timeout=30,
        ).status_code == 200

        leave = state["s"].post(f"{state['base']}/api/rooms/{rid}/leave", headers=_hdr(state["qa1"]["token"]), timeout=30)
        assert leave.status_code == 200
        after_leave = state["s"].get(f"{state['base']}/api/rooms/{rid}", headers=_hdr(state["qa2"]["token"]), timeout=30)
        assert after_leave.status_code == 200
        data = after_leave.json()
        assert data["host"]["id"] == state["qa1"]["user"]["id"]
        assert data["host_present"] is False
        assert data["is_live"] is True

        rejoin = _join(state, rid, state["qa1"]["token"])
        owner_member = next(m for m in rejoin["members"] if m["id"] == state["qa1"]["user"]["id"])
        assert owner_member["role"] == "host"
        assert owner_member["mic_on"] is False

        leave2 = state["s"].post(f"{state['base']}/api/rooms/{rid}/leave", headers=_hdr(state["qa1"]["token"]), timeout=30)
        assert leave2.status_code == 200
        end_by_mod = state["s"].post(f"{state['base']}/api/rooms/{rid}/end", headers=_hdr(state["qa2"]["token"]), timeout=30)
        assert end_by_mod.status_code == 200

    def test_room_gift_credits_owner_not_moderator(self, state):
        room = _create_room(state, "TEST_iter38_income_owner_only")
        rid = room["id"]
        _join(state, rid, state["qa2"]["token"])

        # Make QA2 moderator and gift recipient.
        inv = state["s"].post(
            f"{state['base']}/api/rooms/{rid}/moderators/invite",
            json={"user_id": state["qa2"]["user"]["id"]},
            headers=_hdr(state["qa1"]["token"]),
            timeout=30,
        )
        assert inv.status_code == 200
        inv_id = state["s"].get(
            f"{state['base']}/api/rooms/{rid}/moderators/invitation",
            headers=_hdr(state["qa2"]["token"]),
            timeout=30,
        ).json()["invitation"]["id"]
        assert state["s"].post(
            f"{state['base']}/api/rooms/{rid}/moderators/respond",
            json={"invitation_id": inv_id, "accept": True},
            headers=_hdr(state["qa2"]["token"]),
            timeout=30,
        ).status_code == 200

        users = state["db"]["users"]
        owner_id = state["qa1"]["user"]["id"]
        mod_id = state["qa2"]["user"]["id"]

        owner_before = users.find_one({"_id": owner_id}, {"diamonds": 1, "coins": 1}) or {}
        mod_before = users.find_one({"_id": mod_id}, {"diamonds": 1, "coins": 1}) or {}

        gift = state["s"].post(
            f"{state['base']}/api/rooms/{rid}/gift",
            json={"to_user_id": mod_id, "gift_id": "rose"},
            headers=_hdr(state["qa2"]["token"]),
            timeout=30,
        )
        assert gift.status_code == 201, gift.text

        owner_after = users.find_one({"_id": owner_id}, {"diamonds": 1, "coins": 1}) or {}
        mod_after = users.find_one({"_id": mod_id}, {"diamonds": 1, "coins": 1}) or {}

        assert float(owner_after.get("diamonds", 0) or 0) >= float(owner_before.get("diamonds", 0) or 0) + 1.0
        assert float(mod_after.get("diamonds", 0) or 0) == float(mod_before.get("diamonds", 0) or 0)
        assert int(mod_after.get("coins", 0) or 0) == int(mod_before.get("coins", 0) or 0) - 10
