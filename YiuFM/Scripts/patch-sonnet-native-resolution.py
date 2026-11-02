#!/usr/bin/env python3
"""Keep the Sonnet main canvas at the exact requested pixel density."""
from pathlib import Path

path = Path("YiuFM/Resources/Web/APP/sonnet/sonnet.js")
source = path.read_text(encoding="utf-8")

replacements = {
    "resolution: snapResolutionToTexturePool(width, height, options.tuning.textureResolution),":
    "resolution: options.tuning.textureResolution,",
    "snapResolutionToTexturePool(width, height, this.options.tuning.textureResolution)":
    "this.options.tuning.textureResolution",
}

for old, new in replacements.items():
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one Sonnet canvas resolution anchor, found {count}: {old}")
    source = source.replace(old, new, 1)

if "resolution: snapResolutionToTexturePool(width, height, options.tuning.textureResolution)" in source:
    raise SystemExit("Sonnet initial canvas resolution is still being downsampled.")
if "snapResolutionToTexturePool(width, height, this.options.tuning.textureResolution)" in source:
    raise SystemExit("Sonnet resized canvas resolution is still being downsampled.")

path.write_text(source, encoding="utf-8")
print("Sonnet canvas now uses the exact requested textureResolution; no 25% pool downshift.")
