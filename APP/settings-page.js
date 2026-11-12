/* Yiu.fm 2.0 — Full-screen Settings entry point.
 * Reuses the existing settings controls in #pg5; no settings are duplicated,
 * so current persistence and event handlers remain intact.
 */
(function(w,d){
'use strict';
var attempts=0;
function mount(){
  var page=d.getElementById('pg5');
  var more=d.getElementById('cmore');
  if(!page||!more||!page.querySelector('.pm-box'))return false;
  if(page.dataset.fullscreenSettings==='1')return true;
  page.dataset.fullscreenSettings='1';
  page.classList.add('settings-page');
  /* Keep the existing DOM/control nodes and their listeners; only change their host. */
  d.body.appendChild(page);
  more.style.display='none';
  more.setAttribute('aria-hidden','true');

  var style=d.createElement('style');
  style.id='yiuFullSettingsCSS';
  style.textContent=`
#yiuSettingsLauncher{
  position:fixed;left:16px;top:calc(env(safe-area-inset-top,0px) + 12px);z-index:2147481500;
  width:44px;height:44px;padding:0;border:1px solid rgba(255,255,255,.22);border-radius:15px;
  display:flex;align-items:center;justify-content:center;color:#fff;
  background:rgba(28,30,40,.46);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);
  box-shadow:0 5px 18px rgba(0,0,0,.18);-webkit-tap-highlight-color:transparent;
}
#yiuSettingsLauncher svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
body.yiu-settings-open #yiuSettingsLauncher{opacity:0;pointer-events:none;transform:scale(.92)}
#pg5.settings-page.hide{display:none!important}
#pg5.settings-page:not(.hide){
  display:flex!important;flex-direction:column!important;position:fixed!important;inset:0!important;
  z-index:2147482000!important;width:100vw!important;height:100vh!important;height:100dvh!important;
  max-height:none!important;box-sizing:border-box!important;overflow-x:hidden!important;overflow-y:auto!important;
  overscroll-behavior:contain;-webkit-overflow-scrolling:touch;
  margin:0!important;padding:calc(env(safe-area-inset-top,0px) + 8px) 18px calc(env(safe-area-inset-bottom,0px) + 30px)!important;
  border:0!important;border-radius:0!important;background:radial-gradient(120% 70% at 50% 0%,rgba(80,100,155,.22),transparent 68%),rgba(15,17,25,.97)!important;
  color:#f5f6fb!important;opacity:1!important;visibility:visible!important;transform:none!important;
  pointer-events:auto!important;animation:yiuSettingsIn .28s cubic-bezier(.2,.8,.2,1) both;
}
@keyframes yiuSettingsIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
#pg5.settings-page>.ph{display:none!important}
#pg5 .settings-page-header{
  position:sticky;top:0;z-index:8;flex:none;display:grid;grid-template-columns:44px 1fr 44px;
  align-items:center;gap:10px;min-height:54px;margin:0 -4px 18px;padding:0 4px;
  background:rgba(15,17,25,.88);-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);
}
#pg5 .settings-back{
  width:40px;height:40px;border:0;border-radius:14px;background:rgba(255,255,255,.09);
  color:#fff;display:flex;align-items:center;justify-content:center;padding:0;
}
#pg5 .settings-back svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
#pg5 .settings-heading{text-align:center;min-width:0}
#pg5 .settings-heading b{display:block;font-size:17px;font-weight:750;letter-spacing:.02em}
#pg5 .settings-heading span{display:block;margin-top:2px;font-size:10px;color:rgba(255,255,255,.48);letter-spacing:.12em}
#pg5 .settings-brand{font-size:10px;font-weight:700;letter-spacing:.06em;color:rgba(255,255,255,.48);text-align:right}
#pg5 .settings-hero{
  margin:0 0 18px;padding:20px 18px;border:1px solid rgba(255,255,255,.10);border-radius:22px;
  background:linear-gradient(135deg,rgba(145,170,255,.16),rgba(255,255,255,.045));
}
#pg5 .settings-hero strong{display:block;font-size:21px;line-height:1.25;letter-spacing:-.02em}
#pg5 .settings-hero p{margin:7px 0 0;font-size:12px;line-height:1.65;color:rgba(255,255,255,.58)}
#pg5 .settings-nav{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;margin:0 0 20px;padding:1px 0 4px}
#pg5 .settings-nav::-webkit-scrollbar{display:none}
#pg5 .settings-nav button{
  flex:none;height:34px;padding:0 14px;border:1px solid rgba(255,255,255,.10);border-radius:999px;
  background:rgba(255,255,255,.07);color:rgba(255,255,255,.78);font-size:12px;white-space:nowrap;
}
#pg5 .settings-nav button:active{background:rgba(145,170,255,.24)}
#pg5 .pm-box{width:100%;max-width:680px;margin:0 auto;padding:0 0 8px}
#pg5 .grp{margin:0 0 14px}
#pg5 .gh{min-height:54px;padding:0 16px;border-radius:16px!important;text-align:left}
#pg5 .gh>span{font-size:14px;font-weight:650}
#pg5 .gb{padding-top:8px}
#pg5 .gi{border:1px solid rgba(255,255,255,.09);border-radius:18px;background:rgba(255,255,255,.045);padding:12px}
#pg5 .gp{padding:0!important}
#pg5 .settings-footer{padding:16px 4px 4px;text-align:center;font-size:11px;line-height:1.7;color:rgba(255,255,255,.38)}
@media(prefers-reduced-motion:reduce){#pg5.settings-page:not(.hide){animation:none}}
`;
  d.head.appendChild(style);

  var header=d.createElement('div');
  header.className='settings-page-header';
  header.innerHTML='<button class="settings-back" type="button" aria-label="返回"><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6M9 12h11"/></svg></button><div class="settings-heading"><b>设置</b><span>YIU.FM · PREFERENCES</span></div><div class="settings-brand">Yiu.fm</div>';
  page.insertBefore(header,page.firstChild);

  var box=page.querySelector('.pm-box');
  var hero=d.createElement('section');
  hero.className='settings-hero';
  hero.innerHTML='<strong>让 Yiu.fm 按你的习惯运行</strong><p>管理界面体验、性能表现与实验功能。设置会沿用当前保存方式，不会重置已有配置。</p>';
  box.insertBefore(hero,box.firstChild);

  var nav=d.createElement('nav');
  nav.className='settings-nav';
  nav.setAttribute('aria-label','设置分类');
  nav.innerHTML='<button type="button" data-target="general">通用</button><button type="button" data-target="betaBox">Beta 测试</button><button type="button" data-target="devOptionsHolder">开发者</button>';
  box.insertBefore(nav,hero.nextSibling);

  var footer=d.createElement('div');
  footer.className='settings-footer';
  footer.textContent='Yiu.fm 2.0 · 设置保存在本机';
  box.appendChild(footer);

  var general=box.querySelector('.grp:not(#betaBox)');
  if(general)general.id='yiuGeneralSettings';

  function open(){
    page.classList.remove('hide','leave','go');
    page.setAttribute('aria-hidden','false');
    d.body.classList.add('yiu-settings-open');
    page.scrollTop=0;
    if(general&&!general.classList.contains('open')){
      var toggle=general.querySelector('.gh');
      if(toggle)toggle.click();
    }
  }
  function close(){
    page.classList.add('hide');
    page.setAttribute('aria-hidden','true');
    d.body.classList.remove('yiu-settings-open');
  }
  var launcher=d.createElement('button');
  launcher.type='button';launcher.id='yiuSettingsLauncher';
  launcher.setAttribute('aria-label','打开设置');launcher.setAttribute('aria-haspopup','dialog');
  launcher.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.1a3.9 3.9 0 1 0 0 7.8 3.9 3.9 0 0 0 0-7.8Z"/><path d="m19.4 13.5 1.1.8-1.1 2-1.3-.5a7.8 7.8 0 0 1-1.4.8l-.2 1.4h-2.3l-.3-1.4a7.8 7.8 0 0 1-1.5-.1l-.9 1.1-2-1.1.4-1.4a7.7 7.7 0 0 1-1-1.2l-1.4.1-.8-2.2 1.2-.8a7.7 7.7 0 0 1 .1-1.6L6.9 8.5 8 6.6l1.4.4a7.8 7.8 0 0 1 1.3-.9l.1-1.4H13l.4 1.4a7.8 7.8 0 0 1 1.5.2l.9-1.1 2 1.2-.4 1.3a7.7 7.7 0 0 1 1 1.3l1.4-.1.8 2.2-1.2.8a7.7 7.7 0 0 1 0 1.6Z"/></svg>';
  d.body.appendChild(launcher);
  launcher.addEventListener('click',open);
  header.querySelector('.settings-back').addEventListener('click',close);
  nav.addEventListener('click',function(e){
    var b=e.target.closest('button[data-target]');if(!b)return;
    var id=b.getAttribute('data-target'),target=id==='general'?general:d.getElementById(id);
    if(target){target.scrollIntoView({behavior:'smooth',block:'start'});}
  });
  d.addEventListener('keydown',function(e){if(e.key==='Escape'&&!page.classList.contains('hide'))close();});
  return true;
}
if(!mount()){
  var timer=w.setInterval(function(){if(mount()||++attempts>=80)w.clearInterval(timer);},100);
}
})(window,document);
