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

# Pixi's BitmapText glyph atlases have their own resolution, independent of
# the WebGL canvas. The stock BitmapFontManager defaults to 1x, so changing
# the canvas alone leaves cached glyph raster blurry on Retina screens.
# Apply the selected resolution before Sonnet installs/builds any scenes.
font_manager_anchor = "const context2 = await makePixiContext(pixi, contextOptions, options.signal);"
font_manager_replacement = """if (pixi.BitmapFontManager && pixi.BitmapFontManager.defaultOptions) {
        pixi.BitmapFontManager.defaultOptions.resolution = options.tuning.textureResolution;
      }
      const context2 = await makePixiContext(pixi, contextOptions, options.signal);"""
if source.count(font_manager_anchor) != 1:
    raise SystemExit(f"Expected one Sonnet runtime font-manager anchor, found {source.count(font_manager_anchor)}")
source = source.replace(font_manager_anchor, font_manager_replacement, 1)

# BitmapFontManager caches fonts by style, but not by raster resolution.
# Include the active resolution in the cache key so a resolution rebuild
# cannot silently reuse glyph atlases created at the previous lower density.
font_cache_anchor = "fontFamilyKey += `-${style.fontWeight}`;"
font_cache_replacement = "fontFamilyKey += `-${style.fontWeight}`;\\n          fontFamilyKey += `-${this.defaultOptions.resolution}`;"
if source.count(font_cache_anchor) != 1:
    raise SystemExit(f"Expected one Sonnet bitmap-font cache-key anchor, found {source.count(font_cache_anchor)}")
source = source.replace(font_cache_anchor, font_cache_replacement, 1)

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
