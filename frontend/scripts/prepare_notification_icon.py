"""Convert the managed monochrome artwork into Android's white-alpha PNG.

Image generation providers may bake a checkerboard into JPEG. Preserve only
the white logo silhouette, never ship that backdrop as a notification icon.
Usage: python scripts/prepare_notification_icon.py input.jpg output.png
"""
import sys
from pathlib import Path

from PIL import Image

source = Image.open(sys.argv[1]).convert("RGB")
alpha = source.convert("L").point(lambda pixel: 255 if pixel > 250 else 0)
bounds = alpha.getbbox()
if not bounds:
    raise ValueError("The notification artwork has no white silhouette.")
alpha = alpha.crop(bounds)
alpha.thumbnail((74, 74), Image.Resampling.LANCZOS)
icon = Image.new("RGBA", (96, 96), (255, 255, 255, 0))
position = ((96 - alpha.width) // 2, (96 - alpha.height) // 2)
layer = Image.new("RGBA", alpha.size, (255, 255, 255, 255))
icon.paste(layer, position, alpha)
target = Path(sys.argv[2])
target.parent.mkdir(parents=True, exist_ok=True)
icon.save(target)