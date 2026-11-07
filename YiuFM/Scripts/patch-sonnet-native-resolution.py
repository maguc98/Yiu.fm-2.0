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
font_manager_replacement = """// Pixi filters render through intermediate textures. Their stock default
      // resolution is 1x even when the Application canvas uses a higher density,
      // which can reintroduce jagged edges after the high-resolution scene render.
      // Raise implicit-resolution filters to match the selected canvas density.
      // Explicit per-filter resolutions remain unchanged.
      if (pixi.Filter && pixi.Filter.defaultOptions) {
        pixi.Filter.defaultOptions.resolution = options.tuning.textureResolution;
      }
      if (pixi.BitmapFontManager && pixi.BitmapFontManager.defaultOptions) {
        pixi.BitmapFontManager.defaultOptions.resolution = options.tuning.textureResolution;
      }
      const context2 = await makePixiContext(pixi, contextOptions, options.signal);"""
if source.count(font_manager_anchor) != 1:
    raise SystemExit(f"Expected one Sonnet runtime font-manager anchor, found {source.count(font_manager_anchor)}")
source = source.replace(font_manager_anchor, font_manager_replacement, 1)

# BitmapFontManager checks its base cache key before adding style variants.
# Move that lookup after the resolution suffix is applied; otherwise a 1x atlas
# can be returned before the resolution-aware key is ever reached.
font_cache_old = """let fontFamilyKey = `${style.fontFamily}-bitmap`;
          let overrideFill = true;
          if (Cache.has(fontFamilyKey)) {
            const dynamicFont2 = Cache.get(fontFamilyKey);
            dynamicFont2.ensureCharacters?.(text);
            return dynamicFont2;
          }
          if (style._fill.fill && !style._stroke) {"""
font_cache_new = """let fontFamilyKey = `${style.fontFamily}-bitmap`;
          let overrideFill = true;
          if (style._fill.fill && !style._stroke) {"""
if source.count(font_cache_old) != 1:
    raise SystemExit(f"Expected one Sonnet bitmap-font early-cache block, found {source.count(font_cache_old)}")
source = source.replace(font_cache_old, font_cache_new, 1)

font_cache_anchor = "fontFamilyKey += `-${style.fontStyle}`;"
font_cache_replacement = """fontFamilyKey += `-${this.defaultOptions.resolution}`;
          if (Cache.has(fontFamilyKey)) {
            const dynamicFont2 = Cache.get(fontFamilyKey);
            dynamicFont2.ensureCharacters?.(text);
            return dynamicFont2;
          }
          fontFamilyKey += `-${style.fontStyle}`;"""
if source.count(font_cache_anchor) != 1:
    raise SystemExit(f"Expected one Sonnet bitmap-font style anchor, found {source.count(font_cache_anchor)}")
source = source.replace(font_cache_anchor, font_cache_replacement, 1)
# Explicit low-resolution blur filters can still become the bottleneck in a
# Pixi filter chain: FilterSystem takes the minimum enabled filter resolution.
# Let these effects inherit the input render-target density instead of forcing
# the chain down to 0.75x / 0.5x. Blur strength/quality remain unchanged.
for old, expected in (("resolution: 0.75", 2), ("resolution: 0.5", 1)):
    count = source.count(old)
    if count != expected:
        raise SystemExit(f"Expected {expected} explicit low-resolution blur settings, found {count}: {old}")
    source = source.replace(old, 'resolution: "inherit"')

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
