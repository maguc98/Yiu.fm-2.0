const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function loadAdapter() {
  let rendered = null;
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
        return { get() { return value; }, set(next) { value = next; } };
      }
    },
    default: function PartitaView() {}
  };
  const document = {
    head: { appendChild() {} },
    createElement(tag) {
      return { tag, style: {}, textContent: '', appendChild() {}, removeChild() {} };
    }
  };
  const window = {
    Partita,
    __renderResMul: 1,
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
    requestAnimationFrame() { return 1; },
    cancelAnimationFrame() {}
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
