const test=require('node:test');
const assert=require('node:assert/strict');
const {buildLines}=require('../BuildSupport/fume-folia/lyrics-adapter.mjs');

test('Folia lyric adapter preserves Yiu numeric per-grapheme timestamps inside words',()=>{
 const [line]=buildLines([10],[[10,10.5,11]],['ABC']);
 assert.equal(line.fullText,'ABC');
 assert.equal(line.words.length,1);
 assert.equal(line.words[0].text,'ABC');
 assert.deepEqual(line.words[0].syllables.map(s=>[s.text,s.startTime,s.endTime]),[
  ['A',10,10.5],['B',10.5,11],['C',11,12]
 ]);
});

test('Folia lyric adapter preserves legacy [start,end] intervals',()=>{
 const [line]=buildLines([0],[[[0,0.4],[0.4,0.8]]],['AB']);
 assert.deepEqual(line.words[0].syllables.map(s=>[s.text,s.startTime,s.endTime]),[
  ['A',0,0.4],['B',0.4,0.8]
 ]);
});

test('Folia lyric adapter keeps word-level grouping and whitespace in the full lyric',()=>{
 const [line]=buildLines([0],[[0,0.2,0.4,0.6,0.8,1,1.2,1.4,1.6,1.8,2]],['Hello world']);
 assert.equal(line.fullText,'Hello world');
 assert.equal(line.words.map(w=>w.text).join(''),'Helloworld');
 assert.ok(line.words.length<=2);
 assert.ok(line.words.every(w=>w.syllables.length>0));
});

test('Folia lyric adapter uses grapheme timing for CJK and emoji',()=>{
 const [line]=buildLines([0],[[0,0.5,1]],['你🙂好']);
 assert.equal(line.words.flatMap(w=>w.syllables).length,3);
 assert.equal(line.words.flatMap(w=>w.syllables).map(s=>s.text).join(''),'你🙂好');
});

test('Folia lyric adapter generates Folia render hints',()=>{
 const [line]=buildLines([0],[[0,0.2]],['OK']);
 assert.ok(line.renderHints);
 assert.equal(line.renderHints.rawDuration,line.endTime-line.startTime);
 assert.ok(line.renderHints.renderEndTime>=line.endTime);
});
