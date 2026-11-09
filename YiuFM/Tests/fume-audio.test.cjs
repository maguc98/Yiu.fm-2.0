const test=require('node:test');
const assert=require('node:assert/strict');

test('Fume audio analysis resumes before routing media through the analyser',async()=>{
 const old=global.AudioContext;
 class MockAnalyser{
  constructor(){this.fftSize=1024;this.frequencyBinCount=512;this.connections=[];}
  connect(node){this.connections.push(node);}
  getByteFrequencyData(data){data.fill(128);}
 }
 class MockContext{
  constructor(){this.state='suspended';this.sampleRate=48000;this.destination={kind:'destination'};this.analyser=new MockAnalyser();this.source={connections:[],connect(node){this.connections.push(node);},disconnect(){this.connections=[];}};}
  resume(){this.state='running';return Promise.resolve();}
  createMediaElementSource(audio){this.audio=audio;return this.source;}
  createAnalyser(){return this.analyser;}
 }
 global.AudioContext=MockContext;
 delete require.cache[require.resolve('../Resources/Web/APP/fume-audio.js')];
 const api=require('../Resources/Web/APP/fume-audio.js');
 const graph=await api.connect({});
 assert.ok(graph);
 assert.equal(graph.context.state,'running');
 assert.equal(graph.source.connections[0],graph.analyser);
 assert.equal(graph.analyser.connections[0],graph.context.destination);
 const bands=api.sample(graph);
 for(const key of ['power','bass','lowMid','mid','vocal','treble'])assert.ok(bands[key]>0&&bands[key]<=1);
 global.AudioContext=old;
});

test('Fume audio analysis does not reroute media when AudioContext cannot resume',async()=>{
 const old=global.AudioContext;
 let context;
 class BlockedContext{
  constructor(){this.state='suspended';this.closed=false;this.sourceCreated=false;}
  resume(){return Promise.reject(new Error('gesture required'));}
  close(){this.closed=true;return Promise.resolve();}
  createMediaElementSource(){this.sourceCreated=true;throw new Error('must not be reached');}
 }
 global.AudioContext=class extends BlockedContext{constructor(){super();context=this;}};
 delete require.cache[require.resolve('../Resources/Web/APP/fume-audio.js')];
 const api=require('../Resources/Web/APP/fume-audio.js');
 assert.equal(await api.connect({}),null);
 assert.equal(context.sourceCreated,false);
 assert.equal(context.closed,true);
 global.AudioContext=old;
});

test('Fume audio analysis safely falls back when Web Audio is unavailable',async()=>{
 const old=global.AudioContext;
 delete global.AudioContext;
 delete global.webkitAudioContext;
 delete require.cache[require.resolve('../Resources/Web/APP/fume-audio.js')];
 const api=require('../Resources/Web/APP/fume-audio.js');
 assert.equal(await api.connect({}),null);
 global.AudioContext=old;
});
