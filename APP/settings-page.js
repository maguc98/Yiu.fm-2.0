/* Yiu.fm 2.0 — Independent full-screen settings page.
 * The legacy #pg5 menu and #cmore launcher remain untouched.
 * This page mirrors the existing controls and proxies interactions to their
 * original DOM nodes, preserving the original persistence and event handlers.
 */
(function(w,d){
'use strict';
var attempts=0, mounted=false;
function mount(){
  var legacy=d.getElementById('pg5');
  var source=legacy&&legacy.querySelector('.pm-box');
  if(!legacy||!source||d.getElementById('yiuSettingsPage'))return false;
  if(!d.getElementById('yiuFrameRateSettings')&&attempts<18)return false;

  var page=d.createElement('section');
  page.id='yiuSettingsPage';
  page.setAttribute('role','dialog');
  page.setAttribute('aria-modal','true');
  page.setAttribute('aria-label','Yiu.fm 完整设置');
  page.setAttribute('aria-hidden','true');
  page.className='yiu-settings-page is-hidden';

  var style=d.createElement('style');
  style.id='yiuSettingsPageCSS';
  style.textContent=`
#yiuSettingsLauncher{position:fixed;left:15px;top:calc(env(safe-area-inset-top,0px) + 12px);z-index:2147481500;width:44px;height:44px;padding:0;border:1px solid rgba(255,255,255,.2);border-radius:15px;display:flex;align-items:center;justify-content:center;color:#fff;background:rgba(28,30,40,.46);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);box-shadow:0 5px 18px rgba(0,0,0,.18);-webkit-tap-highlight-color:transparent}
#yiuSettingsLauncher svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
#yiuSettingsPage{position:fixed;inset:0;z-index:2147482000;box-sizing:border-box;width:100vw;height:100vh;height:100dvh;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:calc(env(safe-area-inset-top,0px) + 8px) 18px calc(env(safe-area-inset-bottom,0px) + 28px);background:radial-gradient(120% 70% at 50% 0%,rgba(115,145,205,.18),transparent 68%),rgba(15,17,25,.98);color:#f5f6fb}
#yiuSettingsPage.is-hidden{display:none!important}
#yiuSettingsPage.is-open{display:block;animation:yiuSettingsIn .24s cubic-bezier(.2,.8,.2,1) both}
@keyframes yiuSettingsIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
#yiuSettingsPage .yiu-settings-header{position:sticky;top:0;z-index:20;display:grid;grid-template-columns:44px 1fr 44px;align-items:center;gap:10px;min-height:54px;margin:0 -4px 16px;padding:0 4px;background:rgba(15,17,25,.9);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px)}
#yiuSettingsPage .yiu-settings-back{width:40px;height:40px;border:0;border-radius:14px;background:rgba(255,255,255,.09);color:#fff;display:flex;align-items:center;justify-content:center}
#yiuSettingsPage .yiu-settings-back svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
#yiuSettingsPage .yiu-settings-title{text-align:center;font-size:17px;font-weight:750}
#yiuSettingsPage .yiu-settings-title small{display:block;margin-top:2px;font-size:9px;font-weight:600;letter-spacing:.13em;color:rgba(255,255,255,.45)}
#yiuSettingsPage .yiu-settings-brand{text-align:right;font-size:10px;font-weight:700;color:rgba(255,255,255,.45)}
#yiuSettingsPage .yiu-settings-hero{margin:0 0 16px;padding:19px 18px;border:1px solid rgba(255,255,255,.1);border-radius:22px;background:linear-gradient(135deg,rgba(145,170,255,.16),rgba(255,255,255,.045))}
#yiuSettingsPage .yiu-settings-hero strong{display:block;font-size:20px;line-height:1.3}
#yiuSettingsPage .yiu-settings-hero p{margin:7px 0 0;font-size:12px;line-height:1.65;color:rgba(255,255,255,.58)}
#yiuSettingsPage .yiu-settings-nav{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;margin:0 0 16px;padding:1px 0 5px}
#yiuSettingsPage .yiu-settings-nav::-webkit-scrollbar{display:none}
#yiuSettingsPage .yiu-settings-nav button{flex:none;height:34px;padding:0 14px;border:1px solid rgba(255,255,255,.1);border-radius:999px;background:rgba(255,255,255,.07);color:rgba(255,255,255,.8);font-size:12px}
#yiuSettingsPage .pm-box{width:100%;max-width:680px;margin:0 auto;padding:0 0 8px}
#yiuSettingsPage .grp{margin:0 0 14px}
#yiuSettingsPage .gh{min-height:54px;padding:0 16px;border-radius:16px!important;text-align:left}
#yiuSettingsPage .gh>span{font-size:14px;font-weight:650}
#yiuSettingsPage .gb{padding-top:8px}
#yiuSettingsPage .gi{border:1px solid rgba(255,255,255,.09);border-radius:18px;background:rgba(255,255,255,.045);padding:12px}
#yiuSettingsPage .gp{padding:0!important}
#yiuSettingsPage .yiu-settings-foot{padding:16px 4px 4px;text-align:center;font-size:11px;color:rgba(255,255,255,.38)}
#yiuSettingsPage input,#yiuSettingsPage button{font:inherit}
@media(prefers-reduced-motion:reduce){#yiuSettingsPage.is-open{animation:none}}
`;
  d.head.appendChild(style);

  var header=d.createElement('header');
  header.className='yiu-settings-header';
  header.innerHTML='<button class="yiu-settings-back" type="button" aria-label="返回"><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6M9 12h11"/></svg></button><div class="yiu-settings-title">设置<small>YIU.FM · PREFERENCES</small></div><div class="yiu-settings-brand">Yiu.fm</div>';
  page.appendChild(header);

  var hero=d.createElement('section');
  hero.className='yiu-settings-hero';
  hero.innerHTML='<strong>让 Yiu.fm 按你的习惯运行</strong><p>在这里集中管理界面、性能、视觉效果与实验功能。原有设置入口和操作方式仍然保留。</p>';
  page.appendChild(hero);

  var nav=d.createElement('nav');
  nav.className='yiu-settings-nav';
  nav.setAttribute('aria-label','设置分类');
  nav.innerHTML='<button type="button" data-section="general">通用</button><button type="button" data-section="betaBox">Beta 测试</button><button type="button" data-section="devOptionsHolder">开发者</button>';
  page.appendChild(nav);

  var mirror=source.cloneNode(true);
  mirror.id='yiuSettingsMirror';
  mirror.querySelectorAll('[id]').forEach(function(el){
    var original=el.id;
    el.setAttribute('data-yiu-original-id',original);
    el.id='yiuMirror_'+original;
  });
  mirror.querySelectorAll('label[for]').forEach(function(el){
    var original=el.getAttribute('for');
    el.setAttribute('for','yiuMirror_'+original);
  });
  page.appendChild(mirror);

  var foot=d.createElement('div');
  foot.className='yiu-settings-foot';
  foot.textContent='Yiu.fm 2.0 · 设置保存在本机';
  page.appendChild(foot);
  d.body.appendChild(page);

  function originalFor(el){
    var node=el&&el.closest&&el.closest('[data-yiu-original-id]');
    return node?d.getElementById(node.getAttribute('data-yiu-original-id')):null;
  }
  function syncFromOriginal(){
    mirror.querySelectorAll('[data-yiu-original-id]').forEach(function(el){
      var src=d.getElementById(el.getAttribute('data-yiu-original-id'));
      if(!src)return;
      if('checked' in src)el.checked=src.checked;
      if('value' in src&&src.type!=='button')el.value=src.value;
      if(src.classList.contains('on'))el.classList.add('on');else el.classList.remove('on');
      if(src.getAttribute('aria-expanded')!==null)el.setAttribute('aria-expanded',src.getAttribute('aria-expanded'));
    });
  }
  function open(){
    syncFromOriginal();
    page.classList.remove('is-hidden');
    page.classList.add('is-open');
    page.setAttribute('aria-hidden','false');
    d.body.classList.add('yiu-full-settings-open');
    page.scrollTop=0;
  }
  function close(){
    page.classList.remove('is-open');
    page.classList.add('is-hidden');
    page.setAttribute('aria-hidden','true');
    d.body.classList.remove('yiu-full-settings-open');
  }
  mirror.addEventListener('click',function(e){
    var control=e.target.closest('button,[role="button"]');
    if(!control)return;
    if(control.hasAttribute('data-section'))return;
    var src=originalFor(control);
    if(!src)return;
    if(src.classList.contains('gh')){
      src.click();
      control.parentNode.classList.toggle('open',src.parentNode.classList.contains('open'));
      control.setAttribute('aria-expanded',src.getAttribute('aria-expanded')||'false');
      return;
    }
    src.click();
    w.setTimeout(syncFromOriginal,0);
  });
  mirror.addEventListener('input',function(e){
    var src=originalFor(e.target);
    if(!src||!('value' in e.target))return;
    if(e.target.type==='checkbox'||e.target.type==='radio')src.checked=e.target.checked;
    else src.value=e.target.value;
    src.dispatchEvent(new Event('input',{bubbles:true}));
    syncFromOriginal();
  });
  mirror.addEventListener('change',function(e){
    var src=originalFor(e.target);
    if(!src)return;
    if('checked' in e.target)src.checked=e.target.checked;
    if('value' in e.target)src.value=e.target.value;
    src.dispatchEvent(new Event('change',{bubbles:true}));
    syncFromOriginal();
  });
  header.querySelector('.yiu-settings-back').addEventListener('click',close);
  nav.addEventListener('click',function(e){
    var b=e.target.closest('button[data-section]');if(!b)return;
    var target=b.getAttribute('data-section'),el=target==='general'?mirror.querySelector('.grp'):mirror.querySelector('#yiuMirror_'+target);
    if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
  });
  var launcher=d.createElement('button');
  launcher.type='button';launcher.id='yiuSettingsLauncher';
  launcher.setAttribute('aria-label','打开完整设置');launcher.setAttribute('aria-haspopup','dialog');
  launcher.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.1a3.9 3.9 0 1 0 0 7.8 3.9 3.9 0 0 0 0-7.8Z"/><path d="m19.4 13.5 1.1.8-1.1 2-1.3-.5a7.8 7.8 0 0 1-1.4.8l-.2 1.4h-2.3l-.3-1.4a7.8 7.8 0 0 1-1.5-.1l-.9 1.1-2-1.1.4-1.4a7.7 7.7 0 0 1-1-1.2l-1.4.1-.8-2.2 1.2-.8a7.7 7.7 0 0 1 .1-1.6L6.9 8.5 8 6.6l1.4.4a7.8 7.8 0 0 1 1.3-.9l.1-1.4H13l.4 1.4a7.8 7.8 0 0 1 1.5.2l.9-1.1 2 1.2-.4 1.3a7.7 7.7 0 0 1 1 1.3l1.4-.1.8 2.2-1.2.8a7.7 7.7 0 0 1 0 1.6Z"/></svg>';
  d.body.appendChild(launcher);
  launcher.addEventListener('click',open);
  d.addEventListener('keydown',function(e){if(e.key==='Escape'&&!page.classList.contains('is-hidden'))close();});
  var observer=new MutationObserver(function(){syncFromOriginal();});
  observer.observe(source,{subtree:true,childList:true,attributes:true,characterData:true});
  mounted=true;
  return true;
}
var timer=w.setInterval(function(){attempts++;if(mount()||attempts>=80)w.clearInterval(timer);},100);
})(window,document);
