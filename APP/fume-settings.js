/* Fume (浮名) 动效细节面板：所有控件直接映射到 FumeAdapter 的真实 tuning。 */
(function(){
  'use strict';
  var stage=document.getElementById('stage');
  var anchor=document.getElementById('partitabox');
  if(!stage||!anchor||document.getElementById('fumebox'))return;

  anchor.insertAdjacentHTML('afterend',
    '<div id="fumebox">'+
      '<div class="mt">浮名 · 动效</div>'+
      '<div class="cs cs-sl">'+
        '<div class="row"><span>镜头速度</span><input type="range" data-fk="cameraSpeed" data-scale="100" min="55" max="185" step="5" value="100"></div>'+
        '<div class="row"><span>辉光强度</span><input type="range" data-fk="glowIntensity" data-scale="100" min="0" max="180" step="5" value="100"></div>'+
        '<div class="row"><span>主视觉缩放</span><input type="range" data-fk="heroScale" data-scale="100" min="82" max="132" step="1" value="100"></div>'+
        '<div class="row"><span>图形透明度</span><input type="range" data-fk="backgroundObjectOpacity" data-scale="100" min="0" max="100" step="5" value="50"></div>'+
        '<div class="row"><span>已读文字保留</span><input type="range" data-fk="textHoldRatio" data-scale="100" min="0" max="100" step="5" value="100"></div>'+
        '<div class="tnote">镜头速度控制镜头跟随节奏；主视觉缩放控制重点歌词大小；已读文字保留控制歌词经过后的停留与淡出。</div>'+
      '</div>'+
      '<div class="cs cs-sel">'+
        '<div class="row"><span>镜头跟随</span><div class="seg" id="fmTracking" style="flex:1">'+
          '<button type="button" class="chip" data-v="smooth">平滑</button>'+
          '<button type="button" class="chip" data-v="stepped">阶梯</button>'+
        '</div></div>'+
      '</div>'+
      '<div class="cs cs-sw">'+
        '<label class="chk"><span class="chk-t">显示打印符号</span><input type="checkbox" data-fk="hidePrintSymbols" data-invert="1"></label>'+
        '<label class="chk"><span class="chk-t">关闭几何背景</span><input type="checkbox" data-fk="disableGeometricBackground"></label>'+
      '</div>'+
      '<button class="chip" id="fumeReset" type="button">恢复默认</button>'+
    '</div>'
  );

  var style=document.createElement('style');
  style.id='fumeBoxCSS';
  style.textContent=
    '#fumebox{display:none}'+
    'body.is-fume #fumebox{display:block}'+
    'body.is-fume :is(#sbox,#pbox,#starbox,#fadebox,#typebox,#posterbox,#fxbox,#sonnetbox,#temperabox,#lumierebox,#partitabox){display:none!important}'+
    '#fumebox .row span{min-width:92px}'+
    '#fumebox .tnote{font-size:11px;opacity:.55;margin:2px 0 6px}'+
    '#fumebox #fumeReset{margin-top:14px}';
  document.head.appendChild(style);

  var els=[].slice.call(document.querySelectorAll('#fumebox [data-fk]'));
  var segs={fmTracking:'cameraTrackingMode'};
  var pend={},raf=0;
  function A(){return window.FumeAdapter}
  function read(el){
    if(el.type==='checkbox')return el.dataset.invert==='1'?!el.checked:el.checked;
    return +el.value/(+el.dataset.scale||1);
  }
  function write(el,v){
    if(v==null)return;
    if(el.type==='checkbox')el.checked=el.dataset.invert==='1'?!v:!!v;
    else el.value=Math.round(v*(+el.dataset.scale||1));
  }
  function flush(){
    raf=0;
    var patch=pend;pend={};
    if(A()&&A().updateConfig)A().updateConfig(patch);
  }
  function queue(k,v){pend[k]=v;if(!raf)raf=requestAnimationFrame(flush)}
  els.forEach(function(el){
    el.addEventListener(el.type==='checkbox'?'change':'input',function(){queue(el.dataset.fk,read(el))});
    if(el.type==='range'&&typeof wrapRange==='function'&&!(el.parentNode&&el.parentNode.classList.contains('rw')))try{wrapRange(el)}catch(_){}
  });
  function paint(id,v){
    [].forEach.call(document.querySelectorAll('#'+id+' .chip'),function(c){c.classList.toggle('on',c.dataset.v===v)});
  }
  Object.keys(segs).forEach(function(id){
    [].forEach.call(document.querySelectorAll('#'+id+' .chip'),function(c){
      c.addEventListener('click',function(){paint(id,c.dataset.v);queue(segs[id],c.dataset.v)});
    });
  });
  function pull(){
    if(!A()||!A().getConfig)return;
    var config=A().getConfig();
    els.forEach(function(el){write(el,config[el.dataset.fk])});
    Object.keys(segs).forEach(function(id){paint(id,config[segs[id]])});
  }
  var reset=document.getElementById('fumeReset');
  if(reset)reset.addEventListener('click',function(){if(A()&&A().resetConfig){A().resetConfig();pull()}});
  function onMode(){
    var on=stage.classList.contains('mode-fume');
    document.body.classList.toggle('is-fume',on);
    if(on)pull();
  }
  new MutationObserver(onMode).observe(stage,{attributes:true,attributeFilter:['class']});
  onMode();
})();