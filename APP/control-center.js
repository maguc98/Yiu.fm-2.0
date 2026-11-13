/* Yiu.fm compact control center — home view for the existing #hub.
   Keeps legacy pages and their handlers intact; this file only routes into them. */
(function(){
  'use strict';
  var hub=document.getElementById('hub');
  if(!hub||!document.getElementById('ccHome'))return;
  var $=function(id){return document.getElementById(id)};
  var home=$('ccHome'),sheet=$('ccModeSheet'),back=$('ccBack'),res=$('ccResolution'),resV=$('ccResolutionValue');
  var engineMap={sonnet:['SONNET','商籁'],tempera:['TEMPERA','凝彩'],lumiere:['LUMIÈRE','绘光'],partita:['PARTITA','云阶'],fume:['FUME','浮墨']};
  var active=null,lastLegacy='home';
  window.__YiuControlCenterLeavingOther=function(){lastLegacy='tab'};
  function getEngine(){
    var stage=$('stage'),manager=window.VisualizerManager;
    if(stage){
      for(var k in engineMap)if(stage.classList.contains('mode-'+k))return k;
    }
    return manager&&manager.current&&engineMap[manager.current]?manager.current:null;
  }
  function engineIsRunning(){
    var manager=window.VisualizerManager;
    if(manager){
      if(manager.isSwitching)return 'switching';
      if(manager.current===active&&active)return 'running';
      var adapter=active&&window[({sonnet:'SonnetAdapter',tempera:'TemperaAdapter',lumiere:'LumiereAdapter',partita:'PartitaAdapter',fume:'FumeAdapter'})[active]];
      if(adapter&&typeof adapter.isActive==='function'&&adapter.isActive())return 'running';
      return 'idle';
    }
    var st=$('stage');
    return st&&active&&st.classList.contains('mode-'+active)?'running':'idle';
  }
  function paintEngine(){
    active=getEngine();
    var pair=engineMap[active]||['未选择','尚未启动'];
    $('ccEngineName').textContent=pair[0];$('ccEngineCn').textContent=pair[1];
    var state=engineIsRunning(),pill=$('ccEngineState').parentNode;
    $('ccEngineState').textContent=state==='switching'?'切换中':state==='running'?'运行中':'未运行';
    pill.classList.toggle('is-switching',state==='switching');
    pill.classList.toggle('is-idle',state==='idle');
  }
  function nativeResolution(){
    if(active==='sonnet'){
      var a=document.querySelector('#sonnetbox input#sonnet-res');
      return a?{el:a,min:+a.min||50,max:+a.max||400,step:+a.step||25,value:+a.value||100,kind:'range'}:null;
    }
    if(active==='tempera'){
      var b=document.querySelector('#temperabox input[data-tk="textureResolution"]');
      return b?{el:b,min:+b.min||50,max:+b.max||400,step:+b.step||25,value:+b.value||100,kind:'range'}:null;
    }
    if(active==='lumiere'){
      var seg=$('lmRes'),on=seg&&seg.querySelector('.chip.on'),v=on?on.getAttribute('data-v'):'0';
      return seg?{el:seg,min:50,max:200,step:50,value:({0:50,1:100,1.5:150,2:200})[v]||50,kind:'segment',label:v==='0'?'自动':null}:null;
    }
    return null;
  }
  function paintResolution(){
    var n=nativeResolution();
    if(!n){res.disabled=true;res.value='100';resV.textContent='—';res.style.setProperty('--cc-progress','20%');return}
    res.disabled=false;res.min=n.min;res.max=n.max;res.step=n.step;res.value=n.value;
    resV.textContent=n.label||resolutionLabel(n.value);
    var p=(n.value-n.min)/(n.max-n.min)*100;
    res.style.setProperty('--cc-progress',p+'%');
  }
  function resolutionLabel(v){return active==='lumiere'&&+v===50?'自动':Math.round(+v)+'%'}
  function applyResolution(){
    var n=nativeResolution();if(!n)return;
    var v=+res.value;
    if(n.kind==='range'){
      n.el.value=String(v);
      n.el.dispatchEvent(new Event('input',{bubbles:true}));
      n.el.dispatchEvent(new Event('change',{bubbles:true}));
    }else{
      var wanted=({50:'0',100:'1',150:'1.5',200:'2'})[v]||'1';
      var b=n.el.querySelector('.chip[data-v="'+wanted+'"]');if(b)b.click();
    }
    paintResolution();
  }
  /* 旧设置页仅保留隐藏的兼容 DOM 与业务逻辑；控制中心始终停留在新版首页。 */
  function setHome(on){
    hub.classList.add('cc-home');
    hub.classList.remove('cc-legacy');
    document.body.classList.add('cc-home');
    sheet.hidden=true;
    paintEngine();paintResolution();refreshSwitchState();
  }
  function openLegacyTab(index){
    /* 新控制中心作为首页；功能详情复用原有业务页面，返回时仍回到新版首页。 */
    lastLegacy='tab';
    hub.classList.remove('cc-home');
    hub.classList.add('cc-legacy');
    document.body.classList.remove('cc-home');
    sheet.hidden=true;
    var tab=document.querySelector('#lg .nb[data-i="'+index+'"]');
    if(tab)tab.click();
  }
  function openCurrentEngineDetails(){
    /* 引擎参数位于「调节」页，直接进入对应的现有参数面板。 */
    openLegacyTab(3);
  }
  $('ccClose').addEventListener('click',function(){var b=$('mini');if(b)b.click();else document.body.classList.remove('open')});
  /* 从旧设置页再次点迷你条设置键时，回到控制中心首页；若在「其他」页则复用统一返回逻辑。 */
  var miniSettings=$('miSet');
  if(miniSettings)miniSettings.addEventListener('click',function(){
    if(document.body.classList.contains('open')&&!hub.classList.contains('cc-home'))back.click();
  });
  $('ccEngine').addEventListener('click',openCurrentEngineDetails);
  $('ccVisual').addEventListener('click',function(){openLegacyTab(1)});
  $('ccDisplay').addEventListener('click',function(){sheet.hidden=!sheet.hidden});
  $('ccMusicMode').addEventListener('click',function(){var b=$('btnModeMusic');if(b)b.click();sheet.hidden=true});
  $('ccTextMode').addEventListener('click',function(){var b=$('btnModeText');if(b)b.click();sheet.hidden=true});
  $('ccOther').addEventListener('click',function(){
    /* 打开原有「更多」功能菜单；不复制或改写其中的业务逻辑。 */
    lastLegacy='other';
    hub.classList.remove('cc-home');
    hub.classList.add('cc-legacy');
    document.body.classList.remove('cc-home');
    sheet.hidden=true;
    var more=$('cmore');
    if(more)more.click();
  });
  res.addEventListener('input',function(){resV.textContent=resolutionLabel(res.value);var p=(+res.value- +res.min)/(+res.max- +res.min)*100;res.style.setProperty('--cc-progress',p+'%')});
  res.addEventListener('change',applyResolution);
  home.addEventListener('click',function(e){if(!sheet.hidden&&!e.target.closest('#ccDisplay')&&!sheet.contains(e.target))sheet.hidden=true});
  back.addEventListener('click',function(){
    var more=$('qpop');
    if(more&&more.classList.contains('show')){
      var close=$('cmore');if(close)close.click();
    }
    setHome(true);
  });
  var was=document.body.classList.contains('open');
  new MutationObserver(function(){
    var now=document.body.classList.contains('open');
    if(now&&!was)setHome(true);
    was=now;
  }).observe(document.body,{attributes:true,attributeFilter:['class']});
  var pg5=$('pg5');
  if(pg5)new MutationObserver(function(){
    if(lastLegacy==='other'&&pg5.classList.contains('hide')&&document.body.classList.contains('open'))setHome(true);
  }).observe(pg5,{attributes:true,attributeFilter:['class']});
  var stage=$('stage');
  if(stage)new MutationObserver(function(){if(hub.classList.contains('cc-home')){paintEngine();paintResolution();refreshSwitchState()}}).observe(stage,{attributes:true,attributeFilter:['class']});
  var manager=window.VisualizerManager;
  function refreshSwitchState(){
    if(!hub.classList.contains('cc-home'))return;
    paintEngine();
    if(manager&&manager.isSwitching)window.setTimeout(refreshSwitchState,500);
  }
  if(manager&&manager.isSwitching)refreshSwitchState();
})();
