const test=require('node:test');
const assert=require('node:assert/strict');
const {buildLines}=require('../BuildSupport/fume-folia/lyrics-adapter.mjs');

test('Folia lyric adapter preserves Yiu numeric per-character timestamps',()=>{
 const [line]=buildLines([10],[[10,10.5,11]],['ABC']);
 assert.equal(line.fullText,'ABC');
 assert.deepEqual(line.words.map(w=>[w.text,w.startTime,w.endTime]),[
  ['A',10,10.5],['B',10.5,11],['C',11,12]
 ]);
});

test('Folia lyric adapter preserves legacy interval timestamps',()=>{
 const [line]=buildLines([0],[[[0,0.4],[0.4,0.8]]],['AB']);
 assert.deepEqual(line.words.map(w=>[w.text,w.startTime,w.endTime]),[
  ['A',0,0.4],['B',0.4,0.8]
 ]);
});

test('Folia lyric adapter uses grapheme boundaries for CJK and emoji',()=>{
 const [line]=buildLines([0],[[0,0.5,1]],['你🙂好']);
 assert.equal(line.words.length,3);
 assert.equal(line.words.map(w=>w.text).join(''),'你🙂好');
});
