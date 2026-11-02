const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function loadGovernor() {
  const file = path.join(__dirname, '..', 'Resources', 'Web', 'APP', 'sonnet-perf-governor.js');
  const source = fs.readFileSync(file, 'utf8');
  const fakeWindow = {
    performance: { now: () => 1000 },
    dispatchEvent() {}
  };
  vm.runInNewContext(source, {
    window: fakeWindow,
    performance: fakeWindow.performance,
    requestAnimationFrame() { return 1; },
    cancelAnimationFrame() {},
    CustomEvent: function CustomEvent() {},
    Object,
    Array,
    Math
  });
  return fakeWindow.SonnetPerfGovernor;
}

test('Sonnet adaptive levels preserve camera tracking at L1 and L2', () => {
  const Governor = loadGovernor();
  const runtime = {
    modulation: null,
    setModulation(next) { this.modulation = Object.assign({}, next); },
    setTuning() {}
  };
  const governor = new Governor({
    runtime,
    userModulation: { cameraScale: 0.9 },
    userTuning: {},
    targetFps: 60
  });

  governor.applyLevel(1, true, 'regression-test');
  assert.equal(runtime.modulation.cameraScale, 0.9,
    'L1 must not override the camera tracking baseline');

  governor.applyLevel(2, true, 'regression-test');
  assert.equal(runtime.modulation.cameraScale, 0.9,
    'L2 must not freeze camera tracking after sustained frame drops');

  assert.equal(Object.hasOwn(governor.levels[1].mod, 'cameraScale'), false);
  assert.equal(Object.hasOwn(governor.levels[2].mod, 'cameraScale'), false);
  assert.equal(runtime.modulation.motionScale, 0,
    'L2 should still suppress nonessential typography motion');
});
