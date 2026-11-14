// app/cmd-console.js — 命令窗口（JS 控制台 + 自定义命令）
// 用法：
//   以 / 开头 → 命令：/help  /state  /style 星空  /dev fps on  /uispd 1.5
//   其它输入 → 当作 JavaScript 在全局执行，支持 await；$_ 是上一次的结果
//   __openCmdConsole()  /  Ctrl|Cmd + Shift + K  /  设置 → 开发者选项 → 命令窗口
//   点输出里的「> 命令」可放回输入框；标题栏往下拖收起；「⋯」里可调字号 / 多行输入 / 同步 console
//   自己加命令：
//     CmdConsole.register('hi', { group:'其他', desc:'打招呼', usage:'/hi [名字]',
//       run:function(args, ctx){ return 'hi ' + (args[0] || '') } })
(function () {
  'use strict';
  if (window.__cmdConsoleInstalled) return;
  window.__cmdConsoleInstalled = true;

  var $id = function (id) { return document.getElementById(id); };
  function lsGet(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (_) {} }

  /* 读全局名字（core.js 里的 var / function 都挂在 window 上；let / const 用间接 eval 兜底） */
  function g(name) {
    if (name in window) return window[name];
    try { return (0, eval)(name); } catch (_) { return undefined; }
  }

  /* ============================== 输出格式化 ============================== */
  function short(s, n) { s = String(s); return s.length > n ? s.slice(0, n) + '…(+' + (s.length - n) + ')' : s; }
  function elTag(el) {
    var s = '<' + el.nodeName.toLowerCase();
    if (el.id) s += '#' + el.id;
    if (el.classList && el.classList.length) s += '.' + Array.prototype.join.call(el.classList, '.');
    return s + '>';
  }
  function wrap(open, items, close, d) {
    var one = open + ' ' + items.join(', ') + ' ' + close;
    if (one.length <= 80 && one.indexOf('\n') < 0) return one;
    var pad = new Array(d + 2).join('  '), padc = new Array(d + 1).join('  ');
    return open + '\n' + items.map(function (s) { return pad + s; }).join(',\n') + '\n' + padc + close;
  }
  function fmt(v, d, seen) {
    d = d || 0; seen = seen || [];
    var t = typeof v;
    if (v === null) return 'null';
    if (t === 'undefined') return 'undefined';
    if (t === 'string') return d ? JSON.stringify(short(v, 200)) : v;
    if (t === 'number' || t === 'boolean') return String(v);
    if (t === 'bigint') return v + 'n';
    if (t === 'symbol') return v.toString();
    if (t === 'function') {
      var m = /^[^{=]*?\(([^)]*)\)/.exec(Function.prototype.toString.call(v));
      return 'ƒ ' + (v.name || 'anonymous') + '(' + (m ? m[1] : '') + ')';
    }
    if (v instanceof Error) return v.stack ? v.stack.split('\n').slice(0, 4).join('\n') : v.name + ': ' + v.message;
    if (v instanceof Date) return isNaN(v) ? 'Invalid Date' : 'Date ' + v.toISOString();
    if (v instanceof RegExp) return String(v);
    if (typeof Promise !== 'undefined' && v instanceof Promise) return 'Promise {…}';
    if (v === window) return '[Window]';
    if (v.nodeType === 1) return elTag(v);
    if (v.nodeType === 3) return '#text ' + JSON.stringify(short(v.data, 60));
    if (v.nodeType === 9) return '#document';
    if (seen.indexOf(v) >= 0) return '[Circular]';
    var isArr = Array.isArray(v);
    var isList = !isArr && typeof v.length === 'number' && typeof v.item === 'function';
    var isMap = v instanceof Map, isSet = v instanceof Set;
    if (d >= 3) return isArr ? 'Array(' + v.length + ')' : isList ? 'NodeList(' + v.length + ')' : isMap ? 'Map(' + v.size + ')' : isSet ? 'Set(' + v.size + ')' : '{…}';
    seen = seen.concat([v]);
    var items = [], i, MAX = 40;
    if (isArr || isList) {
      var n = v.length;
      for (i = 0; i < Math.min(n, MAX); i++) items.push(fmt(v[i], d + 1, seen));
      if (n > MAX) items.push('…(+' + (n - MAX) + ')');
      return (isArr ? '' : 'NodeList(' + n + ') ') + (n ? wrap('[', items, ']', d) : '[]');
    }
    if (isSet) {
      v.forEach(function (x) { if (items.length < MAX) items.push(fmt(x, d + 1, seen)); });
      return 'Set(' + v.size + ') ' + (items.length ? wrap('{', items, '}', d) : '{}');
    }
    if (isMap) {
      v.forEach(function (x, k) { if (items.length < MAX) items.push(fmt(k, d + 1, seen) + ' => ' + fmt(x, d + 1, seen)); });
      return 'Map(' + v.size + ') ' + (items.length ? wrap('{', items, '}', d) : '{}');
    }
    if (ArrayBuffer.isView(v)) return v.constructor.name + '(' + v.length + ')';
    var keys = [];
    try { keys = Object.keys(v); } catch (_) {}
    for (i = 0; i < Math.min(keys.length, MAX); i++) {
      var k = keys[i], val;
      try { val = fmt(v[k], d + 1, seen); } catch (e) { val = '[读取失败]'; }
      items.push((/^[\w$]+$/.test(k) ? k : JSON.stringify(k)) + ': ' + val);
    }
    if (keys.length > MAX) items.push('…(+' + (keys.length - MAX) + ')');
    var cn = v.constructor && v.constructor.name;
    var head = (cn && cn !== 'Object') ? cn + ' ' : '';
    return head + (items.length ? wrap('{', items, '}', d) : '{}');
  }
  function fmtTop(x) { var s = fmt(x); return s.length > 20000 ? s.slice(0, 20000) + '\n…(已截断)' : s; }
  function preview(v) {
    var t = typeof v;
    if (v === null || t === 'undefined' || t === 'number' || t === 'boolean') return String(v);
    if (t === 'string') return short(JSON.stringify(v), 40);
    if (Array.isArray(v)) return 'Array(' + v.length + ')';
    if (v && v.nodeType === 1) return elTag(v);
    return '{…}';
  }

  /* ============================== 命令注册表 ============================== */
  var cmds = {}, alias = {};
  function register(name, def) {
    name = String(name).toLowerCase();
    def = def || {};
    def.name = name;
    cmds[name] = def;
    (def.alias || []).forEach(function (a) { alias[String(a).toLowerCase()] = name; });
  }
  function tokenize(s) {
    var out = [], re = /"([^"]*)"|'([^']*)'|(\S+)/g, m;
    while ((m = re.exec(s))) out.push(m[1] !== undefined ? m[1] : m[2] !== undefined ? m[2] : m[3]);
    return out;
  }

  /* /goto /prev /style /theme 默认直接调播放器和渲染器。
     /bind 仍可改成别的全局函数（存在 localStorage 的 cmd_bind），用来临时替换。 */
  var BINDABLE = { goto: '跳到第 n 句（传入从 0 开始的下标）', prev: '上一句', style: '切换文字动画风格（传入风格 key）', theme: '切换主题（传入主题下标）' };
  var binds = {};
  try { binds = JSON.parse(lsGet('cmd_bind') || '{}') || {}; } catch (_) { binds = {}; }
  function callBound(what, args) {
    var fn = binds[what];
    if (!fn) return null;
    if (typeof window[fn] !== 'function') { throw new Error('绑定的函数 ' + fn + ' 不存在，/bind -d ' + what + ' 可解除'); }
    return { name: fn, value: window[fn].apply(window, args) };
  }

  /* ============================== 界面 ============================== */
  var CSS = `
#cmRoot{--cm-fs:13px;--cm-ac:#8fb0ff;--cm-line:rgba(140,160,230,.48);--cm-sub:rgba(255,255,255,.58);--cm-pill:rgba(255,255,255,.14);
  position:fixed;inset:0;z-index:2147482400;visibility:hidden;pointer-events:none;color:#f5f5f7;
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","PingFang SC","Noto Sans SC",system-ui,sans-serif;
  --cm-dur:280ms;transition:visibility 0s linear calc(.3s/var(--ui-spd,1)),height var(--cm-dur) cubic-bezier(.32,.72,0,1)}
#cmRoot.show{visibility:visible;pointer-events:auto;transition:visibility 0s,height var(--cm-dur) cubic-bezier(.32,.72,0,1)}
#cmRoot,#cmRoot .cm-mask,#cmRoot .cm-panel{touch-action:none}
#cmRoot .cm-out,#cmRoot .cm-input{touch-action:pan-y}
#cmRoot .cm-sug{touch-action:pan-x}
html.cm-open,html.cm-open body{overscroll-behavior:none}
#cmRoot .cm-mask{position:fixed;inset:0 0 -420px 0;background:rgba(0,0,0,.3);opacity:0;transition:opacity calc(.28s/var(--ui-spd,1)) ease}
#cmRoot.show .cm-mask{opacity:1}

/* card 是整屏透明层（键盘避让、下滑关闭都作用在它上面），真正的面板是里面的 cm-panel */
#cmRoot .cm-card{position:absolute;left:0;right:0;top:0;bottom:0;max-width:640px;margin:0 auto;pointer-events:none;display:flex;flex-direction:column;
  transform:translateY(24px) scale(.985);
  transition:transform calc(.38s/var(--ui-spd,1)) cubic-bezier(.32,.72,0,1)}
#cmRoot.show .cm-card{transform:none}
#cmRoot .cm-panel{opacity:0}
#cmRoot.show .cm-panel{opacity:1}
#cmRoot .cm-panel{pointer-events:auto;flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden;
  margin:calc(env(safe-area-inset-top,0px) + 52px) 16px calc(env(safe-area-inset-bottom,0px) + 18px);border-radius:34px;
  background:var(--p-bg,rgba(30,30,34,.72));-webkit-backdrop-filter:var(--g-blur,blur(23px)) saturate(1.3);backdrop-filter:var(--g-blur,blur(23px)) saturate(1.3);
  box-shadow:0 18px 60px rgba(0,0,0,.42);transition:margin var(--cm-dur) cubic-bezier(.32,.72,0,1),opacity calc(.25s/var(--ui-spd,1)) ease,box-shadow .25s ease}
#cmRoot.kb .cm-panel{margin:calc(env(safe-area-inset-top,0px) + 8px) 10px 8px}
#cmRoot.rz .cm-panel{box-shadow:none;transition:margin var(--cm-dur) cubic-bezier(.32,.72,0,1),opacity calc(.25s/var(--ui-spd,1)) ease,box-shadow 0s}
#cmRoot.kb .cm-head{padding:10px 12px 8px 18px}
#cmRoot.kb .cm-title{font-size:18px}
#cmRoot.kb .cm-sub{display:none}
#cmRoot.kb .cm-ico{height:32px;width:32px;min-width:32px}
#cmRoot.kb .cm-sug.quiet{display:none}
body.performance-mode #cmRoot .cm-panel{-webkit-backdrop-filter:none;backdrop-filter:none;background:rgba(30,30,34,.96)}

#cmRoot .cm-head{flex:none;display:flex;align-items:center;gap:7px;padding:16px 16px 14px 22px;touch-action:none;-webkit-user-select:none;user-select:none}
#cmRoot .cm-ttl{flex:1;min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:3px;white-space:nowrap;overflow:hidden}
#cmRoot .cm-title{font-size:22px;line-height:1.1;font-weight:800;letter-spacing:.3px}
#cmRoot .cm-sub{font-size:12px;font-weight:500;color:var(--cm-sub);overflow:hidden;text-overflow:ellipsis;transition:color .2s}
#cmRoot.busy .cm-sub{color:#ffd60a}
#cmRoot .cm-btn{flex:none;height:36px;min-width:36px;padding:0 14px;border:none;border-radius:18px;background:var(--cm-pill);
  color:#f5f5f7;font:inherit;font-size:14px;font-weight:600;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:background .15s,scale .18s ease}
#cmRoot .cm-btn:active{background:rgba(255,255,255,.28);scale:.94}
#cmRoot .cm-ico{display:flex;align-items:center;justify-content:center;width:36px;padding:0}
#cmRoot .cm-ico svg{width:18px;height:18px;display:block}
#cmRoot .cm-ico.x{background:rgba(255,255,255,.2)}

#cmRoot .cm-set{flex:none;display:grid;grid-template-rows:0fr;transition:grid-template-rows calc(.25s/var(--ui-spd,1)) ease}
#cmRoot .cm-set.open{grid-template-rows:1fr}
#cmRoot .cm-set-in{min-height:0;overflow:hidden;display:flex;flex-wrap:wrap;align-items:center;gap:10px 20px;padding:0 22px;visibility:hidden;font-size:14px;color:var(--cm-sub)}
#cmRoot .cm-set.open .cm-set-in{padding:0 22px 14px;visibility:visible}
#cmRoot .cm-opt{display:flex;align-items:center;gap:10px}
#cmRoot .cm-opt b{min-width:24px;text-align:center;font-weight:700;color:#f5f5f7}
#cmRoot .cm-sw{flex:none;position:relative;width:46px;height:28px;padding:0;border:none;border-radius:14px;background:rgba(255,255,255,.2);
  cursor:pointer;-webkit-tap-highlight-color:transparent;transition:background .2s}
#cmRoot .cm-sw::after{content:"";position:absolute;top:2px;left:2px;width:24px;height:24px;border-radius:50%;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,.3);transition:transform .2s}
#cmRoot .cm-sw[aria-checked="true"]{background:#5470c9}
#cmRoot .cm-sw[aria-checked="true"]::after{transform:translateX(18px)}

/* 输出区：和更新日志里的内容卡一样，细描边 + 大圆角 */
#cmRoot .cm-outwrap{position:relative;flex:1;min-height:0;margin:0 14px;border-radius:26px;border:1.5px solid var(--cm-line);background:rgba(255,255,255,.04);overflow:hidden}
#cmRoot .cm-out{position:absolute;inset:0;overflow-y:auto;overscroll-behavior:contain;padding:14px 16px;
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"PingFang SC","Noto Sans Mono CJK SC",monospace;
  scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.3) transparent;-webkit-user-select:text;user-select:text;-webkit-overflow-scrolling:touch}
#cmRoot .cm-out::-webkit-scrollbar{width:5px}
#cmRoot .cm-out::-webkit-scrollbar-thumb{background:rgba(255,255,255,.28);border-radius:3px}
#cmRoot .cm-jump{position:absolute;right:12px;bottom:12px;height:34px;padding:0 15px;border:none;border-radius:17px;
  background:#5470c9;color:#fff;font:inherit;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.4);-webkit-tap-highlight-color:transparent}
#cmRoot .cm-jump[hidden]{display:none}

#cmRoot .cm-ln{font-size:var(--cm-fs);line-height:1.6;white-space:pre-wrap;word-break:break-word;padding:1px 2px}
#cmRoot .cm-ln+.cm-ln{margin-top:1px}
#cmRoot .cm-tx{display:block}
#cmRoot .cm-tx.fold{max-height:calc(var(--cm-fs)*1.6*8);overflow:hidden;
  -webkit-mask-image:linear-gradient(#000 62%,transparent);mask-image:linear-gradient(#000 62%,transparent)}
#cmRoot .cm-more{display:block;margin-top:6px;height:30px;padding:0 14px;border:none;border-radius:15px;background:rgba(143,176,255,.2);
  color:#c3d6ff;font-family:-apple-system,"PingFang SC",system-ui,sans-serif;font-size:13px;font-weight:600;cursor:pointer;-webkit-tap-highlight-color:transparent}
#cmRoot .cm-more:active{background:rgba(143,176,255,.4)}
#cmRoot .cm-in{margin-top:12px;padding:7px 12px;border-radius:15px;background:rgba(143,176,255,.14);color:#c3d6ff;font-weight:700;
  cursor:pointer;-webkit-tap-highlight-color:transparent}
#cmRoot .cm-in:first-child{margin-top:0}
#cmRoot .cm-in:active{background:rgba(143,176,255,.28)}
#cmRoot .cm-in+.cm-ln{margin-top:7px}
#cmRoot .cm-out-k{color:#f5f5f7}
#cmRoot .cm-info{color:var(--cm-sub)}
#cmRoot .cm-ok{color:#4cd98a}
#cmRoot .cm-log{color:#78d6ff}
#cmRoot .cm-err,#cmRoot .cm-warn{margin:3px 0;padding:5px 11px;border-radius:5px 14px 14px 5px}
#cmRoot .cm-err{color:#ff9a90;background:rgba(255,69,58,.13);box-shadow:inset 3px 0 0 #ff453a}
#cmRoot .cm-warn{color:#ffe27a;background:rgba(255,214,10,.1);box-shadow:inset 3px 0 0 #ffd60a}
/* 分组标签 + 彩色圆点列表（/help 用），配色同更新日志里的「新功能 / 优化」 */
#cmRoot .cm-tg0,#cmRoot .cm-tg1,#cmRoot .cm-tg2,#cmRoot .cm-tg3{width:fit-content;margin:14px 0 6px;padding:5px 16px;border-radius:999px;font-family:-apple-system,"PingFang SC",system-ui,sans-serif;font-size:14px;font-weight:800}
#cmRoot .cm-tg0:first-child,#cmRoot .cm-tg1:first-child,#cmRoot .cm-tg2:first-child,#cmRoot .cm-tg3:first-child{margin-top:0}
#cmRoot .cm-tg0{background:rgba(88,150,104,.55);color:#b6f0c4}
#cmRoot .cm-tg1{background:rgba(95,125,185,.55);color:#c3d6ff}
#cmRoot .cm-tg2{background:rgba(190,130,60,.5);color:#ffd9a8}
#cmRoot .cm-tg3{background:rgba(180,90,130,.5);color:#ffc2dc}
#cmRoot .cm-li0,#cmRoot .cm-li1,#cmRoot .cm-li2,#cmRoot .cm-li3{position:relative;padding:3px 2px 3px 24px;margin-top:3px}
#cmRoot .cm-li0::before,#cmRoot .cm-li1::before,#cmRoot .cm-li2::before,#cmRoot .cm-li3::before{content:"";position:absolute;left:5px;top:.82em;width:9px;height:9px;border-radius:50%}
#cmRoot .cm-li0::before{background:#6fcf8a}
#cmRoot .cm-li1::before{background:#6aa8f0}
#cmRoot .cm-li2::before{background:#f0a850}
#cmRoot .cm-li3::before{background:#f07ab0}
#cmRoot .t-s{color:#8ee0b0}
#cmRoot .t-n{color:#d2b0ff}
#cmRoot .t-k{color:#ff9ecb}
#cmRoot .t-p{color:#9fbcff}
#cmRoot .cm-x{display:inline-block;margin-left:8px;padding:0 8px;border-radius:10px;background:rgba(255,255,255,.2);color:#fff;font-size:.85em;line-height:1.5}
#cmRoot .cm-dots{display:inline-flex;gap:3px;vertical-align:-1px;margin-right:6px}
#cmRoot .cm-dots i{width:11px;height:11px;border-radius:50%;display:block}

#cmRoot .cm-sug{flex:none;display:flex;gap:7px;padding:9px 12px 0;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}
#cmRoot .cm-sug::-webkit-scrollbar{display:none}
#cmRoot .cm-sug:empty{display:none}
#cmRoot .cm-chip{flex:none;height:32px;padding:0 14px;border:none;border-radius:16px;background:rgba(255,255,255,.12);
  color:#dbe5ff;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"PingFang SC",monospace;font-size:13px;cursor:pointer;-webkit-tap-highlight-color:transparent;white-space:nowrap;transition:background .15s,scale .18s ease}
#cmRoot .cm-chip:active{background:rgba(143,176,255,.5);scale:.95}
#cmRoot .cm-chip.rc{color:#aeb2c8}

#cmRoot .cm-bar{flex:none;display:flex;align-items:flex-end;gap:6px;padding:8px 12px 10px}
#cmRoot .cm-mirror{position:fixed;left:-9999px;top:0;visibility:hidden;pointer-events:none;white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere;box-sizing:border-box;
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"PingFang SC",monospace;font-size:16px;line-height:20px}
#cmRoot{color-scheme:dark}
#cmRoot input,#cmRoot textarea{color-scheme:dark}
#cmRoot .cm-field{flex:1;min-width:0;display:flex;align-items:flex-start;border-radius:18px;background:rgba(255,255,255,.12);transition:background .15s,box-shadow .15s}
#cmRoot .cm-field:focus-within{background:rgba(255,255,255,.16);box-shadow:inset 0 0 0 1.5px var(--cm-line)}
#cmRoot .cm-prompt{flex:none;width:28px;height:36px;text-align:right;padding-right:4px;box-sizing:border-box;color:var(--cm-ac);font:800 15px/36px ui-monospace,Menlo,monospace}
/* 应用的 style.css 里有全局 textarea{min-height:120px;field-sizing:content;width:100%}，这里必须明确盖掉，否则输入框会被撑到 120px 以上 */
#cmRoot .cm-input{flex:1;width:auto;min-width:0;min-height:0!important;field-sizing:fixed!important;margin:0;height:36px;max-height:76px;padding:8px 12px 8px 0;border:none;overflow-y:auto;border-radius:0 18px 18px 0;resize:none;
  background:transparent;color:#f5f5f7;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"PingFang SC",monospace;font-size:16px;line-height:20px;outline:none;box-sizing:border-box}
#cmRoot .cm-input::placeholder{color:rgba(255,255,255,.38)}
#cmRoot .cm-hist{flex:none;display:flex;height:36px;border-radius:18px;overflow:hidden;background:rgba(255,255,255,.12)}
#cmRoot .cm-hbtn{width:28px;height:36px;padding:0;border:none;background:transparent;color:#dbe5ff;font:inherit;font-size:16px;cursor:pointer;-webkit-tap-highlight-color:transparent}
#cmRoot .cm-hbtn+.cm-hbtn{box-shadow:inset 1px 0 0 rgba(255,255,255,.1)}
#cmRoot .cm-hbtn:active{background:rgba(255,255,255,.22)}
#cmRoot .cm-run{flex:none;height:36px;min-width:56px;padding:0 13px;border:none;border-radius:18px;background:#5470c9;color:#fff;
  font:inherit;font-size:15px;font-weight:800;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:background .15s,scale .18s ease}
#cmRoot .cm-run:active{background:#6683dc;scale:.96}
#cmRoot.busy .cm-run{background:#d9534a}
#cmRoot button:focus-visible{outline:2px solid var(--cm-ac);outline-offset:1px}
@media (prefers-reduced-motion:reduce){#cmRoot *,#cmRoot{transition-duration:0s!important;animation:none!important}}

/* ---- 自带键盘（APP/cmd-keyboard.js）---- */
#cmRoot{--kb-dur:160ms}
#cmRoot .cm-kbsw{display:none;flex:none;width:36px;height:36px;padding:0;border:none;border-radius:0 18px 18px 0;background:transparent;color:var(--cm-sub);cursor:pointer;-webkit-tap-highlight-color:transparent}
#cmRoot.kbx .cm-kbsw{display:flex;align-items:center;justify-content:center}
#cmRoot .cm-kbsw:active{background:rgba(255,255,255,.12);color:#fff}
#cmRoot .cm-kbsw svg{width:19px;height:19px;display:block}
#cmRoot.custkb .cm-panel{margin-bottom:0;transition:margin var(--kb-dur) cubic-bezier(.32,.72,0,1),border-radius var(--kb-dur) cubic-bezier(.32,.72,0,1),opacity calc(.25s/var(--ui-spd,1)) ease,box-shadow .25s ease}
#cmRoot.custkb.rz .cm-panel{box-shadow:none;transition:margin var(--kb-dur) cubic-bezier(.32,.72,0,1),border-radius var(--kb-dur) cubic-bezier(.32,.72,0,1),opacity calc(.25s/var(--ui-spd,1)) ease,box-shadow 0s}
#cmRoot.custkb.kbo .cm-panel{margin:calc(env(safe-area-inset-top,0px) + 8px) 10px 8px}   /* 和系统键盘模式一样：悬浮卡片，左右留边，底下留空隙 */
#cmRoot.kbo .cm-head{padding:10px 12px 8px 18px}
#cmRoot.kbo .cm-title{font-size:18px}
#cmRoot.kbo .cm-sub{display:none}
#cmRoot.kbo .cm-ico{height:32px;width:32px;min-width:32px}
#cmRoot.kbo .cm-sug.quiet{display:none}
#cmRoot.kbnt #cmKb,#cmRoot.kbnt #cmKb .kb-in,#cmRoot.kbnt .cm-panel{transition:none!important}
#cmKb{display:none;flex:none;position:relative;overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;
  /* 和命令窗口同一套磨砂玻璃：同一个 --p-bg / --g-blur，按键用 --cm-pill，描边用 --cm-line，强调色 --cm-ac / #5470c9 */
  --kg-glass:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,0) 45%),var(--p-bg,rgba(30,30,34,.72));--kg-blur:var(--g-blur,blur(23px)) saturate(1.3);
  --kg-key:var(--cm-pill);--kg-fn:rgba(255,255,255,.08);--kg-fg:#f5f5f7;--kg-dn:rgba(255,255,255,.3);--kg-edge:rgba(255,255,255,.1);
  --kg-on:var(--cm-ac);--kg-onfg:#12182b;--kg-pop:rgba(72,74,88,.98);
  opacity:0;height:calc(env(safe-area-inset-bottom,0px) + 10px);transition:height var(--kb-dur) cubic-bezier(.32,.72,0,1),opacity calc(.28s/var(--ui-spd,1)) ease}
#cmRoot.custkb #cmKb{display:block}
#cmRoot.show #cmKb{pointer-events:auto;opacity:1}
#cmRoot.cm-off #cmKb{display:none!important}   /* 窗口完全关掉之后，键盘整块拿掉，不留在屏幕上 */   /* 窗口关着（根节点 pointer-events:none / visibility:hidden）时键盘不能拦触摸 */
#cmKb.open{height:var(--kb-h,300px)}
#cmKb .kb-in{position:absolute;left:0;right:0;bottom:0;height:var(--kb-h,370px);box-sizing:border-box;display:flex;flex-direction:column;
  transform:translateY(100%);transition:transform var(--kb-dur) cubic-bezier(.32,.72,0,1)}
#cmKb.open .kb-in{transform:none}
/* 符号胶囊：玻璃胶囊 + 和输入框一样的细描边，悬浮在键盘本体上方 */
#cmKb .kb-bar{flex:none;display:flex;height:46px;margin:8px 16px 10px;padding:0 6px;border-radius:23px;box-sizing:border-box;background:var(--kg-glass);-webkit-backdrop-filter:var(--kg-blur);backdrop-filter:var(--kg-blur);
  border:1.5px solid var(--cm-line);box-shadow:0 8px 24px rgba(0,0,0,.28)}
/* 键盘本体：和窗口一样的磨砂玻璃，顶部大圆角，高度可自定义（dev_kb_h） */
#cmKb .kb-body{flex:1 1 0;min-height:0;box-sizing:border-box;display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(0,1fr);padding:18px 7px 6px;background:var(--kg-glass);-webkit-backdrop-filter:var(--kg-blur);backdrop-filter:var(--kg-blur);
  border-radius:34px 34px 44px 44px;box-shadow:inset 0 1px 0 var(--kg-edge),0 -12px 40px rgba(0,0,0,.3)}
body.performance-mode #cmKb .kb-body,body.performance-mode #cmKb .kb-bar{-webkit-backdrop-filter:none;backdrop-filter:none;background:rgba(30,30,34,.96)}
/* 字母层 / 123 层叠在同一格：旧层的行快速向一侧淡出，新层的行从另一侧一行一行弹入（带一点回弹） */
#cmKb .kb-l{grid-area:1/1;min-height:0;display:flex;flex-direction:column;gap:11px;visibility:hidden;pointer-events:none;transition:visibility 0s .18s}
#cmKb .kb-l .kb-r{opacity:0;transition:opacity .14s ease,transform .18s ease}
#cmKb .kb-l.abc .kb-r{transform:translateX(-24px) scale(.97)}
#cmKb .kb-l.num .kb-r{transform:translateX(24px) scale(.97)}
#cmKb[data-l="abc"] .kb-l.abc,#cmKb[data-l="num"] .kb-l.num{visibility:inherit;pointer-events:inherit;transition:visibility 0s}
#cmKb[data-l="abc"] .kb-l.abc .kb-r,#cmKb[data-l="num"] .kb-l.num .kb-r{opacity:1;transform:none;
  transition:opacity .22s ease calc(var(--ri,0)*26ms + 30ms),transform .5s cubic-bezier(.22,1.12,.36,1) calc(var(--ri,0)*26ms + 30ms)}
#cmKb .kb-r{flex:1 1 0;min-height:0;max-height:58px;display:flex;gap:6px}
#cmKb .kb-r.kb-gr{flex:none;height:40px;max-height:40px;margin:-3px 0 4px;padding:0 26px}
#cmKb .kb-k{flex:1 1 0;min-width:0;padding:0;border:none;border-radius:12px;background:var(--kg-key);color:var(--kg-fg);
  font:500 25px/1 -apple-system,BlinkMacSystemFont,"SF Pro Text","PingFang SC",system-ui,sans-serif;display:flex;align-items:center;justify-content:center;
  -webkit-tap-highlight-color:transparent;touch-action:none;cursor:pointer;transition:background .12s,scale .14s ease}
#cmKb .kb-k.fn{background:var(--kg-fn);font-size:16px;font-weight:600}
#cmKb .kb-k.mr{margin-right:7px}
#cmKb .kb-k.ml{margin-left:7px}
/* ← →：和窗口里的 .cm-btn 一样的圆角药丸，离屏幕边缘留出距离 */
#cmKb .kb-k.gl{flex:0 0 54px!important;height:36px;align-self:center;border-radius:18px;background:var(--kg-key)}
#cmKb .kb-k.gl svg{width:20px;height:20px;stroke-width:2.4}
#cmKb .kb-bar .kb-k{background:transparent;border-radius:18px;font:600 17px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
#cmKb .kb-bar .kb-k.fn{font-size:15px}
#cmKb .kb-k.dn,#cmKb .kb-bar .kb-k.dn{background:var(--kg-dn);scale:.95}
#cmKb .kb-k.en{background:#5470c9;color:#fff}
#cmKb .kb-k.en.dn{background:#7189dc}
#cmKb .kb-k.on{background:var(--kg-on);color:var(--kg-onfg)}
#cmKb .kb-k svg{width:24px;height:24px;display:block;pointer-events:none}
#cmKb .kb-sp{flex:.5 1 0;pointer-events:none}
#cmKb .kb-pop{position:absolute;z-index:6;display:none;align-items:center;justify-content:center;box-sizing:border-box;pointer-events:none;border-radius:16px;background:var(--kg-pop);color:var(--kg-fg);
  border:1.5px solid var(--cm-line);box-shadow:0 8px 24px rgba(0,0,0,.4);font:500 36px/1 -apple-system,BlinkMacSystemFont,"SF Pro Text","PingFang SC",system-ui,sans-serif}
#cmKb .kb-pop.on{display:flex}
#cmKb .kb-ll{display:none}
#cmKb.land .kb-ll{display:flex}
#cmKb.land .kb-pl{display:none}
/* 横屏：胶囊更矮，不要 ← → 那一行（已放进胶囊），键高约 36px，不占半屏 */
#cmKb.land .kb-bar{height:32px;margin:4px 8px 5px;border-radius:16px}
#cmKb.land .kb-body{padding-top:8px;padding-bottom:4px;border-radius:22px 22px 0 0}
#cmKb.land .kb-l{gap:4px}
#cmKb.land .kb-r{max-height:42px;gap:4px}
#cmKb.land .kb-r.kb-gr{display:none}
#cmKb.land .kb-k{font-size:18px;border-radius:8px}
#cmKb.land .kb-bar .kb-k{font-size:15px}
#cmKb.land .kb-k svg{width:19px;height:19px}

/* ---- 浅色模式（设置里的开关，#cmRoot.lt）：灰白磨砂玻璃 + 白字，窗口和键盘一起变；深色是默认，不受影响 ---- */
#cmRoot.lt{--p-bg:rgba(214,217,228,.26);--g-blur:blur(36px) brightness(1.2);--cm-pill:rgba(255,255,255,.26);--cm-sub:rgba(255,255,255,.82);--cm-line:rgba(255,255,255,.5);--cm-ac:#e4ecff}
#cmRoot.lt .cm-mask{background:rgba(255,255,255,.1)}
#cmRoot.lt .cm-panel{background:linear-gradient(180deg,rgba(255,255,255,.2),rgba(255,255,255,.05) 45%),var(--p-bg);box-shadow:0 18px 60px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.4)}
#cmRoot.lt.rz .cm-panel{box-shadow:none}
body.performance-mode #cmRoot.lt .cm-panel{background:rgba(150,152,164,.96)}
#cmRoot.lt .cm-title,#cmRoot.lt .cm-sub,#cmRoot.lt .cm-set-in{text-shadow:0 1px 3px rgba(0,0,0,.28)}
#cmRoot.lt .cm-outwrap{background:rgba(20,22,34,.22)}
#cmRoot.lt .cm-field,#cmRoot.lt .cm-hist,#cmRoot.lt .cm-chip{background:rgba(255,255,255,.2)}
#cmRoot.lt .cm-field:focus-within{background:rgba(255,255,255,.28)}
#cmRoot.lt .cm-input::placeholder{color:rgba(255,255,255,.62)}
#cmRoot.lt .cm-ico.x{background:rgba(255,255,255,.36)}
#cmRoot.lt .cm-sw{background:rgba(255,255,255,.32)}
#cmRoot.lt .cm-sw[aria-checked="true"]{background:#5470c9}
#cmRoot.lt #cmKb{--kg-glass:linear-gradient(180deg,rgba(255,255,255,.16),rgba(255,255,255,.06) 55%),var(--p-bg);--kg-key:rgba(255,255,255,.26);--kg-fn:rgba(255,255,255,.17);--kg-dn:rgba(255,255,255,.46);--kg-edge:rgba(255,255,255,.45);--kg-on:#fff;--kg-onfg:#4a5a8e;--kg-pop:rgba(170,172,186,.98)}
#cmRoot.lt #cmKb .kb-k{font-weight:700;text-shadow:0 1px 2px rgba(0,0,0,.25)}
#cmRoot.lt #cmKb .kb-k.on{text-shadow:none}
`;

  var root, card, out, input, sugEl, setEl, jumpEl, runBtn, mirrorEl, noteBaseFn = null, built = false, openState = false;
  var MAX_LINES = 600, FOLD_LINES = 14, FOLD_CHARS = 1600, MAX_TEXT = 30000;
  var hist = [], hIdx = 0, draft = '';
  try { hist = JSON.parse(lsGet('cmd_hist') || '[]') || []; } catch (_) { hist = []; }
  hIdx = hist.length;

  var fontSize = Math.max(10, Math.min(18, parseInt(lsGet('cmd_fs'), 10) || 13));
  var multi = lsGet('cmd_multi') === '1';
  var mirrorOn = lsGet('cmd_mirror') === '1';
  var lightOn = lsGet('cmd_light') === '1';                         // 浅色模式：默认关（深色）
  var hintOn = lsGet('cmd_hint') !== '0';                           // 历史提示：默认开

  function qs(sel) { return root ? root.querySelector(sel) : null; }

  /* 自带键盘（APP/cmd-keyboard.js，没加载就当没有）。customKbOn() 为 true 时，旧的「窗口避让系统键盘」逻辑全部不动 */
  var kbModule = {
    enabled: function () { var m = window.__cmKb; return !!(m && m.enabled()); },
    isVisible: function () { var m = window.__cmKb; return !!(m && m.isVisible()); },
    hide: function () { var m = window.__cmKb; if (m) m.hide(); },
    focus: function () { var m = window.__cmKb; if (m) m.focusInput(); },
    call: function (n) { var m = window.__cmKb; if (m && m[n]) m[n](); }
  };
  function customKbOn() { return kbModule.enabled(); }

  var mvT = 0, closeT = 0;
  function uiSpd() {
    var v = 1;
    try { v = parseFloat(getComputedStyle(root).getPropertyValue('--ui-spd')) || 1; } catch (_) {}
    return v > 0 ? v : 1;
  }
  /* 动画期间给 root 挂上 .mv（见 CSS），ms 之后自动摘掉 */
  function motion(ms) {
    if (!root) return;
    clearTimeout(mvT);
    root.classList.add('mv');
    mvT = setTimeout(function () { if (root) root.classList.remove('mv'); }, Math.max(0, ms) + 60);
  }
  var rzT = 0;
  function rzMotion(ms) {                                           // 窗口尺寸在动（键盘收起展开 / 校正）：期间去掉大阴影，少画一点
    if (!root) return;
    clearTimeout(rzT);
    root.classList.add('rz');
    rzT = setTimeout(function () { if (root) root.classList.remove('rz'); }, Math.max(0, ms) + 60);
  }
  /* 把键盘避让留下的内联尺寸 / 冻结 / 状态全部复位 */
  function resetLayout() {
    if (!root) return;
    root.style.top = ''; root.style.height = ''; root.style.bottom = '';
    root.classList.remove('kb');
    document.documentElement.classList.remove('cm-frozen');
    if (window.__cmResetFit) window.__cmResetFit();
  }

  function build() {
    if (built) return;
    built = true;
    var st = document.createElement('style');
    st.id = 'cmdConsoleStyle';
    st.textContent = CSS;
    document.head.appendChild(st);

    root = document.createElement('div');
    root.id = 'cmRoot';
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML =
      '<div class="cm-mask"></div>' +
      '<div class="cm-card" role="dialog" aria-modal="true" aria-label="命令窗口"><div class="cm-panel">' +
        '<div class="cm-head">' +
          '<div class="cm-ttl"><span class="cm-title">命令窗口</span><span class="cm-sub" id="cmSub"></span></div>' +
          '<button type="button" class="cm-btn cm-ico" data-act="copy" aria-label="复制全部输出"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="3"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg></button>' +
          '<button type="button" class="cm-btn cm-ico" data-act="copynew" aria-label="复制新增（上次复制之后的内容）"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="3"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/><path d="M14.5 12v5M12 14.5h5"/></svg></button>' +
          '<button type="button" class="cm-btn cm-ico" data-act="clear" aria-label="清空"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg></button>' +
          '<button type="button" class="cm-btn cm-ico" data-act="set" aria-label="设置" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></svg></button>' +
          '<button type="button" class="cm-btn cm-ico x" data-act="close" aria-label="关闭"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
        '</div>' +
        '<div class="cm-set"><div class="cm-set-in">' +
          '<div class="cm-opt"><span>字号</span><button type="button" class="cm-btn" data-act="fs-" aria-label="减小字号">A−</button><b id="cmFs"></b><button type="button" class="cm-btn" data-act="fs+" aria-label="增大字号">A+</button></div>' +
          '<div class="cm-opt"><span>浅色模式</span><button type="button" class="cm-sw" role="switch" data-act="light" aria-label="浅色模式（关闭为深色）"></button></div>' +
          '<div class="cm-opt"><span>多行输入</span><button type="button" class="cm-sw" role="switch" data-act="multi" aria-label="多行输入"></button></div>' +
          '<div class="cm-opt"><span>同步 console</span><button type="button" class="cm-sw" role="switch" data-act="mirror" aria-label="同步页面 console 输出"></button></div>' +
          '<div class="cm-opt"><span>历史提示</span><button type="button" class="cm-sw" role="switch" data-act="hint" aria-label="输入时提示用过的历史代码"></button></div>' +
          '<div class="cm-opt"><span>键盘高度</span><button type="button" class="cm-btn" data-act="kbh-" aria-label="降低键盘高度">−</button><b id="cmKbH"></b><button type="button" class="cm-btn" data-act="kbh+" aria-label="增高键盘高度">+</button><button type="button" class="cm-btn" data-act="kbh0" aria-label="键盘高度恢复自动">自动</button></div>' +
          '<div class="cm-opt"><span>自带键盘</span><button type="button" class="cm-sw" role="switch" data-act="kb" aria-label="用自带键盘代替系统键盘"></button></div>' +
        '</div></div>' +
        '<div class="cm-outwrap"><div class="cm-out" id="cmOut" role="log" aria-live="off"></div><button type="button" class="cm-jump" data-act="jump" hidden></button></div>' +
        '<div class="cm-sug" id="cmSug"></div>' +
        '<div class="cm-bar">' +
          '<div class="cm-field"><span class="cm-prompt">&gt;</span>' +
            '<textarea class="cm-input" id="cmInput" rows="1" autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false"></textarea></div>' +
          '<div class="cm-hist"><button type="button" class="cm-hbtn" data-act="hup" aria-label="上一条历史">↑</button><button type="button" class="cm-hbtn" data-act="hdown" aria-label="下一条历史">↓</button></div>' +
          '<button type="button" class="cm-run" data-act="run">执行</button>' +
        '</div>' +
      '</div></div><div class="cm-mirror" aria-hidden="true"></div>';
    document.body.appendChild(root);
    card = qs('.cm-card');
    out = qs('#cmOut');
    input = qs('#cmInput');
    sugEl = qs('#cmSug');
    setEl = qs('.cm-set');
    jumpEl = qs('.cm-jump');
    runBtn = qs('.cm-run');
    mirrorEl = qs('.cm-mirror');
    syncSet();
    syncJump();
    syncSub();

    qs('.cm-mask').addEventListener('click', function () { if (Date.now() - (window.__cmShrinkT || 0) < 700) return; close(); });
    // 点按钮时不要让输入框失焦（手机上键盘会收起）
    root.addEventListener('mousedown', function (e) { if (e.target.closest && e.target.closest('button')) e.preventDefault(); });

    // 所有「代码里让输入框聚焦」的地方（点历史条目、点命令行、执行、↑↓）都走这里：
    // 先把窗口缩到键盘上方，再用 preventScroll 聚焦，系统弹键盘时就不会把页面顶一下又落回来
    window.__cmFocus = function () { focusInput(); };
    function focusInput() {
      if (customKbOn()) { kbModule.focus(); return; }        // 自带键盘：只聚焦，不做避让
      if (!isFocused()) shrink();
      try { input.focus({ preventScroll: true }); } catch (_) { input.focus(); }
      var n = input.value.length; try { input.setSelectionRange(n, n); } catch (_) {}
    }
    var ACTS = {
      close: close, clear: clearOut, copy: copyOut, copynew: copyNew,
      set: function (b) { motion(300 / uiSpd()); b.setAttribute('aria-expanded', String(setEl.classList.toggle('open'))); },
      'fs-': function () { setFs(fontSize - 1); },
      'fs+': function () { setFs(fontSize + 1); },
      multi: function () { setMulti(!multi); },
      mirror: function () { setMirror(!mirrorOn); },
      hint: function () { setHint(!hintOn); },
      light: function () { setLight(!lightOn); },
      'kbh-': function () { var m = window.__cmKb; if (m) m.setHeight(m.bodyHeight() - 10); },
      'kbh+': function () { var m = window.__cmKb; if (m) m.setHeight(m.bodyHeight() + 10); },
      kbh0: function () { var m = window.__cmKb; if (m) m.setHeight(0); },
      kb: function () { var m = window.__cmKb; if (m) m.setFeature(!m.featureOn()); syncSet(); },
      jump: function () { out.scrollTop = out.scrollHeight; },
      run: function () { if (root.classList.contains('busy')) { if (curCancel) curCancel(); } else submit(); focusInput(); },
      hup: function () { histMove(-1); focusInput(); },
      hdown: function () { histMove(1); focusInput(); }
    };
    root.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-act]');
      if (!b || !ACTS[b.dataset.act]) return;
      ACTS[b.dataset.act](b);
    });

    // 输出区：点「> 命令」把它放回输入框；点「展开」看完整内容
    out.addEventListener('click', function (e) {
      var more = e.target.closest && e.target.closest('.cm-more');
      if (more) {
        var tx = more.parentNode.querySelector('.cm-tx');
        var open = tx.classList.toggle('fold') === false;
        more.textContent = open ? '收起' : '展开 · 共 ' + more.__nl + ' 行';
        return;
      }
      var ln = e.target.closest && e.target.closest('.cm-in');
      if (!ln || !ln.__cmd) return;
      var sel = window.getSelection && window.getSelection();
      if (sel && String(sel).length) return;                       // 正在选文字，不打断
      input.value = ln.__cmd; hIdx = hist.length;
      focusInput();
      autosize(); updateSug();
    });
    if (window.ResizeObserver) { try { new ResizeObserver(function () { keepOut(); }).observe(out); } catch (_) {} }
    var lastOutH = 0;
    out.addEventListener('scroll', function () {
      if (out.clientHeight !== lastOutH) {                         // 高度变了（键盘弹出 / 收起）：本来在底部就继续贴着底部
        lastOutH = out.clientHeight;
        if (pinned) { out.scrollTop = out.scrollHeight; return; }
      }
      pinned = out.scrollHeight - out.scrollTop - out.clientHeight < 80;
      if (pinned) unread = 0;
      syncJump();
    }, { passive: true });

    sugEl.addEventListener('click', function (e) {
      var c = e.target.closest && e.target.closest('.cm-chip');
      if (!c) return;
      if (c.dataset.run) { input.value = ''; exec(c.dataset.run); }
      else { input.value = c.dataset.fill; }
      focusInput();                                                // 先聚焦（键盘马上弹），再做排版和刷新建议条
      autosize(); updateSug();
    });

    input.addEventListener('input', function () {
      if (hIdx !== hist.length && input.value !== hist[hIdx]) hIdx = hist.length;   // 手动改过历史内容，就当新输入
      autosize(); updateSug();
    });
    input.addEventListener('keydown', function (e) {
      if (e.isComposing || e.keyCode === 229) return;          // 输入法选字时的回车不执行
      if (e.key === 'Enter') {
        // 单行模式：Enter 执行、Shift+Enter 换行；多行模式：Enter 换行；两种模式下 Ctrl/Cmd+Enter 都执行
        if (e.metaKey || e.ctrlKey || (!multi && !e.shiftKey)) { e.preventDefault(); submit(); }
        return;
      }
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'Tab') { e.preventDefault(); tabComplete(); return; }
      if (e.key === 'ArrowUp' && input.value.indexOf('\n') < 0) { e.preventDefault(); histMove(-1); return; }
      if (e.key === 'ArrowDown' && input.value.indexOf('\n') < 0) { e.preventDefault(); histMove(1); return; }
    });

    // 点输入框：自己接管这一下点击。先把窗口同步缩到键盘上方、排好版，再 focus，
    // 这样系统弹键盘时输入框已经在安全位置，不会再把整页往上顶。touchend 里 preventDefault 掉后续合成点击，避免点击落到移动后的位置上。
    var tap = null;
    input.addEventListener('touchstart', function (e) {
      var t = e.touches[0];
      tap = (e.touches.length === 1 && t) ? { x: t.clientX, y: t.clientY } : null;
    }, { passive: true });
    input.addEventListener('touchend', function (e) {
      if (customKbOn()) { tap = null; return; }
      if (!tap || isFocused()) { tap = null; return; }
      var t = e.changedTouches[0], moved = !t || Math.abs(t.clientX - tap.x) > 10 || Math.abs(t.clientY - tap.y) > 10;
      tap = null;
      if (moved || kbMode === 'follow') return;
      e.preventDefault();
      shrink();
      try { input.focus({ preventScroll: true }); } catch (_) { input.focus(); }
      var n = input.value.length; try { input.setSelectionRange(n, n); } catch (_) {}
    }, { passive: false });

    // 下滑关闭：在标题栏（按钮以外的地方）按住往下拖，松手时拖得够远 / 够快就收起
    var head = qs('.cm-head'), drag = null;
    head.addEventListener('pointerdown', function (e) {
      if (e.target.closest && e.target.closest('button')) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      drag = { y: e.clientY, t: Date.now(), dy: 0 };
      try { head.setPointerCapture(e.pointerId); } catch (_) {}
      card.style.transition = 'none';
      clearTimeout(mvT); root.classList.add('mv');
    });
    head.addEventListener('pointermove', function (e) {
      if (!drag) return;
      drag.dy = Math.max(0, e.clientY - drag.y);
      card.style.transform = 'translateY(' + drag.dy + 'px)';
    });
    function endDrag() {
      if (!drag) return;
      var dy = drag.dy, v = dy / Math.max(1, Date.now() - drag.t);
      drag = null;
      card.style.transition = '';
      motion(420 / uiSpd());
      if (dy > 110 || (dy > 40 && v > 0.6)) {
        card.style.transform = 'translateY(' + innerHeight + 'px)';
        close();
        setTimeout(function () { if (card) card.style.transform = ''; }, 420);
      } else card.style.transform = '';
    }
    head.addEventListener('pointerup', endDrag);
    head.addEventListener('pointercancel', endDrag);

    // 软键盘。两种系统行为都要兼顾：
    //  A) 页面被整体「平移」（Safari：visualViewport.offsetTop 变大，innerHeight 不变）
    //  B) 页面窗口被「压扁」（主屏幕 App / WebView：innerHeight 和可视高度一起变小，100dvh 的页面会整体往上挤）
    // 做法：1) 命令窗口始终贴合可视区域；2) 键盘弹出的瞬间把页面本身的高度冻结住，后面的界面就不会被挤得往上顶；
    //       3) 用「输入框有焦点 + 可视高度比弹键盘前矮了一大截」判断键盘，而不是比较 innerHeight（B 情况下它也会变）。
    var pinGen = 0, vv = window.visualViewport, kbRaf = 0, pinTimer = 0, baseH = 0, blurT = 0;
    function curH() { return Math.round(Math.min(window.innerHeight, vv ? vv.height : window.innerHeight)); }
    function isFocused() { return document.activeElement === input; }
    function noteBase() {
      var h = Math.round(Math.max(window.innerHeight, vv ? vv.height : 0));
      if (!isFocused() && Date.now() - blurT > 800) baseH = h;      // 键盘没出现、也不在收起动画里：记下「完整高度」
      else if (h > baseH) baseH = h;
    }
    function freeze(on) {                                           // 冻结 / 解冻页面高度
      var de = document.documentElement, fs = document.getElementById('cmFreeze');
      if (!on) { de.classList.remove('cm-frozen'); return; }
      if (!baseH) return;                                           // 还没量到完整高度（刚横竖屏切换）时不冻结，免得页面被冻成 0
      if (!fs) { fs = document.createElement('style'); fs.id = 'cmFreeze'; document.head.appendChild(fs); }
      if (fs.__h !== baseH) { fs.__h = baseH; fs.textContent = 'html.cm-frozen,html.cm-frozen body{height:' + baseH + 'px!important;min-height:' + baseH + 'px!important}'; }
      de.classList.add('cm-frozen');
    }
    var lastTop = '', lastHt = '', lastKb = null, lastH = -1;
    function numLS(k, d) { var v = parseFloat(lsGet(k)); return isNaN(v) ? d : v; }
    function cfg() {
      var mh = numLS('dev_cm_height', 360), mode = lsGet('dev_cm_mode') || 'auto';
      // 窗口高度以前只在「手动」模式生效，自动模式下改了没反应；现在只要改成了非默认值，自动模式也按它来
      return { mode: mode, up: numLS('dev_cm_up', 0), down: numLS('dev_cm_down', 250), wait: numLS('dev_cm_wait', 40), mh: mh, cap: mode === 'manual' || (lsGet('dev_cm_height') !== null && mh !== 360) };
    }
    function cfgSig() { var c = cfg(); return [c.mode, c.up, c.down, c.wait, c.mh].join('|'); }
    var lastSig = '', cfgTimer = 0;
    function kbKey() { return window.innerWidth > window.innerHeight ? 'dev_cm_kbH_l' : 'dev_cm_kbH'; }   // 横屏和竖屏的键盘高度不一样，分开记
    var kbMode = cfg().mode, kbH = numLS(kbKey(), 0), settleT = 0, expandT = 0, kbDone = false;
    function setDur(ms) { root.style.setProperty('--cm-dur', Math.max(0, ms) + 'ms'); }
    function targetH() {
      var c = cfg(), full = baseH || window.innerHeight, kk = (kbH >= full * 0.25 && kbH <= full * 0.65) ? kbH : Math.round(full * 0.47), avail = full - kk;
      return c.cap ? Math.max(180, Math.min(c.mh + 16, avail)) : Math.max(180, avail);
    }
    var lastY = 0, trackRaf = 0, trackGen = 0;
    function trackVV() {                                             // 窗口黏住可见区域（只用 transform，不触发重新排版）；页面本身不许被顶走
      if (!root || !openState || kbMode === 'follow' || !vv) return;
      var y = Math.max(0, Math.round(vv.offsetTop));
      if (y !== lastY) { root.style.transform = y ? 'translate3d(0,' + y + 'px,0)' : ''; lastY = y; }
      if (window.scrollY || window.scrollX) window.scrollTo(0, 0);
    }
    function trackSoon() { if (trackRaf || !openState) return; trackRaf = requestAnimationFrame(function () { trackRaf = 0; trackVV(); }); }
    function trackFor(ms) {
      var t0 = Date.now(), my = ++trackGen;
      (function tick() { if (my !== trackGen) return; trackVV(); if (Date.now() - t0 < ms) requestAnimationFrame(tick); })();
    }
    if (vv) { vv.addEventListener('scroll', trackSoon); vv.addEventListener('resize', trackSoon); }
    window.addEventListener('scroll', trackSoon, { passive: true });
    var kbWT = 0;
    function kbWatch() {                                             // 输入框还聚焦着，但键盘被收掉 / 又弹出来了（iPad、外接键盘、系统收键盘按钮）
      if (kbMode === 'follow' || customKbOn()) return;
      clearTimeout(kbWT);
      kbWT = setTimeout(function () {
        if (!openState || !vv || !isFocused() || Date.now() - (window.__cmShrinkT || 0) < 800) return;
        var full = baseH || window.innerHeight, h = Math.round(vv.height);
        if (lastKb === true && full - h < full * 0.12) applyMeasured(h);
        else if (lastKb === false && full - h > full * 0.2) { lastKb = null; shrink(); }
      }, 150);
    }
    if (vv) vv.addEventListener('resize', kbWatch);
    var wasLand = window.innerWidth > window.innerHeight;
    function onOrient() {                                            // 横竖屏切换：之前记的「完整高度」作废，先收起键盘再重新量
      var land = window.innerWidth > window.innerHeight;
      if (land === wasLand) return;
      wasLand = land; baseH = 0;
      kbH = numLS(kbKey(), 0);
      if (isFocused() && !customKbOn()) input.blur(); else noteBase();
    }
    window.addEventListener('resize', onOrient);
    function shrink() {
      if (customKbOn()) return false;                                              // 点输入框：窗口「瞬间」收到键盘上方
      // 关键：iOS 在 focus 的那一刻按输入框当时的位置决定要不要把页面往上顶。
      // 以前这里是 280ms 动画，那一刻输入框还在最下面（会被键盘盖住），系统就先把整页顶上去，
      // 等动画结束再落回来 —— 就是「往上顶、又弹下来」。现在在 focus 里同步一次到位，系统就没有理由去顶页面。
      var c = cfg(); kbMode = c.mode; lastSig = cfgSig();
      if (kbMode === 'follow') return false;
      if (lastKb === true && root.style.height && lastSig === cfgSig()) { clearTimeout(expandT); window.__cmShrinkT = Date.now(); return true; }   // 已经缩好（点击时先缩过一次），不重复做
      clearTimeout(expandT); clearTimeout(settleT);
      window.__cmShrinkT = Date.now();
      kbH = numLS(kbKey(), 0);
      noteBase();
      var th = targetH();
      if (c.up > 0) {                                                // 手动把 dev_cm_up 调大时，仍走带动画的旧路径
        setDur(c.up); motion(c.up);
        if (root.style.height === '') {
          var h0 = root.getBoundingClientRect().height || baseH || window.innerHeight;   // 必须先量，再去掉 bottom（否则高度会塌成 0，动画就没了）
          root.style.transition = 'none';
          root.style.top = '0px'; root.style.bottom = 'auto'; root.style.height = Math.round(h0) + 'px';
          void root.offsetHeight;
          root.style.transition = '';
          void root.offsetHeight;
        }
        root.classList.add('kb');
        root.style.height = th + 'px';
      } else {
        setDur(0);
        root.style.top = '0px'; root.style.bottom = 'auto'; root.style.height = th + 'px';
        root.classList.add('kb');
      }
      lastKb = true; lastTop = '0px'; lastHt = th + 'px';
      if (pinned && out) setTimeout(function () { if (pinned && out) out.scrollTop = out.scrollHeight; }, 0);   // 窗口变矮后继续贴底；放到后面做，别挡着键盘弹出
      settleT = setTimeout(settle, c.up + 150);
      return true;
    }
    function settle() {                                              // 键盘停稳（连续两次高度一样）后只量一次，并校验
      var n = 0, prev = -1;
      (function poll() {
        if (!isFocused() || !vv || kbMode === 'follow') return;
        var h = Math.round(vv.height), fullH = baseH || window.innerHeight;
        if (fullH - h < fullH * 0.12 && n < 5) { n++; prev = h; settleT = setTimeout(poll, 100); return; }   // 可视高度还没变小：键盘可能还没开始动，多等一会儿
        if (h === prev || ++n > 12) { applyMeasured(h); return; }
        prev = h; settleT = setTimeout(poll, 100);
      })();
    }
    function applyMeasured(h) {
      var full = baseH || window.innerHeight, kh = full - h, ok = kh >= full * 0.25 && kh <= full * 0.65;
      if (kh < full * 0.12) {                                        // 实际没有软键盘（外接键盘 / 桌面 / 键盘被收掉了）：窗口恢复满高，别一直缩着
        var c0 = cfg();
        setDur(c0.down); rzMotion(c0.down);
        root.classList.remove('kb'); lastKb = false;
        root.style.top = '0px'; root.style.height = full + 'px'; lastTop = '0px'; lastHt = full + 'px';
        return;
      }
      if (ok && Math.abs(kh - kbH) > 2) { kbH = kh; lsSet(kbKey(), String(kh)); }
      var c = cfg(), avail = ok ? h : full - ((kbH >= full * 0.25 && kbH <= full * 0.65) ? kbH : Math.round(full * 0.47));
      var th = Math.max(180, c.cap ? Math.min(c.mh + 16, avail) : avail);
      var tp = 0, cd = c.up > 0 ? c.up : 160;
      if (Math.abs(parseFloat(lastHt) - th) > 4 || tp !== parseFloat(lastTop)) {
        setDur(cd); rzMotion(cd);
        root.style.top = tp + 'px'; root.style.height = th + 'px'; lastTop = tp + 'px'; lastHt = th + 'px';
      }
      if (pinned && out) setTimeout(function () { out.scrollTop = out.scrollHeight; }, cd + 40);
    }
    function expand() {
      if (customKbOn()) return;                                              // 键盘收完、停稳后再展开
      if (isFocused() || !openState) return;
      var c = cfg();
      setDur(c.down); rzMotion(c.down);
      root.classList.remove('kb'); lastKb = false;
      var full = baseH || window.innerHeight;
      root.style.top = '0px'; root.style.height = full + 'px'; lastTop = '0px'; lastHt = full + 'px';
      expandT = setTimeout(function () {
        if (isFocused() || !openState) return;
        root.style.top = ''; root.style.height = ''; root.style.bottom = ''; root.style.transform = ''; lastY = 0; lastTop = ''; lastHt = '';
        freeze(false);
        if (pinned && out) out.scrollTop = out.scrollHeight;
      }, c.down + 80);
    }
    window.__cmResetFit = function () { clearTimeout(settleT); clearTimeout(expandT); trackGen++; if (root) root.style.transform = ''; lastY = 0; lastTop = ''; lastHt = ''; lastKb = null; lastH = -1; };
    function cfgCheck() {                                            // 设置页里改了高度 / 速度 / 模式：不用重开窗口，立刻按新设置重新布局
      var sig = cfgSig();
      if (sig === lastSig) return;
      var c = cfg(), was = kbMode;
      lastSig = sig; kbMode = c.mode;
      if (!openState || !root) return;
      if (was !== kbMode) {                                          // 模式换了：清掉旧模式留下的内联尺寸
        clearTimeout(settleT); clearTimeout(expandT);
        root.style.top = ''; root.style.height = ''; root.style.bottom = ''; root.style.transform = '';
        root.classList.remove('kb'); lastY = 0; lastTop = ''; lastHt = ''; lastKb = null;
        if (isFocused() && !customKbOn()) { if (kbMode === 'follow') { fitKb(); pinFor(600); } else shrink(); }
        return;
      }
      if (isFocused() && kbMode !== 'follow' && !customKbOn()) { lastKb = null; shrink(); }   // 键盘正开着：高度改了立刻重算
    }
    window.__cmCfgCheck = cfgCheck;
    window.__cmCfgWatch = function (on) {
      clearInterval(cfgTimer); cfgTimer = 0;
      if (on) { lastSig = cfgSig(); cfgTimer = setInterval(cfgCheck, 500); }
    };
    window.__cmDbg = function () { var c = cfg(); return { mode: kbMode, kbH: kbH, baseH: baseH, lastHt: lastHt, lastTop: lastTop, lastKb: lastKb, up: c.up, down: c.down, wait: c.wait }; };
    window.__cmSetKbH = function (v) { kbH = v > 0 ? v : 0; if (v > 0) lsSet(kbKey(), String(v)); else { try { localStorage.removeItem(kbKey()); } catch (_) {} } };
    function fitKb() {
      if (customKbOn()) return;
      if (!root || !openState || drag || kbMode !== 'follow') return;
      noteBase();
      var h = curH();
      var kbOpen = !!baseH && (isFocused() || Date.now() - blurT < 450) && h < baseH - 100;
      var t = '', ht = '', bt = '';
      if (!kbOpen && (!vv || (vv.offsetTop < 1 && Math.abs(window.innerHeight - vv.height) < 2))) {
        t = ''; ht = ''; bt = '';
      } else if (vv) {
        t = Math.max(0, Math.round(vv.offsetTop)) + 'px';
        ht = Math.round(vv.height) + 'px';
        bt = 'auto';
      }
      if (t !== lastTop) { root.style.top = t; lastTop = t; }
      if (ht !== lastHt) { root.style.height = ht; root.style.bottom = bt; lastHt = ht; }
      if (kbOpen !== lastKb) { root.classList.toggle('kb', kbOpen); lastKb = kbOpen; }
      if (pinned && out && (h !== lastH)) out.scrollTop = out.scrollHeight;
      lastH = h;
      if (kbOpen && (window.scrollY || window.scrollX)) window.scrollTo(0, 0);   // 页面本身不许跟着滚
    }
    function fitKbSoon() { if (kbRaf || !openState) return; kbRaf = requestAnimationFrame(function () { kbRaf = 0; fitKb(); }); }
    if (vv) { vv.addEventListener('resize', fitKbSoon); vv.addEventListener('scroll', fitKbSoon); }
    window.addEventListener('resize', fitKbSoon);
    window.addEventListener('scroll', function () { if (openState) fitKbSoon(); }, { passive: true });
    // 键盘滑出 / 收起动画大约 0.3–0.5 秒，期间逐帧校正，避免面板和键盘各动各的
    function pinFor(ms) {
      if (customKbOn()) return;
      var t0 = Date.now(), my = ++pinGen;
      (function tick() {
        if (my !== pinGen) return;
        fitKb();
        if (Date.now() - t0 > ms) { if (!isFocused()) freeze(false); return; }
        requestAnimationFrame(tick);
      })();
    }
    input.addEventListener('focus', function () { if (customKbOn()) return; setTimeout(function () { if (isFocused()) freeze(true); }, 0); clearTimeout(expandT); if (shrink()) trackFor(1000); else { fitKb(); pinFor(800); } });
    input.addEventListener('blur', function () {
      blurT = Date.now();                                          // 先记时间（noteBase 靠它判断键盘是否还在收），再判断要不要走旧逻辑
      if (customKbOn() || window.__kbSwitching) return;
      var c = cfg(); kbMode = c.mode;
      if (kbMode === 'follow') { pinFor(600); return; }
      clearTimeout(settleT); clearTimeout(expandT);
      expandT = setTimeout(expand, c.wait);
    });

    // 背景遮罩和标题栏上的拖动不要滚动到后面的页面
    qs('.cm-mask').addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
    // 兜底：窗口开着时，只有输出区 / 候选条 / 输入框自己能滚；其他地方的滑动，以及输出区滑到头之后的「橡皮筋」，都不许传给页面
    var tY = 0;
    document.addEventListener('touchstart', function (e) { if (openState && e.touches[0]) tY = e.touches[0].clientY; }, { passive: true, capture: true });
    document.addEventListener('touchmove', function (e) {
      if (!openState || !e.cancelable) return;
      var t = e.target, el = t && t.closest ? t : null;
      if (!el || !root.contains(el)) { e.preventDefault(); return; }
      if (el.closest('#cmKb')) return;                                          // 自带键盘：按键自己处理，长按退格连删不能被拦
      if (el.closest('.cm-sug')) return;
      var sc = el.closest('.cm-out, .cm-input');
      if (!sc) { e.preventDefault(); return; }
      var dy = (e.touches[0] ? e.touches[0].clientY : tY) - tY;                // >0 手指往下 = 内容往上回到顶部方向
      if (sc.scrollHeight <= sc.clientHeight + 1) { if (sc.classList.contains('cm-out') || Math.abs(dy) > 8) e.preventDefault(); return; }   // 输入框没有溢出时只拦纵向拖动，不影响横向拖光标
      if ((dy > 0 && sc.scrollTop <= 0) || (dy < 0 && sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 1)) e.preventDefault();
    }, { passive: false, capture: true });
    head.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
    noteBase();
    noteBaseFn = noteBase;

    // 自带键盘：把需要的内部函数交给 cmd-keyboard.js（它可能比 build 先加载，也可能后加载，两种顺序都接得上）
    var kbCtx = {
      root: root, panel: qs('.cm-panel'), field: qs('.cm-field'), input: input,
      isMulti: function () { return multi; }, uiSpd: uiSpd, rzMotion: rzMotion,
      keep: function () { if (pinned && out) out.scrollTop = out.scrollHeight; },
      fullH: function () { return baseH || window.innerHeight; },
      releaseOld: function () {                                     // 自带键盘接手：去掉系统键盘避让留下的窗口尺寸（瞬间，正好在系统键盘收起的位置）
        clearTimeout(settleT); clearTimeout(expandT);
        var full = baseH || window.innerHeight;
        setDur(0);
        root.classList.remove('kb'); lastKb = false;
        root.style.top = '0px'; root.style.bottom = 'auto'; root.style.height = full + 'px'; lastTop = '0px'; lastHt = full + 'px';
        expandT = setTimeout(function () {
          if (!openState) return;
          root.style.top = ''; root.style.height = ''; root.style.bottom = ''; root.style.transform = ''; lastY = 0; lastTop = ''; lastHt = '';
          freeze(false);
        }, 700);
      },
      toSystem: function () {                                       // 系统键盘自己弹出来了：旧的避让逻辑重新接手
        if (!isFocused()) return;
        freeze(true);
        if (shrink()) trackFor(1000); else { fitKb(); pinFor(800); }
      }
    };
    window.__cmKbCtx = function () { return kbCtx; };
    if (window.__cmKb) window.__cmKb.mount(kbCtx);

    print('命令窗口 · 输入 /help 查看命令', 'info');
    print('不带 / 的内容当 JavaScript 执行，支持 await，$_ 是上一次的结果', 'info');
    print('点上面的「> 命令」可以放回输入框；标题栏往下拖可以收起', 'info');
    updateSug();
  }

  /* ---------- 设置 ---------- */
  function syncSet() {
    if (!built) return;
    root.style.setProperty('--cm-fs', fontSize + 'px');
    qs('#cmFs').textContent = fontSize;
    qs('[data-act="multi"]').setAttribute('aria-checked', String(multi));
    qs('[data-act="mirror"]').setAttribute('aria-checked', String(mirrorOn));
    qs('[data-act="hint"]').setAttribute('aria-checked', String(hintOn));
    root.classList.toggle('lt', lightOn);
    qs('[data-act="light"]').setAttribute('aria-checked', String(lightOn));
    var km = window.__cmKb; qs('[data-act="kb"]').setAttribute('aria-checked', String(!!(km && km.featureOn())));
    if (km && km.sync) km.sync();
    syncSub();
    input.placeholder = multi ? '多行：回车换行' : '命令或 JS';
    input.setAttribute('enterkeyhint', multi ? 'enter' : 'send');
    autosize();
  }
  function syncSub() {
    var el = qs('#cmSub');
    if (!el) return;
    el.textContent = (root.classList.contains('busy') ? '运行中…' : '就绪') + (mirrorOn ? ' · 同步 console' : '');
  }
  function setFs(n) { fontSize = Math.max(10, Math.min(18, Math.round(n) || 13)); lsSet('cmd_fs', String(fontSize)); syncSet(); return fontSize; }
  function setMulti(b) { multi = !!b; lsSet('cmd_multi', multi ? '1' : '0'); syncSet(); return multi; }
  function setLight(b) { lightOn = !!b; lsSet('cmd_light', lightOn ? '1' : '0'); syncSet(); return lightOn; }
  function setHint(b) { hintOn = !!b; lsSet('cmd_hint', hintOn ? '1' : '0'); syncSet(); updateSug(); return hintOn; }
  function setMirror(b) { mirrorOn = !!b; lsSet('cmd_mirror', mirrorOn ? '1' : '0'); if (mirrorOn) hookOn(); else hookOff(); syncSet(); return mirrorOn; }

  /* 输入框高度：空内容固定一行；有内容时用隐藏的「镜像元素」量出行数（iOS 上 textarea 的 scrollHeight 不可靠） */
  var LINE_H = 20, PAD_V = 16, ONE = LINE_H + PAD_V;
  function autosize() {
    if (!input) return;
    var max = multi ? 4 * LINE_H + PAD_V + 8 : 3 * LINE_H + PAD_V, v = input.value, h = ONE;
    if (v && mirrorEl) {
      var w = input.clientWidth;
      if (w > 0) {
        mirrorEl.style.width = Math.max(10, w - 12) + 'px';
        mirrorEl.textContent = v.replace(/\n$/, '\n ') + '\u200b';
        h = Math.min(max, Math.max(ONE, mirrorEl.offsetHeight + PAD_V));
      }
    }
    input.style.maxHeight = max + 'px';
    input.style.height = h + 'px';
  }

  /* ---------- 输出：先排队，每帧一次性写入 DOM（console 刷屏时不会卡） ---------- */
  var q = [], flushing = false, lastEl = null, pinned = true, unread = 0, copyMark = null;   // copyMark：上次复制到的最后一行（DOM 节点）

  function syncJump() {
    if (!jumpEl) return;
    jumpEl.hidden = pinned;
    jumpEl.textContent = unread ? '↓ ' + unread + ' 条新输出' : '↓ 回到底部';
  }

  /* 简易着色：字符串 / 数字 / true false null / 对象的 key */
  var HL = /("(?:[^"\\\n]|\\.){0,200}")|(-?\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b)|(\b(?:true|false|null|undefined|NaN|Infinity)\b)|([A-Za-z_$][\w$]*)(?=:\s)/g;
  function paint(el, text) {
    var last = 0, m, span;
    HL.lastIndex = 0;
    while ((m = HL.exec(text))) {
      if (m.index > last) el.appendChild(document.createTextNode(text.slice(last, m.index)));
      span = document.createElement('span');
      span.className = m[1] ? 't-s' : m[2] ? 't-n' : m[3] ? 't-k' : 't-p';
      span.textContent = m[0];
      el.appendChild(span);
      last = m.index + m[0].length;
    }
    if (last < text.length) el.appendChild(document.createTextNode(text.slice(last)));
  }

  function lineEl(kind, text, hl) {
    var d = document.createElement('div');
    d.className = 'cm-ln cm-' + kind;
    d.__txt = text; d.__n = 1;
    var tx = document.createElement('span');
    tx.className = 'cm-tx';
    if (hl && text.length <= 6000) paint(tx, text); else tx.textContent = text;
    d.appendChild(tx);
    if (kind !== 'in') {
      var nl = text.split('\n').length;
      if (nl > FOLD_LINES || text.length > FOLD_CHARS) {            // 太长的先折叠，点一下再展开
        tx.classList.add('fold');
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'cm-more'; b.__nl = nl;
        b.textContent = '展开 · 共 ' + nl + ' 行';
        d.appendChild(b);
      }
    }
    return d;
  }
  function enqueue(d) {
    // 连续重复的 console 行折叠成「×N」
    if (d.__dup && lastEl && lastEl.__dup === d.__dup) {
      lastEl.__n++;
      var b = lastEl.querySelector('.cm-x');
      if (!b) { b = document.createElement('span'); b.className = 'cm-x'; lastEl.querySelector('.cm-tx').appendChild(b); }
      b.textContent = '×' + lastEl.__n;
      return;
    }
    lastEl = d;
    q.push(d);
    if (!openState && q.length > 400) q.splice(0, q.length - 400);   // 窗口没开时只留最近 400 行
    if (openState) schedule();
  }
  function schedule() { if (!flushing) { flushing = true; requestAnimationFrame(flush); } }
  function flush() {
    flushing = false;
    if (!built || !openState || !q.length) return;
    var frag = document.createDocumentFragment(), force = false, n = q.length;
    for (var i = 0; i < n; i++) { frag.appendChild(q[i]); if (q[i].classList.contains('cm-in')) force = true; }
    q.length = 0;
    out.appendChild(frag);
    while (out.childElementCount > MAX_LINES) out.removeChild(out.firstElementChild);
    if (pinned || force) { out.scrollTop = out.scrollHeight; pinned = true; unread = 0; }
    else unread += n;
    syncJump();
  }

  function print(text, kind) {
    text = String(text);
    if (text.length > MAX_TEXT) text = text.slice(0, MAX_TEXT) + '\n…(已截断)';
    var hl = kind === 'val';
    if (!kind || kind === 'out' || hl) kind = 'out-k';
    var d = lineEl(kind, text, hl);
    if (kind === 'log' || kind === 'warn' || kind === 'err') d.__dup = kind + '\u0000' + text;
    enqueue(d);
  }
  function printDots(colors, text) {
    var d = lineEl('out-k', text, false), dots = document.createElement('span'), tx = d.firstChild;
    dots.className = 'cm-dots';
    colors.forEach(function (c) { var i = document.createElement('i'); i.style.background = c; dots.appendChild(i); });
    tx.insertBefore(dots, tx.firstChild);
    enqueue(d);
  }
  function clearOut() {
    q.length = 0; lastEl = null; unread = 0; pinned = true; copyMark = null;
    if (out) out.innerHTML = '';
    syncJump();
  }
  // 「已复制 N 行」这类提示行：标成 __sys，不算进「复制新增」的内容
  function printSys(text, kind) {
    var d = lineEl(kind || 'out-k', String(text), false);
    d.__sys = true;
    enqueue(d);
  }
  function rowText(n) { return n.__txt + (n.__n > 1 ? '  (×' + n.__n + ')' : ''); }   // 用完整原文，折叠的部分也会复制
  function writeClip(text, okMsg) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.cssText = 'position:fixed;left:-999px;top:0;';
      document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (_) {}
      ta.remove();
      printSys(ok ? okMsg : '复制失败，请长按输出区手动选择', ok ? 'ok' : 'err');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { printSys(okMsg, 'ok'); }, fallback);
    } else fallback();
  }
  function copyOut() {
    var rows = out ? Array.prototype.slice.call(out.children) : [];
    var text = rows.map(rowText).join('\n');
    if (rows.length) copyMark = rows[rows.length - 1];               // 复制全部也算「上一次复制」，下次从这里往后
    writeClip(text, '已复制 ' + rows.length + ' 行');
  }
  function copyNew() {
    var rows = out ? Array.prototype.slice.call(out.children) : [];
    var from = 0;
    if (copyMark && out.contains(copyMark)) from = rows.indexOf(copyMark) + 1;   // 标记行已被挤出 600 行上限或已清空：当作全部都是新的
    var fresh = rows.slice(from).filter(function (n) { return !n.__sys; });
    if (!fresh.length) { printSys('没有新内容（上次复制之后没有新增输出）', 'info'); return; }
    copyMark = rows[rows.length - 1];
    writeClip(fresh.map(rowText).join('\n'), '已复制新增 ' + fresh.length + ' 行');
  }

  /* ---------- 历史 / 补全 ---------- */
  function pushHist(line) {
    if (line.length > 500) return;
    var di = hist.indexOf(line); if (di >= 0) hist.splice(di, 1);   // 重复的挪到最新，不重复占位
    hist.push(line);
    if (hist.length > 150) hist = hist.slice(-150);
    hIdx = hist.length;
    lsSet('cmd_hist', JSON.stringify(hist));
  }
  /* ↑ ↓ 翻历史；输入框里已有内容时，只翻以它开头的那些 */
  function histMove(dir) {
    if (!hist.length) return;
    if (hIdx >= hist.length) { draft = input.value; hIdx = hist.length; }
    var i = hIdx + dir;
    while (i >= 0 && i < hist.length && draft && hist[i].indexOf(draft) !== 0) i += dir;
    if (i < 0) return;
    if (i >= hist.length) { hIdx = hist.length; input.value = draft; }
    else { hIdx = i; input.value = hist[i]; }
    autosize(); updateSug();
    var n = input.value.length; try { input.setSelectionRange(n, n); } catch (_) {}
  }

  var QUICK = ['help', 'menu', 'state', 'play', 'pause', 'next', 'style', 'theme', 'fps', 'log', 'clear'];
  function cmdNames() { return Object.keys(cmds).sort(); }

  /* JS 补全：只沿「数据属性」往下走，绝不触发 getter，也不执行任何代码 */
  function getDesc(o, k) {
    for (var p = o, i = 0; p != null && i < 8; p = Object.getPrototypeOf(p), i++) {
      var d = Object.getOwnPropertyDescriptor(p, k);
      if (d) return d;
    }
    return null;
  }
  var NATIVE = /\{\s*\[native code\]\s*\}\s*$/;
  function walkPath(parts) {
    var o = window;
    for (var i = 0; i < parts.length; i++) {
      if (o == null) return null;
      var d, ob = Object(o); try { d = getDesc(ob, parts[i]); } catch (_) { return null; }
      if (!d) return null;
      if ('value' in d) o = d.value;
      else if (d.get && NATIVE.test(Function.prototype.toString.call(d.get))) { try { o = d.get.call(ob); } catch (_) { return null; } }   // 浏览器自带的 getter（document.body 之类）可以安全读取
      else return null;                                             // 页面自己写的 getter 不碰，免得有副作用
    }
    return o;
  }
  function propNames(o) {
    var seen = {}, res = [];
    try {
      for (var p = Object(o), i = 0; p && i < 6; p = Object.getPrototypeOf(p), i++) {
        if (i > 0 && p === Object.prototype) break;
        Object.getOwnPropertyNames(p).forEach(function (k) {
          if (!seen[k] && k !== 'constructor' && k.indexOf('__') !== 0 && /^[A-Za-z_$][\w$]*$/.test(k)) { seen[k] = 1; res.push(k); }
        });
      }
    } catch (_) {}
    return res;
  }
  function jsSuggest(v) {
    var m = /(?:^|[^\w$.])((?:[A-Za-z_$][\w$]*\.)*)([A-Za-z_$][\w$]*)?$/.exec(v);
    if (!m) return [];
    var base = m[1], part = m[2] || '', names, obj = window;
    if (!base && part.length < 2) return [];
    if (base) {
      obj = walkPath(base.slice(0, -1).split('.'));
      if (obj == null) return [];
      names = propNames(obj);
    } else {
      var seen = {};
      names = appGlobals(true).concat(appGlobals(false), (window.__cmLexNames ? window.__cmLexNames() : []), propNames(window)).filter(function (k) { if (seen[k]) return false; seen[k] = 1; return true; });
    }
    var lq = part.toLowerCase(), head = v.slice(0, v.length - part.length), list = [];
    for (var i = 0; i < names.length && list.length < 14; i++) {
      var n = names[i];
      if (n === part || n.toLowerCase().indexOf(lq) !== 0) continue;
      var d = null; try { d = getDesc(Object(obj), n); } catch (_) {}
      list.push({ text: n + (d && typeof d.value === 'function' ? '()' : ''), fill: head + n });
    }
    return list;
  }
  function histMatches(v) {                                         // 输入的内容和用过的代码相同 / 开头相同 / 包含时，最近的排前面
    var res = [], seen = {}, lv = v.toLowerCase(), i, h;
    for (i = hist.length - 1; i >= 0 && res.length < 5; i--) {
      h = hist[i];
      if (seen[h] || h === v || h.toLowerCase().indexOf(lv) !== 0) continue;
      seen[h] = 1; res.push(h);
    }
    if (v.length >= 3) for (i = hist.length - 1; i >= 0 && res.length < 5; i--) {
      h = hist[i];
      if (seen[h] || h === v || h.toLowerCase().indexOf(lv) < 0) continue;
      seen[h] = 1; res.push(h);
    }
    return res.map(function (h) { var l = h.split('\n')[0]; return { text: '↺ ' + (l.length > 36 ? l.slice(0, 36) + '…' : l) + (h.indexOf('\n') >= 0 ? ' …' : ''), fill: h, rc: 1 }; });
  }
  function suggestions() {
    var v = input.value, list = [];
    if (v && hintOn) { var hm = histMatches(v); if (hm.length) return hm.concat(suggestionsBase(v)).slice(0, 16); }
    return suggestionsBase(v);
  }
  function suggestionsBase(v) {
    var list = [];
    if (!v) {
      var seen = {};
      for (var i = hist.length - 1; hintOn && i >= 0 && list.length < 3; i--) {      // 最近用过的几条，一点就填回去
        var h = hist[i];
        if (seen[h] || h.length > 24 || h.indexOf('\n') >= 0) continue;
        seen[h] = 1; list.push({ text: '↺ ' + h, fill: h, rc: 1 });
      }
      QUICK.forEach(function (n) { if (cmds[n]) list.push({ text: '/' + n, run: cmds[n].tapRun ? '/' + n : '', fill: '/' + n + ' ' }); });
      return list;
    }
    if (v.charAt(0) !== '/') return jsSuggest(v);
    var m = /^([\s\S]*?)(\S*)$/.exec(v), head = m[1], last = m[2];
    if (!head) {                                                    // 正在输入命令名
      var qn = last.slice(1).toLowerCase();
      cmdNames().concat(Object.keys(uAlias)).forEach(function (n) { if (n.indexOf(qn) === 0 && n !== qn) list.push({ text: '/' + n, fill: '/' + n + ' ' }); });
      return list.slice(0, 12);
    }
    var tk = tokenize(head.replace(/^\//, ''));
    var name = (tk.shift() || '').toLowerCase();
    var def = cmds[alias[name] || name];
    if (def && def.complete) {
      var lq = last.toLowerCase();
      (def.complete(tk) || []).forEach(function (c) { if (String(c).toLowerCase().indexOf(lq) === 0 && String(c) !== last) list.push({ text: String(c), fill: head + c + ' ' }); });
    }
    return list.slice(0, 14);
  }
  function updateSug() {
    if (!sugEl) return;
    var html = '';
    suggestions().forEach(function (s) {
      html += '<button type="button" class="cm-chip' + (s.rc ? ' rc' : '') + '" data-fill="' + esc(s.fill) + '"' + (s.run ? ' data-run="' + esc(s.run) + '"' : '') + '>' + esc(s.text) + '</button>';
    });
    sugEl.innerHTML = html;
    sugEl.classList.toggle('quiet', !input.value);
    keepOut();                  // 键盘弹出且没在输入时，把快捷按钮收起来，给输出多留位置
  }
  function keepOut() {                                               // 候选条出现 / 消失会改变输出区高度：本来在底部就贴底，否则按缩小的量往上滚，最后看到的那行不被盖住
    if (!out) return;
    var h = out.clientHeight, d = lastOutH2 - h;
    if (lastOutH2 && d !== 0) { if (pinned) out.scrollTop = out.scrollHeight; else out.scrollTop += d; }
    lastOutH2 = h;
  }
  var lastOutH2 = 0;
  var tabState = null;
  function tabComplete() {                                          // Tab：补全第一个，再按依次换下一个
    if (tabState && tabState.val === input.value) tabState.i = (tabState.i + 1) % tabState.list.length;
    else { var list = suggestions(); if (!list.length) return; tabState = { list: list, i: 0 }; }
    input.value = tabState.list[tabState.i].fill;
    tabState.val = input.value;
    autosize(); updateSug();
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }

  /* ============================== 执行 ============================== */
  function submit() {
    var v = input.value;
    if (!v.trim()) return;
    input.value = ''; hIdx = hist.length; autosize(); updateSug();
    exec(v);
  }
  var busy = Promise.resolve(), running = 0, busyTimer = 0, curCancel = null;
  function exec(line) {
    busy = busy.then(function () { return execNow(line); });   // 串行：先输入的先跑完
    return busy;
  }
  function busyStart() {
    running++;
    if (!busyTimer) busyTimer = setTimeout(function () {         // 跑超过 0.35 秒才亮「停止」，快命令不闪
      busyTimer = 0;
      if (running > 0 && root) { root.classList.add('busy'); runBtn.textContent = '停止'; syncSub(); }
    }, 350);
  }
  function busyEnd() {
    if (--running > 0) return;
    running = 0; clearTimeout(busyTimer); busyTimer = 0;
    if (root) { root.classList.remove('busy'); runBtn.textContent = '执行'; syncSub(); }
  }
  var menuApi = null;                                               // /menu 的钩子（在文件后面赋值）：菜单在等选择 / 输入时，这一行归菜单
  async function execNow(line) {
    line = line.replace(/^\s+|\s+$/g, '');
    if (!line) return;
    var mh = menuApi && menuApi.wants(line);
    if (!mh) pushHist(line);                                        // 选编号的输入不进历史
    var inEl = lineEl('in', '> ' + line, false);
    inEl.__cmd = line;
    enqueue(inEl);
    var t0 = performance.now(), cancelled = false, stop;
    var stopP = new Promise(function (res) { stop = function () { cancelled = true; res(); }; });
    curCancel = stop;
    busyStart();
    try {
      var work = Promise.resolve().then(function () {
        return mh ? menuApi.feed(line) : routeLine(line);
      });
      work.catch(function () {});                                   // 停止等待之后它再抛错，不要变成未处理的 rejection
      await Promise.race([work, stopP]);
      if (cancelled) print('已停止等待（已经发出去的任务可能还在后台运行）', 'warn');
    } catch (e) {
      print(errText(e), 'err');
    } finally {
      curCancel = null;
      busyEnd();
      var dt = performance.now() - t0;
      if (!cancelled && dt >= 200) print('耗时 ' + Math.round(dt) + ' ms', 'info');
    }
  }
  function errText(e) {
    if (e instanceof Error) return e.name + ': ' + e.message;
    return '抛出：' + fmt(e);
  }

  /* 忘了写 / 也照样执行：第一个词是命令名（或自己起的简称），而且整行不是合法的 JS（多个词），
     或者是单个词但页面里没有同名的全局变量，就当命令跑。例如「net off」「get dev_cm_kbH」 */
  function routeLine(line) {
    if (line.charAt(0) === '/' && !/^\/[\/*]/.test(line)) return runCmd(line);
    var first = (line.split(/\s+/)[0] || '').toLowerCase();
    var known = first && /^[\w\u4e00-\u9fa5-]+$/.test(first) && (cmds[alias[first] || first] || uAlias[first]);
    if (known) {
      var single = !/\s/.test(line);
      var asJs = single ? (first in window) : (canParse('return (' + line + '\n)') || canParse(line) || canParse('return (async function(){return (' + line + '\n)})') || canParse('return (async function(){' + line + '\n})'));
      if (!asJs) { print('按命令 /' + first + ' 执行（以后可以加上 /）', 'info'); return runCmd('/' + line); }
    }
    return runJS(line);
  }
  async function runCmd(line) {
    var tk = tokenize(line.slice(1));
    var name = (tk.shift() || '').toLowerCase();
    if (!name) { print('输入 /help 查看命令', 'info'); return; }
    name = alias[name] || name;
    var def = cmds[name];
    if (!def && uAlias[name]) { var extra = line.replace(/^\/\S+\s*/, ''); return runLine(uAlias[name] + (extra ? ' ' + extra : '')); }
    if (!def) {
      var near = cmdNames().filter(function (n) { return n.indexOf(name) === 0; });
      print('未知命令 /' + name + (near.length ? '，是不是想输入：' + near.map(function (n) { return '/' + n; }).join(' ') : '，输入 /help 查看全部'), 'err');
      return;
    }
    var r = def.run(tk, { print: print, printDots: printDots, raw: line });
    if (r && typeof r.then === 'function') r = await r;
    if (r !== undefined) print(fmtTop(r), 'out');
  }

  /* 执行 JS：先当表达式，其次当语句；有 await 时包进 async 函数。
     用 new Function 只做“语法检查”，所以代码不会被执行两次。 */
  function canParse(body) { try { new Function(body); return true; } catch (_) { return false; } }
  function evalJS(src) {
    var G = eval;                                                   // 间接 eval：在全局作用域运行
    if (canParse('return (' + src + '\n)')) return G('(' + src + '\n)');
    if (canParse('return (async function(){return (' + src + '\n)})')) return G('(async function(){return (' + src + '\n)})()');
    var st = src.replace(/^(\s*)(?:let|const)\s+/gm, '$1var ');     // 顶层 let/const 改成 var，变量才能留在全局
    if (canParse(st)) return G(st);
    if (canParse('return (async function(){' + st + '\n})')) return G('(async function(){' + st + '\n})()');
    return G(st);                                                   // 语法不通过，eval 会在执行前抛出原生的 SyntaxError
  }

  /* ---------- 页面 console 的钩子：执行 JS 期间一定开；打开「同步 console」后一直开 ---------- */
  var CON = ['log', 'info', 'warn', 'error', 'debug'];
  var hook = { saved: {}, ours: {}, active: false }, hookRuns = 0, rate = { t: 0, n: 0, drop: 0 };
  function mirrorLine(k, args) {
    var now = Date.now();
    if (now - rate.t > 1000) {
      if (rate.drop) { print('console 输出太快，已丢弃 ' + rate.drop + ' 条', 'warn'); rate.drop = 0; }
      rate.t = now; rate.n = 0;
    }
    if (++rate.n > 100) { rate.drop++; return; }                    // 每秒最多 100 条，防止每帧 log 把界面拖垮
    print(joinArgs(args), k === 'error' ? 'err' : k === 'warn' ? 'warn' : 'log');
  }
  /* 处理 console.log('%c样式', css) / '%s' / '%d' 这类格式串：样式参数丢掉，其余替换进去 */
  function joinArgs(args) {
    var a = Array.prototype.slice.call(args), parts = [], i = 0;
    if (typeof a[0] === 'string' && /%[csdifoOj%]/.test(a[0])) {
      i = 1;
      parts.push(a[0].replace(/%([csdifoOj%])/g, function (m, t) {
        if (t === '%') return '%';
        if (i >= a.length) return m;
        var x = a[i++];
        if (t === 'c') return '';
        if (t === 'd' || t === 'i') return String(parseInt(x, 10));
        if (t === 'f') return String(parseFloat(x));
        return typeof x === 'string' ? x : fmt(x);
      }));
    }
    for (; i < a.length; i++) parts.push(typeof a[i] === 'string' ? a[i] : fmt(a[i]));
    return parts.join(' ');
  }
  function hookOn() {
    hook.active = true;
    CON.forEach(function (k) {
      if (hook.ours[k]) return;
      var o = console[k];
      if (typeof o !== 'function') return;
      var w = function () {
        if (hook.active) { try { mirrorLine(k, arguments); } catch (_) {} }
        return o.apply(console, arguments);
      };
      try { console[k] = w; hook.ours[k] = w; hook.saved[k] = o; } catch (_) {}
    });
  }
  function hookOff() {
    if (mirrorOn || hookRuns > 0) return;
    hook.active = false;
    CON.forEach(function (k) {                                      // 只在没被别人再包一层时才还原，避免覆盖别人的钩子
      var w = hook.ours[k];
      if (w && console[k] === w) { try { console[k] = hook.saved[k]; } catch (_) {} hook.ours[k] = null; }
    });
  }
  async function runJS(src) {
    hookRuns++; hookOn();
    try {
      var r = evalJS(src);
      if (r && typeof r.then === 'function') r = await r;
      window.$_ = r;
      print(r === undefined ? 'undefined' : fmtTop(r), r === undefined ? 'info' : typeof r === 'string' ? 'out' : 'val');
    } finally { hookRuns--; hookOff(); }
  }

  /* ============================== 内置命令 ============================== */
  var GROUPS = ['播放', '外观', '开发者', '存储', '高级', '其他'];
  var uAlias = {}, macros = {};
  try { uAlias = JSON.parse(lsGet('cmd_ualias') || '{}') || {}; } catch (_) { uAlias = {}; }
  try { macros = JSON.parse(lsGet('cmd_macro') || '{}') || {}; } catch (_) { macros = {}; }

  register('help', {
    group: '其他', desc: '列出命令，或查看某个命令的用法', usage: '/help [命令]', tapRun: true, alias: ['h', '?'],
    complete: function () { return cmdNames(); },
    run: function (a, c) {
      if (a[0]) {
        var n = a[0].replace(/^\//, '').toLowerCase(); n = alias[n] || n;
        var d = cmds[n];
        if (!d) return c.print('没有 /' + n, 'err');
        return c.print((d.usage || '/' + n) + '\n' + (d.desc || '') + (d.alias && d.alias.length ? '\n别名：' + d.alias.map(function (x) { return '/' + x; }).join(' ') : ''), 'out');
      }
      GROUPS.forEach(function (gp) {
        var rows = cmdNames().filter(function (k) { return (cmds[k].group || '其他') === gp; });
        if (!rows.length) return;
        var ci = GROUPS.indexOf(gp) % 4;
        c.print(gp, 'tg' + ci);
        rows.forEach(function (k) { c.print('/' + k + '  ' + (cmds[k].desc || ''), 'li' + ci); });
      });
      c.print('其它输入当 JavaScript 执行；/help 命令名 看详细用法', 'info');
    }
  });

  register('clear', { group: '其他', desc: '清空输出', alias: ['cls'], tapRun: true, run: function () { clearOut(); } });
  register('exit', { group: '其他', desc: '关闭命令窗口', alias: ['quit'], run: function () { close(); } });
  register('reload', { group: '其他', desc: '普通刷新页面（不清缓存；清缓存用设置里的“强制刷新”）', run: function () { location.reload(); } });
  register('copy', { group: '其他', desc: '复制全部输出', run: function () { copyOut(); } });
  register('history', {
    group: '其他', desc: '查看输入历史；/history clear 清空', usage: '/history [clear]',
    complete: function () { return ['clear']; },
    run: function (a, c) {
      if (a[0] === 'clear') { hist = []; hIdx = 0; lsSet('cmd_hist', '[]'); return c.print('历史已清空', 'ok'); }
      if (!hist.length) return c.print('还没有历史', 'info');
      c.print(hist.slice(-20).map(function (h, i, arr) { return (hist.length - arr.length + i + 1) + '  ' + h.replace(/\n/g, ' ⏎ '); }).join('\n'), 'out');
    }
  });

  /* ---- 播放 ---- */
  function ppBtn() { return document.querySelector('.ppb'); }
  function nxBtn() { return document.querySelector('.nxb'); }
  register('state', {
    group: '播放', desc: '当前播放 / 风格 / 主题 / 速度等状态', tapRun: true,
    run: function () {
      var STYALL = [].concat(g('STY') || [], g('STY2') || [], g('STY3') || [], g('STY4') || []);
      var sk = g('style'), sl = '';
      STYALL.forEach(function (p) { if (p[0] === sk) sl = p[1]; });
      var th = g('THEMES'), ti = g('theme'), tn = th && th[ti] ? th[ti][0] : '?';
      var LN = g('LN');
      return [
        '歌词句数  ' + (LN && LN.length != null ? LN.length : '?'),
        '当前句    ' + g('idx') + '    进度 ' + (typeof g('prog') === 'number' ? Math.round(g('prog') * 1000) / 1000 : g('prog')),
        '播放中    ' + g('playing'),
        '文字风格  ' + sk + (sl ? '（' + sl + '）' : ''),
        '主题      ' + ti + '（' + tn + '）',
        '背景模式  ' + g('bgMode'),
        '界面速度  ' + g('UISPD') + '×    动效速度 ' + g('ASPD') + '×',
        '性能优化  ' + document.body.classList.contains('performance-mode'),
        '屏幕      ' + innerWidth + '×' + innerHeight + ' @' + (window.devicePixelRatio || 1) + 'x'
      ].join('\n');
    }
  });
  function lineNo() {
    var i = g('idx'), n = (g('LN') || []).length;
    return '第 ' + ((+i || 0) + 1) + (n ? ' / ' + n : '') + ' 句';
  }
  /* 播放 / 暂停：直接调 setPlay，不再去点页面上第一颗 .ppb（那颗在隐藏的播放页里） */
  function setPlaying(v) {
    var fn = g('setPlay');
    if (typeof fn === 'function') { fn(!!v); return; }
    var b = ppBtn();
    if (!b) throw new Error('找不到 setPlay，也找不到播放按钮');
    if (!!g('playing') !== !!v) b.click();
  }
  register('play', {
    group: '播放', desc: '开始播放（已在播放则不动）', tapRun: true,
    run: function () { if (!g('playing')) setPlaying(true); return '播放中：' + g('playing'); }
  });
  register('pause', {
    group: '播放', desc: '暂停', tapRun: true,
    run: function () { if (g('playing')) setPlaying(false); return '播放中：' + g('playing'); }
  });
  register('toggle', {
    group: '播放', desc: '播放 / 暂停切换', alias: ['pp'],
    run: function () { setPlaying(!g('playing')); return '播放中：' + g('playing'); }
  });
  register('next', {
    group: '播放', desc: '下一句（可连续 n 次）。音乐模式且歌单多于一首时，和底栏按钮一样切下一首', usage: '/next [n]', tapRun: true,
    run: function (a) {
      var n = Math.max(1, Math.min(100, parseInt(a[0], 10) || 1));
      var go = g('goNext');
      if (typeof go === 'function') { for (var i = 0; i < n; i++) go(); }
      else {
        var b = nxBtn(); if (!b) throw new Error('找不到 goNext，也找不到下一句按钮');
        for (var j = 0; j < n; j++) b.click();
      }
      return '已下一句 ×' + n + '，' + lineNo();
    }
  });
  register('prev', {
    group: '播放', desc: '上一句（到第一句再往前会回到最后一句）', tapRun: true,
    run: function () {
      var r = callBound('prev', []);
      if (r) return '已调用 ' + r.name + '()，' + lineNo();
      var go = g('gotoIdx');
      if (typeof go !== 'function') return unbound('prev');
      var LN = g('LN') || [];
      if (!LN.length) throw new Error('没有歌词');
      var i = (+g('idx') || 0) - 1;
      if (i < 0) i = LN.length - 1;
      go(i, false);
      return '上一句，' + lineNo();
    }
  });
  register('goto', {
    group: '播放', desc: '跳到第 n 句（从 1 数起），并按歌词时间对齐音频', usage: '/goto <n>',
    run: function (a) {
      var n = parseInt(a[0], 10);
      if (!(n >= 1)) throw new Error('用法：/goto <第几句，从 1 开始>');
      var r = callBound('goto', [n - 1]);
      if (r) return '已调用 ' + r.name + '(' + (n - 1) + ')，' + lineNo();
      var go = g('gotoIdx');
      if (typeof go !== 'function') return unbound('goto');
      var LN = g('LN') || [];
      if (LN.length && n > LN.length) throw new Error('只有 ' + LN.length + ' 句');
      go(n - 1, false);
      return '已跳到' + lineNo();
    }
  });

  /* 找不到可绑定函数时，列出名字里带关键词的全局函数，方便用 /bind 绑定 */
  var HINT = { goto: /goto|jump|seek|go[A-Z_]|line|sent|idx|show/i, prev: /prev|back|last/i, style: /style|fx|anim/i, theme: /theme|palette|color/i };
  function unbound(what) {
    var cand = appGlobals(true).filter(function (k) { return HINT[what].test(k); }).slice(0, 30);
    return '还没绑定「' + BINDABLE[what] + '」的函数。\n'
      + (cand.length ? '名字相近的全局函数：' + cand.join('  ') + '\n' : '')
      + '绑定：/bind ' + what + ' 函数名      （/fn 关键字 可继续搜索）';
  }
  register('bind', {
    group: '播放', desc: '用别的全局函数替换 /goto /prev /style /theme 的默认行为', usage: '/bind [项目 函数名]  |  /bind -d 项目',
    complete: function (tk) { return tk.length ? appGlobals(true) : Object.keys(BINDABLE).concat(['-d']); },
    run: function (a, c) {
      if (!a.length) {
        return Object.keys(BINDABLE).map(function (k) { return k.padEnd(6) + (binds[k] ? binds[k] + '()  （已替换默认）' : '（默认）') + '   ' + BINDABLE[k]; }).join('\n');
      }
      if (a[0] === '-d') { if (!BINDABLE[a[1]]) throw new Error('项目：' + Object.keys(BINDABLE).join(' / ')); delete binds[a[1]]; lsSet('cmd_bind', JSON.stringify(binds)); return '已解除 ' + a[1]; }
      if (!BINDABLE[a[0]]) throw new Error('项目：' + Object.keys(BINDABLE).join(' / '));
      if (typeof window[a[1]] !== 'function') throw new Error('全局里没有函数 ' + a[1] + '，用 /fn 搜一下');
      binds[a[0]] = a[1]; lsSet('cmd_bind', JSON.stringify(binds));
      return a[0] + ' → ' + a[1] + '()';
    }
  });

  /* ---- 外观 ---- */
  function allStyles() { return [].concat(g('STY') || [], g('STY2') || [], g('STY3') || [], g('STY4') || []); }
  register('style', {
    group: '外观', desc: '查看 / 切换文字动画风格（key 或中文名）', usage: '/style [key|名称]', tapRun: false,
    complete: function () { return allStyles().map(function (p) { return p[1]; }); },
    run: function (a, c) {
      var list = allStyles(), cur = g('style');
      if (!list.length) throw new Error('没读到 STY 风格列表');
      if (!a.length) return list.map(function (p) { return (p[0] === cur ? '● ' : '  ') + p[0].padEnd(8) + p[1]; }).join('\n');
      var q = a.join(' ').toLowerCase(), hit = null;
      list.forEach(function (p) { if (!hit && (p[0].toLowerCase() === q || p[1].toLowerCase() === q)) hit = p; });
      list.forEach(function (p) { if (!hit && (p[0].toLowerCase().indexOf(q) >= 0 || p[1].toLowerCase().indexOf(q) >= 0)) hit = p; });
      if (!hit) throw new Error('没有叫「' + q + '」的风格，/style 看列表');
      var r = callBound('style', [hit[0]]);
      if (r) return '已调用 ' + r.name + '("' + hit[0] + '") → ' + hit[1];
      /* 不走 setStyle：那个会把句子重置到第 1 句。这里只换风格并重绘当前句。 */
      window.style = hit[0];
      var mark = g('markStyles'); if (typeof mark === 'function') mark();
      var req = g('reqRender');
      if (typeof req === 'function') req();
      else { var up = g('update'); if (typeof up === 'function') up(); }
      return '风格已切到 ' + hit[0] + '（' + hit[1] + '），当前句已重绘';
    }
  });
  register('theme', {
    group: '外观', desc: '查看 / 切换主题（序号或名称）', usage: '/theme [序号|名称]',
    complete: function () { return (g('THEMES') || []).map(function (t) { return t[0]; }); },
    run: function (a, c) {
      var th = g('THEMES') || [], cur = g('theme');
      if (!th.length) throw new Error('没读到 THEMES');
      if (!a.length) { th.forEach(function (t, i) { c.printDots(t[1], (i === cur ? '● ' : '') + i + '  ' + t[0]); }); return; }
      var q = a.join(' '), idx = -1;
      if (/^\d+$/.test(q) && +q < th.length) idx = +q;
      else th.forEach(function (t, i) { if (idx < 0 && t[0] === q) idx = i; });
      th.forEach(function (t, i) { if (idx < 0 && t[0].indexOf(q) >= 0) idx = i; });
      if (idx < 0) throw new Error('没有这个主题，/theme 看列表');
      var r = callBound('theme', [idx]);
      if (r) return '已调用 ' + r.name + '(' + idx + ') → ' + th[idx][0];
      window.theme = idx;
      var preset = g('applyPreset'); if (typeof preset === 'function') preset(idx);
      var box = $id('themes');
      if (box) Array.prototype.forEach.call(box.children, function (c, i) { c.classList.toggle('on', i === idx); });
      var bg = g('reqBg');
      if (typeof bg === 'function') bg(true);
      else { var apply = g('applyBg'); if (typeof apply === 'function') apply(); }
      return '主题已换为 ' + idx + '（' + th[idx][0] + '）';
    }
  });
  register('uispd', {
    group: '外观', desc: '界面动画速度（0.25–3，和设置里的滑块同步）', usage: '/uispd [倍率]',
    run: function (a) {
      if (!a.length) return '界面速度 ' + g('UISPD') + '×';
      var x = parseFloat(a[0]);
      if (!(x > 0)) throw new Error('用法：/uispd 1.5');
      if (typeof g('setUiSpdPct') !== 'function') throw new Error('找不到 setUiSpdPct');
      g('setUiSpdPct')(x * 100);
      return '界面速度 ' + g('UISPD') + '×';
    }
  });

  /* ---- 开发者 ---- */
  var DEV = {
    perf: ['performanceMode', '性能优化'], jank: ['devJank', '卡顿检测'], fps: ['devFps', '实时帧率显示'],
    floatlog: ['devFloatLogChk', '悬浮窗日志'], pauselog: ['devPauseLogChk', '暂停抓取日志']
  };
  function setSwitch(el, val) { el.checked = val; el.dispatchEvent(new Event('change', { bubbles: true })); }
  register('dev', {
    group: '开发者', desc: '开发者选项开关：perf jank fps floatlog pauselog', usage: '/dev [项目] [on|off]（省略 on/off 为切换）',
    complete: function (tk) { return tk.length ? ['on', 'off'] : Object.keys(DEV); },
    run: function (a) {
      if (!a.length) {
        return Object.keys(DEV).map(function (k) { var el = $id(DEV[k][0]); return k.padEnd(9) + (el ? (el.checked ? '开' : '关') : '（设置页还没生成）') + '   ' + DEV[k][1]; }).join('\n');
      }
      var d = DEV[a[0].toLowerCase()];
      if (!d) throw new Error('项目：' + Object.keys(DEV).join(' / '));
      var el = $id(d[0]);
      if (!el) throw new Error('找不到 #' + d[0] + '，先打开一次设置页');
      var v = a[1] === 'on' || a[1] === '1' ? true : a[1] === 'off' || a[1] === '0' ? false : !el.checked;
      setSwitch(el, v);
      return d[1] + '：' + (el.checked ? '开' : '关');
    }
  });
  register('fps', {
    group: '开发者', desc: '帧率悬浮窗：on / off / 采样间隔毫秒（50–2000）', usage: '/fps [on|off|毫秒]', tapRun: false,
    complete: function () { return ['on', 'off', '100', '500', '1000']; },
    run: function (a) {
      var sw = $id('devFps');
      if (!a.length) return '帧率悬浮窗：' + (sw ? (sw.checked ? '开' : '关') : '（设置页还没生成）') + '，采样间隔 ' + (lsGet('dev_fps_interval') || 500) + 'ms';
      if (!sw) throw new Error('找不到 #devFps，先打开一次设置页');
      if (a[0] === 'on' || a[0] === 'off') { setSwitch(sw, a[0] === 'on'); return '帧率悬浮窗：' + (sw.checked ? '开' : '关'); }
      var ms = parseInt(a[0], 10);
      if (!(ms >= 50 && ms <= 2000)) throw new Error('用法：/fps on | off | 50–2000 的毫秒数');
      var sl = document.querySelector('#fpsIndicator .fpsSlider');
      if (!sl) throw new Error('找不到采样间隔滑块');
      if (!sw.checked) setSwitch(sw, true);
      sl.value = ms; sl.dispatchEvent(new Event('input', { bubbles: true }));
      return '采样间隔 ' + sl.value + 'ms';
    }
  });
  register('log', {
    group: '开发者', desc: '看最近的系统日志（SysLog）', usage: '/log [条数=20] [trace|debug|info|warn|error|fatal]',
    complete: function (tk) { return tk.length ? ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] : ['20', '50']; },
    run: function (a, c) {
      if (!window.SysLog) throw new Error('SysLog 没加载');
      var n = 20, lv = '';
      a.forEach(function (x) { if (/^\d+$/.test(x)) n = +x; else lv = x.toLowerCase(); });
      var RANK = { trace: 0, debug: 1, info: 2, warn: 3, error: 4, fatal: 5 };
      var rows = SysLog.entries().filter(function (e) { return !lv || RANK[e.level] >= RANK[lv]; }).slice(-n);
      if (!rows.length) return c.print('没有日志', 'info');
      function p2(x, l) { x = String(x); while (x.length < (l || 2)) x = '0' + x; return x; }
      rows.forEach(function (e) {
        var d = new Date(e.t);
        var t = p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds()) + '.' + p2(d.getMilliseconds(), 3);
        var kind = e.level === 'error' || e.level === 'fatal' ? 'err' : e.level === 'warn' ? 'warn' : e.level === 'info' ? 'ok' : 'info';
        c.print(t + ' ' + e.level.toUpperCase().padEnd(5) + ' [' + e.ns + '] ' + e.msg + (e.data !== undefined ? ' ' + fmt(e.data, 1) : ''), kind);
      });
    }
  });
  register('syslog', { group: '开发者', desc: '打开系统日志面板', run: function () { if (!window.__openSysLog) throw new Error('SysLog 没加载'); window.__openSysLog(); } });
  register('logpanel', { group: '开发者', desc: '打开全屏日志面板', run: function () { if (!window.__openLogPanel) throw new Error('日志面板没加载'); window.__openLogPanel(); } });
  register('perf', {
    group: '开发者', desc: '采样 1 秒帧率，并显示内存 / DOM 节点数',
    run: function (a, c) {
      c.print('采样 1 秒…', 'info');
      return new Promise(function (res) {
        var n = 0, t0 = 0;
        requestAnimationFrame(function f(t) {
          if (!t0) t0 = t; else n++;
          if (t - t0 < 1000) return requestAnimationFrame(f);
          var m = performance.memory;
          res('FPS ≈ ' + Math.round(n * 1000 / (t - t0))
            + (m ? '\n堆内存 ' + Math.round(m.usedJSHeapSize / 1048576) + ' / ' + Math.round(m.jsHeapSizeLimit / 1048576) + ' MB' : '')
            + '\nDOM 节点 ' + document.getElementsByTagName('*').length);
        });
      });
    }
  });

  /* 页面里 app 自己定义的全局：跟一个空 iframe 的全局对比，剩下的就是 app 的 */
  var baseNames = null;
  function appGlobals(onlyFn) {
    if (!baseNames) {
      baseNames = {};
      try {
        var f = document.createElement('iframe');
        f.style.display = 'none';
        document.body.appendChild(f);
        Object.getOwnPropertyNames(f.contentWindow).forEach(function (k) { baseNames[k] = 1; });
        f.remove();
      } catch (_) {}
    }
    var res = [];
    Object.getOwnPropertyNames(window).forEach(function (k) {
      if (baseNames[k] || k.indexOf('__') === 0 || /^(CmdConsole|SysLog|\$_)$/.test(k)) return;
      var desc = Object.getOwnPropertyDescriptor(window, k);
      if (!desc || !('value' in desc)) return;                      // 跳过 getter，避免触发副作用
      var isFn = typeof desc.value === 'function';
      if (onlyFn ? isFn : !isFn) res.push(k);
    });
    return res.sort();
  }
  register('fn', {
    group: '开发者', desc: '列出 app 定义的全局函数，可按关键字过滤', usage: '/fn [关键字]',
    run: function (a) {
      var kw = (a[0] || '').toLowerCase();
      var list = appGlobals(true).filter(function (k) { return !kw || k.toLowerCase().indexOf(kw) >= 0; });
      return list.length ? list.length + ' 个\n' + list.join('  ') : '没有匹配的函数';
    }
  });
  register('vars', {
    group: '开发者', desc: '列出 app 定义的全局变量和当前值，可按关键字过滤', usage: '/vars [关键字]',
    run: function (a) {
      var kw = (a[0] || '').toLowerCase();
      var list = appGlobals(false).filter(function (k) { return !kw || k.toLowerCase().indexOf(kw) >= 0; });
      if (!list.length) return '没有匹配的变量';
      return list.length + ' 个\n' + list.map(function (k) { var v; try { v = preview(window[k]); } catch (_) { v = '?'; } return k + ' = ' + v; }).join('\n');
    }
  });
  register('q', {
    group: '开发者', desc: '按 CSS 选择器查元素：数量、位置、尺寸', usage: '/q <选择器>', alias: ['dom'],
    run: function (a, c) {
      var sel = a.join(' ');
      if (!sel) throw new Error('用法：/q #stage');
      var list = document.querySelectorAll(sel);
      c.print('匹配 ' + list.length + ' 个', 'info');
      Array.prototype.slice.call(list, 0, 8).forEach(function (el) {
        var r = el.getBoundingClientRect(), cs = getComputedStyle(el);
        c.print(elTag(el) + '  ' + Math.round(r.width) + '×' + Math.round(r.height) + ' @' + Math.round(r.left) + ',' + Math.round(r.top)
          + '  display:' + cs.display + (cs.visibility !== 'visible' ? ' visibility:' + cs.visibility : '') + (cs.opacity !== '1' ? ' opacity:' + cs.opacity : ''), 'out');
      });
      if (list.length > 8) c.print('…还有 ' + (list.length - 8) + ' 个', 'info');
    }
  });

  /* ---- 存储 ---- */
  function lsKeys() { var ks = []; try { for (var i = 0; i < localStorage.length; i++) ks.push(localStorage.key(i)); } catch (_) {} return ks.sort(); }
  function kb(n) { return n >= 1024 ? (n / 1024).toFixed(1) + 'KB' : n + 'B'; }
  register('ls', {
    group: '存储', desc: '列出 localStorage 的 key 和大小，可按关键字过滤', usage: '/ls [关键字]',
    run: function (a) {
      var kw = (a[0] || '').toLowerCase(), total = 0;
      var rows = lsKeys().filter(function (k) { return !kw || k.toLowerCase().indexOf(kw) >= 0; }).map(function (k) {
        var n = (lsGet(k) || '').length; total += n; return k + '  ' + kb(n);
      });
      return rows.length ? rows.length + ' 项，共 ' + kb(total) + '\n' + rows.join('\n') : '没有匹配的 key';
    }
  });
  register('get', {
    group: '存储', desc: '读取一个 localStorage 值（超长只显示开头）', usage: '/get <key>',
    complete: function (tk) { return tk.length ? [] : lsKeys(); },
    run: function (a) {
      if (!a[0]) throw new Error('用法：/get <key>');
      var v = lsGet(a[0]);
      if (v === null) return '（不存在）';
      return (v.length > 1500 ? v.slice(0, 1500) + '\n…共 ' + kb(v.length) : v);
    }
  });
  register('set', {
    group: '存储', desc: '写入 localStorage（值里可以有空格）', usage: '/set <key> <值>',
    complete: function (tk) { return tk.length ? [] : lsKeys(); },
    run: function (a) {
      if (!a[0] || a.length < 2) throw new Error('用法：/set <key> <值>');
      var v = a.slice(1).join(' ');
      lsSet(a[0], v);
      return a[0] + ' = ' + short(v, 80) + '（刷新后生效的设置需要 /reload）';
    }
  });
  register('rm', {
    group: '存储', desc: '删除一个 localStorage key', usage: '/rm <key>',
    complete: function (tk) { return tk.length ? [] : lsKeys(); },
    run: function (a) {
      if (!a[0]) throw new Error('用法：/rm <key>');
      if (lsGet(a[0]) === null) return '（不存在）';
      try { localStorage.removeItem(a[0]); } catch (_) {}
      return '已删除 ' + a[0];
    }
  });

  /* ---- 命令窗口自身的设置 ---- */
  function onoff(a, cur) { return a === 'on' || a === '1' ? true : a === 'off' || a === '0' ? false : !cur; }
  register('console', {
    group: '开发者', desc: '把页面里 console.log / warn / error 的输出同步到这里（刷新后仍保持）', usage: '/console [on|off]',
    complete: function () { return ['on', 'off']; },
    run: function (a) {
      if (!a.length) return '同步 console：' + (mirrorOn ? '开' : '关');
      return '同步 console：' + (setMirror(onoff(a[0], mirrorOn)) ? '开' : '关');
    }
  });
  register('font', {
    group: '外观', desc: '命令窗口字号（10–18）', usage: '/font [10-18]',
    run: function (a) {
      if (!a.length) return '字号 ' + fontSize;
      var n = parseInt(a[0], 10);
      if (!(n >= 10 && n <= 18)) throw new Error('用法：/font 10–18');
      return '字号 ' + setFs(n);
    }
  });
  register('multi', {
    group: '外观', desc: '多行输入：开启后回车换行，点「执行」运行', usage: '/multi [on|off]',
    complete: function () { return ['on', 'off']; },
    run: function (a) { return '多行输入：' + (setMulti(onoff(a[0], multi)) ? '开' : '关'); }
  });

  /* ============================== 高级命令 ============================== */
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function timeStr(ts) { var d = new Date(ts); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds()); }
  /* 原始输入去掉「/命令名」和前 n 个参数后剩下的部分（命令、宏里的整段内容用它取） */
  function restOf(c, n) {
    var s = c.raw.replace(/^\s*\//, '').replace(/^\S+\s*/, '');
    for (var i = 0; i < n; i++) s = s.replace(/^\S+\s*/, '');
    return s;
  }
  function evalSafe(expr) { try { return (0, eval)(expr); } catch (_) { return undefined; } }
  function lsKeys() { var r = []; try { for (var i = 0; i < localStorage.length; i++) r.push(localStorage.key(i)); } catch (_) {} return r.sort(); }
  function lsAll() { var o = {}; lsKeys().forEach(function (k) { o[k] = lsGet(k); }); return o; }

  /* 统一的「执行一行」：/ 开头当命令，其它当 JS（alias / macro / repeat 都用它） */
  var lineDepth = 0;
  async function runLine(l) {
    l = String(l).replace(/^\s+|\s+$/g, '');
    if (!l) return;
    if (lineDepth > 6) throw new Error('嵌套太深（简称 / 宏互相调用了？）');
    lineDepth++;
    try { await routeLine(l); }
    finally { lineDepth--; }
  }

  /* ---------- /alias 简称 ---------- */
  register('alias', {
    group: '高级', desc: '给命令起简称：/alias 简称 完整命令；/alias -d 简称 删除；不带参数列出', usage: '/alias [简称 完整命令]  |  /alias -d 简称',
    complete: function (tk) { return tk[0] === '-d' ? Object.keys(uAlias) : ['-d']; },
    run: function (a, c) {
      if (!a.length) {
        var ks = Object.keys(uAlias);
        if (!ks.length) return c.print('还没有简称。例：/alias s /style 星空，之后输入 /s 就行', 'info');
        return c.print(ks.map(function (k) { return '/' + k + '  →  ' + uAlias[k]; }).join('\n'), 'out');
      }
      if (a[0] === '-d') {
        var k = (a[1] || '').replace(/^\//, '').toLowerCase();
        if (!uAlias[k]) throw new Error('没有简称 /' + k);
        delete uAlias[k]; lsSet('cmd_ualias', JSON.stringify(uAlias));
        return '已删除 /' + k;
      }
      var name = a[0].replace(/^\//, '').toLowerCase();
      if (!/^[\w\u4e00-\u9fa5-]+$/.test(name)) throw new Error('简称只能用字母、数字、下划线、短横线和汉字');
      if (cmds[name] || alias[name]) throw new Error('/' + name + ' 已经是内置命令，换一个简称');
      var line = restOf(c, 1).replace(/\s+$/, '');
      if (!line) throw new Error('用法：/alias 简称 完整命令');
      uAlias[name] = line; lsSet('cmd_ualias', JSON.stringify(uAlias));
      return '已设置 /' + name + '  →  ' + line;
    }
  });

  /* ---------- /macro 宏：把几条命令存成一组 ---------- */
  register('macro', {
    group: '高级', desc: '宏：把几条命令存成一组一次执行。命令之间用「空格;空格」隔开', usage: '/macro 名字  |  /macro add 名字 命令1 ; 命令2  |  /macro show 名字  |  /macro rm 名字',
    complete: function (tk) { return tk.length ? Object.keys(macros) : Object.keys(macros).concat(['add', 'show', 'rm']); },
    run: async function (a, c) {
      var sub = (a[0] || '').toLowerCase(), ks = Object.keys(macros);
      if (!a.length) {
        if (!ks.length) return c.print('还没有宏。例：/macro add 夜景 /theme 2 ; /style 星空 ; /goto 1', 'info');
        return c.print(ks.map(function (k) { return k + '  （' + macros[k].length + ' 步）'; }).join('\n'), 'out');
      }
      if (sub === 'add') {
        var nm = (a[1] || '').toLowerCase();
        if (!/^[\w\u4e00-\u9fa5-]+$/.test(nm) || nm === 'add' || nm === 'show' || nm === 'rm') throw new Error('名字只能用字母、数字、下划线、短横线和汉字，且不能叫 add / show / rm');
        var steps = restOf(c, 2).split(/\s+;\s+/).map(function (x) { return x.replace(/^\s+|\s+$/g, ''); }).filter(Boolean);
        if (!steps.length) throw new Error('用法：/macro add 名字 命令1 ; 命令2');
        macros[nm] = steps; lsSet('cmd_macro', JSON.stringify(macros));
        return '宏 ' + nm + ' 已保存（' + steps.length + ' 步），/macro ' + nm + ' 执行';
      }
      if (sub === 'rm' || sub === 'show') {
        var k = (a[1] || '').toLowerCase();
        if (!macros[k]) throw new Error('没有宏 ' + k);
        if (sub === 'show') return c.print(macros[k].map(function (l, i) { return (i + 1) + '. ' + l; }).join('\n'), 'out');
        delete macros[k]; lsSet('cmd_macro', JSON.stringify(macros));
        return '已删除宏 ' + k;
      }
      var m = macros[sub];
      if (!m) throw new Error('没有宏 ' + a[0] + '，/macro 查看全部');
      for (var i = 0; i < m.length; i++) {
        c.print('› ' + m[i], 'info');
        try { await runLine(m[i]); }
        catch (e) { throw new Error('宏在第 ' + (i + 1) + ' 步出错并已停止：' + (e && e.message ? e.message : e)); }
      }
    }
  });

  /* ---------- /repeat 定时重复 ---------- */
  var repeats = [], repId = 0;
  register('repeat', {
    group: '高级', desc: '重复执行：/repeat 次数 间隔毫秒 命令；/repeat stop [编号]；不带参数看正在跑的', usage: '/repeat 次数 间隔毫秒 命令  |  /repeat stop [编号]',
    complete: function (tk) { return tk.length ? [] : ['stop']; },
    run: function (a, c) {
      if (!a.length) {
        if (!repeats.length) return c.print('没有正在重复的任务', 'info');
        return c.print(repeats.map(function (r) { return '#' + r.id + '  ' + r.done + '/' + r.n + '  每 ' + r.ms + 'ms  ' + r.line; }).join('\n'), 'out');
      }
      if (a[0] === 'stop') {
        var want = a[1] ? parseInt(a[1], 10) : 0, n = 0;
        repeats = repeats.filter(function (r) { if (!want || r.id === want) { clearInterval(r.timer); n++; return false; } return true; });
        return n ? '已停止 ' + n + ' 个任务' : '没有匹配的任务';
      }
      var times = parseInt(a[0], 10), ms = parseInt(a[1], 10);
      if (!(times >= 1 && times <= 1000) || !(ms >= 50)) throw new Error('用法：/repeat 次数(1–1000) 间隔毫秒(≥50) 命令');
      var line = restOf(c, 2).replace(/\s+$/, '');
      if (!line) throw new Error('用法：/repeat 次数 间隔毫秒 命令');
      var rec = { id: ++repId, line: line, n: times, ms: ms, done: 0, timer: 0 };
      function tick() {
        rec.done++;
        print('↻ #' + rec.id + '  ' + rec.done + '/' + rec.n, 'info');
        runLine(line).catch(function (e) { print(errText(e), 'err'); });
        if (rec.done >= rec.n) { clearInterval(rec.timer); repeats = repeats.filter(function (r) { return r !== rec; }); }
      }
      repeats.push(rec);
      rec.timer = setInterval(tick, ms);
      tick();
      return '已开始 #' + rec.id + '：每 ' + ms + 'ms 执行一次，共 ' + times + ' 次；/repeat stop ' + rec.id + ' 可停止';
    }
  });

  /* ---------- /watch 盯变量 ---------- */
  var watches = [], watchTimer = 0;
  function watchShow(v) { var s; try { s = fmt(v); } catch (_) { s = '[无法显示]'; } return s.length > 300 ? s.slice(0, 300) + '…' : s; }
  function watchTick() {
    watches.forEach(function (w) {
      var s = watchShow(evalSafe(w.expr));
      if (w.init && s !== w.last) print(timeStr(Date.now()) + '  ' + w.expr + ':  ' + short(w.last.replace(/\n/g, ' '), 100) + '  →  ' + short(s.replace(/\n/g, ' '), 100), 'log');
      w.last = s; w.init = true;
    });
  }
  function watchSync() {
    if (watches.length && !watchTimer) watchTimer = setInterval(watchTick, 250);
    if (!watches.length && watchTimer) { clearInterval(watchTimer); watchTimer = 0; }
  }
  register('watch', {
    group: '开发者', desc: '盯着一个变量或表达式，值一变就打印。盯很大的对象会耗性能', usage: '/watch 变量或表达式  |  /watch -d 表达式|all  |  /watch',
    complete: function (tk) { if (tk.length) return []; try { return ['-d'].concat(appGlobals(false)); } catch (_) { return ['-d']; } },
    run: function (a, c) {
      if (!a.length) {
        if (!watches.length) return c.print('没有在盯的变量。例：/watch state.t', 'info');
        return c.print(watches.map(function (w) { return w.expr + '  =  ' + short(w.last.replace(/\n/g, ' '), 100); }).join('\n'), 'out');
      }
      if (a[0] === '-d') {
        var key = restOf(c, 1).replace(/\s+$/, '');
        var before = watches.length;
        watches = key === 'all' ? [] : watches.filter(function (w) { return w.expr !== key; });
        watchSync();
        return before !== watches.length ? '已取消' : '没有在盯 ' + key;
      }
      var expr = restOf(c, 0).replace(/\s+$/, '');
      if (watches.some(function (w) { return w.expr === expr; })) return '已经在盯 ' + expr;
      if (watches.length >= 12) throw new Error('最多同时盯 12 个');
      var cur = watchShow(evalSafe(expr));
      watches.push({ expr: expr, last: cur, init: true });
      watchSync();
      return '开始盯 ' + expr + '，当前：' + short(cur.replace(/\n/g, ' '), 120);
    }
  });

  /* ---------- /trace 追踪函数调用 ---------- */
  var traces = {}, traceRate = { t: 0, n: 0 };
  function traceLog(path, args, dt, res, err) {
    var now = Date.now();
    if (now - traceRate.t > 1000) { traceRate.t = now; traceRate.n = 0; }
    if (++traceRate.n > 30) return;                                  // 每秒最多 30 行，免得高频函数刷屏
    var a = Array.prototype.map.call(args, function (x) { return preview(x); }).join(', ');
    var tail = err ? '  ✗ ' + (err && err.message ? err.message : fmt(err)) : (res === undefined ? '' : '  → ' + short(preview(res), 60));
    print(timeStr(now) + '  ƒ ' + path + '(' + short(a, 80) + ')' + tail + '  · ' + dt.toFixed(dt < 10 ? 2 : 1) + 'ms' + (dt > 16 ? ' ⚠' : ''), err ? 'warn' : 'log');
  }
  function lexSet(name, fn) {                                       // 给用 let / var 声明（没挂在 window 上）的名字重新赋值；const 会失败
    window.__cmLexTmp = fn;
    try { (0, eval)(name + ' = window.__cmLexTmp'); } catch (_) { return false; }
    finally { try { delete window.__cmLexTmp; } catch (_) {} }
    return evalSafe(name) === fn;
  }
  function traceOff(path) {
    var t = traces[path]; if (!t) return false;
    try { if (t.lex) { if (evalSafe(t.key) === t.wrapper) lexSet(t.key, t.orig); } else if (t.owner[t.key] === t.wrapper) t.owner[t.key] = t.orig; } catch (_) {}
    delete traces[path];
    return true;
  }
  register('trace', {
    group: '开发者', desc: '追踪一个全局函数：每次被调用就记一行（参数、结果、耗时）。只能追踪之后才发生的调用', usage: '/trace 函数名  |  /trace -d 函数名|all  |  /trace',
    complete: function (tk) { if (tk.length) return Object.keys(traces); try { return ['-d'].concat(appGlobals(true)); } catch (_) { return ['-d']; } },
    run: function (a, c) {
      var ks = Object.keys(traces);
      if (!a.length) {
        if (!ks.length) return c.print('没有在追踪的函数。例：/trace nextLine', 'info');
        return c.print(ks.map(function (k) { var t = traces[k]; return k + '  调用 ' + t.n + ' 次，共 ' + t.ms.toFixed(1) + 'ms，平均 ' + (t.n ? (t.ms / t.n).toFixed(2) : '0') + 'ms'; }).join('\n'), 'out');
      }
      if (a[0] === '-d') {
        var key = a[1] || '';
        if (key === 'all') { ks.forEach(traceOff); return '已取消全部追踪'; }
        return traceOff(key) ? '已取消追踪 ' + key : '没有在追踪 ' + key;
      }
      var path = a[0];
      if (traces[path]) return '已经在追踪 ' + path;
      var parts = path.split('.'), name = parts.pop();
      var lex = false, owner = parts.length ? evalSafe(parts.join('.')) : window;
      if (!parts.length && typeof window[name] !== 'function' && /^[A-Za-z_$][\w$]*$/.test(name) && typeof evalSafe(name) === 'function') lex = true;   // let / var 声明、没挂在 window 上的函数
      if (!lex && (owner == null || typeof owner[name] !== 'function')) throw new Error(path + ' 不是函数（用 /lex 看看有哪些 let / const 名字）');
      var orig = lex ? evalSafe(name) : owner[name], rec = { owner: owner, key: name, orig: orig, lex: lex, n: 0, ms: 0, wrapper: null };
      var wrapper = function () {
        var args = arguments, t0 = performance.now(), r;
        rec.n++;
        function done(res, err) { try { var dt = performance.now() - t0; rec.ms += dt; traceLog(path, args, dt, res, err); } catch (_) {} }
        try { r = orig.apply(this, args); } catch (e) { done(undefined, e); throw e; }
        if (r && typeof r.then === 'function') r.then(function (v) { done(v); }, function (e) { done(undefined, e); });
        else done(r);
        return r;
      };
      if (lex) { if (!lexSet(name, wrapper)) throw new Error(name + ' 是用 const 声明的，不能被替换，无法追踪（可以用 /watch 看它的值）'); }
      else {
        try { owner[name] = wrapper; } catch (e) { throw new Error('无法替换 ' + path + '：' + e.message); }
        if (owner[name] !== wrapper) throw new Error(path + ' 是只读的，无法追踪');
      }
      rec.wrapper = wrapper; traces[path] = rec;
      return '开始追踪 ' + path + '（如果别处已经提前保存了这个函数的引用，那些调用追踪不到）';
    }
  });

  /* ---------- /jank 卡顿记录 ---------- */
  var jk = { on: false, raf: 0, last: 0, ev: [], po: null, t0: performance.now() };
  function jankCtx() {
    return [openState ? '窗口开' : '窗口关', root && root.classList.contains('kb') ? '键盘模式' : '', input && document.activeElement === input ? '输入框聚焦' : '',
      document.body && document.body.classList.contains('performance-mode') ? '省电模式' : ''].filter(Boolean).join(' · ');
  }
  function jankPush(dt, kind) {
    jk.ev.push({ at: performance.now() - jk.t0, dt: dt, kind: kind, ctx: jankCtx() });
    if (jk.ev.length > 100) jk.ev.shift();
  }
  function jankLoop(ts) {
    if (!jk.on) return;
    if (jk.last && !document.hidden) { var dt = ts - jk.last; if (dt > 50 && dt < 2000) jankPush(dt, '掉帧'); }
    jk.last = ts;
    jk.raf = requestAnimationFrame(jankLoop);
  }
  document.addEventListener('visibilitychange', function () { jk.last = 0; });
  function jankSet(on) {
    if (on === jk.on) return;
    jk.on = on;
    if (on) {
      jk.last = 0; jk.raf = requestAnimationFrame(jankLoop);
      try {
        if (window.PerformanceObserver && !jk.po) {
          jk.po = new PerformanceObserver(function (l) { l.getEntries().forEach(function (e) { jankPush(e.duration, '长任务'); }); });
          jk.po.observe({ entryTypes: ['longtask'] });
        }
      } catch (_) { jk.po = null; }
    } else {
      cancelAnimationFrame(jk.raf);
      if (jk.po) { try { jk.po.disconnect(); } catch (_) {} jk.po = null; }
    }
  }
  register('jank', {
    group: '开发者', desc: '卡顿记录：on 开始记录掉帧（帧间隔 >50ms）和长任务，然后正常操作，再 /jank 看结果', usage: '/jank [on|off|clear|条数]',
    complete: function () { return ['on', 'off', 'clear', '10', '30']; },
    run: function (a, c) {
      var s = (a[0] || '').toLowerCase();
      if (s === 'on') { jankSet(true); return '开始记录卡顿。去操作一下（弹出窗口、点输入框、收键盘…），再回来 /jank 看'; }
      if (s === 'off') { jankSet(false); return '已停止记录（已有的记录还在）'; }
      if (s === 'clear') { jk.ev = []; return '已清空'; }
      var n = parseInt(s, 10) || 12;
      var head = '监控：' + (jk.on ? '开' : '关') + '，共 ' + jk.ev.length + ' 次';
      if (!jk.ev.length) return c.print(head + (jk.on ? '。暂时没有卡顿' : '。先 /jank on'), 'info');
      var worst = jk.ev.reduce(function (m, e) { return Math.max(m, e.dt); }, 0);
      c.print(head + '，最长 ' + Math.round(worst) + 'ms', 'info');
      c.print(jk.ev.slice(-n).map(function (e) { return '+' + (e.at / 1000).toFixed(1) + 's  ' + e.kind + ' ' + Math.round(e.dt) + 'ms  ' + e.ctx; }).join('\n'), 'out');
    }
  });

  /* ---------- /err 错误收集（从脚本加载起一直在记） ---------- */
  var errs = ((window.__cmEarly && window.__cmEarly.errs) || []).slice(-100).map(function (x) { return { t: x.t || Date.now(), msg: x.msg || '启动异常', src: x.src || '', file: x.file || '', line: x.line || 0, column: x.column || 0, stack: x.stack || '' }; }), errLive = false;
  /* 合并 index.html 在 sys-log.js 加载前保存的异常。之前这份队列只进系统日志，/err 看不到。 */
  (window.__YiuEarlyErrors || []).forEach(function (x) {
    var d = x.detail || {}, msg = d.message || ('启动早期异常：' + (x.kind || 'unknown'));
    var src = d.file ? d.file + ':' + (d.line || 0) + ':' + (d.column || 0) : (d.url || '');
    var key = msg + '|' + src;
    if (!errs.some(function (old) { return old.msg + '|' + (old.src || '') === key; })) errs.push({ t: x.time ? (Date.parse(x.time) || Date.now()) : Date.now(), msg: msg, src: src, file: d.file || d.url || '', line: d.line || 0, column: d.column || 0, stack: d.stack || '' });
  });
  errs.sort(function (a, b) { return a.t - b.t; }); if (errs.length > 100) errs = errs.slice(-100);
  if (window.__cmEarly) window.__cmEarly.errOn = false;
  function errPush(msg, src, extra) {
    var e = Object.assign({ t: Date.now(), msg: msg, src: src || '', file: '', line: 0, column: 0, stack: '' }, extra || {});
    errs.push(e); if (errs.length > 100) errs.shift();
    if (errLive) print(timeStr(e.t) + '  ' + e.msg + (e.src ? '\n   ' + e.src : '') + (e.stack ? '\n' + e.stack : ''), 'err');
  }
  window.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t !== window && (t.src || t.href)) { errPush('资源加载失败：' + (t.src || t.href), '', { file: t.src || t.href, tag: t.nodeName || '' }); return; }
    var file = e.filename || '', line = e.lineno || 0, column = e.colno || 0, stack = e.error && e.error.stack ? String(e.error.stack) : '';
    errPush(e.message || fmt(e.error), file ? file + ':' + line + ':' + column : '', { file: file, line: line, column: column, stack: stack });
  }, true);
  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason, stack = r && r.stack ? String(r.stack) : '';
    errPush('未处理的 Promise 拒绝：' + (r && r.message ? r.message : fmt(r)), stack ? (stack.split('\n')[1] || '') : '', { stack: stack, file: r && r.fileName || '', line: r && r.lineNumber || 0, column: r && r.columnNumber || 0 });
  });
  register('err', {
    group: '开发者', desc: '页面里的报错和未捕获的 Promise 拒绝（不用开 /console 也会一直记）', usage: '/err [条数|clear|live [on|off]]',
    complete: function () { return ['clear', 'live', '10', '30']; },
    run: function (a, c) {
      var s = (a[0] || '').toLowerCase();
      if (s === 'clear') { errs = []; return '已清空'; }
      if (s === 'live') { errLive = onoff(a[1], errLive); return '新报错实时显示：' + (errLive ? '开' : '关'); }
      var n = parseInt(s, 10) || 15;
      if (!errs.length) return c.print('没有记录到报错', 'ok');
      c.print('共 ' + errs.length + ' 条，显示最近 ' + Math.min(n, errs.length) + ' 条', 'info');
      errs.slice(-n).forEach(function (e) { c.print(timeStr(e.t) + '  ' + e.msg + (e.src ? '\n   ' + e.src : '') + (e.stack ? '\n' + e.stack : ''), 'err'); });
    }
  });

  /* ---------- /css 查元素的样式 ---------- */
  var CSS_DEF = ['display', 'position', 'z-index', 'opacity', 'visibility', 'color', 'background-color', 'font-size', 'overflow', 'pointer-events', 'transform', 'backdrop-filter', 'box-shadow', 'transition'];
  register('css', {
    group: '开发者', desc: '查某个元素当前生效的样式；选择器带空格要加引号', usage: '/css <选择器> [属性…]   例：/css "#cmRoot .cm-panel" opacity z-index',
    run: function (a, c) {
      if (!a.length) throw new Error('用法：/css <选择器> [属性…]');
      var list; try { list = document.querySelectorAll(a[0]); } catch (e) { throw new Error('选择器不合法：' + a[0]); }
      if (!list.length) return c.print('没有匹配的元素', 'warn');
      var el = list[0], cs = getComputedStyle(el), r = el.getBoundingClientRect();
      var props = a.length > 1 ? a.slice(1) : CSS_DEF;
      var rows = [elTag(el) + '  共 ' + list.length + ' 个匹配', '位置 ' + Math.round(r.left) + ', ' + Math.round(r.top) + '   尺寸 ' + Math.round(r.width) + ' × ' + Math.round(r.height)];
      props.forEach(function (p) { var v = cs.getPropertyValue(p); if (v !== '') rows.push(p + ': ' + v); });
      return rows.join('\n');
    }
  });


  /* ---------- /cm 窗口高度 / 键盘动画设置（改完立刻生效，也不依赖设置页） ---------- */
  var CM_KEYS = { mode: 'dev_cm_mode', height: 'dev_cm_height', up: 'dev_cm_up', down: 'dev_cm_down', wait: 'dev_cm_wait' };
  var CM_HELP = {
    mode: '键盘避让模式：auto 自动 / manual 手动高度 / follow 跟随可视区域',
    height: '键盘弹出时窗口的最大高度（像素，默认 360；自动模式下改成非默认值也生效）',
    up: '点输入框时窗口缩小的动画毫秒数（默认 0 = 瞬间到位；调大会有动画，但页面可能被顶一下）',
    down: '键盘收起后窗口展开的动画毫秒数（默认 250）',
    wait: '键盘收起后等多少毫秒再开始展开（默认 40）'
  };
  register('cm', {
    group: '开发者', desc: '窗口高度 / 键盘升降的设置：/cm 看全部，/cm 项目 值 修改，/cm reset 恢复默认', usage: '/cm [mode|height|up|down|wait] [值]  |  /cm reset',
    complete: function (tk) {
      if (!tk.length) return Object.keys(CM_KEYS).concat(['reset']);
      return tk[0] === 'mode' ? ['auto', 'manual', 'follow'] : [];
    },
    run: function (a, c) {
      if (a[0] === 'reset') {
        Object.keys(CM_KEYS).forEach(function (k) { try { localStorage.removeItem(CM_KEYS[k]); } catch (_) {} });
        if (window.__cmCfgCheck) window.__cmCfgCheck();
        return '已恢复默认（mode auto，height 360，up 0，down 250，wait 40）';
      }
      var k = (a[0] || '').toLowerCase();
      if (k) {
        if (!CM_KEYS[k]) throw new Error('项目：' + Object.keys(CM_KEYS).join(' / '));
        if (a[1] === undefined) return k + ' = ' + (lsGet(CM_KEYS[k]) === null ? '（默认）' : lsGet(CM_KEYS[k])) + '\n' + CM_HELP[k];
        var v = a[1];
        if (k === 'mode') { v = v.toLowerCase(); if (['auto', 'manual', 'follow'].indexOf(v) < 0) throw new Error('mode 只能是 auto / manual / follow'); }
        else {
          var n = parseFloat(v);
          if (isNaN(n) || n < 0 || n > 5000) throw new Error(k + ' 需要 0–5000 的数字');
          if (k === 'height' && n < 120) throw new Error('height 至少 120');
          v = String(Math.round(n));
        }
        lsSet(CM_KEYS[k], v);
        if (window.__cmCfgCheck) window.__cmCfgCheck();
        return k + ' = ' + v + '（已生效）';
      }
      Object.keys(CM_KEYS).forEach(function (kk) {
        var raw = lsGet(CM_KEYS[kk]);
        c.print(kk.padEnd(7) + (raw === null ? '默认' : raw) + '    ' + CM_HELP[kk], 'li0');
      });
    }
  });

  /* ---------- /vv 键盘 / 视口诊断 ---------- */
  function safeArea() {
    var d = document.createElement('div');
    d.style.cssText = 'position:fixed;left:0;top:0;visibility:hidden;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
    document.body.appendChild(d);
    var cs = getComputedStyle(d), s = [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].join(' / ');
    d.remove();
    return s;
  }
  var vvRec = null;
  function vvSnap() {
    var v = window.visualViewport;
    return 'vv高 ' + (v ? Math.round(v.height) : '-') + '  偏移 ' + (v ? Math.round(v.offsetTop) : '-') + '  内高 ' + innerHeight + '  页滚 ' + Math.round(window.scrollY) +
      '  窗口高 ' + (root && root.style.height ? root.style.height : '满') + (root && root.style.transform ? '  位移 ' + root.style.transform : '') + (root && root.classList.contains('kb') ? '  [kb]' : '');
  }
  function vvStop(c) {
    if (!vvRec) return;
    clearInterval(vvRec.timer); clearTimeout(vvRec.end);
    if (input) { input.removeEventListener('focus', vvRec.onF); input.removeEventListener('blur', vvRec.onB); }
    var rows = vvRec.rows; vvRec = null;
    print('录制结束，共 ' + rows.length + ' 行变化。把下面这段发给我即可：', 'ok');
    print(rows.join('\n') || '（期间没有任何变化）', 'out');
  }
  register('vv', {
    group: '开发者', desc: '视口 / 键盘诊断：不带参数看现状；watch 录一段时间线；kb 看或设学到的键盘高度', usage: '/vv  |  /vv watch [秒=6]  |  /vv kb [像素|auto]',
    complete: function () { return ['watch', 'stop', 'kb']; },
    run: function (a, c) {
      var s = (a[0] || '').toLowerCase();
      if (s === 'stop') { if (!vvRec) return '没有在录'; vvStop(c); return; }
      if (s === 'watch') {
        if (vvRec) vvStop(c);
        var sec = Math.max(2, Math.min(30, parseInt(a[1], 10) || 6)), t0 = performance.now(), rows = [], last = '';
        function rec(tag) {
          var snap = vvSnap();
          if (!tag && snap === last) return;
          if (rows.length >= 150) return;
          rows.push('+' + Math.round(performance.now() - t0) + 'ms ' + (tag ? '[' + tag + '] ' : '') + snap);
          last = snap;
        }
        var onF = function () { rec('聚焦'); }, onB = function () { rec('失焦'); };
        input.addEventListener('focus', onF); input.addEventListener('blur', onB);
        vvRec = { rows: rows, onF: onF, onB: onB, timer: setInterval(function () { rec(''); }, 30), end: setTimeout(function () { vvStop(); }, sec * 1000) };
        rec('开始');
        return '开始录 ' + sec + ' 秒。现在去点输入框、等键盘弹出，再收起键盘（命令窗口要保持打开）';
      }
      if (s === 'kb') {
        if (!window.__cmSetKbH) throw new Error('命令窗口还没初始化');
        if (a[1]) {
          if (a[1] === 'auto') { window.__cmSetKbH(0); return '已清除，下次弹键盘时重新测量'; }
          var px = parseInt(a[1], 10);
          if (!(px >= 100 && px <= 700)) throw new Error('用法：/vv kb 100–700 的像素值，或 auto');
          window.__cmSetKbH(px); return '键盘高度设为 ' + px + 'px';
        }
        var d = window.__cmDbg ? window.__cmDbg() : {};
        return '学到的键盘高度：' + (d.kbH ? d.kbH + 'px' : '还没有（第一次会用屏幕高度的 47% 估算）');
      }
      var v = window.visualViewport, d2 = window.__cmDbg ? window.__cmDbg() : null;
      var rows2 = [
        '窗口 ' + innerWidth + ' × ' + innerHeight + '    屏幕 ' + screen.width + ' × ' + screen.height,
        'visualViewport ' + (v ? Math.round(v.width) + ' × ' + Math.round(v.height) + '  偏移 ' + Math.round(v.offsetLeft) + ', ' + Math.round(v.offsetTop) + '  缩放 ' + v.scale : '不支持'),
        '页面滚动 ' + Math.round(window.scrollY) + '    文档高 ' + document.documentElement.clientHeight,
        '安全区（上/右/下/左） ' + safeArea(),
        '独立 App 模式 ' + ((navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches)) ? '是' : '否') + '    触屏 ' + ((window.matchMedia && matchMedia('(pointer:coarse)').matches) ? '是' : '否')
      ];
      if (d2) rows2.push('命令窗口：模式 ' + d2.mode + '  基准高 ' + d2.baseH + '  键盘高 ' + (d2.kbH || '未学到') + '  当前高 ' + (d2.lastHt || '满') + '  弹出动画 ' + d2.up + 'ms  展开 ' + d2.down + 'ms  等待 ' + d2.wait + 'ms');
      return rows2.join('\n');
    }
  });

  /* ---------- /export /import /diff 存储搬运与对比 ---------- */
  register('export', {
    group: '存储', desc: '把 localStorage 导出成一段 JSON（可按关键字过滤），尽量复制到剪贴板', usage: '/export [关键字]',
    run: function (a, c) {
      var key = (a[0] || '').toLowerCase(), o = {}, all = lsAll();
      Object.keys(all).forEach(function (k) { if (!key || k.toLowerCase().indexOf(key) >= 0) o[k] = all[k]; });
      var json = JSON.stringify(o), n = Object.keys(o).length;
      if (!n) return c.print('没有匹配的项', 'warn');
      function showAll() { c.print(json, 'out'); c.print('共 ' + n + ' 项，' + json.length + ' 字符。长按上面的文字可手动复制；导入用 /import ' + '{…}', 'info'); }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(json).then(function () { c.print('已复制 ' + n + ' 项（' + json.length + ' 字符）到剪贴板。导入时：/import 加空格再粘贴', 'ok'); }, showAll);
      }
      showAll();
    }
  });
  register('import', {
    group: '存储', desc: '导入 /export 导出的 JSON，写回 localStorage；-n 只预览不写入', usage: '/import [-n] {JSON}',
    run: function (a, c) {
      var dry = a[0] === '-n', src = restOf(c, dry ? 1 : 0).replace(/^\s+|\s+$/g, '');
      if (!src) throw new Error('用法：/import {JSON}（先 /export 导出，再把内容粘贴在 /import 后面）');
      var o; try { o = JSON.parse(src); } catch (e) { throw new Error('JSON 解析失败：' + e.message); }
      if (!o || typeof o !== 'object' || Array.isArray(o)) throw new Error('需要是 {"key":"值"} 这样的对象');
      var ks = Object.keys(o), add = 0, chg = 0, same = 0;
      ks.forEach(function (k) {
        var nv = o[k] == null ? '' : String(o[k]), cur = lsGet(k);
        if (cur === null) add++; else if (cur !== nv) chg++; else same++;
        if (!dry) lsSet(k, nv);
      });
      return (dry ? '预览：' : '已导入：') + '新增 ' + add + '，修改 ' + chg + '，未变 ' + same + (dry ? '。去掉 -n 再执行才会写入' : '。需要的话 /reload 让设置生效');
    }
  });
  var snaps = {};
  var CM_DEFAULTS = { cmd_fs: '13', cmd_multi: '0', cmd_mirror: '0', dev_cm_mode: 'auto', dev_cm_up: '0', dev_cm_down: '250', dev_cm_wait: '40', dev_cm_height: '360' };
  register('diff', {
    group: '存储', desc: '对比 localStorage：/diff save 存一份快照，改完设置再 /diff 看变了什么；没有快照时对比命令窗口的默认值', usage: '/diff save [名字]  |  /diff [名字]',
    complete: function (tk) { return tk.length ? Object.keys(snaps) : ['save'].concat(Object.keys(snaps)); },
    run: function (a, c) {
      if ((a[0] || '').toLowerCase() === 'save') {
        var nm = a[1] || 'last';
        snaps[nm] = lsAll();
        return '已保存快照 ' + nm + '（' + Object.keys(snaps[nm]).length + ' 项，仅保存在内存里，刷新页面会丢）';
      }
      var name = a[0] || 'last', rows = [];
      if (snaps[name]) {
        var old = snaps[name], now = lsAll();
        Object.keys(now).forEach(function (k) {
          if (!(k in old)) rows.push('+ ' + k + ' = ' + short(now[k], 60));
          else if (old[k] !== now[k]) rows.push('~ ' + k + ':  ' + short(old[k], 40) + '  →  ' + short(now[k], 40));
        });
        Object.keys(old).forEach(function (k) { if (!(k in now)) rows.push('- ' + k); });
        return rows.length ? rows.join('\n') : '和快照 ' + name + ' 相比没有变化';
      }
      if (a[0]) throw new Error('没有快照 ' + a[0]);
      Object.keys(CM_DEFAULTS).forEach(function (k) { var v = lsGet(k); if (v !== null && v !== CM_DEFAULTS[k]) rows.push('~ ' + k + ':  默认 ' + CM_DEFAULTS[k] + '  →  ' + v); });
      return rows.length ? '命令窗口里改过的设置：\n' + rows.join('\n') : '命令窗口的设置都是默认值。想对比别的改动：先 /diff save，改完再 /diff';
    }
  });

  /* ---------- /cookie ---------- */
  function cookiePairs() {
    return document.cookie ? document.cookie.split(/;\s*/).map(function (p) { var i = p.indexOf('='); return i < 0 ? { k: p, v: '' } : { k: p.slice(0, i), v: p.slice(i + 1) }; }) : [];
  }
  function safeDecode(v) { try { return decodeURIComponent(v); } catch (_) { return v; } }
  register('cookie', {
    group: '存储', desc: '查看 / 修改 Cookie（读不到 HttpOnly 的）', usage: '/cookie [名字]  |  /cookie set 名字 值  |  /cookie rm 名字',
    complete: function (tk) { return tk.length ? cookiePairs().map(function (p) { return p.k; }) : ['set', 'rm'].concat(cookiePairs().map(function (p) { return p.k; })); },
    run: function (a, c) {
      var sub = (a[0] || '').toLowerCase(), ps = cookiePairs();
      if (sub === 'set') {
        if (!a[1]) throw new Error('用法：/cookie set 名字 值');
        document.cookie = a[1] + '=' + restOf(c, 2).replace(/\s+$/, '') + '; path=/; max-age=31536000';
        return cookiePairs().some(function (p) { return p.k === a[1]; }) ? '已设置 ' + a[1] : '没有设置成功（可能被浏览器策略或 Secure / SameSite 限制）';
      }
      if (sub === 'rm') {
        if (!a[1]) throw new Error('用法：/cookie rm 名字');
        document.cookie = a[1] + '=; path=/; max-age=0';
        return cookiePairs().some(function (p) { return p.k === a[1]; }) ? '没删掉（可能设置时带了别的 path / domain）' : '已删除 ' + a[1];
      }
      if (a[0] && !ps.some(function (p) { return p.k === a[0]; })) throw new Error('没有 Cookie ' + a[0]);
      if (a[0]) return c.print(safeDecode(ps.filter(function (p) { return p.k === a[0]; })[0].v), 'out');
      if (!ps.length) return c.print('没有可读取的 Cookie', 'info');
      c.print(ps.map(function (p) { return p.k + '  =  ' + short(safeDecode(p.v), 60); }).join('\n'), 'out');
    }
  });

  /* ---------- /idb IndexedDB ---------- */
  function idbP(req) { return new Promise(function (res, rej) { req.onsuccess = function () { res(req.result); }; req.onerror = function () { rej(req.error); }; }); }
  register('idb', {
    group: '存储', desc: '查看 IndexedDB：/idb 列出数据库；/idb 库名 看各仓库条数；/idb 库名 仓库 [条数] 看前几条', usage: '/idb [库名 [仓库 [条数]]]  |  /idb del 库名 确认',
    complete: function (tk) { return tk.length ? [] : ['del']; },
    run: async function (a, c) {
      if (!window.indexedDB) throw new Error('这个浏览器不支持 IndexedDB');
      if (!indexedDB.databases) throw new Error('这个浏览器不能列出数据库（Safari 14 以下）');
      var dbs = await indexedDB.databases();
      if (!a.length) {
        if (!dbs.length) return c.print('没有 IndexedDB 数据库', 'info');
        return c.print(dbs.map(function (d) { return d.name + '  v' + d.version; }).join('\n'), 'out');
      }
      if (a[0] === 'del') {
        var dn = a[1]; if (!dn) throw new Error('用法：/idb del 库名 确认');
        if (a[2] !== '确认') return '删除后无法恢复。确定的话输入：/idb del ' + dn + ' 确认';
        await new Promise(function (res, rej) { var rq = indexedDB.deleteDatabase(dn); rq.onsuccess = res; rq.onerror = function () { rej(rq.error); }; rq.onblocked = function () { rej(new Error('被占用，先关掉用到它的页面')); }; });
        return '已删除数据库 ' + dn;
      }
      var name = a[0];
      if (!dbs.some(function (d) { return d.name === name; })) throw new Error('没有数据库 ' + name + '，/idb 看全部');
      var db = await idbP(indexedDB.open(name));
      try {
        var names = [].slice.call(db.objectStoreNames);
        if (!a[1]) {
          if (!names.length) return c.print('这个数据库里没有仓库', 'info');
          for (var i = 0; i < names.length; i++) {
            var st = db.transaction(names[i], 'readonly').objectStore(names[i]), cnt = await idbP(st.count());
            c.print(names[i] + '  ' + cnt + ' 条    keyPath ' + JSON.stringify(st.keyPath) + (st.autoIncrement ? '  自增' : ''), 'out');
          }
          return;
        }
        var sn = a[1];
        if (names.indexOf(sn) < 0) throw new Error('没有仓库 ' + sn + '，可选：' + names.join(' / '));
        var n = Math.max(1, Math.min(50, parseInt(a[2], 10) || 5)), rows = [];
        await new Promise(function (res, rej) {
          var rq = db.transaction(sn, 'readonly').objectStore(sn).openCursor();
          rq.onsuccess = function () { var cur = rq.result; if (cur && rows.length < n) { rows.push({ k: cur.key, v: cur.value }); cur.continue(); } else res(); };
          rq.onerror = function () { rej(rq.error); };
        });
        if (!rows.length) return c.print('这个仓库是空的', 'info');
        c.print(rows.map(function (r) { return short(fmt(r.k).replace(/\n/g, ' '), 40) + '  →  ' + short(fmt(r.v).replace(/\n/g, ' '), 200); }).join('\n'), 'out');
      } finally { db.close(); }
    }
  });

  /* ---------- /cache 与 /sw ---------- */
  register('cache', {
    group: '存储', desc: '查看 Cache Storage：/cache 列出；/cache 名字 看里面的请求；/cache del 名字 确认', usage: '/cache [名字]  |  /cache del 名字 确认',
    complete: function (tk) { return tk.length ? [] : ['del']; },
    run: async function (a, c) {
      if (!window.caches) throw new Error('这个环境不支持 Cache Storage（需要 https）');
      var keys = await caches.keys();
      if (!a.length) {
        if (!keys.length) return c.print('没有缓存', 'info');
        for (var i = 0; i < keys.length; i++) { var ch = await caches.open(keys[i]); c.print(keys[i] + '  ' + (await ch.keys()).length + ' 个请求', 'out'); }
        return;
      }
      if (a[0] === 'del') {
        if (!a[1] || keys.indexOf(a[1]) < 0) throw new Error('没有缓存 ' + (a[1] || ''));
        if (a[2] !== '确认') return '删除后需要重新下载。确定的话输入：/cache del ' + a[1] + ' 确认';
        await caches.delete(a[1]); return '已删除缓存 ' + a[1];
      }
      if (keys.indexOf(a[0]) < 0) throw new Error('没有缓存 ' + a[0]);
      var reqs = await (await caches.open(a[0])).keys();
      c.print('共 ' + reqs.length + ' 个' + (reqs.length > 30 ? '，显示前 30 个' : ''), 'info');
      c.print(reqs.slice(0, 30).map(function (r) { return short(r.url.replace(location.origin, ''), 90); }).join('\n') || '（空）', 'out');
    }
  });
  register('sw', {
    group: '开发者', desc: 'Service Worker：/sw 看注册情况；/sw update 检查更新；/sw unregister 确认 注销', usage: '/sw [update|unregister 确认]',
    complete: function () { return ['update', 'unregister']; },
    run: async function (a, c) {
      if (!navigator.serviceWorker) throw new Error('这个环境不支持 Service Worker（需要 https）');
      var regs = await navigator.serviceWorker.getRegistrations();
      if (a[0] === 'update') { await Promise.all(regs.map(function (r) { return r.update(); })); return '已检查更新（' + regs.length + ' 个）'; }
      if (a[0] === 'unregister') {
        if (a[1] !== '确认') return '注销后离线缓存会失效。确定的话输入：/sw unregister 确认';
        await Promise.all(regs.map(function (r) { return r.unregister(); })); return '已注销 ' + regs.length + ' 个，刷新后生效';
      }
      if (!regs.length) return c.print('没有注册 Service Worker', 'info');
      c.print(regs.map(function (r) {
        var w = r.active || r.waiting || r.installing;
        return r.scope.replace(location.origin, '') + '\n  脚本 ' + (w ? w.scriptURL.replace(location.origin, '') : '-') + '\n  状态 ' + (r.active ? '运行中' : r.waiting ? '等待中' : '安装中') + (r.waiting ? '（有新版本等待激活）' : '');
      }).join('\n'), 'out');
    }
  });

  /* ---------- Tab 补全增强：localStorage 的 key ---------- */
  ['get', 'rm', 'set'].forEach(function (n) {
    var d = cmds[n];
    if (d && !d.complete) d.complete = function (tk) { return tk.length ? [] : lsKeys(); };
  });

  /* ============================== 打开 / 关闭 ============================== */
  function open() {
    if (openState) { if (input && window.__cmFocus) window.__cmFocus(); else if (input) input.focus(); return; }
    openState = true;
    build();
    clearTimeout(closeT); root.classList.remove('cm-off'); resetLayout();                            // 上次关得太快、还没来得及复位的话，先复位
    document.documentElement.classList.add('cm-open');
    root.setAttribute('aria-hidden', 'false');
    if (noteBaseFn) noteBaseFn();
    pinned = true; unread = 0;
    flush();
    out.scrollTop = out.scrollHeight;
    syncJump();
    autosize();
    void root.offsetWidth;                                          // 先按「收起」状态排好版，再加 show —— 这样第一次打开也有动画，不会直接蹦出来
    motion(420 / uiSpd());
    root.classList.add('show');
    kbModule.call('onOpen');                                        // 自带键盘每次打开都从收起状态开始
    if (window.__cmCfgWatch) window.__cmCfgWatch(true);
    // 手机上打开时先不弹键盘：先看输出，要输入时再点输入框（电脑上照旧自动聚焦）
    if (!customKbOn() && !(window.matchMedia && matchMedia('(pointer:coarse)').matches)) {
      try { input.focus({ preventScroll: true }); } catch (_) { input.focus(); }
    }
  }
  function close() {
    if (!openState) return;
    openState = false;
    try { if (window.__cmStopLive) window.__cmStopLive(); } catch (_) {}      // 关窗口时停掉「画布内存自动刷新」
    if (input) input.blur();
    motion(320 / uiSpd());
    if (window.__cmCfgWatch) window.__cmCfgWatch(false);
    kbModule.hide();                                               // 自带键盘跟着收（它在窗口外面，不会再随面板一起淡出）
    root.classList.remove('show');
    document.documentElement.classList.remove('cm-open');
    root.setAttribute('aria-hidden', 'true');
    // 键盘还开着时让面板保持缩小的样子淡出，等完全隐藏后再复位（以前是关的瞬间复位，面板会突然变高）
    clearTimeout(closeT);
    closeT = setTimeout(function () { resetLayout(); if (root && !openState) root.classList.add('cm-off'); }, 420 / uiSpd());
  }
  function toggle() { openState ? close() : open(); }

  /* ============================== /menu 常用指令菜单 ==============================
     /menu 列出分组 → 输入编号进入分组 → 再输入编号执行；也可以直接输两位（21 = 第 2 组第 1 项），或 /menu 21。
     菜单内容存在 localStorage（cmd_menu），可以用 /menu 加 / 删 / 改名 / 上移 / 下移 / 置顶 / 重置 自己改。 */
  (function () {
    var KEY = 'cmd_menu', IDLE = 120000, MAXK = 35;
    var st = null;                                                  // 菜单当前在等什么：g 选组 / i 选项 / arg 要输入值 / confirm 要确认 / code 要输入代码
    var animSaved = null;

    /* ---------- 小工具 ---------- */
    function mine(g) { return !!g.mine; }
    function bytes(n) { return n >= 1048576 ? (n / 1048576).toFixed(2) + ' MB' : n >= 1024 ? (n / 1024).toFixed(1) + ' KB' : n + ' B'; }
    function inCm(el) { return !!(el && el.closest && el.closest('#cmRoot')); }
    function media() { return Array.prototype.slice.call(document.querySelectorAll('audio,video')); }
    function rnd(x) { return Math.round(x); }
    function say(rows, kind) {                                      // 长列表分块输出，每块不超过 12 行，避免被折叠
      for (var i = 0; i < rows.length; i += 12) print(rows.slice(i, i + 12).join('\n'), kind || 'out');
    }
    function styleToggle(id, css) {
      var s = document.getElementById(id);
      if (s) { s.remove(); return false; }
      s = document.createElement('style'); s.id = id; s.textContent = css; document.head.appendChild(s);
      return true;
    }
    function nameOf(el) {
      if (!el) return '无父节点';
      if (el.id) return '#' + el.id;
      var cn = el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className;
      cn = String(cn || '').split(/\s+/)[0];
      return cn ? '.' + cn : el.nodeName.toLowerCase();
    }
    function canvasAll() { return Array.prototype.slice.call(document.querySelectorAll('canvas')); }
    function cDesc(c, i) {
      var r = c.getBoundingClientRect(), cs = getComputedStyle(c);
      var vis = cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0;
      return '#' + i + '  ' + (c.id ? '#' + c.id : '(无 id)') + '  父级 ' + nameOf(c.parentElement) + '  ' + c.width + '×' + c.height + '  ' + (vis ? '可见' : '不可见') + (c.isConnected ? '' : '  已脱离文档');
    }
    function lsEntries() {
      var rows = [];
      try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i), v = localStorage.getItem(k) || ''; rows.push({ k: k, n: k.length + v.length }); } } catch (_) {}
      return rows.sort(function (a, b) { return b.n - a.n; });
    }
    function safeArea() {
      var pr = document.createElement('div');
      pr.style.cssText = 'position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
      document.body.appendChild(pr);
      var cs = getComputedStyle(pr), r = '上 ' + cs.paddingTop + ' 右 ' + cs.paddingRight + ' 下 ' + cs.paddingBottom + ' 左 ' + cs.paddingLeft;
      pr.remove();
      return r;
    }
    function screenRows() {
      var vv = window.visualViewport, o = (window.screen && screen.orientation && screen.orientation.type) || (window.orientation !== undefined ? window.orientation + '°' : '未知');
      return [
        '屏幕 ' + screen.width + '×' + screen.height + '  像素比 ' + window.devicePixelRatio,
        '视口 ' + innerWidth + '×' + innerHeight + (vv ? '  可视视口 ' + rnd(vv.width) + '×' + rnd(vv.height) + '  缩放 ' + vv.scale + '  顶部偏移 ' + rnd(vv.offsetTop) : ''),
        '安全区 ' + safeArea(),
        '方向 ' + o
      ];
    }
    function envRows() {
      var ua = navigator.userAgent, ios = /iP(hone|ad|od)/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      return [
        'UA  ' + ua,
        '平台 ' + navigator.platform + '  ' + (ios ? 'iOS / iPadOS 设备' : '非 iOS 设备') + '  语言 ' + navigator.language,
        '触点 ' + navigator.maxTouchPoints + '  CPU 核数 ' + (navigator.hardwareConcurrency || '未知') + '  设备内存 ' + (navigator.deviceMemory ? navigator.deviceMemory + ' GB' : '浏览器不提供'),
        '协议 ' + location.protocol + '  安全上下文 ' + (window.isSecureContext ? '是' : '否') + '  独立应用模式 ' + (navigator.standalone ? '是' : '否'),
        '能力  IndexedDB ' + (window.indexedDB ? '有' : '无') + '  ServiceWorker ' + (navigator.serviceWorker ? '有' : '无') + '  CacheStorage ' + (window.caches ? '有' : '无') + '  剪贴板 ' + (navigator.clipboard ? '有' : '无') + '  WebGL ' + (function () { try { var c = document.createElement('canvas'); return (c.getContext('webgl2') ? 'WebGL2' : c.getContext('webgl') ? 'WebGL1' : '无'); } catch (_) { return '未知'; } })()
      ];
    }

    /* ---------- 内置功能（菜单项用 fn 名字引用） ---------- */
    var KEEP = ['cimg', 'bvOrb', 'bvCanvas'], HOSTS = ['sonnetHost', 'temperaHost', 'lumiereHost', 'partitaHost'];
    var UI_KEEP = '.pd-card, .pd-eg, #pdPv, #loC';                       // 界面自带的画布容器：里面的画布一律保留
    function uiOwned(c) { try { return !!c.closest(UI_KEEP); } catch (_) { return false; } }
    function canvasPlan() {
      var all = canvasAll().filter(function (c) { return !inCm(c); }), last = {}, keep = [], kill = [];
      HOSTS.forEach(function (h) { var el = document.getElementById(h); if (!el) return; var cs = el.querySelectorAll('canvas'); if (cs.length) last[h] = cs[cs.length - 1]; });
      all.forEach(function (c, i) {
        var why = '', host = '';
        HOSTS.forEach(function (h) { var el = document.getElementById(h); if (el && el.contains(c)) host = h; });
        if (c.id && KEEP.indexOf(c.id) >= 0) why = '界面自带画布';
        else if (uiOwned(c)) why = '界面自带画布（白名单容器）';
        else if (host && last[host] === c) why = '#' + host + ' 里最新的一块（引擎在用）';
        if (why) keep.push({ c: c, i: i, why: why });
        else kill.push({ c: c, i: i, why: host ? '#' + host + ' 里的旧画布' : '不在任何已知容器里' });
      });
      return { keep: keep, kill: kill };
    }
    var FN = {
      cvCount: function () { print('当前共有 ' + canvasAll().length + ' 个画布', 'ok'); },
      cvList: function () {
        var all = canvasAll();
        if (!all.length) return print('页面里没有画布', 'info');
        print('共 ' + all.length + ' 个画布', 'info');
        say(all.map(cDesc));
      },
      cvClean: function () {
        var pl = canvasPlan();
        print('保留 ' + pl.keep.length + ' 个，准备清理 ' + pl.kill.length + ' 个', 'info');
        if (pl.keep.length) say(pl.keep.map(function (k) { return '保留 ' + cDesc(k.c, k.i) + '  ← ' + k.why; }), 'ok');
        if (!pl.kill.length) return print('没有需要清理的画布', 'ok');
        say(pl.kill.map(function (k) { return '清理 ' + cDesc(k.c, k.i) + '  ← ' + k.why; }), 'warn');
        return {
          confirm: '确认清理以上 ' + pl.kill.length + ' 个画布？输入 y 确认，其他取消',
          go: function () {
            var n = 0;
            pl.kill.forEach(function (k) {
              var c = k.c;
              try { var gl = c.getContext('webgl2') || c.getContext('webgl'); if (gl) { var ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); } } catch (_) {}
              if (c.parentNode) c.parentNode.removeChild(c);
              n++;
            });
            print('已清理 ' + n + ' 个画布，剩余 ' + canvasAll().length + ' 个', 'ok');
          }
        };
      },
      cvMem: function () {
        var all = canvasAll().filter(function (c) { return !inCm(c); });
        if (!all.length) return print('页面里没有画布', 'info');
        var rows = all.map(function (c, i) { return { i: i, c: c, b: c.width * c.height * 4 }; }), tot = 0;
        rows.forEach(function (r) { tot += r.b; });
        rows.sort(function (a, b) { return b.b - a.b; });
        print('共 ' + all.length + ' 个画布，像素数据约 ' + bytes(tot) + '（宽×高×4 字节的估算，WebGL 实际占用通常更多）', 'info');
        say(rows.slice(0, 10).map(function (r) { return bytes(r.b) + '  ' + cDesc(r.c, r.i); }));
      },
      webgl: function () {
        var c = document.createElement('canvas'), gl = null, v2 = false;
        try { gl = c.getContext('webgl2'); v2 = !!gl; if (!gl) gl = c.getContext('webgl') || c.getContext('experimental-webgl'); } catch (_) {}
        if (!gl) return print('此环境创建不了 WebGL 上下文', 'err');
        var dbg = gl.getExtension('WEBGL_debug_renderer_info'), vp = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
        say([
          'WebGL2 ' + (v2 ? '支持' : '不支持（只有 WebGL1）'),
          '显卡 ' + (dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) + '（浏览器隐藏了真实型号）'),
          '版本 ' + gl.getParameter(gl.VERSION),
          '最大贴图尺寸 ' + gl.getParameter(gl.MAX_TEXTURE_SIZE) + '  最大渲染缓冲 ' + gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) + '  最大视口 ' + (vp ? vp[0] + '×' + vp[1] : '未知'),
          '贴图单元 ' + gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS) + '  扩展 ' + ((gl.getSupportedExtensions() || []).length) + ' 个'
        ]);
        try { var e = gl.getExtension('WEBGL_lose_context'); if (e) e.loseContext(); } catch (_) {}
      },
      engines: function () {
        var names = Object.keys(window).filter(function (k) { return /lumiere|tempera|sonnet|partita|pixi|visualizer/i.test(k); }), rows = [];
        if (!names.length) rows.push('没有找到名字里带 Lumiere / Tempera / Sonnet / Partita / Pixi / Visualizer 的全局对象');
        names.forEach(function (k) {
          var v = window[k], t = typeof v, ks = '';
          if (v && (t === 'object' || t === 'function')) { try { ks = '  成员：' + Object.keys(v).slice(0, 6).join(', '); } catch (_) {} }
          rows.push(k + '  ' + t + ks);
        });
        ['sonnetHost', 'temperaHost', 'lumiereHost', 'stage'].forEach(function (h) {
          var el = document.getElementById(h);
          rows.push('#' + h + '  ' + (el ? '存在，里面有 ' + el.querySelectorAll('canvas').length + ' 个画布' : '不存在'));
        });
        say(rows);
      },
      scripts: function () {
        var ss = Array.prototype.slice.call(document.scripts), ext = ss.filter(function (s) { return s.src; });
        var rows = ext.map(function (s) {
          var f = s.src.split('?')[0].split('/').slice(-2).join('/'), e = window.performance && performance.getEntriesByName ? performance.getEntriesByName(s.src)[0] : null;
          return f + (e && (e.transferSize || e.encodedBodySize) ? '  ' + bytes(e.transferSize || e.encodedBodySize) + '  ' + rnd(e.duration) + 'ms' : '  （没有大小 / 耗时数据）');
        });
        print('共 ' + ss.length + ' 个脚本，其中外部文件 ' + ext.length + ' 个、内联 ' + (ss.length - ext.length) + ' 个', 'info');
        say(rows);
      },

      audioStatus: function () {
        var ms = media();
        if (!ms.length) return print('页面里没有 audio / video 元素', 'info');
        say(ms.map(function (m, i) {
          return '#' + i + ' <' + m.nodeName.toLowerCase() + '>  ' + (m.currentSrc ? m.currentSrc.split('/').pop().slice(0, 40) : '(无来源)') + '\n   ' + (m.paused ? '已暂停' : '播放中') + '  ' + m.currentTime.toFixed(1) + ' / ' + (isFinite(m.duration) ? m.duration.toFixed(1) : '未知') + ' 秒  音量 ' + m.volume + (m.muted ? '（静音）' : '') + '  速度 ' + m.playbackRate + '\n   readyState ' + m.readyState + '  networkState ' + m.networkState + (m.error ? '  错误码 ' + m.error.code : '');
        }));
      },
      setSpeed: function (arg) {
        var v = parseFloat(arg), ms = media();
        if (!(v >= 0.25 && v <= 4)) return print('请输入 0.25 到 4 之间的数字，例如 0.75、1、1.25、1.5', 'err');
        if (!ms.length) return print('页面里没有 audio / video 元素', 'warn');
        ms.forEach(function (m) { try { m.playbackRate = v; } catch (_) {} });
        print('已把 ' + ms.length + ' 个媒体的播放速度设为 ' + v, 'ok');
      },
      setVolume: function (arg) {
        var v = parseFloat(arg), ms = media();
        if (!(v >= 0 && v <= 100)) return print('请输入 0 到 100 之间的数字', 'err');
        if (!ms.length) return print('页面里没有 audio / video 元素', 'warn');
        var bad = 0;
        ms.forEach(function (m) { try { m.volume = v / 100; } catch (_) {} if (Math.abs(m.volume - v / 100) > 0.01) bad++; });
        print('已把 ' + ms.length + ' 个媒体的音量设为 ' + v + '%', 'ok');
        if (bad) print('有 ' + bad + ' 个媒体没有变化：iOS 上网页通常不能改音量，请用系统音量键', 'warn');
      },
      stopMedia: function () {
        var ms = media(), n = 0;
        ms.forEach(function (m) { if (!m.paused) { try { m.pause(); n++; } catch (_) {} } });
        print('页面里共 ' + ms.length + ' 个媒体，已暂停 ' + n + ' 个正在播放的', n ? 'ok' : 'info');
      },

      overflow: function () {
        var W = document.documentElement.clientWidth || innerWidth, els = document.body.querySelectorAll('*'), rows = [], total = 0;
        for (var i = 0; i < els.length; i++) {
          var el = els[i]; if (inCm(el)) continue;
          var r = el.getBoundingClientRect();
          if (!r.width || !r.height) continue;
          if (r.right > W + 1 || r.left < -1) {
            var cs = getComputedStyle(el);
            if (cs.display === 'none' || cs.visibility === 'hidden') continue;
            total++;
            if (rows.length < 30) rows.push(elTag(el) + '  左 ' + rnd(r.left) + '  右 ' + rnd(r.right) + '  宽 ' + rnd(r.width));
          }
        }
        print('视口宽 ' + W + '，页面横向滚动宽 ' + document.documentElement.scrollWidth + (document.documentElement.scrollWidth > W + 1 ? '（页面能横向滚动）' : '（页面不能横向滚动）'), 'info');
        if (!total) return print('没有超出屏幕左右边缘的可见元素', 'ok');
        print('共 ' + total + ' 个超出屏幕左右边缘的元素' + (total > rows.length ? '，显示前 ' + rows.length + ' 个' : '') + '（轮播、滑出的面板本来就会超出，不一定是问题）', 'warn');
        say(rows);
      },
      centerStack: function () {
        var x = innerWidth / 2, y = innerHeight / 2;
        if (!document.elementsFromPoint) return print('此环境不支持 elementsFromPoint', 'err');
        var arr = document.elementsFromPoint(x, y).filter(function (e) { return !inCm(e); });
        print('屏幕中心 (' + rnd(x) + ', ' + rnd(y) + ') 处从上到下共 ' + arr.length + ' 层（只算能接收点击的元素）', 'info');
        say(arr.slice(0, 20).map(function (e, i) {
          var cs = getComputedStyle(e);
          return (i + 1) + '. ' + elTag(e) + '  ' + cs.position + '  z ' + cs.zIndex + '  透明度 ' + cs.opacity;
        }));
      },
      outline: function () {
        var on = styleToggle('cmMenuOutline', 'body *{outline:1px solid rgba(255,70,70,.65)!important}#cmRoot,#cmRoot *{outline:none!important}');
        print('轮廓线已' + (on ? '开启，再选一次关闭' : '关闭'), 'ok');
      },
      hideUi: function () {
        var on = styleToggle('cmMenuHideUi', 'body *{visibility:hidden!important}canvas{visibility:visible!important}#cmRoot.show,#cmRoot.show *{visibility:visible!important}');
        print(on ? '界面已隐藏，只剩画布。关掉命令窗口就能看到背景；再打开窗口、再选一次恢复' : '界面已恢复', 'ok');
      },
      domStats: function () {
        var els = document.getElementsByTagName('*'), tags = {}, top = [], maxD = 0;
        for (var i = 0; i < els.length; i++) {
          var e = els[i], t = e.nodeName.toLowerCase(), d = 0, p = e;
          tags[t] = (tags[t] || 0) + 1;
          while ((p = p.parentNode) && p.nodeType === 1) d++;
          if (d > maxD) maxD = d;
          top.push(e);
        }
        top.sort(function (a, b) { return b.childElementCount - a.childElementCount; });
        var tg = Object.keys(tags).sort(function (a, b) { return tags[b] - tags[a]; }).slice(0, 6).map(function (k) { return k + ' ' + tags[k]; }).join('，');
        print('DOM 节点共 ' + els.length + ' 个，最深 ' + maxD + ' 层', 'info');
        print('数量最多的标签：' + tg, 'out');
        say(['子元素最多的前 10 个：'].concat(top.slice(0, 10).map(function (e) { return e.childElementCount + ' 个  ' + elTag(e); })));
      },
      fixedList: function () {
        var els = document.body.querySelectorAll('*'), rows = [], n = Math.min(els.length, 8000);
        for (var i = 0; i < n && rows.length < 30; i++) {
          var e = els[i]; if (inCm(e)) continue;
          var cs = getComputedStyle(e);
          if (cs.position === 'fixed' || cs.position === 'sticky') {
            var r = e.getBoundingClientRect();
            rows.push(cs.position + '  ' + elTag(e) + '  ' + rnd(r.width) + '×' + rnd(r.height) + '  z ' + cs.zIndex);
          }
        }
        if (!rows.length) return print('没有 fixed / sticky 定位的元素', 'info');
        print('找到 ' + rows.length + (rows.length >= 30 ? '+' : '') + ' 个 fixed / sticky 元素' + (els.length > n ? '（只检查了前 8000 个节点）' : ''), 'info');
        say(rows);
      },

      animToggle: function () {
        if (!animSaved) {
          animSaved = { anims: [] };
          var list = document.getAnimations ? document.getAnimations() : [];   // 先数再暂停：样式一加上，动画就不再是 running 了
          list.forEach(function (a) {
            if (a.playState !== 'running') return;
            var t = a.effect && a.effect.target;
            if (t && inCm(t)) return;
            try { a.pause(); animSaved.anims.push(a); } catch (_) {}
          });
          styleToggle('cmMenuAnim', 'body>:not(#cmRoot),body>:not(#cmRoot) *{animation-play-state:paused!important}');
          print('已暂停 ' + animSaved.anims.length + ' 个 CSS 动画 / 过渡。再选一次恢复', 'ok');
          print('提示：用 requestAnimationFrame 驱动的动画（画布、Pixi 等）不受影响', 'info');
        } else {
          var s = document.getElementById('cmMenuAnim'); if (s) s.remove();
          animSaved.anims.forEach(function (a) { try { a.play(); } catch (_) {} });
          animSaved = null;
          print('已恢复动画', 'ok');
        }
      },
      blurToggle: function () {
        var on = styleToggle('cmMenuBlur', 'body>:not(#cmRoot),body>:not(#cmRoot) *{-webkit-backdrop-filter:none!important;backdrop-filter:none!important;filter:none!important}');
        print('全部模糊 / 滤镜效果已' + (on ? '关闭（用来判断卡顿是不是模糊引起的），再选一次恢复' : '恢复'), 'ok');
      },
      perfToggle: function () {
        var el = document.getElementById('performanceMode');
        if (el) el.click(); else document.body.classList.toggle('performance-mode');
        print('性能模式现在：' + (document.body.classList.contains('performance-mode') ? '开' : '关'), 'ok');
      },
      loadTiming: function () {
        var nav = window.performance && performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null, rows = [];
        if (nav) {
          rows.push('DOM 解析完成 ' + rnd(nav.domContentLoadedEventEnd) + ' ms');
          rows.push('页面 load 完成 ' + rnd(nav.loadEventEnd) + ' ms');
          rows.push('响应结束 ' + rnd(nav.responseEnd) + ' ms');
        }
        var paints = window.performance && performance.getEntriesByType ? performance.getEntriesByType('paint') : [];
        paints.forEach(function (p) { rows.push(p.name + ' ' + rnd(p.startTime) + ' ms'); });
        if (!rows.length || rows.every(function (r) { return /\s0 ms$/.test(r); })) return print('此环境没有页面加载耗时数据（file:// 打开时常见）', 'warn');
        say(rows);
      },

      screenInfo: function () { say(screenRows()); },
      envInfo: function () { say(envRows()); },
      netInfo: function () {
        var cn = navigator.connection, rows = ['网络 ' + (navigator.onLine ? '在线' : '离线')];
        rows.push(cn ? '类型 ' + (cn.effectiveType || '未知') + '  下行 ' + (cn.downlink || '?') + ' Mbps  延迟 ' + (cn.rtt || '?') + ' ms' + (cn.saveData ? '  省流量模式' : '') : '此环境不提供网络类型信息');
        say(rows);
      },
      quota: function () {
        if (!navigator.storage || !navigator.storage.estimate) return print('此环境不支持存储配额查询', 'warn');
        return navigator.storage.estimate().then(function (e) {
          print('已用 ' + bytes(e.usage || 0) + ' / 配额 ' + bytes(e.quota || 0) + (e.quota ? '（' + ((e.usage || 0) / e.quota * 100).toFixed(2) + '%）' : ''), 'ok');
        }, function (e) { print('查询失败：' + (e && e.message), 'err'); });
      },

      lsTop: function () {
        var rows = lsEntries(), tot = 0;
        rows.forEach(function (r) { tot += r.n; });
        if (!rows.length) return print('localStorage 是空的', 'info');
        print('共 ' + rows.length + ' 项，约 ' + bytes(tot * 2) + '（按每字符 2 字节估算）。占用最大的前 10 项：', 'info');
        say(rows.slice(0, 10).map(function (r) { return bytes(r.n * 2) + '  ' + r.k; }));
      },
      kbReset: function () {
        if (!window.__cmSetKbH) return print('命令窗口还没初始化', 'err');
        window.__cmSetKbH(0);
        print('已清除当前方向（竖屏 / 横屏各记各的）的键盘高度，下次点输入框时重新测量', 'ok');
      },
      cacheClear: function () {
        if (!window.caches) return print('此环境不支持 Cache Storage', 'warn');
        return caches.keys().then(function (ks) {
          if (!ks.length) return print('没有 Cache Storage', 'info');
          print('将清空 ' + ks.length + ' 个缓存：\n' + ks.join('\n'), 'out');
          return { confirm: '确认清空？输入 y 确认，其他取消', go: function () { return Promise.all(ks.map(function (k) { return caches.delete(k); })).then(function () { print('已清空 ' + ks.length + ' 个缓存', 'ok'); }); } };
        });
      },
      swUnreg: function () {
        if (!navigator.serviceWorker || !navigator.serviceWorker.getRegistrations) return print('此环境不支持 Service Worker', 'warn');
        return navigator.serviceWorker.getRegistrations().then(function (rs) {
          if (!rs.length) return print('没有注册的 Service Worker', 'info');
          print('将注销 ' + rs.length + ' 个 Service Worker：\n' + rs.map(function (r) { return r.scope; }).join('\n'), 'out');
          return { confirm: '确认注销？输入 y 确认，其他取消', go: function () { return Promise.all(rs.map(function (r) { return r.unregister(); })).then(function () { print('已注销 ' + rs.length + ' 个', 'ok'); }); } };
        });
      },

      copyNew: function () { copyNew(); },
      diag: async function () {
        var L = [], now = new Date();
        L.push('=== 诊断包 ' + now.toLocaleString() + ' ===');
        L.push('页面 ' + location.href.split('?')[0]);
        L = L.concat(envRows(), screenRows());
        var cv = canvasAll().filter(function (c) { return !inCm(c); }), tot = 0;
        cv.forEach(function (c) { tot += c.width * c.height * 4; });
        L.push('--- 画布 ' + cv.length + ' 个，像素数据约 ' + bytes(tot) + ' ---');
        cv.slice(0, 12).forEach(function (c, i) { L.push(cDesc(c, i)); });
        var ms = media();
        L.push('--- 媒体 ' + ms.length + ' 个 ---');
        ms.forEach(function (m, i) { L.push('#' + i + ' ' + (m.paused ? '暂停' : '播放中') + ' ' + m.currentTime.toFixed(1) + '/' + (isFinite(m.duration) ? m.duration.toFixed(1) : '?') + 's 音量 ' + m.volume + ' 速度 ' + m.playbackRate + (m.error ? ' 错误码 ' + m.error.code : '')); });
        var names = Object.keys(window).filter(function (k) { return /lumiere|tempera|sonnet|partita|pixi/i.test(k); });
        L.push('--- 引擎相关全局对象：' + (names.join(', ') || '无') + ' ---');
        L.push('DOM 节点 ' + document.getElementsByTagName('*').length + ' 个；body class：' + (document.body.className || '无') + '；html class：' + (document.documentElement.className || '无'));
        var ls = lsEntries(), lt = 0; ls.forEach(function (r) { lt += r.n; });
        L.push('--- localStorage ' + ls.length + ' 项，约 ' + bytes(lt * 2) + '；最大 5 项 ---');
        ls.slice(0, 5).forEach(function (r) { L.push(bytes(r.n * 2) + '  ' + r.k); });
        if (navigator.storage && navigator.storage.estimate) { try { var q = await navigator.storage.estimate(); L.push('存储配额 已用 ' + bytes(q.usage || 0) + ' / ' + bytes(q.quota || 0)); } catch (_) {} }
        L.push('--- 最近报错（最多 8 条）---');
        if (!errs.length) L.push('没有记录到报错');
        errs.slice(-8).forEach(function (e) { L.push(timeStr(e.t) + '  ' + e.msg + (e.src ? '  ' + e.src : '')); });
        if (window.SysLog && SysLog.entries) {
          var se = SysLog.entries().filter(function (e) { return e.level === 'warn' || e.level === 'error' || e.level === 'fatal'; }).slice(-10);
          L.push('--- 系统日志里最近的 warn / error（最多 10 条）---');
          if (!se.length) L.push('没有 warn / error');
          se.forEach(function (e) { L.push(timeStr(e.t) + ' ' + String(e.level).toUpperCase() + ' [' + e.ns + '] ' + short(e.msg, 160)); });
        }
        var text = L.join('\n');
        print(text, 'out');
        writeClip(text, '已复制诊断包（' + text.length + ' 字符），直接粘贴发给我即可');
      }
    };

    /* ---------- 第二批命令：画布 / 引擎 / 性能盘点 / 探针 / 快照 ---------- */
    var engines0 = FN.engines;
    var NEWFN = (function () {
      var memTimer = 0, hiddenCv = [], bgSim = false, snap = null;
      var ENG = [{ k: 'sonnet', n: '商籁', g: 'SonnetRuntime' }, { k: 'tempera', n: '凝彩', g: 'TemperaRuntime' }, { k: 'lumiere', n: '绘光', g: 'LumiereRuntime' }];

      function pcv() { return canvasAll().filter(function (c) { return !inCm(c); }); }
      function cd1(c, i) { return cDesc(c, i).replace(/^#\d+/, '[' + (i + 1) + ']'); }       // 本批命令的编号从 1 开始（0 留给「取消」）
      function parseSel(s, n) {                                                                // 3 / 3,5,7 / 2-6 → 0 起的下标
        var out = {};
        String(s || '').split(/[\s,，、;；]+/).forEach(function (t) {
          if (!t) return;
          var m = /^(\d+)\s*[-~～到至]\s*(\d+)$/.exec(t);
          if (m) { var a = +m[1], b = +m[2], x; if (a > b) { x = a; a = b; b = x; } for (var i = a; i <= b; i++) if (i >= 1 && i <= n) out[i - 1] = 1; return; }
          if (/^\d+$/.test(t) && +t >= 1 && +t <= n) out[+t - 1] = 1;
        });
        return Object.keys(out).map(Number).sort(function (a, b) { return a - b; });
      }
      function killCanvas(c) {
        try { var gl = c.getContext('webgl2') || c.getContext('webgl'); if (gl) { var ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); } } catch (_) {}
        if (c.parentNode) c.parentNode.removeChild(c);
      }
      function pxBytes(list) { var t = 0; list.forEach(function (c) { t += c.width * c.height * 4; }); return t; }
      function probeOf() {
        var E = window.__cmEarly;
        if (!E || !E.probe) { print('找不到 cmd-early.js 里的探针（__cmEarly.probe）：确认 cmd-early.js 是新版，并且在 <head> 里最先加载', 'err'); return null; }
        return E.probe;
      }
      function top(obj, n) {
        return Object.keys(obj).map(function (k) { return { k: k, n: obj[k].n }; }).sort(function (a, b) { return b.n - a.n; }).slice(0, n);
      }

      /* ---- 引擎状态 ---- */
      function engState(e) {
        var L = window.__EngineLoader, urls = (L && L.groups && L.groups[e.k]) || [], res = [];
        try { res = performance.getEntriesByType('resource'); } catch (_) {}
        var files = urls.map(function (u) {
          var tail = u.split('?')[0].replace(/^\.\//, ''), hit = null;
          res.forEach(function (r) { var nm = r.name.split('?')[0]; if (nm.slice(-tail.length) === tail) hit = r; });
          return { name: tail.split('/').pop(), hit: hit };
        });
        var got = files.filter(function (f) { return f.hit; }).length;
        return { files: files, got: got, total: files.length, rt: !!window[e.g] };
      }
      function engRows() {
        var L = window.__EngineLoader, rows = [];
        if (!L) { rows.push('没有找到 __EngineLoader（引擎加载器不在页面里，可能是旧版 index.html）'); return rows; }
        rows.push('加载模式：' + (L.eager ? '全部同步加载（eager，已走回退开关）' : '按需加载（第一次用到才下载）'));
        ENG.forEach(function (e) {
          var s = engState(e), why;
          if (s.rt) why = '已加载，运行时对象可用';
          else if (!s.got) why = L.eager ? '同步模式下却没看到脚本请求（可能走了缓存或记录被清）' : '未使用：按需加载，还没切到这个风格（正常，不是失败）';
          else if (s.got < s.total) why = '脚本只下载了 ' + s.got + '/' + s.total + '（下载中或有文件加载失败，看 /err）';
          else why = '脚本已下载，但运行时对象还没出现（可能还在执行，或执行时报错，看 /err）';
          rows.push(e.n + '（' + e.g + '）：' + why + '  [脚本 ' + s.got + '/' + s.total + ']');
        });
        return rows;
      }

      var X = {
        /* 检查各引擎是否加载成功：先给按需加载的状态，再接原来的全局对象列表 */
        engines: function () { say(engRows()); return engines0(); },

        engTiming: function () {
          var L = window.__EngineLoader;
          if (!L || !L.groups) return print('没有找到 __EngineLoader，没法算加载耗时', 'warn');
          var rows = ['加载模式：' + (L.eager ? '全部同步加载（eager）' : '按需加载') + '；时间从页面开始导航算起，只含下载，不含脚本执行'];
          ENG.forEach(function (e) {
            var s = engState(e);
            if (!s.got) { rows.push(e.n + '：没有脚本请求（' + (L.eager ? '同步模式下异常' : '还没用到，按需加载') + '）'); return; }
            var t0 = Infinity, t1 = 0;
            s.files.forEach(function (f) {
              if (!f.hit) { rows.push('  ' + f.name + '  没有请求记录'); return; }
              var h = f.hit;
              t0 = Math.min(t0, h.startTime); t1 = Math.max(t1, h.responseEnd);
              rows.push('  ' + f.name + '  ' + rnd(h.startTime) + ' → ' + rnd(h.responseEnd) + ' ms（' + rnd(h.duration) + ' ms）' + (h.transferSize ? '  ' + bytes(h.transferSize) : '  缓存或未报告大小'));
            });
            rows.push(e.n + '：第一个文件开始 ' + rnd(t0) + ' ms，最后一个下载完 ' + rnd(t1) + ' ms，整体 ' + rnd(t1 - t0) + ' ms（' + s.got + '/' + s.total + ' 个文件）');
          });
          say(rows);
        },

        eagerToggle: function () {
          var cur = lsGet('qt_eager_engines') === '1';
          if (cur) { try { localStorage.removeItem('qt_eager_engines'); } catch (_) {} } else lsSet('qt_eager_engines', '1');
          var L = window.__EngineLoader;
          print('回退开关（全部引擎启动时同步加载）已' + (cur ? '关闭' : '开启') + '，刷新页面后生效。当前页面是：' + (L ? (L.eager ? '同步加载' : '按需加载') : '未知') + '。地址里带 ?eager=1 也会强制同步，这个关不掉。', 'ok');
        },

        /* ---- 画布 ---- */
        cvPick: function () {
          var all = pcv();
          if (!all.length) return print('页面里没有画布', 'info');
          var pl = canvasPlan(), tag = {};
          pl.keep.forEach(function (k) { tag[k.i] = k.why; });
          print('共 ' + all.length + ' 个画布（编号从 1 开始；⚠ 是界面自带或引擎正在用的）', 'info');
          say(all.map(function (c, i) { return (tag[i] ? '⚠ ' : '   ') + cd1(c, i) + (tag[i] ? '  ← ' + tag[i] : ''); }));
          return {
            ask: '输入要删除的编号，如 3 或 3,5,7 或 2-6（0 取消）',
            go: function (s) {
              var idx = parseSel(s, all.length);
              if (!idx.length) { print('没有读到有效编号', 'warn'); return; }
              var risky = idx.filter(function (i) { return tag[i]; });
              print('将删除 ' + idx.length + ' 个画布：', 'info');
              say(idx.map(function (i) { return '删除 ' + cd1(all[i], i) + (tag[i] ? '  ⚠ ' + tag[i] : ''); }), 'warn');
              function doKill() {
                var n = 0;
                idx.forEach(function (i) { killCanvas(all[i]); n++; });
                print('已删除 ' + n + ' 个画布，剩余 ' + pcv().length + ' 个', 'ok');
              }
              return {
                confirm: '确认删除以上 ' + idx.length + ' 个画布？输入 y 确认，其他取消',
                go: function () {
                  if (!risky.length) return doKill();
                  return { confirm: '其中 ' + risky.length + ' 个带 ⚠（界面自带或引擎正在用），删掉可能黑屏或缺画面，要继续吗？再输入一次 y 确认', go: doKill };
                }
              };
            }
          };
        },

        cvFocus: function () {
          var all = pcv();
          if (!all.length) return print('页面里没有画布', 'info');
          print('共 ' + all.length + ' 个画布（编号从 1 开始）', 'info');
          say(all.map(function (c, i) { return cd1(c, i); }));
          return {
            ask: '输入要定位的编号（0 取消）',
            go: function (s) {
              var i = parseSel(s, all.length)[0];
              if (i === undefined) { print('没有这个编号', 'warn'); return; }
              var c = all[i];
              if (!c.isConnected) return print('这个画布已经不在页面里了', 'warn');
              var r = c.getBoundingClientRect();
              if (!(r.width > 0 && r.height > 0)) return print('[' + (i + 1) + '] 当前不可见（尺寸为 0 或被隐藏），没法描边；父级 ' + nameOf(c.parentElement), 'warn');
              try { c.scrollIntoView({ block: 'center', inline: 'center' }); } catch (_) {}
              var po = c.style.getPropertyValue('outline'), pop = c.style.getPropertyPriority('outline');
              var pf = c.style.getPropertyValue('outline-offset'), pfp = c.style.getPropertyPriority('outline-offset');
              c.style.setProperty('outline', '3px dashed #ff3b30', 'important');
              c.style.setProperty('outline-offset', '-3px', 'important');
              setTimeout(function () {
                if (po) c.style.setProperty('outline', po, pop); else c.style.removeProperty('outline');
                if (pf) c.style.setProperty('outline-offset', pf, pfp); else c.style.removeProperty('outline-offset');
              }, 8000);
              print('已给 [' + (i + 1) + '] 描上红色虚线框，8 秒后消失（命令窗口可能挡住它，先关窗口再看）。位置 左 ' + rnd(r.left) + ' 上 ' + rnd(r.top) + '，大小 ' + rnd(r.width) + '×' + rnd(r.height), 'ok');
            }
          };
        },

        cvHide: function () {
          var all = pcv();
          if (!all.length) return print('页面里没有画布', 'info');
          hiddenCv = hiddenCv.filter(function (h) { return h.c.isConnected; });
          function isHid(c) { return hiddenCv.some(function (x) { return x.c === c; }); }
          function show(h) { if (h.v) h.c.style.setProperty('display', h.v, h.p); else h.c.style.removeProperty('display'); }
          print('共 ' + all.length + ' 个画布（编号从 1 开始），被本命令隐藏的有 ' + hiddenCv.length + ' 个（标 ✖）', 'info');
          say(all.map(function (c, i) { return (isHid(c) ? '✖ ' : '   ') + cd1(c, i); }));
          return {
            ask: '输入编号隐藏（如 3 或 3,5 或 2-6），已隐藏的再输一次就恢复；r 全部恢复；0 取消',
            go: function (s) {
              if (/^r$/i.test(String(s).trim())) {
                hiddenCv.forEach(show);
                print('已恢复 ' + hiddenCv.length + ' 个画布', 'ok');
                hiddenCv = [];
                return;
              }
              var idx = parseSel(s, all.length);
              if (!idx.length) { print('没有读到有效编号', 'warn'); return; }
              var hid = 0, rec = 0;
              idx.forEach(function (i) {
                var c = all[i];
                if (isHid(c)) { hiddenCv = hiddenCv.filter(function (h) { if (h.c !== c) return true; show(h); rec++; return false; }); return; }
                hiddenCv.push({ c: c, v: c.style.getPropertyValue('display'), p: c.style.getPropertyPriority('display') });
                c.style.setProperty('display', 'none', 'important');
                hid++;
              });
              print('隐藏 ' + hid + ' 个，恢复 ' + rec + ' 个。隐藏用的是 display:none，引擎可能因为尺寸变 0 而重置；恢复后画面不对，切一次风格即可', 'warn');
            }
          };
        },

        engFree: function () {
          var rows = ENG.map(function (e, i) {
            var host = document.getElementById(e.k + 'Host');
            return (i + 1) + '  ' + e.n + '  #' + e.k + 'Host' + (host ? '（' + host.querySelectorAll('canvas').length + ' 个画布）' : '（不存在）');
          });
          say(rows);
          return {
            ask: '输入要释放的引擎编号 1-3（0 取消）',
            go: function (s) {
              var e = ENG[(+String(s).trim()) - 1];
              if (!e) { print('只能输入 1、2、3', 'warn'); return; }
              var host = document.getElementById(e.k + 'Host'), cs = host ? Array.prototype.slice.call(host.querySelectorAll('canvas')) : [];
              /* 找引擎自带的 destroy：名字里带引擎名、自己有 destroy 方法的全局对象；恰好找到一个才调用 */
              var cand = Object.keys(window).filter(function (k) {
                if (k.toLowerCase().indexOf(e.k) < 0) return false;
                var v = window[k];
                return v && typeof v === 'object' && typeof v.destroy === 'function';
              });
              return {
                confirm: '释放「' + e.n + '」：' + (cand.length === 1 ? '先调用 ' + cand[0] + '.destroy()，' : (cand.length > 1 ? '找到多个 destroy（' + cand.join('、') + '），不乱调用，' : '没找到引擎自带的 destroy，')) + '再清掉 #' + e.k + 'Host 里的 ' + cs.length + ' 个画布。它正在显示的话画面会消失，切一次风格才会重新创建。输入 y 确认',
                go: function () {
                  var before = pxBytes(cs), msg = [];
                  if (cand.length === 1) { try { window[cand[0]].destroy(); msg.push('已调用 ' + cand[0] + '.destroy()'); } catch (err) { msg.push(cand[0] + '.destroy() 报错：' + err.message); } }
                  cs.forEach(function (c) { if (c.isConnected) killCanvas(c); });
                  print('「' + e.n + '」已释放：' + (msg.length ? msg.join('；') + '；' : '') + '清掉 ' + cs.length + ' 个画布，约 ' + bytes(before) + ' 像素数据；页面画布剩 ' + pcv().length + ' 个', 'ok');
                }
              };
            }
          };
        },

        cvMemLive: function () {
          if (memTimer) { clearInterval(memTimer); memTimer = 0; return print('画布内存自动刷新已停止', 'ok'); }
          var last = null;
          function tick() {
            var all = pcv(), b = pxBytes(all);
            if (last && last.n === all.length && last.b === b) return;
            var d = last ? '（' + (b >= last.b ? '+' : '-') + bytes(Math.abs(b - last.b)) + '，画布 ' + (all.length - last.n >= 0 ? '+' : '') + (all.length - last.n) + '）' : '';
            last = { n: all.length, b: b };
            print(timeStr(Date.now()) + '  画布 ' + all.length + ' 个，像素约 ' + bytes(b) + ' ' + d, 'info');
          }
          tick();
          memTimer = setInterval(tick, 2000);
          print('已开启：每 2 秒检查一次，有变化才输出。再选一次停止；关闭命令窗口也会自动停止', 'ok');
        },

        glLose: function () {
          var all = pcv();
          if (!all.length) return print('页面里没有画布', 'info');
          print('共 ' + all.length + ' 个画布（编号从 1 开始），只有 WebGL 画布能测', 'info');
          say(all.map(function (c, i) { return cd1(c, i); }));
          return {
            ask: '输入要测试的画布编号（0 取消）',
            go: function (s) {
              var i = parseSel(s, all.length)[0];
              if (i === undefined) { print('没有这个编号', 'warn'); return; }
              var c = all[i], gl = null;
              try { gl = c.getContext('webgl2') || c.getContext('webgl'); } catch (_) {}
              if (!gl) return print('[' + (i + 1) + '] 不是 WebGL 画布（或上下文类型不匹配），没法测', 'warn');
              var ext = gl.getExtension('WEBGL_lose_context');
              if (!ext) return print('这个浏览器没有 WEBGL_lose_context 扩展，没法模拟', 'warn');
              return {
                confirm: '会让 [' + (i + 1) + '] 的 WebGL 上下文丢失约 2 秒再恢复，期间这块画面可能变黑或卡住。输入 y 确认',
                go: function () {
                  var lost = false, prevented = false, restored = false;
                  function onLost(ev) { lost = true; setTimeout(function () { prevented = !!ev.defaultPrevented; }, 0); }
                  function onRest() { restored = true; }
                  c.addEventListener('webglcontextlost', onLost);
                  c.addEventListener('webglcontextrestored', onRest);
                  print('开始：让上下文丢失…', 'info');
                  try { ext.loseContext(); } catch (err) {
                    c.removeEventListener('webglcontextlost', onLost); c.removeEventListener('webglcontextrestored', onRest);
                    return print('失败：' + err.message, 'err');
                  }
                  setTimeout(function () {
                    if (!lost) print('没收到 webglcontextlost 事件（浏览器没有真的丢失上下文）', 'warn');
                    else print('已丢失；引擎' + (prevented ? '已调用' : '没有调用') + ' preventDefault' + (prevented ? '（可以恢复）' : '（上下文无法恢复；真机被系统回收时同样恢复不了）'), prevented ? 'ok' : 'warn');
                    if (lost && prevented) { try { ext.restoreContext(); print('已请求恢复…', 'info'); } catch (_) {} }
                    setTimeout(function () {
                      c.removeEventListener('webglcontextlost', onLost); c.removeEventListener('webglcontextrestored', onRest);
                      if (restored) print('收到 webglcontextrestored。引擎有没有重建画面，请肉眼确认：画面回来 = 恢复成功', 'ok');
                      else print(lost && prevented ? '2.5 秒内没收到 webglcontextrestored' : '没有恢复（原因见上）', 'warn');
                    }, 2500);
                  }, 2000);
                }
              };
            }
          };
        },

        /* ---- 性能盘点 ---- */
        animAudit: function () {
          if (!document.getAnimations) return print('这个浏览器没有 document.getAnimations，没法盘点', 'warn');
          var list = document.getAnimations().filter(function (a) { var t = a.effect && a.effect.target; return !(t && inCm(t)); });
          var run = 0, inf = 0, tr = 0, by = {};
          list.forEach(function (a) {
            var t = a.effect && a.effect.target, it = 1, isRun = a.playState === 'running';
            try { it = a.effect.getComputedTiming().iterations; } catch (_) {}
            if (isRun) run++;
            if (it === Infinity) inf++;
            if (typeof CSSTransition !== 'undefined' && a instanceof CSSTransition) tr++;
            var key = nameOf(t) + ((a.effect && a.effect.pseudoElement) || '') + ' · ' + (a.animationName || a.transitionProperty || a.id || '动画') + (it === Infinity ? ' ∞' : '');
            var o = by[key] || (by[key] = { n: 0, run: 0 }); o.n++; if (isRun) o.run++;
          });
          print('动画共 ' + list.length + ' 个：正在跑 ' + run + ' 个，无限循环 ' + inf + ' 个，过渡（transition）' + tr + ' 个', 'info');
          var rows = Object.keys(by).map(function (k) { return { k: k, n: by[k].n, run: by[k].run }; }).sort(function (a, b) { return b.run - a.run || b.n - a.n; }).slice(0, 12);
          if (rows.length) say(rows.map(function (r) { return r.k + '  共 ' + r.n + ' 个，在跑 ' + r.run + ' 个'; }));
        },

        blurAudit: function () {
          var vw = window.innerWidth, vh = window.innerHeight, els = document.getElementsByTagName('*'), rows = [], tot = 0, kinds = {}, t0 = performance.now();
          function bf(el, pe) { var cs = getComputedStyle(el, pe || null), v = cs.backdropFilter || cs.webkitBackdropFilter; return v && v !== 'none' ? v : ''; }
          for (var i = 0; i < els.length; i++) {
            var el = els[i];
            if (inCm(el)) continue;
            var r = el.getBoundingClientRect();
            if (!r.width || !r.height) continue;
            var w = Math.min(r.right, vw) - Math.max(r.left, 0), h = Math.min(r.bottom, vh) - Math.max(r.top, 0);
            if (w <= 0 || h <= 0) continue;
            if (getComputedStyle(el).visibility === 'hidden') continue;
            ['', '::before', '::after'].forEach(function (pe) {
              var v = bf(el, pe);
              if (!v) return;
              rows.push({ n: nameOf(el) + pe, v: v, a: w * h });
              tot += w * h; kinds[v] = (kinds[v] || 0) + 1;
            });
          }
          print('屏幕内开着毛玻璃（backdrop-filter）的有 ' + rows.length + ' 处（含 ::before / ::after），叠加面积约 ' + (tot / (vw * vh)).toFixed(2) + ' 屏（超过 1 屏说明有重叠或多层）；扫描 ' + rnd(performance.now() - t0) + ' ms', 'info');
          if (!rows.length) return;
          print('模糊参数：' + Object.keys(kinds).map(function (k) { return k + ' × ' + kinds[k]; }).join('；'), 'info');
          rows.sort(function (a, b) { return b.a - a.a; });
          say(rows.slice(0, 10).map(function (r) { return r.n + '  ' + r.v + '  占屏 ' + Math.round(r.a / (vw * vh) * 100) + '%'; }));
          print('伪元素按宿主元素的屏内面积估算；只统计在屏幕内、可见的', 'info');
        },

        resMul: function () {
          var raw = lsGet('qt_res_mul'), cur = window.__renderResMul;
          print('渲染分辨率倍率：存储值 ' + (raw === null ? '（没设置，等于 100%）' : raw) + '，运行值 window.__renderResMul = ' + (cur === undefined ? '未定义' : cur), 'info');
          return {
            ask: '输入 100、75 或 50（0 取消）',
            go: function (s) {
              var m = /^(100|75|50)%?$/.exec(String(s).trim());
              if (!m) { print('只接受 100、75、50', 'warn'); return; }
              var pct = +m[1], asPct = raw !== null && /^\d+$/.test(raw) && +raw > 1;
              var val = asPct ? String(pct) : String(pct / 100);
              lsSet('qt_res_mul', val);
              window.__renderResMul = pct / 100;
              var done = [];
              Object.keys(window).forEach(function (k) {
                if (!/sonnet|tempera|lumiere/i.test(k)) return;
                var v = window[k];
                if (v && typeof v.applyResMul === 'function') { try { v.applyResMul(); done.push(k); } catch (_) {} }
              });
              print('已写入存储值 ' + val + '、运行值 ' + pct / 100 + (done.length ? '；已通知 ' + done.join('、') + ' 重新应用' : '；没找到能直接通知的适配器，切一次风格或刷新页面后生效'), 'ok');
            }
          };
        },

        simBg: function () {
          if (!bgSim) {
            try {
              Object.defineProperty(document, 'hidden', { configurable: true, get: function () { return true; } });
              Object.defineProperty(document, 'visibilityState', { configurable: true, get: function () { return 'hidden'; } });
            } catch (err) { return print('模拟失败：' + err.message, 'err'); }
            bgSim = true;
            document.dispatchEvent(new Event('visibilitychange'));
            print('已模拟「页面在后台」：document.hidden = true，并触发了 visibilitychange。注意只有读 document.hidden 的代码会停，浏览器本身不会真的降频；再选一次恢复前台', 'warn');
          } else {
            try { delete document.hidden; delete document.visibilityState; } catch (_) {}
            bgSim = false;
            document.dispatchEvent(new Event('visibilitychange'));
            print('已恢复前台（document.hidden = ' + document.hidden + '）', 'ok');
          }
        },

        /* ---- 快照 ---- */
        snapSave: function () {
          snap = takeSnap();
          print('快照已存（' + timeStr(snap.t) + '）。操作一阵或切换风格后，选「对比快照」看差异', 'ok');
          say(SNAPDEF.map(function (d) { return d.l + '  ' + fmtSnap(d, snap[d.k]); }));
        },
        snapDiff: function () {
          if (!snap) return print('还没有快照，先选「存快照」', 'warn');
          var now = takeSnap(), rows = [], chg = 0;
          SNAPDEF.forEach(function (d) {
            var a = snap[d.k], b = now[d.k];
            if (a < 0 || b < 0) { rows.push('－ ' + d.l + '  不可用'); return; }
            var diff = b - a;
            if (!diff) { rows.push('＝ ' + d.l + '  ' + fmtSnap(d, b)); return; }
            chg++;
            rows.push((diff > 0 ? '▲ ' : '▼ ') + d.l + '  ' + fmtSnap(d, a) + ' → ' + fmtSnap(d, b) + '（' + (diff > 0 ? '+' : '-') + fmtSnap(d, Math.abs(diff)) + '）');
          });
          print('和 ' + timeStr(snap.t) + ' 的快照相比（隔了 ' + rnd((now.t - snap.t) / 1000) + ' 秒），有 ' + chg + ' 项变化：', 'info');
          say(rows);
        },

        /* ---- 探针（数据来自 cmd-early.js） ---- */
        timers: function () {
          var P = probeOf(); if (!P) return;
          if (!P.on.tm) { P.start('tm'); return print('定时器统计已开启，从现在开始记（开启前创建的看不到）。操作一会儿、或「模拟后台」之后，再选一次查看。想从页面一开始就记：用「提前统计开关」并刷新', 'ok'); }
          var secs = Math.max(1, (performance.now() - P.t0.tm) / 1000), g = {};
          Object.keys(P.iv).forEach(function (id) {
            var r = P.iv[id], k = r.src + '|' + r.ms, o = g[k] || (g[k] = { src: r.src, ms: r.ms, n: 0, f: 0, tot: 0, hf: 0, htot: 0 });
            o.n++; o.f += r.fires; o.tot += r.tot; o.hf += r.hf; o.htot += r.htot;
          });
          print('统计起点：页面启动后 ' + (P.t0.tm / 1000).toFixed(1) + ' 秒，已统计 ' + rnd(secs) + ' 秒（' + (P.t0.tm < 500 ? '覆盖启动阶段' : '开启前创建的看不到') + '）', 'info');
          print('setInterval：开启后创建 ' + P.ivMade + ' 个，已清除 ' + P.ivCleared + ' 个，存活 ' + Object.keys(P.iv).length + ' 个；setTimeout 创建 ' + P.to.n + ' 次（约 ' + (P.to.n / secs).toFixed(1) + ' 次/秒）', 'info');
          var rows = Object.keys(g).map(function (k) { return g[k]; }).sort(function (a, b) { return b.tot - a.tot; }).slice(0, 12);
          if (rows.length) say(rows.map(function (o) {
            return '每 ' + o.ms + ' ms ×' + o.n + '  @' + o.src + '  触发 ' + o.f + ' 次，回调共 ' + o.tot.toFixed(1) + ' ms（平均 ' + (o.f ? (o.tot / o.f).toFixed(2) : '0') + ' ms）；后台触发 ' + o.hf + ' 次，共 ' + o.htot.toFixed(1) + ' ms';
          }));
          var tt = top(P.to.by, 8);
          if (tt.length) say(['setTimeout 创建最多的来源：'].concat(tt.map(function (t) { return '  ' + t.k + '  ' + t.n + ' 次（约 ' + (t.n / secs).toFixed(1) + ' 次/秒）'; })));
          print('说明：定时器照常触发不代表回调在干活；看「平均耗时」，回调内部提前 return 的（如后台跳过）耗时会接近 0', 'info');
        },

        observers: function () {
          var P = probeOf(); if (!P) return;
          if (!P.on.ob) { P.start('ob'); return print('观察器统计已开启，从现在开始记（开启前创建的看不到）。操作一会儿后再选一次查看。想从页面一开始就记：用「提前统计开关」并刷新', 'ok'); }
          var secs = Math.max(1, (performance.now() - P.t0.ob) / 1000), g = {};
          P.ob.forEach(function (r) {
            var k = r.tag + '|' + r.src, o = g[k] || (g[k] = { tag: r.tag, src: r.src, made: 0, alive: 0, calls: 0, tot: 0, recs: 0, hc: 0 });
            o.made++; if (r.on) o.alive++; o.calls += r.calls; o.tot += r.tot; o.recs += r.recs; o.hc += r.hc;
          });
          var mo = P.ob.filter(function (r) { return r.on && r.tag === 'MO'; }).length, ro = P.ob.filter(function (r) { return r.on && r.tag === 'RO'; }).length;
          print('统计起点：页面启动后 ' + (P.t0.ob / 1000).toFixed(1) + ' 秒，已统计 ' + rnd(secs) + ' 秒（' + (P.t0.ob < 500 ? '覆盖启动阶段' : '开启前创建的看不到') + '）', 'info');
          print('开启后创建 ' + P.ob.length + ' 个；正在观察（observe 之后没 disconnect）MutationObserver ' + mo + ' 个，ResizeObserver ' + ro + ' 个', 'info');
          var rows = Object.keys(g).map(function (k) { return g[k]; }).sort(function (a, b) { return b.calls - a.calls; }).slice(0, 12);
          if (rows.length) say(rows.map(function (o) {
            return o.tag + ' @' + o.src + '  创建 ' + o.made + '、观察中 ' + o.alive + '；回调 ' + o.calls + ' 次（约 ' + (o.calls / secs).toFixed(1) + ' 次/秒），收到 ' + o.recs + ' 条记录，回调共 ' + o.tot.toFixed(1) + ' ms；后台回调 ' + o.hc + ' 次';
          }));
          print('说明：观察目标被移出页面但没 disconnect 的，仍会算「观察中」', 'info');
        },

        rafMon: function () {
          var P = probeOf(); if (!P) return;
          if (!P.on.raf) { P.start('raf'); return print('rAF 监控已开启（按来源统计 requestAnimationFrame 的调用次数），一会儿后再选一次查看；开启前就缓存了 rAF 引用的循环看不到', 'ok'); }
          var secs = Math.max(1, (performance.now() - P.t0.raf) / 1000);
          print('已统计 ' + rnd(secs) + ' 秒，rAF 共被调用 ' + P.raf.n + ' 次，约 ' + (P.raf.n / secs).toFixed(1) + ' 次/秒；页面现在' + (document.hidden ? '在后台' : '在前台'), 'info');
          var tt = top(P.raf.by, 10);
          if (tt.length) say(tt.map(function (t) { return '  ' + t.k + '  ' + t.n + ' 次（约 ' + (t.n / secs).toFixed(1) + ' 次/秒）'; }));
          print('说明：循环每帧重新排下一帧，所以调用次数约等于该循环每秒跑的帧数；后台里还在涨的就是空转', 'info');
        },

        probeEarly: function () {
          var P = probeOf(); if (!P) return;
          var on = !P.early;
          P.setEarly(on);
          print('提前统计已' + (on ? '开启' : '关闭') + '，刷新页面后生效。开启后页面一开始就统计定时器和观察器（rAF 不提前挂钩），会有少量额外开销，用完记得关', 'ok');
        },

        probeStop: function () {
          var P = probeOf(); if (!P) return;
          var names = { tm: '定时器', ob: '观察器', raf: 'rAF' }, was = [];
          ['tm', 'ob', 'raf'].forEach(function (k) { if (P.stop(k)) was.push(names[k]); });
          print(was.length ? '已停止并还原：' + was.join('、') + '（数据还保留，再开启会清零）' : '没有在跑的探针', 'ok');
          if (P.early) print('提前统计还开着，刷新页面后又会自动开始；要关用「提前统计开关」', 'warn');
        }
      };

      /* 快照 */
      var SNAPDEF = [
        { k: 'dom', l: 'DOM 节点', f: 'n' }, { k: 'cv', l: '画布数量', f: 'n' }, { k: 'cvb', l: '画布像素数据', f: 'b' },
        { k: 'hs', l: '商籁画布', f: 'n' }, { k: 'ht', l: '凝彩画布', f: 'n' }, { k: 'hl', l: '绘光画布', f: 'n' }, { k: 'hp', l: '云阶画布', f: 'n' },
        { k: 'ls', l: 'localStorage 条数', f: 'n' }, { k: 'lsb', l: 'localStorage 大小', f: 'b' },
        { k: 'anim', l: '正在跑的动画', f: 'n' }, { k: 'heap', l: 'JS 堆内存', f: 'b' },
        { k: 'iv', l: '存活 setInterval', f: 'n' }, { k: 'ob', l: '观察中的观察器', f: 'n' }
      ];
      function fmtSnap(d, v) { return v < 0 ? '不可用' : (d.f === 'b' ? bytes(v) : String(v)); }
      function takeSnap() {
        var all = pcv(), ls = lsEntries(), lt = 0, P = (window.__cmEarly && window.__cmEarly.probe) || null, run = -1;
        ls.forEach(function (r) { lt += r.n; });
        try { if (document.getAnimations) run = document.getAnimations().filter(function (a) { var t = a.effect && a.effect.target; return a.playState === 'running' && !(t && inCm(t)); }).length; } catch (_) {}
        function host(id) { var el = document.getElementById(id); return el ? el.querySelectorAll('canvas').length : 0; }
        return {
          t: Date.now(), dom: document.getElementsByTagName('*').length, cv: all.length, cvb: pxBytes(all),
          hs: host('sonnetHost'), ht: host('temperaHost'), hl: host('lumiereHost'), hp: host('partitaHost'),
          ls: ls.length, lsb: lt * 2, anim: run,
          heap: (window.performance && performance.memory && performance.memory.usedJSHeapSize) || -1,
          iv: P && P.on.tm ? Object.keys(P.iv).length : -1,
          ob: P && P.on.ob ? P.ob.filter(function (r) { return r.on; }).length : -1
        };
      }

      window.__cmStopLive = function () { if (memTimer) { clearInterval(memTimer); memTimer = 0; } };
      return X;
    })();
    Object.keys(NEWFN).forEach(function (k) { FN[k] = NEWFN[k]; });

    /* ---------- 默认菜单 ---------- */
    var DEF = [
      { name: '画布 / 画面', items: [
        { name: '统计画布数量', fn: 'cvCount' },
        { name: '列出所有画布', fn: 'cvList' },
        { name: '清理异常画布', fn: 'cvClean', sure: 1 },
        { name: '估算画布占用的内存', fn: 'cvMem' },
        { name: '检查 WebGL 能力', fn: 'webgl' },
        { name: '检查各引擎是否加载成功', fn: 'engines' },
        { name: '列出加载的脚本', fn: 'scripts' },
        { name: '选择删除画布（自己挑编号）', fn: 'cvPick', sure: 1 },
        { name: '定位画布（红框闪烁）', fn: 'cvFocus' },
        { name: '隐藏 / 恢复画布（排查卡顿）', fn: 'cvHide' },
        { name: '按引擎释放（商籁 / 凝彩 / 绘光）', fn: 'engFree', sure: 1 },
        { name: '画布内存自动刷新（开关）', fn: 'cvMemLive' },
        { name: 'WebGL 上下文丢失测试', fn: 'glLose', sure: 1 },
        { name: '引擎加载计时', fn: 'engTiming' },
        { name: '回退开关：全部引擎同步加载（开关）', fn: 'eagerToggle' }
      ] },
      { name: '播放 / 音频', items: [
        { name: '当前播放状态', cmd: '/state' },
        { name: '播放', cmd: '/play' },
        { name: '暂停', cmd: '/pause' },
        { name: '播放 / 暂停切换', cmd: '/toggle' },
        { name: '下一句', cmd: '/next' },
        { name: '上一句', cmd: '/prev' },
        { name: '音频详细状态', fn: 'audioStatus' },
        { name: '播放速度', fn: 'setSpeed', ask: '输入播放速度，常用 0.75、1、1.25、1.5' },
        { name: '音量', fn: 'setVolume', ask: '输入音量 0 到 100' },
        { name: '暂停全部音频 / 视频', fn: 'stopMedia' },
        { name: '跳到第几句', cmd: '/goto {}', ask: '输入要跳到第几句（从 1 开始）' }
      ] },
      { name: '布局排查', items: [
        { name: '找出横向溢出的元素', fn: 'overflow' },
        { name: '屏幕中心叠了哪些元素', fn: 'centerStack' },
        { name: '给所有元素加轮廓线（开关）', fn: 'outline' },
        { name: '隐藏 / 显示整个界面，只看背景（开关）', fn: 'hideUi' },
        { name: '统计 DOM 节点数量', fn: 'domStats' },
        { name: '列出固定定位（fixed / sticky）的元素', fn: 'fixedList' }
      ] },
      { name: '卡顿 / 性能', items: [
        { name: '暂停 / 恢复所有 CSS 动画（开关）', fn: 'animToggle' },
        { name: '关闭 / 恢复全部模糊效果（开关）', fn: 'blurToggle' },
        { name: '切换性能模式', fn: 'perfToggle' },
        { name: '打开帧率悬浮窗', cmd: '/fps on' },
        { name: '关闭帧率悬浮窗', cmd: '/fps off' },
        { name: '开始记录卡顿', cmd: '/jank on' },
        { name: '查看卡顿记录', cmd: '/jank' },
        { name: '页面加载各阶段耗时', fn: 'loadTiming' },
        { name: '内存估算', cmd: '/mem' },
        { name: '动画盘点（正在跑的 / 无限循环）', fn: 'animAudit' },
        { name: '毛玻璃盘点（屏幕内开着模糊的元素）', fn: 'blurAudit' },
        { name: '渲染分辨率（全局 100 / 75 / 50）', fn: 'resMul' },
        { name: '模拟后台 / 恢复前台（开关）', fn: 'simBg' },
        { name: '存快照（记录当前状态）', fn: 'snapSave' },
        { name: '对比快照（和存的时候比）', fn: 'snapDiff' }
      ] },
      { name: '设备信息', items: [
        { name: '屏幕、视口与安全区', fn: 'screenInfo' },
        { name: '系统与浏览器环境', fn: 'envInfo' },
        { name: '网络状态', fn: 'netInfo' },
        { name: '存储配额', fn: 'quota' }
      ] },
      { name: '存储 / 清理', items: [
        { name: '本地存储占用最大的前 10 项', fn: 'lsTop' },
        { name: '导出本地存储（复制）', cmd: '/export' },
        { name: '清空命令历史', cmd: '/history clear' },
        { name: '重新测量键盘高度', fn: 'kbReset' },
        { name: '窗口高度 / 键盘设置恢复默认', cmd: '/cm reset' },
        { name: '清空 Cache Storage', fn: 'cacheClear', sure: 1 },
        { name: '注销 Service Worker', fn: 'swUnreg', sure: 1 }
      ] },
      { name: '日志 / 诊断', items: [
        { name: '一键诊断包（复制到剪贴板）', fn: 'diag' },
        { name: '查看报错', cmd: '/err' },
        { name: '打开系统日志面板', cmd: '/syslog' },
        { name: '打开全屏日志面板', cmd: '/logpanel' },
        { name: '开启同步页面 console', cmd: '/console on' },
        { name: '关闭同步页面 console', cmd: '/console off' },
        { name: '开始记录网络请求', cmd: '/net on' },
        { name: '查看网络记录', cmd: '/net' },
        { name: '命令窗口加载之前的报错', cmd: '/early' }
      ] },
      { name: '窗口 / 外观', items: [
        { name: '清空输出', cmd: '/clear' },
        { name: '复制全部输出', cmd: '/copy' },
        { name: '复制新增（上次复制之后的内容）', fn: 'copyNew' },
        { name: '关闭命令窗口', cmd: '/exit' },
        { name: '刷新页面', cmd: '/reload' },
        { name: '查看文字动画风格列表', cmd: '/style' },
        { name: '切换文字动画风格', cmd: '/style {}', ask: '输入风格名称或 key' },
        { name: '查看主题列表', cmd: '/theme' },
        { name: '切换主题', cmd: '/theme {}', ask: '输入主题序号或名称' },
        { name: '命令窗口字号', cmd: '/font {}', ask: '输入字号 10 到 18' },
        { name: '多行输入开关', cmd: '/multi' }
      ] },
      { name: '探针 / 监控', items: [
        { name: '定时器盘点（setInterval / setTimeout）', fn: 'timers' },
        { name: '观察器盘点（MutationObserver / ResizeObserver）', fn: 'observers' },
        { name: 'rAF 监控（每秒回调数）', fn: 'rafMon' },
        { name: '提前统计开关（页面一开始就挂钩）', fn: 'probeEarly' },
        { name: '停止全部探针并还原', fn: 'probeStop' }
      ] },
      { name: '我的指令', mine: 1, items: [] }
    ];

    /* ---------- 读写 ---------- */
    function defaults() { return JSON.parse(JSON.stringify(DEF)); }
    function sanitize(d) {
      var out = [];
      d.forEach(function (g) {
        if (!g || typeof g.name !== 'string' || !Array.isArray(g.items)) return;
        var items = g.items.filter(function (it) {
          return it && typeof it.name === 'string' && ((it.fn && FN[it.fn]) || typeof it.cmd === 'string');
        }).slice(0, MAXK);
        out.push({ name: g.name, mine: g.mine ? 1 : 0, items: items });
      });
      if (!out.some(mine)) out.push({ name: '我的指令', mine: 1, items: [] });
      return out;
    }
    var data;
    function load() {
      var raw = lsGet(KEY);
      if (raw) { try { var d = JSON.parse(raw); if (Array.isArray(d) && d.length) return sanitize(d); } catch (_) {} }
      return defaults();
    }
    function save() { lsSet(KEY, JSON.stringify(data)); }
    data = load();

    /* 菜单存过之后，默认清单里新增的内置项不会自动出现：这里把「上次没见过的」新项补进去。
       记下见过哪些（cmd_menu_seen），所以你删掉的内置项不会被反复加回来。 */
    var SEEN = 'cmd_menu_seen';
    var OLD_KEYS = ["cvCount", "cvList", "cvClean", "cvMem", "webgl", "engines", "scripts", "/state", "/play", "/pause", "/toggle", "/next", "/prev", "audioStatus", "setSpeed", "setVolume", "stopMedia", "/goto {}", "overflow", "centerStack", "outline", "hideUi", "domStats", "fixedList", "animToggle", "blurToggle", "perfToggle", "/fps on", "/fps off", "/jank on", "/jank", "loadTiming", "/mem", "screenInfo", "envInfo", "netInfo", "quota", "lsTop", "/export", "/history clear", "kbReset", "/cm reset", "cacheClear", "swUnreg", "diag", "/err", "/syslog", "/logpanel", "/console on", "/console off", "/net on", "/net", "/early", "/clear", "/copy", "copyNew", "/exit", "/reload", "/style", "/style {}", "/theme", "/theme {}", "/font {}", "/multi"];
    function itemKey(it) { return it.fn || it.cmd; }
    function allKeys(defs) { var o = []; defs.forEach(function (g) { g.items.forEach(function (it) { o.push(itemKey(it)); }); }); return o; }
    function mergeNew() {
      var cur = allKeys(DEF);
      if (!lsGet(KEY)) { lsSet(SEEN, JSON.stringify(cur)); return; }
      var seen = null; try { seen = JSON.parse(lsGet(SEEN)); } catch (_) {}
      if (!Array.isArray(seen)) seen = OLD_KEYS;
      var fresh = {}, nf = 0;
      cur.forEach(function (k) { if (seen.indexOf(k) < 0) { fresh[k] = 1; nf++; } });
      if (!nf) { lsSet(SEEN, JSON.stringify(cur)); return; }
      var have = {}, mineIdx = -1;
      data.forEach(function (g, i) { if (mine(g)) mineIdx = i; g.items.forEach(function (it) { have[itemKey(it)] = 1; }); });
      DEF.forEach(function (dg) {
        if (dg.mine) return;
        var add = dg.items.filter(function (it) { return fresh[itemKey(it)] && !have[itemKey(it)]; });
        if (!add.length) return;
        var g = null;
        data.forEach(function (x) { if (!mine(x) && x.name === dg.name) g = x; });
        if (!g) { g = { name: dg.name, mine: 0, items: [] }; data.splice(mineIdx < 0 ? data.length : mineIdx, 0, g); if (mineIdx >= 0) mineIdx++; }
        add.forEach(function (it) { if (g.items.length < MAXK) g.items.push(JSON.parse(JSON.stringify(it))); });
      });
      save(); lsSet(SEEN, JSON.stringify(cur));
    }
    mergeNew();

    /* ---------- 编号 ---------- */
    function keyOf(i) { return i < 9 ? String(i + 1) : String.fromCharCode(97 + i - 9); }
    function idxOf(ch) {
      ch = String(ch).toLowerCase();
      if (/^[1-9]$/.test(ch)) return +ch - 1;
      if (/^[a-z]$/.test(ch)) return 9 + ch.charCodeAt(0) - 97;
      return -1;
    }
    function pathOf(s) {
      var m = /^([1-9a-z])[.．。:：,，-]([1-9a-z])$/i.exec(String(s || '').trim());
      if (!m) return null;
      var gi = idxOf(m[1]), ii = idxOf(m[2]);
      if (!data[gi] || !data[gi].items[ii]) return null;
      return { gi: gi, ii: ii };
    }

    /* ---------- 显示 ---------- */
    function showGroups() {
      print('常用指令菜单 · 输入编号选择，0 退出', 'tg0');
      data.forEach(function (g, i) { print(keyOf(i) + '  ' + g.name + '  （' + g.items.length + '）', 'li' + (i % 4)); });
      print('也可以直接输两位，如 21 = 第 2 组第 1 项；/menu 帮助 看怎么增删', 'info');
      st = { lvl: 'g', t: Date.now() };
    }
    function showItems(gi) {
      var g = data[gi];
      print(keyOf(gi) + ' ' + g.name + ' · 输入编号执行，0 返回', 'tg' + (gi % 4));
      if (!g.items.length) print('（还没有内容。用 /menu 加 名字 = 命令或代码 来添加）', 'info');
      g.items.forEach(function (it, i) { print(keyOf(i) + '  ' + it.name + (it.ask ? '  （要输入）' : '') + (it.sure ? '  （先确认）' : ''), 'li' + (gi % 4)); });
      st = { lvl: 'i', gi: gi, t: Date.now() };
    }

    /* ---------- 执行 ---------- */
    /* 命令可以返回 { confirm, go } 要求确认，或 { ask, go } 要求再输入一个值（go 的返回值可以继续链下去） */
    function follow(r) {
      if (r && r.confirm) { st = { lvl: 'confirm', go: r.go, t: Date.now() }; print(r.confirm, 'warn'); }
      else if (r && r.ask) { st = { lvl: 'arg2', go: r.go, t: Date.now() }; print(r.ask, 'info'); }
    }
    async function runIt(it, arg) {
      if (it.fn) {
        return follow(await FN[it.fn](arg));
      }
      var code = it.ask ? it.cmd.split('{}').join(arg) : it.cmd;
      return runLine(code);
    }
    function pick(gi, ii) {
      var g = data[gi], it = g && g.items[ii];
      if (!it) { print('没有这一项', 'warn'); return; }
      st = null;
      print('▶ ' + g.name + ' · ' + it.name, 'info');
      if (it.ask) { st = { lvl: 'arg', item: it, t: Date.now() }; print(it.ask + '（0 取消）', 'info'); return; }
      return runIt(it, '');
    }

    /* execNow 在跑每一行输入之前问一句：这行是不是菜单要的？ */
    function wants(line) {
      if (!st) return false;
      if (Date.now() - st.t > IDLE) { st = null; return false; }
      var l = line.trim(), ok = false;
      if (st.lvl === 'g') ok = /^[0-9a-z]$/i.test(l) || /^[1-9][1-9a-z]$/i.test(l);
      else if (st.lvl === 'i') ok = /^[0-9a-z]$/i.test(l);
      else if (st.lvl === 'code') ok = true;
      else ok = l.charAt(0) !== '/';                                // arg / confirm：输入以 / 开头就当作放弃菜单、照常执行命令
      if (!ok) st = null;
      return ok;
    }
    async function feed(line) {
      var l = line.trim(), s = st;
      if (s.lvl === 'g') {
        if (l === '0') { st = null; print('已退出菜单', 'info'); return; }
        if (l.length === 2) return pick(idxOf(l.charAt(0)), idxOf(l.charAt(1)));
        var gi = idxOf(l);
        if (!data[gi]) { print('没有这一组', 'warn'); return; }
        return showItems(gi);
      }
      if (s.lvl === 'i') {
        if (l === '0') return showGroups();
        return pick(s.gi, idxOf(l));
      }
      if (s.lvl === 'arg') {
        st = null;
        if (l === '0') { print('已取消', 'info'); return; }
        return runIt(s.item, l);
      }
      if (s.lvl === 'confirm') {
        st = null;
        if (/^(y|yes|是|确认|好|行)$/i.test(l)) return follow(await s.go());
        print('已取消', 'info');
        return;
      }
      if (s.lvl === 'arg2') {
        st = null;
        if (l === '0') { print('已取消', 'info'); return; }
        return follow(await s.go(l));
      }
      if (s.lvl === 'code') {
        st = null;
        if (l === '0') { print('已取消', 'info'); return; }
        return addItem(s.name, line.replace(/^\s+|\s+$/g, ''));
      }
    }
    menuApi = { wants: wants, feed: feed };

    /* ---------- 编辑 ---------- */
    function addItem(name, code) {
      var gi = -1; data.forEach(function (g, i) { if (mine(g)) gi = i; });
      var g = data[gi];
      if (g.items.length >= MAXK) throw new Error('「' + g.name + '」已经满了（最多 ' + MAXK + ' 项），先删几项');
      g.items.push({ name: name, cmd: code });
      save();
      print('已添加到「' + g.name + '」（第 ' + keyOf(gi) + ' 组第 ' + keyOf(g.items.length - 1) + ' 项）：' + name, 'ok');
    }
    function need(p, s) { if (!p) throw new Error('找不到「' + s + '」。格式是 组号.项号，例如 2.3；先用 /menu 看编号'); return p; }
    var HELP = [
      '/menu                      列出分组，输入编号选择',
      '/menu 2                    直接进入第 2 组',
      '/menu 21                   直接执行第 2 组第 1 项',
      '/menu 加 名字 = 命令或代码    添加到「我的指令」，例：/menu 加 看状态 = /state',
      '/menu 加 名字               只写名字，下一行再输入命令或代码（适合多行代码）',
      '/menu 删 2.3               删除第 2 组第 3 项',
      '/menu 改名 2.3 新名字       改名字',
      '/menu 上移 2.3 / 下移 2.3 / 置顶 2.3',
      '/menu 重置                 恢复默认菜单（你添加的会被清空）',
      '右边的内容以 / 开头就是窗口命令，否则当 JavaScript 执行。'
    ];
    var SUBS = {
      add: ['加', '添加', '新增', 'add'], del: ['删', '删除', 'del', 'rm'], ren: ['改名', '重命名', 'ren', 'rename'],
      up: ['上移', 'up'], down: ['下移', 'down'], top: ['置顶', 'top'], reset: ['重置', 'reset'], help: ['帮助', 'help', '?']
    };
    function subOf(w) { w = String(w || '').toLowerCase(); for (var k in SUBS) if (SUBS[k].indexOf(w) >= 0) return k; return ''; }

    register('menu', {
      group: '其他', desc: '常用指令菜单：中文名，输入编号执行，可以自己增删', usage: '/menu [组号|组号项号|加|删|改名|上移|下移|置顶|重置|帮助]',
      alias: ['m', '菜单'], tapRun: true,
      complete: function (tk) { return tk.length ? [] : ['加', '删', '改名', '上移', '下移', '置顶', '重置', '帮助']; },
      run: function (a, c) {
        var sub = subOf(a[0]);
        if (!a.length) return showGroups();
        if (!sub) {
          var w = String(a[0]);
          if (/^[0-9a-z]$/i.test(w)) { var gi = idxOf(w); if (!data[gi]) throw new Error('没有第 ' + w + ' 组'); return showItems(gi); }
          if (/^[1-9][1-9a-z]$/i.test(w)) return pick(idxOf(w.charAt(0)), idxOf(w.charAt(1)));
          throw new Error('不认识「' + w + '」，/menu 帮助 看用法');
        }
        if (sub === 'help') { say(HELP); return; }
        if (sub === 'add') {
          var rest = restOf(c, 1).replace(/^\s+|\s+$/g, ''), eq = rest.search(/[=＝]/), name, code = '';
          if (eq >= 0) { name = rest.slice(0, eq).replace(/\s+$/, ''); code = rest.slice(eq + 1).replace(/^\s+|\s+$/g, ''); } else name = rest;
          if (!name) throw new Error('用法：/menu 加 名字 = 命令或代码');
          if (name.length > 30) throw new Error('名字太长了（最多 30 个字）');
          if (!code) { st = { lvl: 'code', name: name, t: Date.now() }; print('请输入「' + name + '」要执行的命令或代码（0 取消）。多行代码先在 ⋯ 里打开「多行输入」', 'info'); return; }
          return addItem(name, code);
        }
        if (sub === 'reset') {
          st = { lvl: 'confirm', go: function () { data = defaults(); try { localStorage.removeItem(KEY); } catch (_) {} print('已恢复默认菜单', 'ok'); }, t: Date.now() };
          print('将恢复默认菜单，你自己添加和修改的内容会被清空。输入 y 确认，其他取消', 'warn');
          return;
        }
        var p = need(pathOf(a[1]), a[1] || ''), g = data[p.gi], it = g.items[p.ii];
        if (sub === 'del') { g.items.splice(p.ii, 1); save(); return print('已删除：' + it.name, 'ok'); }
        if (sub === 'ren') {
          var nn = restOf(c, 2).replace(/^\s+|\s+$/g, '');
          if (!nn) throw new Error('用法：/menu 改名 2.3 新名字');
          if (nn.length > 30) throw new Error('名字太长了（最多 30 个字）');
          it.name = nn; save(); return print('已改名：' + nn, 'ok');
        }
        var to = sub === 'up' ? p.ii - 1 : sub === 'down' ? p.ii + 1 : 0;
        if (to < 0 || to >= g.items.length) return print('已经在' + (sub === 'down' ? '最后' : '最前') + '了', 'info');
        g.items.splice(p.ii, 1); g.items.splice(to, 0, it); save();
        print('「' + it.name + '」现在是第 ' + keyOf(p.gi) + ' 组第 ' + keyOf(to) + ' 项', 'ok');
      }
    });
  })();

  window.CmdConsole = {
    open: open, close: close, toggle: toggle, register: register, run: exec, print: print, fmt: fmt,
    commands: function () { return cmdNames(); }, isOpen: function () { return openState; }
  };
  /* 给 cmd-extra.js 用：往输出里放自定义节点、执行 JS、把文字填进输入框 */
  function printNode(node, txt) {
    var d = document.createElement('div');
    d.className = 'cm-ln cm-out-k'; d.__txt = txt || node.textContent || ''; d.__n = 1;
    d.appendChild(node);
    enqueue(d);
    return d;
  }
  function fillInput(t) {
    if (!built) return;
    input.value = t; hIdx = hist.length; autosize(); updateSug();
    if (window.__cmFocus) window.__cmFocus();
  }
  window.CmdConsole._i = {
    print: print, printNode: printNode, fill: fillInput, evalJS: evalJS, evalSafe: evalSafe, lexSet: lexSet, short: short, elTag: elTag, preview: preview,
    timeStr: timeStr, restOf: restOf, onoff: onoff, appGlobals: appGlobals, tokenize: tokenize, esc: esc, fmtTop: fmtTop, exec: exec,
    scrollEnd: function () { if (out) { out.scrollTop = out.scrollHeight; pinned = true; syncJump(); } }
  };
  window.__openCmdConsole = open;
  window.__closeCmdConsole = close;

  /* 第一次点开时才建 DOM + 注入 CSS，会让整页重算一次样式，点下去就卡一下。页面加载完、空闲时先建好。 */
  function prebuild() {
    if (built) return;
    try { build(); }
    catch (e) {
      built = false; root = null;
      var r = document.getElementById('cmRoot'); if (r) r.remove();
      var st = document.getElementById('cmdConsoleStyle'); if (st) st.remove();
      if (window.console && console.warn) console.warn('[命令窗口] 预创建失败，改为打开时再创建', e);
    }
  }
  function schedulePrebuild() {
    if (window.requestIdleCallback) requestIdleCallback(prebuild, { timeout: 5000 });
    else setTimeout(prebuild, 3000);
  }
  if (document.readyState === 'complete') schedulePrebuild();
  else window.addEventListener('load', schedulePrebuild, { once: true });

  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'K' || e.key === 'k')) { e.preventDefault(); toggle(); }
  });

  if (mirrorOn) hookOn();                                           // 上次开着「同步 console」，刷新后继续
})();
