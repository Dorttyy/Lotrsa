"""Iteration 54 branding verification.

# Module: transparent PNG dimensions/alpha checks for bundled branding assets
# Module: splash plugin and iOS icon path configuration checks
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from PIL import Image


ROOT = Path("/app/frontend")
IMG = ROOT / "assets" / "images"
APP_JSON = ROOT / "app.json"


def _load(path: Path) -> Image.Image:
    assert path.exists(), f"missing asset: {path}"
    return Image.open(path)


class TestBrandingAssets:
    def test_source_png_dimensions_rgba(self):
        img = _load(IMG / "brand-original.png")
        assert img.size == (713, 837)
        assert img.mode == "RGBA"

    @pytest.mark.parametrize(
        "name,size",
        [
            ("icon.png", (1024, 1024)),
            ("android-icon.png", (1024, 1024)),
            ("adaptive-icon.png", (1080, 1080)),
            ("splash-icon.png", (512, 512)),
            ("brand-logo.png", (256, 256)),
            ("favicon.png", (64, 64)),
        ],
    )
    def test_transparent_assets_have_expected_dimensions_and_alpha(self, name: str, size: tuple[int, int]):
        img = _load(IMG / name)
        assert img.size == size
        assert img.mode == "RGBA"
        alpha = img.getchannel("A")
        low, high = alpha.getextrema()
        assert low == 0, f"{name} has no fully transparent pixels"
        assert high == 255, f"{name} has no fully opaque pixels"

        # Transparent-corner guarantee: no old gray rectangle at edges.
        w, h = img.size
        for pixel in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
            assert alpha.getpixel(pixel) == 0, f"{name} corner not transparent at {pixel}"

    def test_ios_icon_is_opaque_and_explicitly_configured(self):
        img = _load(IMG / "ios-icon.png")
        assert img.size == (1024, 1024)
        assert img.mode == "RGB"

        app = json.loads(APP_JSON.read_text(encoding="utf-8"))
        expo = app["expo"]
        assert expo["ios"]["icon"] == "./assets/images/ios-icon.png"

    def test_splash_plugin_uses_transparent_asset_contain_and_theme_backgrounds(self):
        app = json.loads(APP_JSON.read_text(encoding="utf-8"))
        plugins = app["expo"].get("plugins", [])
        splash_cfg = None
        for item in plugins:
            if isinstance(item, list) and item and item[0] == "expo-splash-screen":
                splash_cfg = item[1]
                break
        assert splash_cfg, "expo-splash-screen plugin config missing"
        assert splash_cfg["image"] == "./assets/images/splash-icon.png"
        assert splash_cfg["imageWidth"] == 200
        assert splash_cfg["resizeMode"] == "contain"
        assert splash_cfg["backgroundColor"] == "#FFFFFF"
        assert splash_cfg["dark"]["image"] == "./assets/images/splash-icon.png"
        assert splash_cfg["dark"]["backgroundColor"] == "#0B1220"
