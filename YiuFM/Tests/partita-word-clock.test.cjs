const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Packaged Partita waits for exact timestamps and the full staggered entrance animation', () => {
  const bundle = fs.readFileSync(
    path.join(__dirname, '..', 'Resources', 'Web', 'APP', 'P1.js'),
    'utf8'
  );

  assert.ok(
    bundle.includes('let[m,p]=(0,gc.useState)(()=>{let g=n.get(),h=wordAnimationEnd(t,u);return g>=t.startTime&&g<=h?"active":g>h?"passed":"waiting"})'),
    'a newly mounted word must initialize from the current playback time rather than wait for the next MotionValue event'
  );
  assert.ok(
    bundle.includes('let[p,x]=(0,cM.useState)(()=>{let y=o.get(),h=Math.max(mc(t[t.length-1],c),...e.map(w=>wordAnimationEnd(w,c)));return y>=t[0].startTime&&y<=h?"active":y>h?"passed":"waiting"})'),
    'a newly mounted chunk must initialize from the current playback time rather than render one stale waiting frame'
  );
  assert.ok(
    bundle.includes('initial:m,animate:m,className:"inline-block origin-center relative will-change-transform whitespace-nowrap"'),
    'a word already active at mount must not be forced through the waiting entrance variant'
  );

  assert.ok(
    bundle.includes('wordAnimationEnd=(t,e)=>'),
    'the bundle must calculate the actual entrance-animation completion deadline'
  );
  assert.ok(
    bundle.includes('t.startTime+.55'),
    'the word deadline must include the 550ms spring-layout settling allowance'
  );
  assert.ok(
    bundle.includes('Math.max(a.endTime-a.startTime,.001)*6'),
    'normal character entrance duration must account for the six-times timestamp-span transition'
  );
  assert.ok(
    bundle.includes('g>=t.startTime&&g<=h?y="active":g>h&&(y="passed")'),
    'individual word state must remain active until its final character entrance completes'
  );
  assert.ok(
    bundle.includes('y>=b&&y<=h?S="active":y>h&&(S="passed")'),
    'the containing lyric chunk must remain active until all display words finish entering'
  );
  assert.ok(!bundle.includes('startTime-u.wordLookahead'));
  assert.ok(!bundle.includes('b-c.wordLookahead'));
  assert.ok(!bundle.includes('E+0.08'));

  assert.ok(
    bundle.includes('x:n.x+Math.sin(n.y)*100'),
    'Folia original per-word waiting entrance offset must be preserved'
  );
  assert.ok(
    bundle.includes('x:p==="waiting"?n.x+(g==="left"?-40:40):n.x'),
    'Folia original chunk waiting entrance offset must be preserved'
  );

  assert.ok(
    bundle.includes('Pl,{initial:!1,mode:"wait",children:(0,In.jsx)(St.div,'),
    'the next lyric line must wait until the previous line exit animation completes'
  );
  assert.ok(
    bundle.includes('variants:{leave:Y=>Y?LV:E.exit}'),
    'the original lyric line exit transition must remain unchanged without an incoming-line delay'
  );
  assert.ok(!bundle.includes('lineAnimationEnd='));
  assert.ok(!bundle.includes('delay:Math.max(E.exit.transition?.delay??0,lineAnimationEnd-e.get())'));
});
