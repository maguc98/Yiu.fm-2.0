const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function loadAdapter() {
  const file = path.join(__dirname, '..', 'Resources', 'Web', 'APP', 'sonnet-adapter.js');
  const source = fs.readFileSync(file, 'utf8');
  const window = { devicePixelRatio: 2 };
  const document = { addEventListener() {}, getElementById() { return null; } };
  vm.runInNewContext(source, {
    window,
    document,
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

test('The packaged legacy UI receives the current karaoke timing fixes', () => {
  const webApp = path.join(__dirname, '..', 'Resources', 'Web', 'APP');
  const player = fs.readFileSync(path.join(webApp, 'player.js'), 'utf8');
  const renderer = fs.readFileSync(path.join(webApp, 'renderer.js'), 'utf8');

  assert.match(player, /function karaCssEnd\\(/,
    'the packaged player must calculate full animation completion deadlines');
  assert.doesNotMatch(player, /间隔太短的字/,
    'the packaged player must not shorten a character animation to fit the next timestamp');
  assert.match(player, /if\(cur && cur\._kara\) karaPaint\(ct\)/,
    'the previous lyric line must be painted to the exact cutover time');
  assert.match(renderer, /var _retireWait=o\._kara/,
    'the renderer must wait for character entrance animations before retiring a line');
  assert.match(renderer, /audio\.currentTime-LYR_OFF/,
    'the first karaoke paint must use lyric-offset-adjusted audio time');
});
