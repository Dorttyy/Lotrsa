"""
Iteration 30 — Paid Practice partner isolation

Verifies:
  * GET /api/users/partners (default, no params) MUST NOT include any user
    with paid_practice=true.
  * The same holds when filtering by language, location, gender, online_only,
    and search.
  * GET /api/users/partners?paid_practice=true returns ALL paid_practice=true
    users (the standalone pool).
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/") or \
           os.environ.get("EXPO_BACKEND_URL", "").rstrip("/")

MEI_EMAIL = "mei@demo.com"
MEI_PASSWORD = "Demo1234!"


@pytest.fixture(scope="module")
def mei_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": MEI_EMAIL, "password": MEI_PASSWORD},
        timeout=30,
    )
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(mei_token):
    return {"Authorization": f"Bearer {mei_token}", "Content-Type": "application/json"}


def _get_partners(auth_headers, **params):
    r = requests.get(
        f"{BASE_URL}/api/users/partners",
        params=params or None,
        headers=auth_headers,
        timeout=30,
    )
    assert r.status_code == 200, f"{params} → {r.status_code} {r.text[:200]}"
    return r.json()


def _paid_practice_pool(auth_headers):
    """The full set of paid_practice=true partners from the standalone tab."""
    return _get_partners(auth_headers, paid_practice="true")


class TestPaidPracticePool:
    """Standalone pool returned by ?paid_practice=true."""

    def test_pool_nonempty(self, auth_headers):
        pool = _paid_practice_pool(auth_headers)
        assert isinstance(pool, list)
        assert len(pool) >= 1, "Demo should have at least one paid_practice partner"

    def test_all_pool_users_have_paid_practice_true(self, auth_headers):
        pool = _paid_practice_pool(auth_headers)
        for u in pool:
            assert u.get("paid_practice") is True, (
                f"User {u.get('name')}/{u.get('id')} in pool but paid_practice != True"
            )

    def test_expected_demo_names_present(self, auth_headers):
        """Demo seed lists Emma Wilson / Amélie Laurent / Yuki Tanaka."""
        pool = _paid_practice_pool(auth_headers)
        names = {u.get("name") for u in pool}
        # Do not hard-fail if seed changes; just require at least one known.
        known = {"Emma Wilson", "Amélie Laurent", "Yuki Tanaka"}
        assert names & known, f"None of {known} found in paid_practice pool: {names}"


class TestPaidPracticeIsolation:
    """paid_practice=true users MUST be hidden from every other partner list."""

    def _pool_ids(self, auth_headers):
        return {u["id"] for u in _paid_practice_pool(auth_headers)}

    def test_default_partners_excludes_paid(self, auth_headers):
        pool_ids = self._pool_ids(auth_headers)
        partners = _get_partners(auth_headers)
        ids = {u["id"] for u in partners}
        leaked = ids & pool_ids
        assert not leaked, f"Paid-practice users leaked into default list: {leaked}"
        # Also verify the flag is not True on any returned card
        for u in partners:
            assert u.get("paid_practice") is not True, (
                f"Default list includes paid_practice=true user {u.get('name')}"
            )

    def test_language_all_excludes_paid(self, auth_headers):
        pool_ids = self._pool_ids(auth_headers)
        partners = _get_partners(auth_headers, language="all")
        ids = {u["id"] for u in partners}
        assert not (ids & pool_ids), "Paid users leaked into ?language=all"

    def test_language_specific_excludes_paid(self, auth_headers):
        pool_ids = self._pool_ids(auth_headers)
        # Try a few common learning languages present in demo
        for lang in ["en", "es", "ja", "fr", "zh"]:
            partners = _get_partners(auth_headers, language=lang)
            ids = {u["id"] for u in partners}
            leaked = ids & pool_ids
            assert not leaked, f"Paid users leaked into ?language={lang}: {leaked}"

    def test_location_filter_excludes_paid(self, auth_headers):
        pool_ids = self._pool_ids(auth_headers)
        # Pick a location that a paid_practice user actually has to make the
        # test meaningful (e.g., country of Emma/Yuki/Amélie).
        pool = _paid_practice_pool(auth_headers)
        countries = {u.get("country") for u in pool if u.get("country")}
        assert countries, "Paid pool should have at least one country to test with"
        for c in countries:
            partners = _get_partners(auth_headers, location=c)
            ids = {u["id"] for u in partners}
            leaked = ids & pool_ids
            assert not leaked, f"Paid users leaked into ?location={c}: {leaked}"

    def test_gender_filter_excludes_paid(self, auth_headers):
        pool_ids = self._pool_ids(auth_headers)
        for g in ["male", "female"]:
            partners = _get_partners(auth_headers, gender=g)
            ids = {u["id"] for u in partners}
            leaked = ids & pool_ids
            assert not leaked, f"Paid users leaked into ?gender={g}: {leaked}"

    def test_online_only_excludes_paid(self, auth_headers):
        pool_ids = self._pool_ids(auth_headers)
        partners = _get_partners(auth_headers, online_only="true")
        ids = {u["id"] for u in partners}
        leaked = ids & pool_ids
        assert not leaked, f"Paid users leaked into ?online_only=true: {leaked}"

    def test_search_excludes_paid(self, auth_headers):
        pool_ids = self._pool_ids(auth_headers)
        pool = _paid_practice_pool(auth_headers)
        # Search by the first name of a paid user — the exact user should NOT
        # come back in the non-paid search.
        for u in pool:
            name = (u.get("name") or "").split()[0]
            if not name:
                continue
            partners = _get_partners(auth_headers, search=name)
            ids = {p["id"] for p in partners}
            assert u["id"] not in ids, (
                f"Paid user {u.get('name')} leaked into search='{name}'"
            )

    def test_min_max_age_excludes_paid(self, auth_headers):
        pool_ids = self._pool_ids(auth_headers)
        partners = _get_partners(auth_headers, min_age=13, max_age=120)
        ids = {u["id"] for u in partners}
        leaked = ids & pool_ids
        assert not leaked, f"Paid users leaked into age filter: {leaked}"
