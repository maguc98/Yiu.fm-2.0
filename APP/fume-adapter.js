/* Fume adapter: VisualizerManager lifecycle, driven by Yiu's player clock. */
(function(global){
  'use strict';
  var host=null,engine=null,active=false,suspended=false,lyrics=null,theme=null,lastTime=0,ready=null,initOptions={},audioGraph=null,audioGraphPromise=null,audioRaf=0,lastAudioSample=0,audioPlayListener=null;
  function readTheme(){
    var stage=document.getElementById('stage'),cs=stage?getComputedStyle(stage):null;
    var read=function(name,fallback){return cs&&cs.getPropertyValue(name).trim()||fallback;};
    var primary=read('--tx','#f5f3ef');
    var fontFamily=cs&&cs.fontFamily||getComputedStyle(document.body).fontFamily||'-apple-system,BlinkMacSystemFont,sans-serif';
    var fontFamilyStack=fontFamily.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(function(item){return item.trim().replace(/^['"]|['"]$/g,'');}).filter(Boolean);
    var fontWeightValue=cs&&parseInt(cs.fontWeight,10);
    var fontStyle=/mono/i.test(fontFamily)?'mono':/serif/i.test(fontFamily)?'serif':'sans';
    return {
      textColor:primary,
      primaryColor:primary,
      secondaryColor:read('--sub','#a7a4a0'),
      accentColor:read('--ac','#d8c5a4'),
      backgroundColor:read('--bg','#101116'),
      fontStyle:fontStyle,
      fontFamilyStack:fontFamilyStack.length?fontFamilyStack:['-apple-system','BlinkMacSystemFont','sans-serif'],
      fontWeight:Number.isFinite(fontWeightValue)?fontWeightValue:500,
      animationIntensity:'normal',
      wordColors:[]
    };
  }
  function getBootDiagnostics(){
    var scripts=[];
    try{
      Array.prototype.forEach.call(document.querySelectorAll('script[src]'),function(script){
        var src=String(script.src||script.getAttribute('src')||'');
        if(/fume/i.test(src))scripts.push({src:src,type:script.type||'classic',async:!!script.async,defer:!!script.defer});
      });
    }catch(_){}
    return {
      foliaBundleType:typeof global.FumeFoliaBundle,
      foliaCreateType:global.FumeFoliaBundle?typeof global.FumeFoliaBundle.create:'undefined',
      canvasEngineType:typeof global.FumeCanvasEngine,
      canvasCreateType:global.FumeCanvasEngine?typeof global.FumeCanvasEngine.create:'undefined',
      readyState:document.readyState,
      scripts:scripts
    };
  }
  function publishBootDiagnostics(){
    var diagnostics=getBootDiagnostics();
    try{global.__YIU_FUME_FOLIA_DIAGNOSTICS__=diagnostics;}catch(_){}
    return diagnostics;
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
    var audio=document.getElementById('audio');
    if(!audio)return;
    if(!audioGraph&&!audioGraphPromise){
      audioGraphPromise=global.YiuFumeAudio.connect(audio).then(function(graph){
        audioGraph=graph;audioGraphPromise=null;
        if(audioGraph&&active&&!suspended){global.YiuFumeAudio.resume(audioGraph);if(!audioRaf)audioRaf=requestAnimationFrame(pumpAudioAnalysis);}
      },function(){audioGraphPromise=null;});
    }else if(audioGraph){
      global.YiuFumeAudio.resume(audioGraph);
      if(!audioRaf)audioRaf=requestAnimationFrame(pumpAudioAnalysis);
    }
  }
  function applyLyrics(){
    if(engine&&lyrics)engine.setLyrics(lyrics.TS,lyrics.WT,lyrics.LN);
  }
  var Adapter={
    version:'folia-fume-bundle-1.0.0',
    init:function(el,opts){host=el;theme=readTheme();initOptions=opts||{};publishBootDiagnostics();var audio=document.getElementById('audio');if(audio&&!audioPlayListener){audioPlayListener=function(){if(active&&!suspended)startAudioAnalysis();};audio.addEventListener('play',audioPlayListener);}return Adapter;},
    show:function(){
      if(!host)throw new Error('Fume host is not initialized');
      if(engine){active=true;suspended=false;engine.setTheme(readTheme());engine.start();startAudioAnalysis();return Promise.resolve();}
      var diagnostics=publishBootDiagnostics();
      var foliaFactory=global.FumeFoliaBundle&&global.FumeFoliaBundle.create;
      var canvasFactory=global.FumeCanvasEngine&&global.FumeCanvasEngine.create;
      var factory=typeof foliaFactory==='function'?foliaFactory:canvasFactory;
      if(typeof factory!=='function'){
        var unavailable=new Error('Folia Fume bundle and compatibility fallback are both unavailable; boot diagnostics: '+JSON.stringify(diagnostics));
        unavailable.code='FUME_FACTORY_UNAVAILABLE';
        unavailable.diagnostics=diagnostics;
        throw unavailable;
      }
      if(typeof foliaFactory!=='function'&&typeof canvasFactory==='function'&&global.console&&global.console.warn){
        global.console.warn('[FumeAdapter] Folia bundle is not registered; using Canvas compatibility engine',diagnostics);
      }
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
  publishBootDiagnostics();
  global.FumeAdapter=Adapter;
})(window);
