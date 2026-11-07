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
  assert.ok(
    source.includes('fontFamilyKey += `-${this.defaultOptions.resolution}`;'),
    'resolution changes must not reuse a cached glyph atlas from an older, lower density'
  );
});
