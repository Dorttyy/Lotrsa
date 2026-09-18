"""Prepare faithful bundled branding; archive derivatives in managed storage.

Run manually with EMERGENT_LLM_KEY supplied in the environment (never bundled).
Use the NEW transparent user upload without recoloring or redrawing.
"""
import hashlib
import io
import json
import math
import os
from pathlib import Path
import uuid

from dotenv import load_dotenv
from PIL import Image, ImageChops, ImageOps
import requests

load_dotenv()
SOURCE = "https://customer-assets-v7afamib.emergentagent.net/job_elevate-familiar/artifacts/rizf8n77_1000101542.png"
DEST = Path(__file__).resolve().parents[1] / "assets" / "images"


def prepare():
    response = requests.get(SOURCE, timeout=60)
    response.raise_for_status()
    source = ImageOps.exif_transpose(Image.open(io.BytesIO(response.content))).convert("RGBA")
    crop = source.getchannel("A").getbbox()
    artwork = source.crop(crop)
    side = max(artwork.size) + 120
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.alpha_composite(artwork, ((side - artwork.width) // 2, (side - artwork.height) // 2))
    android_icon = square.resize((1024, 1024), Image.Resampling.LANCZOS)
    # Apple app-store icons cannot have alpha. Only the iOS/general icon gets a
    # white backing; default icon, in-app logo, splash and Android stay transparent.
    icon = Image.new("RGBA", (1024, 1024), "white")
    icon.alpha_composite(android_icon)
    icon = icon.convert("RGB")
    alpha = square.getchannel("A")
    radius = max(math.hypot(x - side / 2, y - side / 2)
                 for y in range(side) for x in range(side) if alpha.getpixel((x, y)))
    adaptive_size = min(660, int(side * 318 / radius))
    adaptive = Image.new("RGBA", (1080, 1080), (0, 0, 0, 0))
    offset = (1080 - adaptive_size) // 2
    adaptive.alpha_composite(square.resize((adaptive_size, adaptive_size), Image.Resampling.LANCZOS), (offset, offset))
    # Android status icons MUST be white with transparency, not full-color art.
    saturation = square.convert("RGB").convert("HSV").getchannel("S").point(lambda value: 255 if value > 65 else 0)
    silhouette = ImageChops.multiply(alpha, saturation).resize((96, 96), Image.Resampling.LANCZOS)
    notification = Image.new("RGBA", (96, 96), "white")
    notification.putalpha(silhouette)
    assets = {"icon.png": android_icon, "ios-icon.png": icon, "android-icon.png": android_icon, "adaptive-icon.png": adaptive,
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
    (DEST / "brand-original.png").write_bytes(response.content)
    print(json.dumps({"source": SOURCE, "source_size": source.size, "crop": crop,
                      "transparent": True, "adaptive_size": adaptive_size, "assets": records}, indent=2))


if __name__ == "__main__":
    prepare()