const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function loadAdapter() {
  let rendered = null;
  let timeSetCount = 0;
  function Component() {}
  const React = {
    Component,
    createElement(type, props, child) {
      const next = Object.assign({}, props || {});
      if (arguments.length > 2) next.children = child;
      return { type, props: next };
    }
  };
  const Partita = {
    React,
    ReactDOM: {
      createRoot() {
        return {
          render(element) { rendered = element; },
          unmount() {}
        };
      }
    },
    FramerMotion: {
      motionValue(initial) {
        let value = initial;
        return { get() { return value; }, set(next) { timeSetCount++; value = next; } };
      }
    },
    default: function PartitaView() {}
  };
  const document = {
    head: { appendChild() {} },
    getElementById() { return null; },
    createElement(tag) {
      return { tag, style: {}, textContent: '', appendChild() {}, removeChild() {} };
    }
  };
  let now = 0;
  let nextFrameId = 1;
  const frames = new Map();
  const window = {
    Partita,
    __renderResMul: 1,
    performance: { now() { return now; } },
    requestAnimationFrame(callback) { const id = nextFrameId++; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    addEventListener() {}
  };
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'Resources', 'Web', 'APP', 'partita-adapter.js'),
    'utf8'
  );
  vm.runInNewContext(source, {
    window, document, console,
    setTimeout() { return 1; },
    clearTimeout() {},
    requestAnimationFrame: window.requestAnimationFrame,
    cancelAnimationFrame: window.cancelAnimationFrame
  });

  const host = {
    innerHTML: '',
    style: {},
    appendChild() {},
    querySelector() { return null; },
    querySelectorAll() { return []; }
  };
  window.PartitaAdapter.init(host);
  return {
    adapter: window.PartitaAdapter,
    host,
    advanceFrame(ms) {
      now += ms;
      const pending = Array.from(frames.values());
      frames.clear();
      pending.forEach(callback => callback(now));
    },
    pendingFrames() { return frames.size; },
    time() { return rendered.props.children.props.currentTime; },
    timeSetCount() { return timeSetCount; },
    lineIndex() { return rendered.props.children.props.currentLineIndex; },
    setLyricOffset(value) { window.LYR_OFF = value; },
    load(TS, WT, LN) {
      window.PartitaAdapter.loadLyrics(TS, WT, LN);
      window.PartitaAdapter.show();
      return rendered.props.children.props.lines;
    }
  };
}

test('Partita preserves absolute per-character start timestamps', () => {
  const harness = loadAdapter();
  const lines = harness.load(
    [1.0, 3.0],
    [[1.00, 1.18, 1.44, 1.92], null],
    ['云阶逐字', '下一句']
  );

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

test('Partita keeps characters sharing one timestamp synchronized', () => {
  const harness = loadAdapter();
  const lines = harness.load(
    [2.0, 4.0],
    [[2.0, 2.0, 2.65, 3.4], null],
    ['啊啊然后', '下一句']
  );

  assert.deepEqual(
    Array.from(lines[0].words, word => word.startTime),
    [2.0, 2.0, 2.65, 3.4]
  );
  assert.deepEqual(
    Array.from(lines[0].words, word => word.endTime),
    [2.65, 2.65, 3.4, 4.0]
  );
});

test('Partita retains evenly-spaced fallback for ordinary LRC without word times', () => {
  const harness = loadAdapter();
  const lines = harness.load(
    [1.0, 4.0],
    [null, null],
    ['普通歌词', '下一句']
  );

  const starts = Array.from(lines[0].words, word => word.startTime);
  assert.equal(starts.length, 4);
  assert.ok(Math.abs(starts[0] - 1.0) < 1e-9);
  assert.ok(Math.abs(starts[1] - 1.75) < 1e-9);
  assert.ok(Math.abs(starts[2] - 2.5) < 1e-9);
  assert.ok(Math.abs(starts[3] - 3.25) < 1e-9);
});

test('Partita interpolates its MotionValue on display frames between 30Hz player clock samples', () => {
  const harness = loadAdapter();
  harness.load([1.0, 3.0], [[1.0, 1.5], null], ['云阶', '下一句']);

  harness.adapter.drive(1.0);
  assert.equal(harness.time().get(), 1.0);
  assert.equal(harness.pendingFrames(), 1);

  harness.advanceFrame(1000 / 60);
  assert.ok(Math.abs(harness.time().get() - (1.0 + 1 / 60)) < 0.002,
    'the animation clock should advance on the display frame, not wait for the next player tick');

  harness.advanceFrame(1000 / 60);
  assert.ok(Math.abs(harness.time().get() - (1.0 + 2 / 60)) < 0.002);

  harness.adapter.drive(1.05);
  harness.advanceFrame(1000 / 60);
  assert.ok(harness.time().get() >= 1.05 - 0.002,
    'the next audio-clock sample should gently correct the interpolated clock');
});

test('Partita smooth clock stops after player updates cease and cannot drift while paused', () => {
  const harness = loadAdapter();
  harness.load([1.0, 3.0], [[1.0, 1.5], null], ['云阶', '下一句']);

  harness.adapter.drive(1.0);
  harness.advanceFrame(1000 / 60);
  harness.advanceFrame(500);
  assert.equal(harness.pendingFrames(), 0,
    'the independent frame loop must stop when the player clock becomes stale');
});

test('Partita ignores duplicate timestamps to avoid redundant MotionValue updates', () => {
  const harness = loadAdapter();
  harness.load([1.0, 3.0], [[1.0, 1.5], null], ['云阶', '下一句']);

  harness.adapter.drive(1.25);
  const afterFirstUpdate = harness.timeSetCount();
  assert.equal(harness.time().get(), 1.25);

  harness.adapter.drive(1.25);
  assert.equal(harness.timeSetCount(), afterFirstUpdate, 'the same timestamp must not be submitted twice');
});

test('Partita suspension pauses its clock without deactivating the engine', () => {
  const harness = loadAdapter();
  harness.load([1.0, 3.0], [[1.0, 1.5], null], ['云阶', '下一句']);
  const time = harness.time();

  harness.adapter.drive(1.25);
  assert.equal(time.get(), 1.25);

  harness.adapter.setSuspended(true);
  assert.equal(harness.adapter.isActive(), true);
  assert.equal(harness.host.style.display, 'none');
  harness.adapter.drive(1.75);
  assert.equal(time.get(), 1.25, 'the clock must remain frozen while suspended');

  harness.adapter.setSuspended(false);
  assert.equal(harness.host.style.display, 'block');
  harness.adapter.drive(1.75);
  assert.equal(time.get(), 1.75, 'the clock must resume after unsuspending');
});


test('Partita ignores tiny clock jitter but accepts a meaningful backward seek', () => {
  const harness = loadAdapter();
  harness.load([1.0, 3.0], [[1.0, 1.5], null], ['第一句', '第二句']);

  harness.adapter.drive(1.25);
  harness.adapter.drive(1.24);
  assert.equal(harness.time().get(), 1.25, 'a 10ms regression should be treated as clock jitter');

  harness.adapter.drive(1.15);
  assert.equal(harness.time().get(), 1.15, 'a 100ms regression must be accepted as a seek');
});

test('Partita moves the active line backward after seeking to an earlier lyric', () => {
  const harness = loadAdapter();
  harness.load([1.0, 3.0], [[1.0, 1.5], null], ['第一句', '第二句']);

  harness.adapter.drive(3.2);
  assert.equal(harness.lineIndex(), 1);

  harness.adapter.drive(1.2);
  assert.equal(harness.time().get(), 1.2);
  assert.equal(harness.lineIndex(), 0, 'the active lyric line must follow the backward seek');
});


test('Partita fallback drive applies the current global lyric offset', () => {
  const harness = loadAdapter();
  harness.load([1.0], [null], ['测试歌词']);
  harness.setLyricOffset(0.5);

  harness.adapter.drive(10.0, true);
  assert.equal(harness.time().get(), 9.5);

  harness.setLyricOffset(0.2);
  harness.adapter.drive(10.1, true);
  assert.equal(harness.time().get(), 9.9, 'fallback drive must use the latest per-song offset');
});
