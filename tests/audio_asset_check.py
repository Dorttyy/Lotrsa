import hashlib
import json
import os
import wave


def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def wav_duration(path: str) -> float:
    with wave.open(path, "rb") as w:
        return w.getnframes() / float(w.getframerate())


def mp3_duration(path: str):
    try:
        from mutagen.mp3 import MP3
    except Exception as e:  # pragma: no cover
        return {"duration": None, "error": f"mutagen unavailable: {e}"}
    try:
        return {"duration": float(MP3(path).info.length), "error": None}
    except Exception as e:
        return {"duration": None, "error": str(e)}


def main():
    mp3 = "/app/frontend/assets/sounds/outgoing-call.mp3"
    wav = "/app/frontend/assets/sounds/ringtone.wav"

    out = {
        "outgoing_call_mp3": {
            "exists": os.path.exists(mp3),
            "bytes": os.path.getsize(mp3) if os.path.exists(mp3) else None,
            "sha256": sha256_file(mp3) if os.path.exists(mp3) else None,
            **mp3_duration(mp3),
        },
        "ringtone_wav": {
            "exists": os.path.exists(wav),
            "bytes": os.path.getsize(wav) if os.path.exists(wav) else None,
            "sha256": sha256_file(wav) if os.path.exists(wav) else None,
            "duration": wav_duration(wav) if os.path.exists(wav) else None,
        },
    }
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
