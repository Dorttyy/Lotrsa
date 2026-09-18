"""Prepare faithful bundled branding; archive derivatives in managed storage.

Run manually with EMERGENT_LLM_KEY supplied in the environment (never bundled).
No redraw, recoloring, aspect distortion, or removal of the photo background.
"""
import hashlib
import io
import json
import os
from pathlib import Path
import uuid

from dotenv import load_dotenv
from PIL import Image, ImageOps
import requests

load_dotenv()
SOURCE = "https://customer-assets-v7afamib.emergentagent.net/job_elevate-familiar/artifacts/xgnt8aha_1789740818648.jpg"
DEST = Path(__file__).resolve().parents[1] / "assets" / "images"


def prepare():
    response = requests.get(SOURCE, timeout=60)
    response.raise_for_status()
    source = ImageOps.exif_transpose(Image.open(io.BytesIO(response.content))).convert("RGB")
    saturation = source.convert("HSV").getchannel("S").point(lambda value: 255 if value > 65 else 0)
    left, top, right, bottom = saturation.getbbox()
    side = min(source.width, source.height, max(right - left, bottom - top) + 120)
    x = max(0, min(source.width - side, (left + right - side) // 2 + 8))
    y = max(0, min(source.height - side, (top + bottom - side) // 2 + 10))
    crop = (x, y, x + side, y + side)
    square = source.crop(crop)
    icon = square.resize((1024, 1024), Image.Resampling.LANCZOS)
    background = square.getpixel((0, 0))
    adaptive = Image.new("RGB", (1080, 1080), background)
    adaptive.paste(square.resize((660, 660), Image.Resampling.LANCZOS), (210, 210))
    # Android status icons MUST be white with transparency, not full-color art.
    silhouette = saturation.crop(crop).resize((96, 96), Image.Resampling.LANCZOS)
    notification = Image.new("RGBA", (96, 96), "white")
    notification.putalpha(silhouette)
    assets = {"icon.png": icon, "adaptive-icon.png": adaptive,
              "splash-icon.png": square.resize((512, 512), Image.Resampling.LANCZOS),
              "brand-logo.png": square.resize((256, 256), Image.Resampling.LANCZOS),
              "favicon.png": square.resize((64, 64), Image.Resampling.LANCZOS),
              "notification-icon.png": notification}
    base = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
    api = base.rstrip("/") + "/objstore/api/v1/storage"
    key = os.environ.get("EMERGENT_LLM_KEY")
    if not key:
        raise RuntimeError("Managed storage credential required in environment")
    init = requests.post(f"{api}/init", json={"emergent_key": key}, timeout=30)
    init.raise_for_status()
    headers = {"X-Storage-Key": init.json()["storage_key"]}
    records = []
    for name, image in assets.items():
        buffer = io.BytesIO()
        image.save(buffer, format="PNG", optimize=True)
        content = buffer.getvalue()
        digest = hashlib.sha256(content).hexdigest()
        path = f"linguaconnect/uploads/branding/{uuid.uuid5(uuid.NAMESPACE_URL, digest)}.png"
        result = requests.put(f"{api}/objects/{path}", data=content,
                              headers={**headers, "Content-Type": "image/png"}, timeout=120)
        result.raise_for_status()
        stored = result.json()["path"]
        verify = requests.get(f"{api}/objects/{stored}", headers=headers, timeout=60)
        verify.raise_for_status()
        if hashlib.sha256(verify.content).hexdigest() != digest:
            raise RuntimeError("Storage round-trip integrity mismatch")
        (DEST / name).write_bytes(content)
        records.append({"file": name, "size": image.size, "mode": image.mode,
                        "sha256": digest, "storage_path": stored})
    (DEST / "brand-original.jpg").write_bytes(response.content)
    print(json.dumps({"source": SOURCE, "source_size": source.size, "crop": crop,
                      "background": "#%02X%02X%02X" % background, "assets": records}, indent=2))


if __name__ == "__main__":
    prepare()