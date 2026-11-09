/* Fume adapter: VisualizerManager lifecycle, driven by Yiu's player clock. */
(function(global){
  'use strict';
  var host=null,engine=null,active=false,suspended=false,lyrics=null,theme=null,lastTime=0,ready=null;
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
  function applyLyrics(){
    if(engine&&lyrics)engine.setLyrics(lyrics.TS,lyrics.WT,lyrics.LN);
  }
  var Adapter={
    version:'fume-canvas-0.1',
    init:function(el,opts){host=el;theme=readTheme();if(opts){};return Adapter;},
    show:function(){
      if(!host)throw new Error('Fume host is not initialized');
      if(engine){active=true;suspended=false;engine.setTheme(readTheme());engine.start();return Promise.resolve();}
      if(!global.FumeCanvasEngine)throw new Error('FumeCanvasEngine is not loaded');
      try{
        engine=global.FumeCanvasEngine.create(host,{});
        engine.setTheme(readTheme());applyLyrics();engine.setTime(lastTime);
        active=true;suspended=false;engine.start();return Promise.resolve();
      }catch(e){engine=null;active=false;return Promise.reject(e);}
    },
    hide:function(){active=false;if(engine)engine.stop();},
    destroy:function(){active=false;if(engine)engine.destroy();engine=null;ready=null;},
    drive:function(ct){lastTime=Number(ct)||0;if(engine)engine.setTime(lastTime);},
    loadLyrics:function(TS,WT,LN){lyrics={TS:Array.isArray(TS)?TS.slice():[],WT:Array.isArray(WT)?WT.slice():[],LN:Array.isArray(LN)?LN.slice():[]};applyLyrics();},
    setSuspended:function(v){suspended=!!v;if(!engine)return;if(suspended)engine.stop();else if(active)engine.start();},
    isAlive:function(){return !!engine;},
    isActive:function(){return !!(active&&engine&&!suspended);},
    whenReady:function(){return Promise.resolve(engine);},
    getConfig:function(){return {};},
    updateConfig:function(){return {};},
    resetConfig:function(){return {};}
  };
  global.FumeAdapter=Adapter;
})(window);
