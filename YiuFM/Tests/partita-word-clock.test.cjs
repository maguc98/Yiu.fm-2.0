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
    bundle.includes('wordAnimationEnd=(t,e)=>'),
    'the bundle must calculate the actual entrance-animation completion deadline'
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
    bundle.includes('Pl,{initial:!1,mode:"popLayout",children:(0,In.jsx)(St.div,'),
    'the previous keyed lyric line must use Folia original popLayout exit positioning'
  );
  assert.ok(
    bundle.includes('lineAnimationEnd=b?Math.max(0,...v.columns.flatMap'),
    'the line exit deadline must include every displayed word and its staggered character animation'
  );
  assert.ok(
    bundle.includes('duration:Math.max(E.exit.transition?.duration??0,lineAnimationEnd-e.get())'),
    'the previous line must not exit before its final word entrance animation completes'
  );
});
