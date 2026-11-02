const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function loadAdapter(devicePixelRatio = 2, slider = null, storedConfig = null, runtimeHarness = null) {
  const file = path.join(__dirname, '..', 'Resources', 'Web', 'APP', 'sonnet-adapter.js');
  const source = fs.readFileSync(file, 'utf8');
  const window = { devicePixelRatio };
  if (runtimeHarness) {
    window.SonnetRuntime = {
      compileSonnetProgram() { return {}; },
      SonnetPixiRuntime: {
        create(options) {
          runtimeHarness.created.push(Number(options.tuning.textureResolution));
          return Promise.resolve({
            options: { currentTime: options.currentTime, paused: options.paused },
            setPaused(value) { this.options.paused = value; },
            renderOnce() {},
            setTuning() {},
            setModulation() {},
            destroy() { runtimeHarness.destroyed++; }
          });
        }
      }
    };
  }
  const document = {
    hidden: false,
    addEventListener() {},
    getElementById(id) {
      if (id === 'sonnet-res') return slider;
      if (id === 'sonnetHost') return runtimeHarness ? runtimeHarness.host : null;
      if (id === 'audio') return runtimeHarness ? runtimeHarness.audio : null;
      return null;
    }
  };
  const localStorage = {
    getItem() { return storedConfig ? JSON.stringify(storedConfig) : null; },
    setItem() {}
  };
  vm.runInNewContext(source, {
    window,
    document,
    localStorage,
    performance: { now: () => 1000 },
    Intl,
    Uint8Array,
    console,
    Math,
    Array,
    Object,
    Promise,
    AbortController,
    setTimeout,
    clearTimeout
  });
  return window.SonnetAdapter;
}

test('Sonnet preserves original per-character lyric timestamps', () => {
  const adapter = loadAdapter();
  const lines = adapter.buildLines(
    [1.0, 3.0],
    [[1.00, 1.18, 1.44, 1.92], null],
    ['云阶逐字', '下一句']
  );

  assert.equal(lines.length, 2);
  assert.deepEqual(
    Array.from(lines[0].words, word => word.text),
    ['云', '阶', '逐', '字']
  );
  assert.deepEqual(
    Array.from(lines[0].words, word => word.startTime),
    [1.00, 1.18, 1.44, 1.92]
  );
  assert.deepEqual(
    Array.from(lines[0].words, word => word.endTime),
    [1.18, 1.44, 1.92, 3.0]
  );
});

test('Sonnet playback clock never moves backward during sustained small negative drift', () => {
  const adapterPath = path.join(__dirname, '..', 'Resources', 'Web', 'APP', 'sonnet-adapter.js');
  const source = fs.readFileSync(adapterPath, 'utf8');
  assert.match(source, /Math\.max\(p, p \+ err \* 0\.2\)/,
    'soft correction must use the current estimated time as its lower bound');

  // Deterministic 3-minute / 60fps simulation with a 30fps audio clock
  // and small negative drift. This mirrors the production feed/estimate equations.
  let anchor = 0;
  let wall = 0;
  let last = 0;
  let previousWall = 0;
  let minimumStep = Infinity;
  for (let frame = 1; frame <= 10800; frame++) {
    wall = frame * (1000 / 60);
    const estimate = anchor + (wall - (frame === 1 ? 0 : previousWall)) / 1000;
    const audioTime = Math.floor((wall / 1000 - 0.04) * 30) / 30;
    const error = audioTime - estimate;
    const nextAnchor = Math.abs(error) > 0.3
      ? audioTime
      : Math.max(estimate, estimate + error * 0.2);
    anchor = nextAnchor;
    previousWall = wall;
    const current = anchor;
    assert.ok(current >= last - 1e-12, 'clock must remain monotonic');
    minimumStep = Math.min(minimumStep, current - last);
    last = current;
  }
  assert.ok(last > 170, 'clock should continue advancing throughout the 3-minute run');
  assert.ok(minimumStep >= -1e-12, 'no negative time step is permitted');
});

test('Sonnet does not spread repeated character timestamps into an even line animation', () => {
  const adapter = loadAdapter();
  const lines = adapter.buildLines(
    [2.0, 4.0],
    [[2.0, 2.0, 2.65, 3.4], null],
    ['啊啊然后', '下一句']
  );

  assert.deepEqual(
    Array.from(lines[0].words, word => word.startTime),
    [2.0, 2.0, 2.65, 3.4]
  );
});

test('Sonnet resolution is clamped to the device pixel density', () => {
  const adapter = loadAdapter();
  adapter.setTextureResolution(0.5);
  assert.equal(adapter.getConfig().textureResolution, 2);
});

test('Sonnet resolution never drops below Retina device pixel density', () => {
  const adapter = loadAdapter(3);
  assert.equal(adapter.getConfig().textureResolution, 3,
    'the default resolution should follow a 3x display');
  adapter.setTextureResolution(1);
  assert.equal(adapter.getConfig().textureResolution, 3,
    'manual 1x values must be raised to the physical display density');
  adapter.updateConfig({ textureResolution: 1 });
  assert.equal(adapter.getConfig().textureResolution, 3,
    'legacy configuration updates must not reintroduce sub-native rendering');
});

test('Sonnet upgrades persisted 1x settings to the current Retina DPR', () => {
  const adapter = loadAdapter(3, null, { textureResolution: 1 });
  assert.equal(adapter.getConfig().textureResolution, 3);
});

test('Sonnet resolution slider reflects and enforces the device DPR', async () => {
  const listeners = {};
  const slider = {
    min: '50',
    max: '400',
    step: '25',
    value: '100',
    addEventListener(type, callback) { listeners[type] = callback; }
  };
  const adapter = loadAdapter(3, slider);
  await adapter.init();

  assert.equal(slider.min, '300');
  assert.equal(slider.value, '300');
  assert.equal(slider.max, '400');
  assert.equal(typeof listeners.input, 'function',
    'the resolution control must respond while the slider is being adjusted');
  assert.equal(typeof listeners.change, 'function',
    'the resolution control must also apply on release');

  slider.value = '350';
  listeners.change();
  assert.equal(adapter.getConfig().textureResolution, 3.5);
  assert.equal(slider.value, '350');
});

test('The packaged legacy UI receives the current karaoke timing fixes', () => {
  const webApp = path.join(__dirname, '..', 'Resources', 'Web', 'APP');
  const player = fs.readFileSync(path.join(webApp, 'player.js'), 'utf8');
  const renderer = fs.readFileSync(path.join(webApp, 'renderer.js'), 'utf8');

  assert.ok(player.includes('function karaCssEnd('),
    'the packaged player must calculate full animation completion deadlines');
  assert.ok(!player.includes('间隔太短的字'),
    'the packaged player must not shorten a character animation to fit the next timestamp');
  assert.ok(player.includes('if(cur && cur._kara) karaPaint(ct)'),
    'the previous lyric line must be painted to the exact cutover time');
  assert.ok(renderer.includes('var _retireWait=o._kara'),
    'the renderer must wait for character entrance animations before retiring a line');
  assert.ok(renderer.includes('audio.currentTime-LYR_OFF'),
    'the first karaoke paint must use lyric-offset-adjusted audio time');
});


test('Sonnet resolution slider input rebuilds the live renderer at the selected resolution', async () => {
  const listeners = {};
  const slider = {
    min: '50', max: '400', step: '25', value: '200',
    addEventListener(type, callback) { listeners[type] = callback; }
  };
  const runtimeHarness = {
    created: [],
    destroyed: 0,
    host: { id: 'sonnetHost', innerHTML: '', style: {}, clientWidth: 400, clientHeight: 800 },
    audio: { paused: true, currentTime: 0, addEventListener() {} }
  };
  const adapter = loadAdapter(2, slider, null, runtimeHarness);
  await adapter.init();
  adapter.show();
  await adapter.whenReady();

  assert.deepEqual(runtimeHarness.created, [2]);
  assert.equal(adapter.state().appliedTextureResolution, 2);

  slider.value = '300';
  listeners.input();
  await new Promise(resolve => setTimeout(resolve, 650));

  assert.deepEqual(runtimeHarness.created, [2, 3],
    'the input event must destroy and recreate the Pixi runtime with the selected resolution');
  assert.equal(runtimeHarness.destroyed, 1);
  assert.equal(adapter.state().textureResolution, 3);
  assert.equal(adapter.state().appliedTextureResolution, 3);
});
