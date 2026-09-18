"""Iteration 34 backend integration tests.

# Module: practice availability + matching queue + direct call guards
# Module: ws signaling participant checks + media-ready connection gating
# Module: local caption pipeline (consent, PCM validation, real speech inference)
"""

from __future__ import annotations

import asyncio
import io
import json
import os
import struct
import subprocess
import wave
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any
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


def _require_base_url() -> str:
    if not BASE_URL:
        pytest.skip("EXPO_BACKEND_URL is missing; cannot run public-endpoint tests.")
    return BASE_URL


def _ws_url(base_url: str, token: str) -> str:
    parsed = urlparse(base_url)
    scheme = "wss" if parsed.scheme == "https" else "ws"
    return f"{scheme}://{parsed.netloc}/api/ws?token={token}"


def _login(session: requests.Session, email: str, password: str) -> tuple[str, dict[str, Any]]:
    res = session.post(
        f"{_require_base_url()}/api/auth/login",
        json={"email": email, "password": password},
        timeout=30,
    )
    assert res.status_code == 200, f"login failed for {email}: {res.status_code} {res.text[:200]}"
    data = res.json()
    return data["token"], data["user"]


def _hdr(token: str, octet: bool = False) -> dict[str, str]:
    headers = {"Authorization": f"Bearer {token}"}
    if octet:
        headers["Content-Type"] = "application/octet-stream"
    return headers


def _set_availability(session: requests.Session, token: str, enabled: bool, language: str = "en") -> requests.Response:
    return session.put(
        f"{_require_base_url()}/api/rtc/practice/availability",
        json={"available": enabled, "language": language},
        headers=_hdr(token),
        timeout=30,
    )


def _queue(session: requests.Session, token: str) -> requests.Response:
    return session.post(
        f"{_require_base_url()}/api/rtc/practice/queue",
        headers=_hdr(token),
        timeout=30,
    )


def _call_status(session: requests.Session, token: str, call_id: str, status: str) -> requests.Response:
    return session.post(
        f"{_require_base_url()}/api/rtc/calls/{call_id}/status",
        json={"status": status},
        headers=_hdr(token),
        timeout=30,
    )


def _speech_fixture_pcm16k() -> bytes:
    """Real speech only. A download failure MUST NOT become a sine-wave fixture."""
    tmp = Path("/tmp/iter34_caption_speech.wav")
    if shutil_which("espeak"):
        try:
            subprocess.run(
                ["espeak", "-v", "en", "Hello friend this is a caption test", "-s", "150", "-w", str(tmp)],
                check=True,
                capture_output=True,
                text=True,
                timeout=20,
            )
            with wave.open(str(tmp), "rb") as wf:
                channels = wf.getnchannels()
                sampwidth = wf.getsampwidth()
                rate = wf.getframerate()
                frames = wf.readframes(wf.getnframes())
            if sampwidth == 2 and channels >= 1 and rate > 0:
                samples = struct.unpack("<" + "h" * (len(frames) // 2), frames)
                mono = samples[::channels] if channels > 1 else samples
                if rate != 16000:
                    ratio = 16000 / rate
                    target_len = int(len(mono) * ratio)
                    resampled = []
                    for i in range(target_len):
                        src = i / ratio
                        j = int(src)
                        frac = src - j
                        a = mono[min(j, len(mono) - 1)]
                        b = mono[min(j + 1, len(mono) - 1)]
                        resampled.append(int(a + (b - a) * frac))
                    mono = resampled
                return struct.pack("<" + "h" * len(mono), *mono)
        except Exception:
            pass

    fixture = Path(os.environ.get("CAPTION_TEST_WAV", "/tmp/caption-real-speech.wav"))
    assert fixture.is_file(), "Provide CAPTION_TEST_WAV pointing to real PCM speech; no tone fallback."
    with wave.open(io.BytesIO(fixture.read_bytes())) as wf:
        assert wf.getsampwidth() == 2, "Real speech must be PCM16"
        channels, rate = wf.getnchannels(), wf.getframerate()
        frames = wf.readframes(int(rate * 4))
    import numpy as np
    mono = np.frombuffer(frames, dtype="<i2")[::channels]
    positions = np.arange(int(len(mono) * 16000 / rate)) * rate / 16000
    return np.interp(positions, np.arange(len(mono)), mono).astype("<i2").tobytes()


def shutil_which(cmd: str) -> str | None:
    from shutil import which

    return which(cmd)


@pytest.fixture(scope="module")
def state() -> dict[str, Any]:
    session = requests.Session()
    base = _require_base_url()
    t1, u1 = _login(session, QA1_EMAIL, QA_PASSWORD)
    t2, u2 = _login(session, QA2_EMAIL, QA_PASSWORD)

    me1 = session.get(f"{base}/api/auth/me", headers=_hdr(t1), timeout=30)
    me2 = session.get(f"{base}/api/auth/me", headers=_hdr(t2), timeout=30)
    assert me1.status_code == 200 and me2.status_code == 200
    p1 = me1.json()
    p2 = me2.json()

    tracker = {
        "session": session,
        "base": base,
        "qa1": {"token": t1, "user": u1, "orig": p1},
        "qa2": {"token": t2, "user": u2, "orig": p2},
        "calls": [],
    }
    yield tracker

    # cleanup queue + availability
    for token in (t1, t2):
        try:
            session.delete(f"{base}/api/rtc/practice/queue", headers=_hdr(token), timeout=20)
        except Exception:
            pass
        try:
            _set_availability(session, token, False)
        except Exception:
            pass

    # cleanup created calls
    for call_id in tracker["calls"]:
        try:
            _call_status(session, t1, call_id, "CANCELLED")
        except Exception:
            pass

    # restore language profiles
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


class TestPracticeAvailabilityAndQueue:
    """Practice API behavior with real QA users."""

    def test_availability_requires_online_ws_and_partner_listing(self, state):
        async def _case():
            s = state["session"]
            t1 = state["qa1"]["token"]
            t2 = state["qa2"]["token"]
            id2 = state["qa2"]["user"]["id"]

            offline = _set_availability(s, t1, True, "en")
            assert offline.status_code == 409, offline.text

            async with websockets.connect(_ws_url(state["base"], t1)), websockets.connect(
                _ws_url(state["base"], t2)
            ):
                await asyncio.sleep(0.2)
                on1 = _set_availability(s, t1, True, "en")
                on2 = _set_availability(s, t2, True, "en")
                assert on1.status_code == 200 and on1.json().get("available") is True
                assert on2.status_code == 200 and on2.json().get("available") is True

                partners = s.get(
                    f"{state['base']}/api/rtc/practice/partners?language=en",
                    headers=_hdr(t1),
                    timeout=30,
                )
                assert partners.status_code == 200
                body = partners.json()
                ids = {p["id"] for p in body.get("partners", [])}
                assert id2 in ids, f"QA2 should appear when online+opted in. got={ids}"
                assert state["qa1"]["user"]["id"] not in ids

        asyncio.run(_case())

    def test_queue_match_cancel_and_single_reserved_callid(self, state):
        async def _case():
            s = state["session"]
            t1 = state["qa1"]["token"]
            t2 = state["qa2"]["token"]

            async with websockets.connect(_ws_url(state["base"], t1)), websockets.connect(_ws_url(state["base"], t2)):
                assert _set_availability(s, t1, True, "en").status_code == 200
                assert _set_availability(s, t2, True, "en").status_code == 200

                first = _queue(s, t1)
                assert first.status_code == 200
                assert first.json().get("state") == "searching"

                # Two concurrent queue hits for QA2 should not allocate 2 call IDs.
                with ThreadPoolExecutor(max_workers=2) as ex:
                    r1_f = ex.submit(_queue, s, t2)
                    r2_f = ex.submit(_queue, s, t2)
                r1 = r1_f.result()
                r2 = r2_f.result()
                assert r1.status_code == 200 and r2.status_code == 200
                bodies = [r1.json(), r2.json()]
                matched = [b for b in bodies if b.get("state") == "matched" and b.get("call_id")]
                assert len(matched) == 1, f"expected exactly one match reservation, got {bodies}"
                call_id = matched[0]["call_id"]
                state["calls"].append(call_id)

                # Release reservation so later tests are not blocked as "busy".
                released = _call_status(s, t2, call_id, "CANCELLED")
                assert released.status_code == 200

                cancel = s.delete(f"{state['base']}/api/rtc/practice/queue", headers=_hdr(t1), timeout=30)
                assert cancel.status_code == 200 and cancel.json().get("ok") is True
                assert _set_availability(s, t1, False).status_code == 200
                assert _set_availability(s, t2, False).status_code == 200

        asyncio.run(_case())


class TestRtcSignalingAndCaptionGates:
    """Signaling participant checks and caption consent/media-ready flow."""

    def test_participant_only_signaling_and_media_ready_connection_gate(self, state):
        async def _case():
            s = state["session"]
            t1 = state["qa1"]["token"]
            t2 = state["qa2"]["token"]
            id2 = state["qa2"]["user"]["id"]

            create = s.post(f"{state['base']}/api/rtc/calls", json={"receiver_id": id2}, headers=_hdr(t1), timeout=30)
            assert create.status_code == 201, create.text
            call_id = create.json()["call_id"]
            state["calls"].append(call_id)

            async with websockets.connect(_ws_url(state["base"], t1)) as ws1, websockets.connect(
                _ws_url(state["base"], t2)
            ) as ws2:
                await asyncio.sleep(0.2)

                await ws1.send(
                    '{"type":"call_offer","to":"not-a-participant","call_id":"%s","sdp":{"type":"offer","sdp":"v=0"}}'
                    % call_id
                )
                invalid_raw = await asyncio.wait_for(ws1.recv(), timeout=4)
                assert "call_invalid" in invalid_raw

                await ws1.send(
                    '{"type":"call_offer","to":"%s","call_id":"%s","sdp":{"type":"offer","sdp":"v=0"}}'
                    % (id2, call_id)
                )
                offer_for_b = await asyncio.wait_for(ws2.recv(), timeout=4)
                assert "call_offer" in offer_for_b

                await ws2.send(
                    '{"type":"call_answer","to":"%s","call_id":"%s","sdp":{"type":"answer","sdp":"v=0"}}'
                    % (state["qa1"]["user"]["id"], call_id)
                )
                answer_for_a = await asyncio.wait_for(ws1.recv(), timeout=4)
                assert "call_answer" in answer_for_a

                c1 = s.put(f"{state['base']}/api/rtc/calls/{call_id}/captions", json={"enabled": True}, headers=_hdr(t1), timeout=30)
                c2 = s.put(f"{state['base']}/api/rtc/calls/{call_id}/captions", json={"enabled": True}, headers=_hdr(t2), timeout=30)
                assert c1.status_code == 200 and c2.status_code == 200

                st_pre = s.get(f"{state['base']}/api/rtc/calls/{call_id}/captions", headers=_hdr(t1), timeout=30)
                assert st_pre.status_code == 200
                assert st_pre.json().get("active") is False, "answer-only must not mark CONNECTED"

                await ws1.send('{"type":"call_media_ready","to":"%s","call_id":"%s"}' % (id2, call_id))
                await asyncio.sleep(0.25)
                st_mid = s.get(f"{state['base']}/api/rtc/calls/{call_id}/captions", headers=_hdr(t1), timeout=30)
                assert st_mid.status_code == 200 and st_mid.json().get("active") is False

                await ws2.send('{"type":"call_media_ready","to":"%s","call_id":"%s"}' % (state["qa1"]["user"]["id"], call_id))
                await asyncio.sleep(0.3)
                st_a = s.get(f"{state['base']}/api/rtc/calls/{call_id}/captions", headers=_hdr(t1), timeout=30)
                st_b = s.get(f"{state['base']}/api/rtc/calls/{call_id}/captions", headers=_hdr(t2), timeout=30)
                assert st_a.status_code == 200 and st_a.json().get("active") is True
                assert st_b.status_code == 200 and st_b.json().get("active") is True

            done = _call_status(s, t1, call_id, "CANCELLED")
            assert done.status_code == 200

        asyncio.run(_case())


class TestCaptionEngineRuntime:
    """Runtime caption assertions with local Whisper+M2M100 models."""

    def test_caption_audio_validation_and_local_translation_output(self, state):
        async def _case():
            s = state["session"]
            t1 = state["qa1"]["token"]
            t2 = state["qa2"]["token"]
            id1 = state["qa1"]["user"]["id"]
            id2 = state["qa2"]["user"]["id"]

            # Temporarily set target native languages for translation validation.
            p1 = s.put(
                f"{state['base']}/api/users/me",
                json={"native_language": "bn", "learning_language": "en", "learning_languages": ["en"]},
                headers=_hdr(t1),
                timeout=30,
            )
            p2 = s.put(
                f"{state['base']}/api/users/me",
                json={"native_language": "es", "learning_language": "en", "learning_languages": ["en"]},
                headers=_hdr(t2),
                timeout=30,
            )
            assert p1.status_code == 200 and p2.status_code == 200

            create = s.post(f"{state['base']}/api/rtc/calls", json={"receiver_id": id2}, headers=_hdr(t1), timeout=30)
            assert create.status_code == 201, create.text
            call_id = create.json()["call_id"]
            state["calls"].append(call_id)

            async with websockets.connect(_ws_url(state["base"], t1)) as ws1, websockets.connect(
                _ws_url(state["base"], t2)
            ) as ws2:
                await ws1.send(
                    '{"type":"call_offer","to":"%s","call_id":"%s","sdp":{"type":"offer","sdp":"v=0"}}'
                    % (id2, call_id)
                )
                await asyncio.wait_for(ws2.recv(), timeout=4)
                await ws2.send(
                    '{"type":"call_answer","to":"%s","call_id":"%s","sdp":{"type":"answer","sdp":"v=0"}}'
                    % (id1, call_id)
                )
                await asyncio.wait_for(ws1.recv(), timeout=4)
                await ws1.send('{"type":"call_media_ready","to":"%s","call_id":"%s"}' % (id2, call_id))
                await ws2.send('{"type":"call_media_ready","to":"%s","call_id":"%s"}' % (id1, call_id))
                await asyncio.sleep(0.35)

                c1 = s.put(
                    f"{state['base']}/api/rtc/calls/{call_id}/captions",
                    json={"enabled": True},
                    headers=_hdr(t1),
                    timeout=30,
                )
                c2 = s.put(
                    f"{state['base']}/api/rtc/calls/{call_id}/captions",
                    json={"enabled": True},
                    headers=_hdr(t2),
                    timeout=30,
                )
                assert c1.status_code == 200 and c2.status_code == 200

                silence = bytes(6400)
                silent = s.post(
                    f"{state['base']}/api/rtc/calls/{call_id}/audio",
                    data=silence,
                    headers=_hdr(t1, octet=True),
                    timeout=30,
                )
                assert silent.status_code == 200
                assert silent.json().get("speech_detected") is False

                oversize = s.post(
                    f"{state['base']}/api/rtc/calls/{call_id}/audio",
                    data=bytes(16000 * 2 * 6 + 2),
                    headers=_hdr(t1, octet=True),
                    timeout=30,
                )
                assert oversize.status_code == 413

                speech = _speech_fixture_pcm16k()
                submit = s.post(
                    f"{state['base']}/api/rtc/calls/{call_id}/audio",
                    data=speech,
                    headers=_hdr(t1, octet=True),
                    timeout=90,
                )
                assert submit.status_code == 200, submit.text
                submit_data = submit.json()
                assert submit_data.get("speech_detected") is True, (
                    f"expected speech_detected=true for speech fixture, got {submit_data}"
                )

                # Expect call_caption for both listeners with target language from DB profile.
                got = []
                end_by = asyncio.get_running_loop().time() + 12
                while asyncio.get_running_loop().time() < end_by and len(got) < 2:
                    for ws in (ws1, ws2):
                        try:
                            msg = await asyncio.wait_for(ws.recv(), timeout=1.2)
                        except asyncio.TimeoutError:
                            continue
                        if "call_caption" in msg:
                            got.append(msg)
                    await asyncio.sleep(0.05)

                assert got, "No call_caption events observed after speech fixture submission"
                events = [json.loads(part) for part in got]
                by_language = {e["target_language"]: e for e in events}
                assert set(by_language) == {"bn", "es"}
                assert any("\u0980" <= ch <= "\u09ff" for ch in by_language["bn"]["text"])
                assert by_language["es"]["text"] != by_language["es"]["original"]
                print("Verified local caption output:", {k: e["text"] for k, e in by_language.items()})

                revoke = s.put(
                    f"{state['base']}/api/rtc/calls/{call_id}/captions",
                    json={"enabled": False},
                    headers=_hdr(t2),
                    timeout=30,
                )
                assert revoke.status_code == 200
                after_revoke = s.post(
                    f"{state['base']}/api/rtc/calls/{call_id}/audio",
                    data=speech,
                    headers=_hdr(t1, octet=True),
                    timeout=30,
                )
                assert after_revoke.status_code == 403

            ended = _call_status(s, t1, call_id, "CANCELLED")
            assert ended.status_code == 200
            ended_audio = s.post(
                f"{state['base']}/api/rtc/calls/{call_id}/audio",
                data=bytes(6400),
                headers=_hdr(t1, octet=True),
                timeout=30,
            )
            assert ended_audio.status_code == 404

        asyncio.run(_case())
