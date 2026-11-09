/* Fume adapter: VisualizerManager lifecycle, driven by Yiu's player clock. */
(function(global){
  'use strict';
  var host=null,engine=null,active=false,suspended=false,lyrics=null,theme=null,lastTime=0,ready=null,initOptions={},audioGraph=null,audioRaf=0,lastAudioSample=0;
  function readTheme(){
    var stage=document.getElementById('stage'),cs=stage?getComputedStyle(stage):null;
    return {
      textColor:cs&&cs.getPropertyValue('--tc').trim()||'#f5f3ef',
      primaryColor:cs&&cs.getPropertyValue('--tc').trim()||'#f5f3ef',
      secondaryColor:cs&&cs.getPropertyValue('--hl').trim()||'#a7a4a0',
      accentColor:cs&&cs.getPropertyValue('--hl').trim()||'#d8c5a4',
      backgroundColor:'#101116'
    };
  }
  function stopAudioAnalysis(){
    if(audioRaf){cancelAnimationFrame(audioRaf);audioRaf=0;}
    lastAudioSample=0;
    if(engine&&typeof engine.setAudioBands==='function')engine.setAudioBands({power:0,bass:0,lowMid:0,mid:0,vocal:0,treble:0});
  }
  function pumpAudioAnalysis(now){
    audioRaf=0;
    if(!active||suspended||!engine||!audioGraph||!global.YiuFumeAudio)return;
    if(now-lastAudioSample>=32){
      lastAudioSample=now;
      try{engine.setAudioBands(global.YiuFumeAudio.sample(audioGraph));}catch(_){}
    }
    audioRaf=requestAnimationFrame(pumpAudioAnalysis);
  }
  function startAudioAnalysis(){
    if(!global.YiuFumeAudio||!engine)return;
    try{
      var audio=document.getElementById('audio');
      if(audio&&!audioGraph)audioGraph=global.YiuFumeAudio.connect(audio);
      if(audioGraph)global.YiuFumeAudio.resume(audioGraph);
    }catch(_){}
    if(audioGraph&&!audioRaf)audioRaf=requestAnimationFrame(pumpAudioAnalysis);
  }
  function applyLyrics(){
    if(engine&&lyrics)engine.setLyrics(lyrics.TS,lyrics.WT,lyrics.LN);
  }
  var Adapter={
    version:'folia-fume-bundle-1.0.0',
    init:function(el,opts){host=el;theme=readTheme();initOptions=opts||{};return Adapter;},
    show:function(){
      if(!host)throw new Error('Fume host is not initialized');
      if(engine){active=true;suspended=false;engine.setTheme(readTheme());engine.start();startAudioAnalysis();return Promise.resolve();}
      var factory=global.FumeFoliaBundle&&global.FumeFoliaBundle.create||global.FumeCanvasEngine&&global.FumeCanvasEngine.create;
      if(typeof factory!=='function')throw new Error('Folia Fume bundle and compatibility fallback are both unavailable');
      try{
        engine=factory(host,{theme:readTheme(),tuning:initOptions.tuning||initOptions.fumeTuning||{}});
        engine.setTheme(readTheme());applyLyrics();engine.setTime(lastTime);
        active=true;suspended=false;engine.start();startAudioAnalysis();return Promise.resolve();
      }catch(e){engine=null;active=false;return Promise.reject(e);}
    },
    hide:function(){active=false;stopAudioAnalysis();if(engine)engine.stop();},
    destroy:function(){active=false;stopAudioAnalysis();if(engine)engine.destroy();engine=null;ready=null;},
    drive:function(ct){lastTime=Number(ct)||0;if(engine)engine.setTime(lastTime);},
    loadLyrics:function(TS,WT,LN){lyrics={TS:Array.isArray(TS)?TS.slice():[],WT:Array.isArray(WT)?WT.slice():[],LN:Array.isArray(LN)?LN.slice():[]};applyLyrics();},
    setSuspended:function(v){suspended=!!v;if(!engine)return;if(suspended){stopAudioAnalysis();engine.stop();}else if(active){engine.start();startAudioAnalysis();}},
    isAlive:function(){return !!engine;},
    isActive:function(){return !!(active&&engine&&!suspended);},
    whenReady:function(){return Promise.resolve(engine);},
    getConfig:function(){return {};},
    updateConfig:function(patch){if(engine&&typeof engine.setTuning==='function')engine.setTuning(patch||{});return patch||{};},
    resetConfig:function(){if(engine&&typeof engine.setTuning==='function')engine.setTuning({});return {};}
  };
  global.FumeAdapter=Adapter;
})(window);
