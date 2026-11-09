const test=require('node:test');
const assert=require('node:assert/strict');

test('Fume audio analysis routes media through an analyser to the original output',async()=>{
 const old=global.AudioContext;
 class MockAnalyser{
  constructor(){this.fftSize=1024;this.frequencyBinCount=512;this.connections=[];}
  connect(node){this.connections.push(node);}
  getByteFrequencyData(data){data.fill(128);}
 }
 class MockContext{
  constructor(){this.state='suspended';this.sampleRate=48000;this.destination={kind:'destination'};this.analyser=new MockAnalyser();this.source={connections:[],connect(node){this.connections.push(node);},disconnect(){this.connections=[];}};}
  createMediaElementSource(audio){this.audio=audio;return this.source;}
  createAnalyser(){return this.analyser;}
  resume(){this.state='running';return Promise.resolve();}
 }
 global.AudioContext=MockContext;
 delete require.cache[require.resolve('../Resources/Web/APP/fume-audio.js')];
 const api=require('../Resources/Web/APP/fume-audio.js');
 const audio={};
 const graph=api.connect(audio);
 assert.ok(graph);
 assert.equal(graph.source.connections[0],graph.analyser);
 assert.equal(graph.analyser.connections[0],graph.context.destination);
 assert.equal(await api.resume(graph),true);
 const bands=api.sample(graph);
 for(const key of ['power','bass','lowMid','mid','vocal','treble'])assert.ok(bands[key]>0&&bands[key]<=1);
 global.AudioContext=old;
});

test('Fume audio analysis safely falls back when Web Audio is unavailable',()=>{
 const old=global.AudioContext;
 delete global.AudioContext;
 delete global.webkitAudioContext;
 delete require.cache[require.resolve('../Resources/Web/APP/fume-audio.js')];
 const api=require('../Resources/Web/APP/fume-audio.js');
 assert.equal(api.connect({}),null);
 global.AudioContext=old;
});
