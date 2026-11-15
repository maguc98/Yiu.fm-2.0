/* Control Center home view — keeps legacy panels and their handlers intact. */
(function(){
  var hub=document.getElementById('hub'); if(!hub||document.getElementById('cc-home')) return;
  var home=document.createElement('section'); home.id='cc-home'; home.setAttribute('aria-label','控制中心');
  home.innerHTML='<header class="cc-head"><div class="cc-headcopy"><div class="cc-kicker">YIU.FM</div><div class="cc-title">控制中心</div></div><button class="cc-close" type="button" aria-label="关闭控制中心">×</button></header>'+
    '<section class="cc-engine"><div><div class="cc-engine-name">SONNET</div><div class="cc-engine-sub">视觉引擎</div></div><span class="cc-running">运行中</span></section>'+
    '<div class="cc-section-label">快捷入口</div><div class="cc-shortcuts">'+
    '<button class="cc-shortcut" type="button" data-cc-go="visual"><strong>视觉效果</strong><small>动效与渲染设置</small></button>'+
    '<button class="cc-shortcut" type="button" data-cc-go="mode"><strong>显示模式</strong><small>文字与音乐显示</small></button></div>'+
    '<section class="cc-resolution"><div class="cc-resolution-head"><span class="cc-resolution-title">渲染分辨率</span><span class="cc-resolution-value" id="cc-res-value">65%</span></div><div id="cc-res-slot"></div></section>'+
    '<button class="cc-other" type="button" data-cc-go="other"><span class="cc-other-icon"><svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/><circle cx="9" cy="7" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="8" cy="17" r="2"/></svg></span><strong>其他</strong><span class="cc-chevron">›</span></button>';
  hub.insertBefore(home,hub.firstChild);
  var slider=document.getElementById('sonnet-res'),slot=document.getElementById('cc-res-slot'),value=document.getElementById('cc-res-value');
  if(slider&&slot){var row=slider.closest('.row');if(row)slot.appendChild(row);var update=function(){if(value)value.textContent=Math.round(Number(slider.value)||65)+'%'};slider.addEventListener('input',update);slider.addEventListener('change',update);update();}
  function showLegacy(tab){
    hub.classList.add('cc-legacy-open');
    var nav=hub.querySelector('#lg .nb[data-i="'+tab+'"]'); if(nav)nav.click();
    if(tab===4){var play=hub.querySelector('#lg .nb[data-i="3"]');if(play)play.click();}
  }
  home.addEventListener('click',function(e){
    var close=e.target.closest('.cc-close');
    if(close){document.body.classList.remove('open');return;}
    var action=e.target.closest('[data-cc-go]');if(!action)return;
    var dest=action.getAttribute('data-cc-go');
    if(dest==='visual')showLegacy(1);
    else if(dest==='mode'){
      hub.classList.add('cc-legacy-open');
      var q=hub.querySelector('#cq');if(q)q.click();
    }else if(dest==='other')showLegacy(3);
  });
  var was=document.body.classList.contains('open');
  new MutationObserver(function(){
    var now=document.body.classList.contains('open');
    if(now&&!was){hub.classList.remove('cc-legacy-open');}
    was=now;
  }).observe(document.body,{attributes:true,attributeFilter:['class']});
  var back=hub.querySelector('#hback');
  if(back)back.addEventListener('click',function(){hub.classList.remove('cc-legacy-open')});
})();
