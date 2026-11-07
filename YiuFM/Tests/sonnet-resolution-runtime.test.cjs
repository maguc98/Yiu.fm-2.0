const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Sonnet canvas preserves the exact requested texture resolution at creation and resize', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'Resources', 'Web', 'APP', 'sonnet', 'sonnet.js'),
    'utf8'
  );

  assert.ok(
    source.includes('resolution: options.tuning.textureResolution,'),
    'Pixi Application must receive the requested texture resolution directly'
  );
  assert.ok(
    source.includes('this.options.tuning.textureResolution\n      );'),
    'canvas resize must also use the exact requested texture resolution'
  );
  assert.ok(
    !source.includes('resolution: snapResolutionToTexturePool(width, height, options.tuning.textureResolution)'),
    'initial canvas creation must not reduce the requested resolution'
  );
  assert.ok(
    !source.includes('snapResolutionToTexturePool(width, height, this.options.tuning.textureResolution)'),
    'subsequent canvas resize must not reduce the requested resolution'
  );
  assert.ok(
    source.includes('pixi.BitmapFontManager.defaultOptions.resolution = options.tuning.textureResolution;'),
    'dynamic BitmapText glyph atlases must be rasterized at the selected texture resolution'
  );
  const resolutionKey = source.indexOf('fontFamilyKey += `-${this.defaultOptions.resolution}`;');
  const cacheLookup = source.indexOf('if (Cache.has(fontFamilyKey))', resolutionKey);
  const earlyCacheLookup = source.indexOf('if (Cache.has(fontFamilyKey))');
  assert.ok(resolutionKey >= 0 && cacheLookup > resolutionKey,
    'bitmap-font cache lookup must happen after the raster-resolution key is added');
  assert.equal(earlyCacheLookup, cacheLookup,
    'no early cache lookup may bypass the resolution-aware key');
  assert.ok(
    source.includes('antialias: "on"'),
    'Sonnet post-process filter passes must retain multisampled render targets'
  );
});
