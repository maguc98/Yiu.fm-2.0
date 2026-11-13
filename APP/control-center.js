/* Yiu.fm compact control center — home view for the existing #hub.
   Keeps legacy pages and their handlers intact; this file only routes into them. */
(function(){
  'use strict';
  var hub=document.getElementById('hub');
  if(!hub||!document.getElementById('ccHome'))return;
  var $=function(id){return document.getElementById(id)};
  var home=$('ccHome'),sheet=$('ccModeSheet'),back=$('ccBack'),res=$('ccResolution'),resV=$('ccResolutionValue');
  var engineMap={sonnet:['SONNET','商籁'],tempera:['TEMPERA','凝彩'],lumiere:['LUMIÈRE','绘光'],partita:['PARTITA','云阶'],fume:['FUME','浮墨']};
  var active='sonnet',lastLegacy='home';
  function getEngine(){
    var stage=$('stage');
    if(stage){
      for(var k in engineMap)if(stage.classList.contains('mode-'+k))return k;
    }
    return 'sonnet';
  }
  function paintEngine(){
    active=getEngine();
    var pair=engineMap[active]||engineMap.sonnet;
    $('ccEngineName').textContent=pair[0];$('ccEngineCn').textContent=pair[1];
    var ready=!!($('stage')&&$('stage').classList.contains('mode-'+active));
    $('ccEngineState').textContent=ready?'运行中':'就绪';
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
      return seg?{el:seg,min:50,max:200,step:50,value:({0:50,1:100,1.5:150,2:200})[v]||50,kind:'segment'}:null;
    }
    return null;
  }
  function paintResolution(){
    var n=nativeResolution();
    if(!n){res.disabled=true;res.value='100';resV.textContent='—';res.style.setProperty('--cc-progress','20%');return}
    res.disabled=false;res.min=n.min;res.max=n.max;res.step=n.step;res.value=n.value;
    resV.textContent=n.value+'%';
    var p=(n.value-n.min)/(n.max-n.min)*100;
    res.style.setProperty('--cc-progress',p+'%');
  }
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
  function setHome(on){
    hub.classList.toggle('cc-home',!!on);
    hub.classList.toggle('cc-legacy',!on);
    document.body.classList.toggle('cc-home',!!on);
    if(on){sheet.hidden=true;paintEngine();paintResolution();}
  }
  function openLegacyTab(index){
    setHome(false);lastLegacy='tab';
    var b=document.querySelector('#lg .nb[data-i="'+index+'"]');
    if(b)b.click();
    else if(typeof window.showPg==='function')window.showPg(index,1);
  }
  $('ccClose').addEventListener('click',function(){var b=$('miSet');if(b)b.click();else document.body.classList.remove('open')});
  $('ccEngine').addEventListener('click',function(){openLegacyTab(1)});
  $('ccVisual').addEventListener('click',function(){openLegacyTab(1)});
  $('ccDisplay').addEventListener('click',function(){sheet.hidden=!sheet.hidden});
  $('ccMusicMode').addEventListener('click',function(){var b=$('btnModeMusic');if(b)b.click();sheet.hidden=true});
  $('ccTextMode').addEventListener('click',function(){var b=$('btnModeText');if(b)b.click();sheet.hidden=true});
  $('ccOther').addEventListener('click',function(){
    setHome(false);lastLegacy='other';
    var more=$('cmore');
    if(more)more.click();
    window.setTimeout(function(){
      var pg=$('pg5');if(pg&&!$('ccOtherBack')){
        var b=document.createElement('button');b.id='ccOtherBack';b.type='button';b.className='chip';b.textContent='‹ 返回控制中心';b.style.cssText='width:100%;margin:0 0 10px;padding:9px 12px;text-align:left;color:var(--tx);';
        pg.insertBefore(b,pg.firstChild);
        b.addEventListener('click',function(){if(more)more.click();setHome(true)});
      }
    },80);
  });
  res.addEventListener('input',function(){resV.textContent=res.value+'%';var p=(+res.value- +res.min)/(+res.max- +res.min)*100;res.style.setProperty('--cc-progress',p+'%')});
  res.addEventListener('change',applyResolution);
  back.addEventListener('click',function(){
    var more=$('cmore');
    if(lastLegacy==='other'&&more&&$('pg5')&&!$('pg5').classList.contains('hide'))more.click();
    setHome(true);
  });
  // The existing open/close gesture remains untouched. On each open, present the new home.
  var was=document.body.classList.contains('open');
  new MutationObserver(function(){
    var now=document.body.classList.contains('open');
    if(now&&!was){setHome(true)}
    was=now;
  }).observe(document.body,{attributes:true,attributeFilter:['class']});
  // If the legacy menu is closed using its original control, restore the new home.
  var pg5=$('pg5');
  if(pg5)new MutationObserver(function(){
    if(lastLegacy==='other'&&pg5.classList.contains('hide')&&document.body.classList.contains('open'))setHome(true);
  }).observe(pg5,{attributes:true,attributeFilter:['class']});
  // Keep engine and resolution labels in sync after engine switches.
  var stage=$('stage');
  if(stage)new MutationObserver(function(){if(hub.classList.contains('cc-home')){paintEngine();paintResolution()}}).observe(stage,{attributes:true,attributeFilter:['class']});
  // Start hidden until the first open; this does not alter the existing launch animation.
})();