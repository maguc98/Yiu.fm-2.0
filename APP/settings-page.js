/* Yiu.fm 2.0 — Android / Material You inspired settings.
 * Independent full-screen settings experience. Legacy #pg5 stays intact.
 * Mirrored controls forward events to the original controls to reuse their
 * existing handlers and persistence.
 */
(function(w,d){
'use strict';
var attempts=0;
function mount(){
  var legacy=d.getElementById('pg5');
  var source=legacy&&legacy.querySelector('.pm-box');
  if(!legacy||!source||d.getElementById('yiuSettingsPage'))return false;
  if(!d.getElementById('yiuFrameRateSettings')&&attempts<18)return false;

  var page=d.createElement('section');
  page.id='yiuSettingsPage';
  page.setAttribute('role','dialog');
  page.setAttribute('aria-modal','true');
  page.setAttribute('aria-label','Yiu.fm 设置');
  page.setAttribute('aria-hidden','true');
  page.className='is-hidden';

  var style=d.createElement('style');
  style.id='yiuSettingsPageCSS';
  style.textContent=`
:root{--yiu-m3-bg:#f6f3fb;--yiu-m3-surface:#fff;--yiu-m3-surface2:#eee9f6;--yiu-m3-primary:#6750a4;--yiu-m3-ink:#211f26;--yiu-m3-sub:#625d6b}
#yiuSettingsLauncher{position:fixed;left:15px;top:calc(env(safe-area-inset-top,0px) + 12px);z-index:2147481500;width:44px;height:44px;padding:0;border:1px solid rgba(255,255,255,.25);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;background:rgba(35,32,45,.48);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);box-shadow:0 3px 12px rgba(0,0,0,.18);-webkit-tap-highlight-color:transparent}
#yiuSettingsLauncher svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
#yiuSettingsPage{position:fixed;inset:0;z-index:2147482000;box-sizing:border-box;width:100vw;height:100vh;height:100dvh;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:calc(env(safe-area-inset-top,0px) + 8px) 18px calc(env(safe-area-inset-bottom,0px) + 30px);background:var(--yiu-m3-bg);color:var(--yiu-m3-ink);font-family:inherit;color-scheme:light}
#yiuSettingsPage.is-hidden{display:none!important}
#yiuSettingsPage.is-open{display:block;animation:yiuM3In .22s cubic-bezier(.2,.8,.2,1) both}
@keyframes yiuM3In{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
#yiuSettingsPage *{box-sizing:border-box}
#yiuSettingsPage button,#yiuSettingsPage input{font:inherit}
#yiuSettingsPage .m3-top{position:sticky;top:0;z-index:30;display:flex;align-items:center;gap:14px;min-height:54px;margin:0 -18px;padding:0 18px;background:rgba(246,243,251,.94);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px)}
#yiuSettingsPage .m3-back{display:none;flex:none;width:42px;height:42px;border:0;border-radius:50%;background:transparent;color:var(--yiu-m3-ink);font-size:25px;line-height:1}
#yiuSettingsPage .m3-title{font-size:23px;line-height:1.2;font-weight:650;letter-spacing:-.4px}
#yiuSettingsPage .m3-top.sub .m3-back{display:block}
#yiuSettingsPage .m3-top.sub .m3-title{font-size:20px}
#yiuSettingsPage .m3-search{display:flex;align-items:center;gap:10px;margin:12px 0 18px;padding:0 16px;height:54px;border-radius:18px;background:var(--yiu-m3-surface2);color:var(--yiu-m3-sub)}
#yiuSettingsPage .m3-search svg{width:20px;height:20px;flex:none;fill:none;stroke:currentColor;stroke-width:1.8}
#yiuSettingsPage .m3-search input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:var(--yiu-m3-ink);font-size:15px}
#yiuSettingsPage .m3-search input::placeholder{color:#77717f}
#yiuSettingsPage .m3-hero{display:flex;align-items:center;gap:15px;margin:0 0 23px;padding:19px;border-radius:24px;background:#e8def8;color:#302747}
#yiuSettingsPage .m3-logo{display:flex;align-items:center;justify-content:center;flex:none;width:52px;height:52px;border-radius:17px;background:#d0bcf2;color:#4d3a79;font-size:24px;font-weight:800}
#yiuSettingsPage .m3-hero strong{display:block;font-size:18px;font-weight:700}
#yiuSettingsPage .m3-hero small{display:block;margin-top:4px;font-size:12px;line-height:1.5;color:#594f6b}
#yiuSettingsPage .m3-section-title{margin:20px 4px 9px;font-size:14px;font-weight:700;color:#514b59}
#yiuSettingsPage .m3-list{overflow:hidden;border-radius:22px;background:var(--yiu-m3-surface);box-shadow:0 1px 2px rgba(35,25,50,.04)}
#yiuSettingsPage .m3-category{display:flex;align-items:center;gap:15px;width:100%;min-height:76px;padding:12px 16px;border:0;border-bottom:1px solid #eeeaf1;background:transparent;text-align:left;color:var(--yiu-m3-ink);-webkit-tap-highlight-color:transparent}
#yiuSettingsPage .m3-category:last-child{border-bottom:0}
#yiuSettingsPage .m3-category:active{background:#f1edf6}
#yiuSettingsPage .m3-icon{display:flex;align-items:center;justify-content:center;flex:none;width:42px;height:42px;border-radius:14px;background:#eee7f8;color:var(--yiu-m3-primary);font-size:20px}
#yiuSettingsPage .m3-cat-copy{flex:1;min-width:0}
#yiuSettingsPage .m3-cat-copy strong{display:block;font-size:15px;font-weight:650}
#yiuSettingsPage .m3-cat-copy small{display:block;margin-top:4px;font-size:12px;line-height:1.4;color:var(--yiu-m3-sub)}
#yiuSettingsPage .m3-chevron{color:#797381;font-size:23px;font-weight:300}
#yiuSettingsPage .m3-home[hidden],#yiuSettingsPage .m3-subpage[hidden]{display:none!important}
#yiuSettingsPage .m3-subpage{padding-bottom:12px}
#yiuSettingsPage .m3-subdesc{margin:0 3px 16px;color:var(--yiu-m3-sub);font-size:13px;line-height:1.55}
#yiuSettingsPage .m3-subpage .grp{margin:0 0 14px;padding:15px 16px;border-radius:22px;background:var(--yiu-m3-surface);box-shadow:0 1px 2px rgba(35,25,50,.04)}
#yiuSettingsPage .m3-subpage .gh{display:none!important}
#yiuSettingsPage .m3-subpage .gb{display:block!important;height:auto!important;max-height:none!important;overflow:visible!important;padding:0!important}
#yiuSettingsPage .m3-subpage .gi{padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}
#yiuSettingsPage .m3-subpage .gp{padding:0!important}
#yiuSettingsPage .m3-subpage .qh{color:var(--yiu-m3-ink)}
#yiuSettingsPage .m3-subpage .qtip{color:var(--yiu-m3-sub)!important}
#yiuSettingsPage .m3-subpage .chk{color:var(--yiu-m3-ink)!important}
#yiuSettingsPage .m3-subpage .row>span{color:var(--yiu-m3-ink)!important}
#yiuSettingsPage .m3-subpage .chip{color:var(--yiu-m3-primary)!important;border-color:#d7c9eb!important;background:#f5f0fb!important}
#yiuSettingsPage .m3-subpage input[type=range]{accent-color:var(--yiu-m3-primary)}
#yiuSettingsPage .m3-subpage input[type=checkbox]{accent-color:var(--yiu-m3-primary)}
#yiuSettingsPage .m3-subpage .m3-group-title{margin:0 0 12px;font-size:17px;font-weight:700}
#yiuSettingsPage .m3-empty{padding:20px;border-radius:18px;background:#fff;color:var(--yiu-m3-sub);font-size:13px}
#yiuSettingsPage .m3-footer{padding:22px 0 5px;text-align:center;font-size:11px;color:#817b88}
@media(prefers-reduced-motion:reduce){#yiuSettingsPage.is-open{animation:none}}
`;
  d.head.appendChild(style);

  var top=d.createElement('header');
  top.className='m3-top';
  top.innerHTML='<button type="button" class="m3-back" aria-label="返回">‹</button><div class="m3-title">设置</div>';
  page.appendChild(top);

  var home=d.createElement('div');
  home.className='m3-home';
  var search=d.createElement('label');
  search.className='m3-search';
  search.innerHTML='<svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.2 4.2"/></svg><input type="search" placeholder="搜索设置" aria-label="搜索设置">';
  home.appendChild(search);

  var hero=d.createElement('section');
  hero.className='m3-hero';
  hero.innerHTML='<div class="m3-logo">Y</div><div><strong>Yiu.fm 设置</strong><small>管理应用偏好、实验功能与高级选项</small></div>';
  home.appendChild(hero);

  var sectionTitle=d.createElement('div');
  sectionTitle.className='m3-section-title';
  sectionTitle.textContent='所有设置';
  home.appendChild(sectionTitle);
  var list=d.createElement('div');
  list.className='m3-list';
  home.appendChild(list);
  page.appendChild(home);

  var subpage=d.createElement('div');
  subpage.className='m3-subpage';
  subpage.hidden=true;
  page.appendChild(subpage);

  var foot=d.createElement('div');
  foot.className='m3-footer';
  foot.textContent='Yiu.fm 2.0 · 设置保存在本机';
  page.appendChild(foot);
  d.body.appendChild(page);

  var sourceNodes=[source].concat([].slice.call(source.querySelectorAll('*')));
  var mirrorRoot=d.createElement('div');
  mirrorRoot.id='yiuSettingsMirror';
  var mirrorNodes=[];
  var categories=[];
  var configs=[
    {id:'system',title:'系统设置',desc:'界面动画速度、性能优化与基础偏好',icon:'⚙',match:function(el){return el.classList.contains('grp')&&!el.id}},
    {id:'beta',title:'Beta 测试功能',desc:'体验正在测试中的新功能',icon:'🧪',match:function(el){return el.id==='betaBox'}},
    {id:'developer',title:'开发者选项',desc:'调试工具、运行状态与高级诊断',icon:'⌘',match:function(el){return el.id==='devOptionsHolder'}}
  ];
  function bindTree(clone,original){
    var originals=[original].concat([].slice.call(original.querySelectorAll('*')));
    var clones=[clone].concat([].slice.call(clone.querySelectorAll('*')));
    clones.forEach(function(el,i){
      var index=sourceNodes.indexOf(originals[i]);
      el.setAttribute('data-yiu-source-index',String(index));
      mirrorNodes.push(el);
    });
  }
  configs.forEach(function(cfg){
    var original=[].slice.call(source.children).find(cfg.match);
    if(!original)return;
    var clone=original.cloneNode(true);
    clone.querySelectorAll('[id]').forEach(function(el){el.id='yiuMirror_'+el.id});
    clone.querySelectorAll('label[for]').forEach(function(el){el.setAttribute('for','yiuMirror_'+el.getAttribute('for'))});
    bindTree(clone,original);
    var card=d.createElement('button');
    card.type='button';card.className='m3-category';
    card.innerHTML='<span class="m3-icon">'+cfg.icon+'</span><span class="m3-cat-copy"><strong>'+cfg.title+'</strong><small>'+cfg.desc+'</small></span><span class="m3-chevron">›</span>';
    card.setAttribute('data-category',cfg.id);
    list.appendChild(card);
    var panel=d.createElement('section');
    panel.className='m3-category-panel';
    panel.setAttribute('data-panel',cfg.id);
    var desc=d.createElement('p');
    desc.className='m3-subdesc';desc.textContent=cfg.desc;
    panel.appendChild(desc);
    var content=d.createElement('div');
    if(clone.classList.contains('grp')){
      var gh=clone.querySelector('.gh');
      var title=gh&&gh.querySelector('span');
      var h=d.createElement('h2');h.className='m3-group-title';h.textContent=title?title.textContent.trim():cfg.title;
      panel.appendChild(h);
      content.appendChild(clone);
    }else{
      content.appendChild(clone);
    }
    panel.appendChild(content);
    subpage.appendChild(panel);
    categories.push({cfg:cfg,card:card,panel:panel,clone:clone,original:original});
  });

  function sourceFor(el){
    var node=el&&el.closest&&el.closest('[data-yiu-source-index]');
    if(!node)return null;
    var i=Number(node.getAttribute('data-yiu-source-index'));
    return Number.isInteger(i)&&i>=0?sourceNodes[i]||null:null;
  }
  function sync(){
    mirrorNodes.forEach(function(el){
      var src=sourceFor(el);if(!src)return;
      if('checked' in src)el.checked=src.checked;
      if('value' in src&&src.type!=='button')el.value=src.value;
      ['on','open','hide','show'].forEach(function(c){el.classList.toggle(c,src.classList.contains(c))});
      if(src.getAttribute('aria-pressed')!==null)el.setAttribute('aria-pressed',src.getAttribute('aria-pressed'));
      if(src.getAttribute('aria-expanded')!==null)el.setAttribute('aria-expanded',src.getAttribute('aria-expanded'));
      if(src.textContent!==el.textContent&&src.children.length===0)el.textContent=src.textContent;
    });
  }
  function showHome(){
    home.hidden=false;subpage.hidden=true;top.classList.remove('sub');
    top.querySelector('.m3-title').textContent='设置';
    foot.style.display='';
    search.querySelector('input').value='';
    categories.forEach(function(c){c.card.hidden=false});
    page.scrollTop=0;
  }
  function openCategory(id){
    var item=categories.find(function(c){return c.cfg.id===id});if(!item)return;
    sync();
    home.hidden=true;subpage.hidden=false;top.classList.add('sub');
    top.querySelector('.m3-title').textContent=item.cfg.title;
    foot.style.display='none';
    categories.forEach(function(c){c.panel.hidden=c!==item});
    page.scrollTop=0;
  }
  list.addEventListener('click',function(e){
    var card=e.target.closest('[data-category]');if(card)openCategory(card.getAttribute('data-category'));
  });
  search.querySelector('input').addEventListener('input',function(){
    var q=this.value.trim().toLocaleLowerCase();
    categories.forEach(function(c){
      var hay=(c.cfg.title+' '+c.cfg.desc+' '+c.clone.textContent).toLocaleLowerCase();
      c.card.hidden=!!q&&!hay.includes(q);
    });
    sectionTitle.textContent=q?'搜索结果':'所有设置';
  });
  subpage.addEventListener('click',function(e){
    var control=e.target.closest('button,[role="button"]');
    if(!control)return;
    var src=sourceFor(control);if(!src)return;
    if(src.classList.contains('gh'))return;
    src.click();
    w.setTimeout(sync,0);
  });
  function forwardValue(e){
    var src=sourceFor(e.target);if(!src)return;
    var clone=e.target;
    if('checked' in clone)src.checked=clone.checked;
    if('value' in clone)src.value=clone.value;
    src.dispatchEvent(new Event(e.type,{bubbles:true}));
    sync();
  }
  subpage.addEventListener('input',forwardValue);
  subpage.addEventListener('change',forwardValue);
  top.querySelector('.m3-back').addEventListener('click',showHome);

  function open(){
    sync();
    page.classList.remove('is-hidden');
    page.classList.add('is-open');
    page.setAttribute('aria-hidden','false');
    d.body.classList.add('yiu-full-settings-open');
    showHome();
  }
  function close(){
    page.classList.remove('is-open');
    page.classList.add('is-hidden');
    page.setAttribute('aria-hidden','true');
    d.body.classList.remove('yiu-full-settings-open');
  }
  var launcher=d.createElement('button');
  launcher.type='button';launcher.id='yiuSettingsLauncher';
  launcher.setAttribute('aria-label','打开设置');launcher.setAttribute('aria-haspopup','dialog');
  launcher.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.1a3.9 3.9 0 1 0 0 7.8 3.9 3.9 0 0 0 0-7.8Z"/><path d="m19.4 13.5 1.1.8-1.1 2-1.3-.5a7.8 7.8 0 0 1-1.4.8l-.2 1.4h-2.3l-.3-1.4a7.8 7.8 0 0 1-1.5-.1l-.9 1.1-2-1.1.4-1.4a7.7 7.7 0 0 1-1-1.2l-1.4.1-.8-2.2 1.2-.8a7.7 7.7 0 0 1 .1-1.6L6.9 8.5 8 6.6l1.4.4a7.8 7.8 0 0 1 1.3-.9l.1-1.4H13l.4 1.4a7.8 7.8 0 0 1 1.5.2l.9-1.1 2 1.2-.4 1.3a7.7 7.7 0 0 1 1 1.3l1.4-.1.8 2.2-1.2.8a7.7 7.7 0 0 1 0 1.6Z"/></svg>';
  d.body.appendChild(launcher);
  launcher.addEventListener('click',open);
  d.addEventListener('keydown',function(e){if(e.key==='Escape'&&!page.classList.contains('is-hidden')){if(!subpage.hidden)showHome();else close()}});
  var observer=new MutationObserver(function(){if(!page.classList.contains('is-hidden'))sync()});
  observer.observe(source,{subtree:true,childList:true,attributes:true,characterData:true});
  return true;
}
var timer=w.setInterval(function(){attempts++;if(mount()||attempts>=80)w.clearInterval(timer)},100);
})(window,document);
