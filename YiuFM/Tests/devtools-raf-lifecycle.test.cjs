const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '..', '..', 'APP', 'devtools.js'),
  'utf8'
);
const start = source.indexOf('  // 全局帧率门控');
const end = source.indexOf('  // 4. 悬浮窗日志', start);
assert.ok(start >= 0 && end > start, 'RAF wrapper block must remain identifiable');
const rafSource = source.slice(start, end);

function createHarness() {
  let nextId = 0;
  const pending = new Map();
  const cancelled = [];
  const window = {
    __rafCapActive: false,
    __rafLimitFps: 30, // cap must stay inactive when only jank tracing is enabled
    __lowPower: false
  };
  const origRAF = callback => {
    const id = ++nextId;
    pending.set(id, callback);
    return id;
  };
  const origCancel = id => {
    cancelled.push(id);
    pending.delete(id);
  };
  window.requestAnimationFrame = origRAF;
  window.cancelAnimationFrame = origCancel;
  const context = vm.createContext({
    window,
    state: { jank: false },
    origRAF,
    origCancel,
    performance: { now: () => 1 },
    Date,
    Math,
    Number,
    Object,
    Error,
    console: { warn() {} }
  });
  vm.runInContext('var lastWarnTime = 0;\n' + rafSource, context);
  return { context, window, origRAF, origCancel, pending, cancelled };
}

test('RAF wrapper restores native cancel only after pending wrapped IDs are cleared', () => {
  const h = createHarness();
  h.context.state.jank = true;
  h.context.syncRafWrapper();
  const wrappedId = h.window.requestAnimationFrame(() => {});
  assert.notEqual(h.window.requestAnimationFrame, h.origRAF);
  assert.notEqual(h.window.cancelAnimationFrame, h.origCancel);

  h.context.state.jank = false;
  h.context.syncRafWrapper();
  assert.equal(h.window.requestAnimationFrame, h.origRAF);
  assert.notEqual(h.window.cancelAnimationFrame, h.origCancel);
  assert.equal(h.window.__rafWrapped, true);

  h.window.cancelAnimationFrame(wrappedId);
  assert.equal(h.pending.size, 0);
  assert.deepEqual(h.cancelled, [1]);
  assert.equal(h.window.cancelAnimationFrame, h.origCancel);
  assert.equal(h.window.__rafWrapped, false);
});

test('RAF wrapper restores native cancel after the final pending callback completes', () => {
  const h = createHarness();
  let called = false;
  h.context.state.jank = true;
  h.context.syncRafWrapper();
  h.window.requestAnimationFrame(() => { called = true; });

  h.context.state.jank = false;
  h.context.syncRafWrapper();
  const [nativeId, callback] = h.pending.entries().next().value;
  h.pending.delete(nativeId); // Native RAF consumes its request before invoking the callback.
  callback(16);

  assert.equal(called, true);
  assert.equal(h.pending.has(nativeId), false);
  assert.equal(h.window.requestAnimationFrame, h.origRAF);
  assert.equal(h.window.cancelAnimationFrame, h.origCancel);
  assert.equal(h.window.__rafWrapped, false);
});
