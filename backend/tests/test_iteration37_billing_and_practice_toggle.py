"""Iteration 37 targeted backend regression.

# Module: billing safety gates and legacy endpoint shutdown behavior
# Module: paid_practice vs gift_gate mutual-exclusion update rules
"""

from __future__ import annotations

import os
from concurrent.futures import ThreadPoolExecutor

import pytest
import requests
from dotenv import load_dotenv


load_dotenv("/app/frontend/.env")

BASE_URL = (os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL") or "").strip().strip("'").rstrip("/")
QA1_EMAIL = "qa_tester_b40dc299@linguatest.com"
QA2_EMAIL = "qa_guest_removal_67403793@linguatest.com"
QA_PASSWORD = "QATest2026!"


def _base() -> str:
    if not BASE_URL:
        pytest.skip("EXPO_BACKEND_URL missing")
    return BASE_URL


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


def _hdr(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def auth_state() -> dict:
    s = requests.Session()
    base = _base()
    t1, _ = _login(s, QA1_EMAIL, QA_PASSWORD)
    t2, u2 = _login(s, QA2_EMAIL, QA_PASSWORD)

    me1 = s.get(f"{base}/api/auth/me", headers=_hdr(t1), timeout=30)
    me2 = s.get(f"{base}/api/auth/me", headers=_hdr(t2), timeout=30)
    assert me1.status_code == 200 and me2.status_code == 200

    st = {
        "s": s,
        "base": base,
        "qa1": {"token": t1, "orig": me1.json()},
        "qa2": {"token": t2, "id": u2["id"], "orig": me2.json()},
    }
    yield st

    # Restore QA1 toggles/rates
    restore = {
        "paid_practice": bool(st["qa1"]["orig"].get("paid_practice")),
        "gift_gate": bool(st["qa1"]["orig"].get("gift_gate")),
        "practice_rate": int(st["qa1"]["orig"].get("practice_rate") or 50),
        "gift_gate_min": int(st["qa1"]["orig"].get("gift_gate_min") or 20),
    }
    try:
        s.put(f"{base}/api/users/me", json=restore, headers=_hdr(t1), timeout=30)
    except Exception:
        pass


class TestBillingSafety:
    def test_legacy_vip_and_topup_endpoints_are_410_and_wallet_unchanged(self, auth_state):
        s = auth_state["s"]
        base = auth_state["base"]
        t1 = auth_state["qa1"]["token"]

        before = s.get(f"{base}/api/market/wallet", headers=_hdr(t1), timeout=30)
        assert before.status_code == 200
        before_wallet = before.json()

        vip = s.post(f"{base}/api/users/me/vip", headers=_hdr(t1), timeout=30)
        assert vip.status_code == 410
        assert "app store" in (vip.text or "").lower()

        topup = s.post(f"{base}/api/market/topup", json={"amount": 100}, headers=_hdr(t1), timeout=30)
        assert topup.status_code == 410

        topup_pack = s.post(f"{base}/api/market/topup-pack", json={"coins": 8}, headers=_hdr(t1), timeout=30)
        assert topup_pack.status_code == 410

        redeem_vip = s.post(
            f"{base}/api/market/redeem",
            json={"what": "vip", "days": 7},
            headers=_hdr(t1),
            timeout=30,
        )
        assert redeem_vip.status_code == 410

        after = s.get(f"{base}/api/market/wallet", headers=_hdr(t1), timeout=30)
        assert after.status_code == 200
        assert after.json() == before_wallet

    def test_vip_market_catalog_item_is_not_coin_buyable(self, auth_state):
        s = auth_state["s"]
        base = auth_state["base"]
        t1 = auth_state["qa1"]["token"]

        wallet_before = s.get(f"{base}/api/market/wallet", headers=_hdr(t1), timeout=30).json()
        blocked = s.post(
            f"{base}/api/market/buy",
            json={"item_id": "vip_monthly"},
            headers=_hdr(t1),
            timeout=30,
        )
        assert blocked.status_code == 410
        wallet_after = s.get(f"{base}/api/market/wallet", headers=_hdr(t1), timeout=30).json()
        assert wallet_after == wallet_before

    def test_unknown_purchase_endpoint_cannot_grant_vip(self, auth_state):
        s = auth_state["s"]
        base = auth_state["base"]
        t1 = auth_state["qa1"]["token"]

        res = s.post(
            f"{base}/api/market/purchasevipitems",
            json={"days": 7},
            headers=_hdr(t1),
            timeout=30,
        )
        # This route never existed. The real /market/buy VIP path is asserted
        # above; do not invent a legacy endpoint merely to make a test pass.
        assert res.status_code == 404


class TestPracticeGiftMutualExclusion:
    def test_both_true_payload_rejected_with_422(self, auth_state):
        s = auth_state["s"]
        base = auth_state["base"]
        t1 = auth_state["qa1"]["token"]
        res = s.put(
            f"{base}/api/users/me",
            json={"paid_practice": True, "gift_gate": True},
            headers=_hdr(t1),
            timeout=30,
        )
        assert res.status_code == 422

    def test_enable_one_mode_auto_disables_other_and_both_false_allowed(self, auth_state):
        s = auth_state["s"]
        base = auth_state["base"]
        t1 = auth_state["qa1"]["token"]

        on_paid = s.put(
            f"{base}/api/users/me",
            json={"paid_practice": True, "gift_gate": False, "practice_rate": 60},
            headers=_hdr(t1),
            timeout=30,
        )
        assert on_paid.status_code == 200
        paid_doc = on_paid.json()
        assert paid_doc["paid_practice"] is True
        assert paid_doc["gift_gate"] is False

        on_gift = s.put(
            f"{base}/api/users/me",
            json={"gift_gate": True, "gift_gate_min": 20},
            headers=_hdr(t1),
            timeout=30,
        )
        assert on_gift.status_code == 200
        gift_doc = on_gift.json()
        assert gift_doc["gift_gate"] is True
        assert gift_doc["paid_practice"] is False

        off_both = s.put(
            f"{base}/api/users/me",
            json={"paid_practice": False, "gift_gate": False},
            headers=_hdr(t1),
            timeout=30,
        )
        assert off_both.status_code == 200
        doc = off_both.json()
        assert doc["paid_practice"] is False
        assert doc["gift_gate"] is False

    def test_concurrent_enable_attempts_never_persist_both_true(self, auth_state):
        s = auth_state["s"]
        base = auth_state["base"]
        t1 = auth_state["qa1"]["token"]

        # Baseline off for deterministic race
        reset = s.put(
            f"{base}/api/users/me",
            json={"paid_practice": False, "gift_gate": False},
            headers=_hdr(t1),
            timeout=30,
        )
        assert reset.status_code == 200

        def _put(payload: dict):
            return requests.put(
                f"{base}/api/users/me",
                json=payload,
                headers=_hdr(t1),
                timeout=30,
            )

        with ThreadPoolExecutor(max_workers=2) as pool:
            f1 = pool.submit(_put, {"paid_practice": True})
            f2 = pool.submit(_put, {"gift_gate": True})
            r1, r2 = f1.result(), f2.result()

        assert r1.status_code == 200
        assert r2.status_code == 200

        final_me = s.get(f"{base}/api/auth/me", headers=_hdr(t1), timeout=30)
        assert final_me.status_code == 200
        doc = final_me.json()
        assert not (bool(doc.get("paid_practice")) and bool(doc.get("gift_gate")))

    def test_practice_status_prioritizes_paid_mode_over_gift_gate(self, auth_state):
        s = auth_state["s"]
        base = auth_state["base"]
        t1 = auth_state["qa1"]["token"]
        t2 = auth_state["qa2"]["token"]
        qa1_id = auth_state["qa1"]["orig"]["id"]

        set_paid = s.put(
            f"{base}/api/users/me",
            json={"paid_practice": True, "gift_gate": False, "practice_rate": 55},
            headers=_hdr(t1),
            timeout=30,
        )
        assert set_paid.status_code == 200

        status = s.get(f"{base}/api/practice/status/{qa1_id}", headers=_hdr(t2), timeout=30)
        assert status.status_code == 200
        data = status.json()
        assert data["is_paid_partner"] is True
        assert data["is_gift_gate"] is False
        assert data["rate"] == 55
