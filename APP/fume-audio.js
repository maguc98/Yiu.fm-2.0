(function(global){
 'use strict';
 var graph=null;
 var clamp=function(value){return Math.max(0,Math.min(1,value));};
 function connect(audio){
  if(graph)return graph.audio===audio?graph:null;
  var AudioContextCtor=global.AudioContext||global.webkitAudioContext;
  if(!audio||typeof AudioContextCtor!=='function')return null;
  var context=null,source=null,analyser=null;
  try{
   context=new AudioContextCtor();
   source=context.createMediaElementSource(audio);
   analyser=context.createAnalyser();
   analyser.fftSize=1024;
   analyser.smoothingTimeConstant=0.78;
   analyser.minDecibels=-90;
   analyser.maxDecibels=-10;
   source.connect(analyser);
   analyser.connect(context.destination);
   graph={audio:audio,context:context,source:source,analyser:analyser,data:new Uint8Array(analyser.frequencyBinCount)};
   return graph;
  }catch(error){
   try{if(source){source.disconnect();source.connect(context.destination);}}catch(_){}
   try{if(context&&typeof context.close==='function')context.close();}catch(_){}
   return null;
  }
 }
 function resume(value){
  if(!value||!value.context||value.context.state==='running')return Promise.resolve(false);
  try{return Promise.resolve(value.context.resume()).then(function(){return true;},function(){return false;});}
  catch(_){return Promise.resolve(false);}
 }
 function band(data,rate,fftSize,low,high){
  var hzPerBin=rate/fftSize;
  var first=Math.max(1,Math.floor(low/hzPerBin));
  var last=Math.min(data.length-1,Math.ceil(high/hzPerBin));
  if(last<first)return 0;
  var sum=0,count=0;
  for(var i=first;i<=last;i++){var value=data[i]/255;sum+=value*value;count++;}
  return count?clamp(Math.sqrt(sum/count)*1.45):0;
 }
 function sample(value){
  var zero={power:0,bass:0,lowMid:0,mid:0,vocal:0,treble:0};
  if(!value||!value.analyser||!value.context||value.context.state!=='running')return zero;
  try{
   value.analyser.getByteFrequencyData(value.data);
   var rate=value.context.sampleRate,fft=value.analyser.fftSize,data=value.data;
   return {
    power:band(data,rate,fft,30,12000),
    bass:band(data,rate,fft,30,140),
    lowMid:band(data,rate,fft,140,400),
    mid:band(data,rate,fft,400,2000),
    vocal:band(data,rate,fft,2000,5000),
    treble:band(data,rate,fft,5000,12000)
   };
  }catch(_){return zero;}
 }
 var api={connect:connect,resume:resume,sample:sample};
 global.YiuFumeAudio=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
