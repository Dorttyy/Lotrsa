"""Iteration 44 backend quota/time regression suite.

# Module: daily UTC room-time allowance shape + VIP/free behavior
# Module: room lifecycle time accounting (join/rejoin/heartbeat/leave/switch)
# Module: watchdog boundary enforcement, room-share tags, and notices serialization
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
import time
import uuid
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse
from pathlib import Path

import pytest
import requests
import websockets
from dotenv import load_dotenv
from pymongo import MongoClient


load_dotenv("/app/frontend/.env")
load_dotenv("/app/backend/.env")
if "/app/backend" not in sys.path:
    sys.path.append("/app/backend")

from room_time_clock import allowance_from, day_bounds  # noqa: E402


BASE_URL = (os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL") or "").strip().strip("'").rstrip("/")
MONGO_URL = (os.environ.get("MONGO_URL") or "").strip().strip("'")
DB_NAME = (os.environ.get("DB_NAME") or "").strip().strip("'")

QA1_EMAIL = "qa_tester_b40dc299@linguatest.com"  # currently VIP per API
QA2_EMAIL = "qa_guest_removal_67403793@linguatest.com"  # expected free account
QA_PASSWORD = "QATest2026!"


def _base() -> str:
    if not BASE_URL:
        pytest.skip("EXPO_BACKEND_URL missing")
    return BASE_URL


def _hdr(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _ws_url(base_url: str, token: str) -> str:
    parsed = urlparse(base_url)
    scheme = "wss" if parsed.scheme == "https" else "ws"
    return f"{scheme}://{parsed.netloc}/api/ws?token={token}"


def _login(session: requests.Session, email: str, password: str) -> tuple[str, dict]:
    res = session.post(
        f"{_base()}/api/auth/login",
        json={"email": email, "password": password},
        timeout=30,
    )
    assert res.status_code == 200, f"login failed for {email}: {res.status_code} {res.text[:240]}"
    body = res.json()
    assert body.get("token")
    assert body.get("user", {}).get("id")
    return body["token"], body["user"]


def _create_room(ctx: dict, token: str, *, title: str, is_private: bool = False, share_to_moments: bool = False) -> dict:
    res = ctx["s"].post(
        f"{ctx['base']}/api/rooms",
        json={
            "title": title,
            "language": "en",
            "is_private": is_private,
            "share_to_moments": share_to_moments,
            # malicious bypass hints should be ignored by backend schema/logic
            "host_remaining_seconds": 999999,
            "listener_remaining_seconds": 999999,
            "limit_seconds": 999999,
        },
        headers=_hdr(token),
        timeout=30,
    )
    assert res.status_code == 201, res.text
    room = res.json()
    ctx["created_rooms"].append(room["id"])
    return room


def _join(ctx: dict, room_id: str, token: str) -> requests.Response:
    return ctx["s"].post(f"{ctx['base']}/api/rooms/{room_id}/join", headers=_hdr(token), timeout=30)


def _allowance(ctx: dict, token: str) -> dict:
    res = ctx["s"].get(f"{ctx['base']}/api/rooms/time-allowance", headers=_hdr(token), timeout=30)
    assert res.status_code == 200, res.text
    return res.json()


def _register_temp_user(ctx: dict, suffix: str) -> tuple[str, dict]:
    email = f"qa_iter44_{suffix}_{uuid.uuid4().hex[:8]}@linguatest.com"
    password = "QATest2026!"
    reg = ctx["s"].post(
        f"{ctx['base']}/api/auth/register",
        json={"email": email, "password": password, "name": f"QA Iter44 {suffix}"},
        timeout=30,
    )
    assert reg.status_code == 201, reg.text
    data = reg.json()
    with Path("/app/memory/test_credentials.md").open("a") as credentials:
        credentials.write(f"\n| Iter44 temporary QA | {email} | {password} | {data['user']['id']} | Created by quota test; cleanup pending |\n")
    return data["token"], data["user"]


def _reset_user_ledger(ctx: dict, user_id: str):
    # Safe reset for temp QA users created by this suite only.
    ctx["ledger"].delete_many({"user_id": user_id})
    ctx["warnings"].delete_many({"_id": {"$regex": f":{user_id}:"}})


@pytest.fixture(scope="module")
def ctx() -> dict:
    if not MONGO_URL or not DB_NAME:
        pytest.skip("Mongo env missing")

    session = requests.Session()
    base = _base()
    t1, u1 = _login(session, QA1_EMAIL, QA_PASSWORD)
    t2, u2 = _login(session, QA2_EMAIL, QA_PASSWORD)

    mongo = MongoClient(MONGO_URL)
    db = mongo[DB_NAME]
    users = db["users"]

    tracked = {
        "s": session,
        "base": base,
        "qa1": {"token": t1, "user": u1},
        "qa2": {"token": t2, "user": u2},
        "mongo": mongo,
        "db": db,
        "ledger": db["room_time_intervals"],
        "warnings": db["room_time_warnings"],
        "moments": db["moments"],
        "rooms": db["rooms"],
        "notices": db["voiceroom_notices"],
        "created_rooms": [],
        "created_moment_ids": [],
        "created_notice_ids": [],
        "created_ledger_ids": [],
        "created_warning_ids": [],
        "user_backup": {
            u1["id"]: users.find_one({"_id": u1["id"]}, {"is_vip": 1, "vip_expires_at": 1, "host_usage": 1}),
            u2["id"]: users.find_one({"_id": u2["id"]}, {"is_vip": 1, "vip_expires_at": 1, "host_usage": 1}),
        },
    }
    temp_token, temp_user = _register_temp_user(tracked, "free")
    tracked["free"] = {"token": temp_token, "user": temp_user}
    yield tracked

    # End only rooms created by this suite (safe QA cleanup).
    for rid in tracked["created_rooms"]:
        for token in (t1, t2, tracked["free"]["token"]):
            try:
                session.post(f"{base}/api/rooms/{rid}/end", headers=_hdr(token), timeout=10)
            except Exception:
                pass

    if tracked["created_moment_ids"]:
        tracked["moments"].delete_many({"_id": {"$in": tracked["created_moment_ids"]}})

    if tracked["created_notice_ids"]:
        tracked["notices"].delete_many({"_id": {"$in": tracked["created_notice_ids"]}})

    if tracked["created_ledger_ids"]:
        tracked["ledger"].delete_many({"_id": {"$in": tracked["created_ledger_ids"]}})

    if tracked["created_warning_ids"]:
        tracked["warnings"].delete_many({"_id": {"$in": tracked["created_warning_ids"]}})

    # Also clear any ledger/warnings tied to this test's room IDs.
    if tracked["created_rooms"]:
        tracked["ledger"].delete_many({"room_id": {"$in": tracked["created_rooms"]}})
    if tracked.get("free"):
        users.update_one(
            {"_id": tracked["free"]["user"]["id"]},
            {"$set": {"is_vip": False, "vip_expires_at": None}},
        )
        tracked["ledger"].delete_many({"user_id": tracked["free"]["user"]["id"]})
        tracked["warnings"].delete_many({"_id": {"$regex": f":{tracked['free']['user']['id']}:"}})

    # Restore QA user entitlement/compat fields exactly.
    for uid, orig in tracked["user_backup"].items():
        for key in ("is_vip", "vip_expires_at", "host_usage"):
            update = {"$set": {key: orig[key]}} if orig and key in orig else {"$unset": {key: ""}}
            users.update_one({"_id": uid}, update)

    # Only exact IDs created by this fixture; NEVER clear an entire collection.
    room_ids = tracked["created_rooms"]
    for collection in (tracked["moments"], tracked["notices"], db["room_messages"]):
        collection.delete_many({"room_id": {"$in": room_ids}})
    tracked["rooms"].delete_many({"_id": {"$in": room_ids}})
    free_user = tracked["free"]["user"]
    users.delete_one({"_id": free_user["id"]})
    with Path("/app/memory/test_credentials.md").open("a") as credentials:
        credentials.write(f"\nIter44 cleanup: `{free_user['email']}` (`{free_user['id']}`) DELETED; credentials inactive.\n")

    mongo.close()


def _inject_closed_interval(ctx: dict, user_id: str, bucket: str, seconds: int) -> str:
    now = datetime.now(timezone.utc)
    started = now - timedelta(seconds=seconds + 1)
    ended = now - timedelta(seconds=1)
    row_id = f"TEST_iter44_{uuid.uuid4()}"
    doc = {
        "_id": row_id,
        "room_id": f"TEST_room_closed_{uuid.uuid4()}",
        "user_id": user_id,
        "bucket": bucket,
        "started_at": started.isoformat(),
        "last_seen_at": ended.isoformat(),
        "ended_at": ended.isoformat(),
    }
    ctx["ledger"].insert_one(doc)
    ctx["created_ledger_ids"].append(row_id)
    return row_id


class TestRoomTimeAllowanceAndSerialization:
    def test_time_allowance_shape_and_vip_vs_free_contract(self, ctx):
        vip = _allowance(ctx, ctx["qa1"]["token"])
        free = _allowance(ctx, ctx["qa2"]["token"])

        # QA1 currently VIP on this preview.
        assert vip["is_unlimited"] is True
        assert vip["limit_seconds"] is None
        assert vip["host"]["remaining_seconds"] is None
        assert vip["listener"]["remaining_seconds"] is None

        # QA2 should be free/timed.
        assert free["is_unlimited"] is False
        assert free["limit_seconds"] == 7200
        assert isinstance(free["host"]["remaining_seconds"], (int, float))
        assert isinstance(free["listener"]["remaining_seconds"], (int, float))
        assert free["timezone"] == "UTC"
        assert "_id" not in json.dumps(free)

    def test_free_create_not_blocked_by_legacy_host_counter_field(self, ctx):
        uid = ctx["qa2"]["user"]["id"]
        ctx["db"]["users"].update_one({"_id": uid}, {"$set": {"host_usage": {"date": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "count": 999999}}})
        room = _create_room(
            ctx,
            ctx["qa2"]["token"],
            title=f"TEST_iter44_legacy_counter_{uuid.uuid4().hex[:6]}",
        )
        assert room["id"]

    def test_join_rejoin_heartbeat_idempotent_and_nonmember_heartbeat_forbidden(self, ctx):
        room = _create_room(ctx, ctx["qa1"]["token"], title=f"TEST_iter44_rejoin_{uuid.uuid4().hex[:6]}")
        rid = room["id"]
        uid2 = ctx["qa2"]["user"]["id"]

        j1 = _join(ctx, rid, ctx["qa2"]["token"])
        j2 = _join(ctx, rid, ctx["qa2"]["token"])
        assert j1.status_code == 200 and j2.status_code == 200

        open_rows = list(ctx["ledger"].find({"room_id": rid, "user_id": uid2, "bucket": "listener", "ended_at": None}))
        assert len(open_rows) == 1

        hb = ctx["s"].post(f"{ctx['base']}/api/rooms/{rid}/heartbeat", headers=_hdr(ctx["qa2"]["token"]), timeout=30)
        assert hb.status_code == 200

        time.sleep(1.2)
        leave = ctx["s"].post(f"{ctx['base']}/api/rooms/{rid}/leave", headers=_hdr(ctx["qa2"]["token"]), timeout=30)
        assert leave.status_code == 200

        hb_forbidden = ctx["s"].post(f"{ctx['base']}/api/rooms/{rid}/heartbeat", headers=_hdr(ctx["qa2"]["token"]), timeout=30)
        assert hb_forbidden.status_code == 403

        rejoin = _join(ctx, rid, ctx["qa2"]["token"])
        assert rejoin.status_code == 200
        all_rows = list(ctx["ledger"].find({"room_id": rid, "user_id": uid2, "bucket": "listener"}))
        assert len(all_rows) >= 2
        assert sum(1 for r in all_rows if r.get("ended_at") is None) == 1

    def test_listener_speaker_moderator_share_listener_pool_host_is_separate(self, ctx):
        room = _create_room(ctx, ctx["qa1"]["token"], title=f"TEST_iter44_roles_{uuid.uuid4().hex[:6]}")
        rid = room["id"]
        uid2 = ctx["qa2"]["user"]["id"]

        assert _join(ctx, rid, ctx["qa2"]["token"]).status_code == 200

        inv_mod = ctx["s"].post(
            f"{ctx['base']}/api/rooms/{rid}/moderators/invite",
            json={"user_id": uid2},
            headers=_hdr(ctx["qa1"]["token"]),
            timeout=30,
        )
        assert inv_mod.status_code == 200
        inv_mod_id = ctx["s"].get(
            f"{ctx['base']}/api/rooms/{rid}/moderators/invitation",
            headers=_hdr(ctx["qa2"]["token"]),
            timeout=30,
        ).json()["invitation"]["id"]
        ack_mod = ctx["s"].post(
            f"{ctx['base']}/api/rooms/{rid}/moderators/respond",
            json={"invitation_id": inv_mod_id, "accept": True},
            headers=_hdr(ctx["qa2"]["token"]),
            timeout=30,
        )
        assert ack_mod.status_code == 200

        inv_stage = ctx["s"].post(
            f"{ctx['base']}/api/rooms/{rid}/stage/invite",
            json={"user_id": uid2},
            headers=_hdr(ctx["qa1"]["token"]),
            timeout=30,
        )
        assert inv_stage.status_code == 200
        inv_stage_id = ctx["s"].get(
            f"{ctx['base']}/api/rooms/{rid}/stage/invitation",
            headers=_hdr(ctx["qa2"]["token"]),
            timeout=30,
        ).json()["invitation"]["id"]
        ack_stage = ctx["s"].post(
            f"{ctx['base']}/api/rooms/{rid}/stage/respond",
            json={"invitation_id": inv_stage_id, "accept": True},
            headers=_hdr(ctx["qa2"]["token"]),
            timeout=30,
        )
        assert ack_stage.status_code == 200

        rows = list(ctx["ledger"].find({"room_id": rid, "user_id": uid2, "ended_at": None}))
        assert rows
        assert {r["bucket"] for r in rows} == {"listener"}

        before = _allowance(ctx, ctx["qa1"]["token"])["host"]["used_seconds"]
        leave_host = ctx["s"].post(f"{ctx['base']}/api/rooms/{rid}/leave", headers=_hdr(ctx["qa1"]["token"]), timeout=30)
        assert leave_host.status_code == 200
        room_live = ctx["s"].get(f"{ctx['base']}/api/rooms/{rid}", headers=_hdr(ctx["qa2"]["token"]), timeout=30)
        assert room_live.status_code == 200 and room_live.json()["is_live"] is True
        time.sleep(2.2)
        after = _allowance(ctx, ctx["qa1"]["token"])["host"]["used_seconds"]
        assert after > before

        assert ctx["s"].post(f"{ctx['base']}/api/rooms/{rid}/leave", headers=_hdr(ctx["qa2"]["token"]), timeout=30).status_code == 200
        final_room = ctx["rooms"].find_one({"_id": rid}, {"is_live": 1})
        assert final_room and final_room.get("is_live") is False

    def test_joining_another_room_settles_previous_membership(self, ctx):
        a = _create_room(ctx, ctx["qa1"]["token"], title=f"TEST_iter44_switchA_{uuid.uuid4().hex[:5]}")
        uid2 = ctx["qa2"]["user"]["id"]

        assert _join(ctx, a["id"], ctx["qa2"]["token"]).status_code == 200
        b = _create_room(ctx, ctx["qa1"]["token"], title=f"TEST_iter44_switchB_{uuid.uuid4().hex[:5]}")
        assert _join(ctx, b["id"], ctx["qa2"]["token"]).status_code == 200

        room_a = ctx["s"].get(f"{ctx['base']}/api/rooms/{a['id']}", headers=_hdr(ctx["qa1"]["token"]), timeout=30)
        room_b = ctx["s"].get(f"{ctx['base']}/api/rooms/{b['id']}", headers=_hdr(ctx["qa1"]["token"]), timeout=30)
        # Previous membership must be settled; room A may auto-close if empty.
        assert room_b.status_code == 200
        assert room_a.status_code in (200, 404)
        if room_a.status_code == 200:
            assert uid2 not in [m["id"] for m in room_a.json()["members"]]
        assert uid2 in [m["id"] for m in room_b.json()["members"]]

        old_rows = list(ctx["ledger"].find({"room_id": a["id"], "user_id": uid2, "bucket": "listener"}))
        new_rows = list(ctx["ledger"].find({"room_id": b["id"], "user_id": uid2, "bucket": "listener", "ended_at": None}))
        assert old_rows and all(r.get("ended_at") is not None for r in old_rows)
        assert len(new_rows) == 1

    def test_simultaneous_owned_rooms_sum_host_time(self, ctx):
        owner = ctx["free"]
        _reset_user_ledger(ctx, owner["user"]["id"])

        room_a = _create_room(ctx, owner["token"], title=f"TEST_iter44_parallelA_{uuid.uuid4().hex[:5]}")
        # Keep room A live while owner creates room B (owner leaves A automatically on create B).
        assert _join(ctx, room_a["id"], ctx["qa1"]["token"]).status_code == 200
        room_b = _create_room(ctx, owner["token"], title=f"TEST_iter44_parallelB_{uuid.uuid4().hex[:5]}")

        a_doc = ctx["rooms"].find_one({"_id": room_a["id"]}, {"is_live": 1})
        b_doc = ctx["rooms"].find_one({"_id": room_b["id"]}, {"is_live": 1})
        assert a_doc and a_doc.get("is_live") is True
        assert b_doc and b_doc.get("is_live") is True

        before = _allowance(ctx, owner["token"])
        assert before["host"]["active_rooms"] >= 2
        used0 = before["host"]["used_seconds"]
        time.sleep(2.0)
        used1 = _allowance(ctx, owner["token"])["host"]["used_seconds"]
        assert (used1 - used0) >= 3.0

    def test_kick_and_end_stop_listener_intervals_and_preserve_kicked_permissions(self, ctx):
        room = _create_room(ctx, ctx["qa1"]["token"], title=f"TEST_iter44_kick_end_{uuid.uuid4().hex[:5]}")
        rid = room["id"]
        listener = ctx["free"]
        assert _join(ctx, rid, listener["token"]).status_code == 200

        kicked = ctx["s"].post(
            f"{ctx['base']}/api/rooms/{rid}/kick",
            json={"user_id": listener["user"]["id"]},
            headers=_hdr(ctx["qa1"]["token"]),
            timeout=30,
        )
        assert kicked.status_code == 200

        open_after_kick = list(ctx["ledger"].find({
            "room_id": rid,
            "user_id": listener["user"]["id"],
            "bucket": "listener",
            "ended_at": None,
        }))
        assert open_after_kick == []

        rejoin = _join(ctx, rid, listener["token"])
        assert rejoin.status_code == 403

        ended = ctx["s"].post(f"{ctx['base']}/api/rooms/{rid}/end", headers=_hdr(ctx["qa1"]["token"]), timeout=30)
        assert ended.status_code == 200
        host_open = list(ctx["ledger"].find({
            "room_id": rid,
            "user_id": ctx["qa1"]["user"]["id"],
            "bucket": "host",
            "ended_at": None,
        }))
        assert host_open == []


class TestRoomShareAndNotices:
    def test_private_room_cannot_be_shared_to_moments(self, ctx):
        private_room = _create_room(
            ctx,
            ctx["qa1"]["token"],
            title=f"TEST_iter44_private_share_{uuid.uuid4().hex[:6]}",
            is_private=True,
            share_to_moments=True,
        )
        share = ctx["s"].post(
            f"{ctx['base']}/api/rooms/{private_room['id']}/share-to-moments",
            json={"text": "should fail"},
            headers=_hdr(ctx["qa1"]["token"]),
            timeout=30,
        )
        assert share.status_code == 400

    def test_public_share_auto_tag_once_manual_caption_preserved_private_no_autopublish(self, ctx):
        uid1 = ctx["qa1"]["user"]["id"]
        before = set(m["_id"] for m in ctx["moments"].find({"user_id": uid1}, {"_id": 1}))

        public_room = _create_room(
            ctx,
            ctx["qa1"]["token"],
            title=f"TEST_iter44_auto_share_{uuid.uuid4().hex[:5]}",
            share_to_moments=True,
        )
        time.sleep(0.5)
        after_public = list(ctx["moments"].find({"user_id": uid1, "room_id": public_room["id"]}))
        assert len(after_public) >= 1
        auto = sorted(after_public, key=lambda d: d["created_at"])[0]
        assert auto.get("tags") == ["voiceroom"]
        assert auto.get("tags", []).count("voiceroom") == 1

        caption = f"TEST_iter44_caption_{uuid.uuid4().hex[:6]}"
        share_manual = ctx["s"].post(
            f"{ctx['base']}/api/rooms/{public_room['id']}/share-to-moments",
            json={"text": caption},
            headers=_hdr(ctx["qa1"]["token"]),
            timeout=30,
        )
        assert share_manual.status_code == 201
        latest = ctx["moments"].find_one({"user_id": uid1, "room_id": public_room["id"], "text": caption})
        assert latest is not None
        assert latest.get("tags") == ["voiceroom"]

        private_room = _create_room(
            ctx,
            ctx["qa1"]["token"],
            title=f"TEST_iter44_private_noauto_{uuid.uuid4().hex[:5]}",
            is_private=True,
            share_to_moments=True,
        )
        private_moments = list(ctx["moments"].find({"user_id": uid1, "room_id": private_room["id"]}))
        assert private_moments == []

        created = [m["_id"] for m in ctx["moments"].find({"user_id": uid1, "_id": {"$nin": list(before)}})]
        ctx["created_moment_ids"].extend(created)

    def test_notices_unread_preview_and_legacy_notice_serialization(self, ctx):
        room = _create_room(ctx, ctx["qa1"]["token"], title=f"TEST_iter44_notice_room_{uuid.uuid4().hex[:5]}")
        now = datetime.now(timezone.utc)
        n1 = {
            "_id": f"TEST_iter44_notice_{uuid.uuid4()}",
            "user_id": ctx["qa2"]["user"]["id"],
            "room_id": room["id"],
            "host_id": ctx["qa1"]["user"]["id"],
            "read": False,
            "created_at": now.isoformat(),
        }
        legacy = {
            "_id": f"TEST_iter44_legacy_notice_{uuid.uuid4()}",
            "user_id": ctx["qa2"]["user"]["id"],
            "room_id": room["id"],
            "host_id": ctx["qa1"]["user"]["id"],
            "created_at": (now - timedelta(minutes=1)).isoformat(),
        }
        ctx["notices"].insert_many([n1, legacy])
        ctx["created_notice_ids"].extend([n1["_id"], legacy["_id"]])

        unread = ctx["s"].get(f"{ctx['base']}/api/rooms/notices/unread", headers=_hdr(ctx["qa2"]["token"]), timeout=30)
        assert unread.status_code == 200
        payload = unread.json()
        assert payload["unread"] >= 1
        assert payload["last"]["type"] == "room"
        assert payload["last"]["text"] == "Voiceroom"

        feed = ctx["s"].get(f"{ctx['base']}/api/rooms/notices/list", headers=_hdr(ctx["qa2"]["token"]), timeout=30)
        assert feed.status_code == 200
        rows = feed.json()
        notice_ids = {r["id"] for r in rows}
        assert n1["_id"] in notice_ids
        assert legacy["_id"] in notice_ids


class TestWatchdogAndQuotaBoundaries:
    def test_listener_cap_watchdog_removes_listener_only_and_host_pool_stays_available(self, ctx):
        uid2 = ctx["free"]["user"]["id"]
        _reset_user_ledger(ctx, uid2)
        _inject_closed_interval(ctx, uid2, "listener", 7197)

        host_room = _create_room(ctx, ctx["qa1"]["token"], title=f"TEST_iter44_listener_cap_{uuid.uuid4().hex[:5]}")
        rid = host_room["id"]
        assert _join(ctx, rid, ctx["free"]["token"]).status_code == 200

        removed = False
        for _ in range(12):
            time.sleep(0.6)
            room = ctx["s"].get(f"{ctx['base']}/api/rooms/{rid}", headers=_hdr(ctx["qa1"]["token"]), timeout=30)
            if room.status_code != 200:
                continue
            member_ids = [m["id"] for m in room.json().get("members", [])]
            if uid2 not in member_ids:
                removed = True
                assert room.json()["is_live"] is True
                break
        assert removed is True

        rejoin = _join(ctx, rid, ctx["free"]["token"])
        assert rejoin.status_code == 403

        create_host = _create_room(ctx, ctx["free"]["token"], title=f"TEST_iter44_other_pool_ok_{uuid.uuid4().hex[:5]}")
        assert create_host["id"]

    def test_host_cap_watchdog_closes_owned_room_within_seconds(self, ctx):
        uid2 = ctx["free"]["user"]["id"]
        _reset_user_ledger(ctx, uid2)
        _inject_closed_interval(ctx, uid2, "host", 7197)

        own_room = _create_room(ctx, ctx["free"]["token"], title=f"TEST_iter44_host_cap_{uuid.uuid4().hex[:5]}")
        rid = own_room["id"]

        closed = False
        for _ in range(12):
            time.sleep(0.6)
            check = ctx["rooms"].find_one({"_id": rid}, {"is_live": 1})
            if check and check.get("is_live") is False:
                closed = True
                break
        assert closed is True

        recreate = ctx["s"].post(
            f"{ctx['base']}/api/rooms",
            json={"title": f"TEST_iter44_host_recreate_blocked_{uuid.uuid4().hex[:5]}", "language": "en"},
            headers=_hdr(ctx["free"]["token"]),
            timeout=30,
        )
        assert recreate.status_code == 403

    def test_warning_once_per_day_per_bucket_with_actual_websocket(self, ctx):
        uid2 = ctx["free"]["user"]["id"]
        _reset_user_ledger(ctx, uid2)
        # 6905s used => <5 min remaining. Warning should fire once with active room.
        _inject_closed_interval(ctx, uid2, "host", 6905)

        async def _case() -> list[dict]:
            events: list[dict] = []
            async with websockets.connect(_ws_url(ctx["base"], ctx["free"]["token"])) as ws:
                _create_room(ctx, ctx["free"]["token"], title=f"TEST_iter44_warning_{uuid.uuid4().hex[:5]}")
                # First enforcement call should emit warning.
                first = ctx["s"].get(f"{ctx['base']}/api/rooms/time-allowance", headers=_hdr(ctx["free"]["token"]), timeout=30)
                assert first.status_code == 200
                # Second call should not duplicate same-day host warning key.
                second = ctx["s"].get(f"{ctx['base']}/api/rooms/time-allowance", headers=_hdr(ctx["free"]["token"]), timeout=30)
                assert second.status_code == 200

                deadline = time.time() + 4
                while time.time() < deadline:
                    try:
                        raw = await asyncio.wait_for(ws.recv(), timeout=0.8)
                    except asyncio.TimeoutError:
                        continue
                    evt = json.loads(raw)
                    if evt.get("type") == "room_time_warning":
                        events.append(evt)
            return events

        warning_events = asyncio.run(_case())
        assert len([e for e in warning_events if e.get("bucket") == "host"]) == 1


class TestVipExpiryAndPureClockMath:
    def test_vip_bypass_then_expired_vip_uses_free_since_expiry(self, ctx):
        uid2 = ctx["free"]["user"]["id"]
        _reset_user_ledger(ctx, uid2)
        users = ctx["db"]["users"]

        # While VIP-active: unlimited despite spent ledgers.
        future = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
        users.update_one({"_id": uid2}, {"$set": {"is_vip": True, "vip_expires_at": future}})
        _inject_closed_interval(ctx, uid2, "host", 7197)
        vip = _allowance(ctx, ctx["free"]["token"])
        assert vip["is_unlimited"] is True
        assert vip["host"]["remaining_seconds"] is None

        # After VIP expiry: only time after expiry should consume free quota.
        now = datetime.now(timezone.utc)
        expired = (now - timedelta(minutes=5)).isoformat()
        users.update_one({"_id": uid2}, {"$set": {"is_vip": True, "vip_expires_at": expired}})

        old_id = f"TEST_iter44_oldhost_{uuid.uuid4()}"
        fresh_id = f"TEST_iter44_freshhost_{uuid.uuid4()}"
        ctx["ledger"].insert_many([
            {
                "_id": old_id,
                "room_id": f"TEST_old_{uuid.uuid4()}",
                "user_id": uid2,
                "bucket": "host",
                "started_at": (now - timedelta(minutes=30)).isoformat(),
                "last_seen_at": (now - timedelta(minutes=20)).isoformat(),
                "ended_at": (now - timedelta(minutes=20)).isoformat(),
            },
            {
                "_id": fresh_id,
                "room_id": f"TEST_new_{uuid.uuid4()}",
                "user_id": uid2,
                "bucket": "host",
                "started_at": (now - timedelta(minutes=3)).isoformat(),
                "last_seen_at": (now - timedelta(minutes=1)).isoformat(),
                "ended_at": (now - timedelta(minutes=1)).isoformat(),
            },
        ])
        ctx["created_ledger_ids"].extend([old_id, fresh_id])

        free = _allowance(ctx, ctx["free"]["token"])
        assert free["is_unlimited"] is False
        # Expired VIP: only post-expiry overlap counts (tail of active interval + fresh interval).
        assert 360 <= free["host"]["used_seconds"] <= 480

    def test_allowance_from_midnight_clipping_and_daily_reset_unit(self):
        now = datetime(2026, 1, 20, 0, 0, 10, tzinfo=timezone.utc)
        day_start, _ = day_bounds(now)
        prev_day = day_start - timedelta(days=1)

        rows = [
            {
                "bucket": "host",
                "started_at": (prev_day + timedelta(hours=23, minutes=59, seconds=30)).isoformat(),
                "ended_at": (day_start + timedelta(seconds=30)).isoformat(),
                "last_seen_at": (day_start + timedelta(seconds=30)).isoformat(),
            },
            {
                "bucket": "listener",
                "started_at": (day_start + timedelta(seconds=2)).isoformat(),
                "ended_at": (day_start + timedelta(seconds=7)).isoformat(),
                "last_seen_at": (day_start + timedelta(seconds=7)).isoformat(),
            },
        ]
        out = allowance_from(rows, unlimited=False, now=now)
        assert out.date == "2026-01-20"
        assert out.host.used_seconds == 10.0
        assert out.listener.used_seconds == 5.0
        assert out.host.remaining_seconds == 7190.0
        assert out.listener.remaining_seconds == 7195.0
