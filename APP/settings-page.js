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
#yiuSettingsPage .m3-back{display:flex;align-items:center;justify-content:center;flex:none;width:42px;height:42px;border:0;border-radius:50%;background:transparent;color:var(--yiu-m3-ink);font-size:25px;line-height:1;-webkit-tap-highlight-color:transparent}#yiuSettingsPage .m3-back:active{background:#e9e3f1}#yiuSettingsPage .m3-back:focus-visible,#yiuSettingsPage .m3-category:focus-visible,#yiuSettingsPage .m3-search-result:focus-visible,#yiuSettingsPage .m3-empty button:focus-visible{outline:2px solid var(--yiu-m3-primary);outline-offset:2px}#yiuSettingsPage button:disabled,#yiuSettingsPage input:disabled,#yiuSettingsPage select:disabled{opacity:.48;cursor:not-allowed}
#yiuSettingsPage .m3-title{font-size:23px;line-height:1.2;font-weight:650;letter-spacing:-.4px}
#yiuSettingsPage .m3-top.sub .m3-back{display:block}
#yiuSettingsPage .m3-top.sub .m3-title{font-size:20px}
#yiuSettingsPage .m3-search{display:flex;align-items:center;gap:10px;margin:12px 0 18px;padding:0 16px;height:54px;border-radius:18px;background:var(--yiu-m3-surface2);color:var(--yiu-m3-sub)}
#yiuSettingsPage .m3-search svg{width:20px;height:20px;flex:none;fill:none;stroke:currentColor;stroke-width:1.8}
#yiuSettingsPage .m3-search input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:var(--yiu-m3-ink);font-size:15px}#yiuSettingsPage .m3-search:focus-within{background:#e8e1f1;box-shadow:0 0 0 2px rgba(103,80,164,.14)}#yiuSettingsPage .m3-search input:focus{outline:0}
#yiuSettingsPage .m3-search input::placeholder{color:#77717f}
#yiuSettingsPage .m3-hero{display:flex;align-items:center;gap:15px;margin:0 0 23px;padding:19px;border-radius:24px;background:#e8def8;color:#302747}
#yiuSettingsPage .m3-logo{display:flex;align-items:center;justify-content:center;flex:none;width:52px;height:52px;border-radius:17px;background:#d0bcf2;color:#4d3a79;font-size:24px;font-weight:800}
#yiuSettingsPage .m3-hero strong{display:block;font-size:18px;font-weight:700}
#yiuSettingsPage .m3-hero small{display:block;margin-top:4px;font-size:12px;line-height:1.5;color:#594f6b}
#yiuSettingsPage .m3-section-title{margin:20px 4px 9px;font-size:14px;font-weight:700;color:#514b59;letter-spacing:.1px}
#yiuSettingsPage .m3-list{overflow:hidden;border-radius:22px;background:var(--yiu-m3-surface);box-shadow:0 1px 2px rgba(35,25,50,.04)}#yiuSettingsPage .m3-empty{margin-top:12px;padding:22px 18px;border-radius:20px;background:#fff;text-align:center;color:var(--yiu-m3-sub);box-shadow:0 1px 2px rgba(35,25,50,.04)}#yiuSettingsPage .m3-empty strong{display:block;margin-bottom:5px;color:var(--yiu-m3-ink);font-size:15px}#yiuSettingsPage .m3-empty button{margin-top:12px;padding:9px 15px;border:0;border-radius:999px;background:#eee7f8;color:#59458b;font-size:13px;font-weight:650}
#yiuSettingsPage .m3-category{display:flex;align-items:center;gap:15px;width:100%;min-height:76px;padding:12px 16px;border:0;border-bottom:1px solid #eeeaf1;background:transparent;text-align:left;color:var(--yiu-m3-ink);-webkit-tap-highlight-color:transparent}
#yiuSettingsPage .m3-category:last-child{border-bottom:0}
#yiuSettingsPage .m3-search-results{display:flex;flex-direction:column;gap:7px;margin:0 0 12px}#yiuSettingsPage [hidden]{display:none!important}#yiuSettingsPage .m3-search-result{display:flex;flex-direction:column;align-items:flex-start;gap:3px;width:100%;padding:12px 14px;border:1px solid #e9e4ef;border-radius:14px;background:#fff;color:var(--yiu-m3-ink);text-align:left}#yiuSettingsPage .m3-search-result strong{font-size:14px}#yiuSettingsPage .m3-search-result small{font-size:12px;color:var(--yiu-m3-sub)}#yiuSettingsPage .m3-search-hit{outline:2px solid #9b8acb!important;outline-offset:3px!important;border-radius:10px!important;background:rgba(232,224,248,.35)!important;}
#yiuSettingsPage .m3-category{cursor:pointer;transition:background .16s ease,transform .16s ease}#yiuSettingsPage .m3-category:active{background:#f1edf6;transform:scale(.995)}#yiuSettingsPage .m3-chevron{transition:transform .16s ease}#yiuSettingsPage .m3-category:active .m3-chevron{transform:translateX(2px)}
#yiuSettingsPage .m3-icon{display:flex;align-items:center;justify-content:center;flex:none;width:44px;height:44px;border-radius:15px;background:#eee7f8;color:#6750a4}#yiuSettingsPage .m3-icon svg{display:block;width:27px;height:27px;overflow:visible}#yiuSettingsPage .m3-category[data-category=system] .m3-icon{background:#e6eafa;color:#5369b4}#yiuSettingsPage .m3-category[data-category=beta] .m3-icon{background:#fcebdc;color:#b66a35}#yiuSettingsPage .m3-category[data-category=developer] .m3-icon{background:#e2f2e9;color:#3e8060}
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
  search.innerHTML='<svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.2 4.2"/></svg><input type="search" placeholder="搜索设置" aria-label="搜索设置" enterkeyhint="search" autocapitalize="off" spellcheck="false">';
  home.appendChild(search);

  var hero=d.createElement('section');
  hero.className='m3-hero';
  hero.innerHTML='<div class="m3-logo">Y</div><div><strong>Yiu.fm 设置</strong><small>管理应用偏好、实验功能与高级选项</small></div>';
  home.appendChild(hero);

  var sectionTitle=d.createElement('div');
  sectionTitle.className='m3-section-title';
  sectionTitle.setAttribute('aria-live','polite');
  sectionTitle.setAttribute('role','status');
  sectionTitle.textContent='所有设置';
  home.appendChild(sectionTitle);
  var list=d.createElement('div');
  list.className='m3-list';
  home.appendChild(list);
  var results=d.createElement('div');
  results.className='m3-search-results';
  results.hidden=true;
  results.setAttribute('aria-label','匹配的设置项');
  home.appendChild(results);
  var searchMatches=[];
  var empty=d.createElement('div');
  empty.className='m3-empty';
  empty.setAttribute('role','status');
  empty.setAttribute('aria-live','polite');
  empty.hidden=true;
  empty.innerHTML='<strong>没有找到相关设置</strong><span>试试其他关键词，或查看全部设置分类。</span><br><button type="button">清除搜索</button>';
  home.appendChild(empty);
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
    {id:'system',title:'系统设置',desc:'界面动画速度、性能优化与基础偏好',icon:'<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="#8da0e2" d="M13.2 3.5h5.6l.8 3.1a10 10 0 0 1 2.2 1.3l3.1-.8 2.8 4.8-2.3 2.2a10 10 0 0 1 0 2.6l2.3 2.2-2.8 4.8-3.1-.8a10 10 0 0 1-2.2 1.3l-.8 3.1h-5.6l-.8-3.1a10 10 0 0 1-2.2-1.3l-3.1.8-2.8-4.8 2.3-2.2a10 10 0 0 1 0-2.6l-2.3-2.2 2.8-4.8 3.1.8a10 10 0 0 1 2.2-1.3z"/><circle cx="16" cy="15.4" r="5.1" fill="#fff"/><circle cx="16" cy="15.4" r="2.5" fill="#5369b4"/></svg>',match:function(el){return el.classList.contains('grp')&&!el.id}},
    {id:'beta',title:'Beta 测试功能',desc:'体验正在测试中的新功能',icon:'<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="#e9a56e" d="M12 3h8v2h-2v7.2l7.1 11.2A3.7 3.7 0 0 1 22 29H10a3.7 3.7 0 0 1-3.1-5.6L14 12.2V5h-2z"/><path fill="#fff1df" d="M10.2 22.2 8.7 24.5A1.8 1.8 0 0 0 10.2 27h11.6a1.8 1.8 0 0 0 1.5-2.5l-1.5-2.3z"/><circle cx="13" cy="19" r="1.3" fill="#c97942"/><circle cx="19.5" cy="17.5" r="1" fill="#c97942"/></svg>',match:function(el){return el.id==='betaBox'}},
    {id:'developer',title:'开发者选项',desc:'调试工具、运行状态与高级诊断',icon:'<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="4" y="5" width="24" height="22" rx="6" fill="#79b99a"/><path d="M10 12h12M10 20h12" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><circle cx="14" cy="12" r="3" fill="#3e8060" stroke="#fff" stroke-width="1.5"/><circle cx="20" cy="20" r="3" fill="#3e8060" stroke="#fff" stroke-width="1.5"/></svg>',find:function(root){return root.querySelector('#devOptionsGroup')||root.querySelector('#devOptionsHolder')}}
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
    var original=cfg.find?cfg.find(source):[].slice.call(source.children).find(cfg.match);
    if(!original)return;
    var clone=original.cloneNode(true);
    if(clone.id)clone.id='yiuMirror_'+clone.id;
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
      if(src.tagName==='SELECT')el.selectedIndex=src.selectedIndex;
      if('disabled' in src)el.disabled=src.disabled;
      el.hidden=!!src.hidden;
      ['on','open','hide','show','active'].forEach(function(c){el.classList.toggle(c,src.classList.contains(c))});
      ['aria-pressed','aria-expanded','aria-checked','aria-disabled','aria-label','title'].forEach(function(a){if(src.hasAttribute(a))el.setAttribute(a,src.getAttribute(a));else el.removeAttribute(a)});
      if(src.textContent!==el.textContent&&src.children.length===0)el.textContent=src.textContent;
    });
  }
  function updateSearch(){
    var input=search.querySelector('input');
    var q=input.value.trim().toLocaleLowerCase();
    var visible=0;
    var exact=[];
    categories.forEach(function(c){
      var hay=(c.cfg.title+' '+c.cfg.desc+' '+c.clone.textContent).toLocaleLowerCase();
      c.card.hidden=!!q&&!hay.includes(q);
      if(!c.card.hidden)visible++;
      if(!q)return;
      var controls=[].slice.call(c.clone.querySelectorAll('input,button,select,textarea,[role="button"]'));
      controls.forEach(function(control){
        var holder=control.closest('.row,.chk,label,button')||control.parentElement||control;
        if(!holder||!c.clone.contains(holder))return;
        var label=(holder.textContent||'').trim();
        var aria=control.getAttribute('aria-label')||'';
        var id=control.id||'';
        var haystack=(label+' '+aria+' '+id).toLocaleLowerCase();
        if(!haystack.includes(q))return;
        if(!label)label=aria||id||'设置项';
        var key=c.cfg.id+'|'+label;
        if(exact.some(function(x){return x.key===key}))return;
        exact.push({key:key,category:c.cfg.id,title:label.replace(/\s+/g,' ').slice(0,90),target:holder});
      });
    });
    searchMatches=exact;
    results.textContent='';
    exact.forEach(function(match,index){
      var item=d.createElement('button');
      item.type='button';item.className='m3-search-result';
      item.setAttribute('data-search-match',String(index));
      var strong=d.createElement('strong');strong.textContent=match.title;
      var small=d.createElement('small');small.textContent=categories.find(function(c){return c.cfg.id===match.category}).cfg.title+' · 设置项';
      item.appendChild(strong);item.appendChild(small);results.appendChild(item);
    });
    results.hidden=!q||exact.length===0;
    list.hidden=!!q&&exact.length>0;
    sectionTitle.textContent=q?'匹配的设置项（'+exact.length+'）':'所有设置（'+categories.length+'）';
    empty.hidden=!q||exact.length>0;
  }
  results.addEventListener('click',function(e){
    var item=e.target.closest('[data-search-match]');
    if(!item)return;
    var match=searchMatches[Number(item.getAttribute('data-search-match'))];
    if(!match)return;
    openCategory(match.category);
    w.setTimeout(function(){
      if(!match.target||!match.target.isConnected)return;
      match.target.scrollIntoView({block:'center',behavior:'smooth'});
      match.target.classList.add('m3-search-hit');
      w.setTimeout(function(){match.target.classList.remove('m3-search-hit')},1400);
      var control=match.target.matches('input,button,select,textarea')?match.target:match.target.querySelector('input,button,select,textarea');
      if(control&&control.type!=='range')try{control.focus({preventScroll:true})}catch(_){}
    },80);
  });
  empty.querySelector('button').addEventListener('click',function(){
    search.querySelector('input').value='';
    updateSearch();
    search.querySelector('input').focus();
  });
  function showHome(){
    home.hidden=false;subpage.hidden=true;top.classList.remove('sub');
    top.querySelector('.m3-title').textContent='设置';
    foot.style.display='';
    search.querySelector('input').value='';
    updateSearch();
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
  search.querySelector('input').addEventListener('input',updateSearch);
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
  top.querySelector('.m3-back').addEventListener('click',function(){if(!subpage.hidden)showHome();else close()});
  page.addEventListener('keydown',function(e){
    if(e.key!=='Tab')return;
    var focusable=[].slice.call(page.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter(function(el){return !el.closest('[hidden]')&&el.getAttribute('aria-hidden')!=='true'&&el.getClientRects().length>0});
    if(!focusable.length){e.preventDefault();top.querySelector('.m3-back').focus();return;}
    var first=focusable[0],last=focusable[focusable.length-1];
    if(e.shiftKey&&d.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&d.activeElement===last){e.preventDefault();first.focus();}
  });

  var previousFocus=null;
  var previousBodyOverflow='';
  var isOpen=false;
  function open(){
    if(isOpen)return;
    isOpen=true;
    previousFocus=d.activeElement;
    previousBodyOverflow=d.body.style.overflow;
    sync();
    page.classList.remove('is-hidden');
    page.classList.add('is-open');
    page.setAttribute('aria-hidden','false');
    d.body.classList.add('yiu-full-settings-open');
    d.body.style.overflow='hidden';
    showHome();
    top.querySelector('.m3-back').focus();
  }
  function close(){
    if(!isOpen)return;
    isOpen=false;
    page.classList.remove('is-open');
    page.classList.add('is-hidden');
    page.setAttribute('aria-hidden','true');
    d.body.classList.remove('yiu-full-settings-open');
    d.body.style.overflow=previousBodyOverflow;
    if(previousFocus&&typeof previousFocus.focus==='function')previousFocus.focus();
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
  sync();
  return true;
}
var timer=w.setInterval(function(){attempts++;if(mount()||attempts>=80)w.clearInterval(timer)},100);
})(window,document);
