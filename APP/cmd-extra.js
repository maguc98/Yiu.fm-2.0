/* 命令窗口的扩展命令（要在 cmd-console.js 之后加载；网络和早期记录依赖 cmd-early.js）。
   /early /net  加载前的报错日志、网络请求（含请求内容 / 响应内容 / WebSocket / sendBeacon / 全部资源加载）
   /pick /tree /edit /rules  点选元素、可展开的元素树、实时改样式、看命中的 CSS 规则
   /prof /mem   函数耗时调用树（插桩式，不是采样）、内存估算与前后对比
   /lex /bp     找出 let / const 声明的名字；函数断点（记录参数和调用栈，可选真正的 debugger）
   /frames /in  同源 iframe 的查看和执行 */
(function () {
  'use strict';
  var C = window.CmdConsole;
  if (!C || !C._i) return;
  var I = C._i, E = window.__cmEarly || null;
  var print = I.print, short = I.short, evalSafe = I.evalSafe;
  function reg(name, def) { def.group = def.group || '开发者'; C.register(name, def); }
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function fmtBytes(n) { if (n == null || isNaN(n)) return '-'; return n < 1024 ? Math.round(n) + 'B' : n < 1048576 ? (n / 1024).toFixed(1) + 'KB' : (n / 1048576).toFixed(1) + 'MB'; }
  function rel(t) { return '+' + (((t - (E ? E.t0 : t)) / 1000)).toFixed(2) + 's'; }
  function onoff(a, cur) { return a === 'on' || a === '1' ? true : a === 'off' || a === '0' ? false : !cur; }

  /* ============================== /early ============================== */
  reg('early', {
    desc: '命令窗口加载之前发生的报错和 console 输出（从页面最开始记）', usage: '/early [条数]',
    run: function (a, c) {
      if (!E) return c.print('没有加载 cmd-early.js：要放在 index.html 的 <head> 最前面', 'err');
      var n = parseInt(a[0], 10) || 40, rows = [];
      E.logs.forEach(function (x) { rows.push({ t: x.t, k: x.k === 'error' ? 'err' : x.k === 'warn' ? 'warn' : 'log', s: x.s }); });
      E.errs.forEach(function (x) { rows.push({ t: x.t, k: 'err', s: x.msg + (x.src ? '  ' + x.src : '') + (x.stack ? '\n' + x.stack : '') }); });
      /* index.html 的最早期捕获队列与 cmd-early 是两条独立通道；展开原始 detail，避免只看到 {time,message,file,...} 字段名。 */
      (Array.isArray(window.__YiuEarlyErrors) ? window.__YiuEarlyErrors : []).forEach(function (x) {
        var d = x && x.detail || {}, when = x && x.time ? Date.parse(x.time) : NaN;
        var stamp = isFinite(when) ? when : (E ? E.t0 : Date.now());
        var raw; try { raw = JSON.stringify(d, null, 2); } catch (_) { raw = String(d); }
        rows.push({ t: stamp, k: 'err', s: '[early-raw][' + ((x && x.kind) || 'unknown') + '] ' + (d.message || '') + (d.file ? '\\nfile: ' + d.file : '') + (d.url ? '\\nurl: ' + d.url : '') + (d.line ? '\\nline: ' + d.line : '') + (d.column ? '\\ncolumn: ' + d.column : '') + (d.stack ? '\\nstack: ' + d.stack : '') + '\\nraw: ' + (raw || '{}') });
      });
      rows.sort(function (p, q) { return p.t - q.t; });
      if (!rows.length) return c.print('没有记录。console 只记页面加载后 3 秒内的输出，报错一直记', 'info');
      c.print('从页面开始起共 ' + rows.length + ' 条，显示最近 ' + Math.min(n, rows.length) + ' 条（时间是页面开始后的秒数）', 'info');
      rows.slice(-n).forEach(function (x) { c.print(rel(x.t) + '  ' + x.s, x.k); });
    }
  });

  /* ============================== /net ============================== */
  var netLive = false, netTimer = 0;
  function netFailed(r) { return !!r.err || (r.via !== 'ws' && r.via !== 'sse' && (r.status >= 400 || (r.status === 0 && r.ms != null))); }
  function netKind(r) { return netFailed(r) ? 'err' : (r.ms != null && r.ms > 1000) ? 'warn' : 'log'; }
  function netLine(r) {
    var u = r.url; try { if (u.indexOf(location.origin) === 0 && location.origin !== 'null') u = u.slice(location.origin.length) || '/'; } catch (_) {}
    return '#' + r.id + '  ' + (r.err ? '失败' : r.ms == null ? '…' : r.status) + '  ' + r.method + '  ' + (r.ms == null ? '…' : Math.round(r.ms) + 'ms') + '  ' + fmtBytes(r.size) + '  ' + r.via + '  ' + short(u, 90);
  }
  function pretty(r) {
    var t = r.resBody;
    if (t && /json/i.test(r.ct || '') && t.length === r.resLen) { try { return JSON.stringify(JSON.parse(t), null, 2); } catch (_) {} }
    return t;
  }
  function netDetail(r, mode) {
    var rows = [r.method + ' ' + r.url,
      '状态 ' + (r.err ? '失败：' + r.err : r.ms == null ? '进行中' : r.status) + '    耗时 ' + (r.ms == null ? '…' : Math.round(r.ms) + 'ms') + '    大小 ' + fmtBytes(r.size),
      '方式 ' + r.via + '    类型 ' + (r.ct || '-') + '    时间 ' + I.timeStr(r.t)];
    if (r.note) rows.push(r.note);
    if (r.closed) rows.push('连接已关闭：' + r.closed);
    var lim = mode === 'body' ? 20000 : 1500, t;
    if (mode !== 'body') {
      if (r.rh && r.rh.length) rows.push('请求头：\n  ' + r.rh.join('\n  '));
      if (r.reqBody != null) rows.push('请求内容：\n' + short(r.reqBody, lim));
      if (r.hd && r.hd.length) rows.push('响应头：\n  ' + r.hd.join('\n  '));
    }
    if (r.frames) {
      rows.push('消息（最多记 80 条）：\n' + (r.frames.length ? r.frames.map(function (f) { return rel(f.t) + ' ' + f.d + ' ' + f.s; }).join('\n') : '（暂无）'));
    } else if (r.resBody != null) {
      t = pretty(r);
      rows.push('响应内容' + (r.resLen > r.resBody.length ? '（只保存了前 ' + r.resBody.length + ' 字，共 ' + r.resLen + '）' : '') + '：\n' + short(t, lim) + (mode !== 'body' && t.length > lim ? '\n/net ' + r.id + ' body 看更多' : ''));
    } else if (r.via !== 'beacon') {
      rows.push('响应内容：没有保存（不是文本，或者超过 600KB，或者还没返回）');
    }
    return rows.join('\n');
  }
  function netRes(a, c) {
    var es = performance.getEntriesByType('resource') || [], kw = (a[1] || '').toLowerCase(), slow = kw === 'slow', cnt = {};
    es.forEach(function (e) { cnt[e.initiatorType || '?'] = (cnt[e.initiatorType || '?'] || 0) + 1; });
    var list = es.filter(function (e) { return slow || !kw || e.name.toLowerCase().indexOf(kw) >= 0 || (e.initiatorType || '').toLowerCase() === kw; });
    if (slow) list = list.slice().sort(function (p, q) { return q.duration - p.duration; });
    c.print('页面从开始到现在加载过 ' + es.length + ' 个资源：' + Object.keys(cnt).map(function (k) { return k + ' ' + cnt[k]; }).join(' · ') + '。' + (slow ? '按耗时从长到短：' : kw ? '筛选“' + kw + '”：' + list.length + ' 个' : '显示最近 25 个。/net res 关键字或类型（img script css …）筛选，/net res slow 看最慢的'), 'info');
    (slow ? list.slice(0, 20) : list.slice(-25)).forEach(function (e) {
      var sz = e.transferSize || e.encodedBodySize || e.decodedBodySize || 0, u = e.name;
      try { if (u.indexOf(location.origin) === 0 && location.origin !== 'null') u = u.slice(location.origin.length); } catch (_) {}
      c.print((e.initiatorType || '?') + '  ' + Math.round(e.duration) + 'ms  ' + (sz ? fmtBytes(sz) : '-') + '  ' + short(u, 90), e.duration > 1000 ? 'warn' : 'log');
    });
    if (es.length >= 1400) c.print('资源记录快满了（上限 1500），更早的可能已被挤掉', 'warn');
  }
  function netTick() {
    if (!E) return;
    E.net.forEach(function (r) { if (!r.__shown && r.ms != null && (r.via !== 'fetch' || r.resBody != null || r.err || r.status >= 400 || Date.now() - r.t > 1500)) { r.__shown = true; try { print(netLine(r), netKind(r)); } catch (_) {} } });
  }
  function netLiveSet(on) {
    netLive = on; clearInterval(netTimer); netTimer = 0;
    if (on) { if (E) E.net.forEach(function (r) { r.__shown = true; }); netTimer = setInterval(netTick, 500); }
  }
  reg('net', {
    desc: '网络请求：on 开始记录（刷新后从页面一开始就记，含请求/响应内容、WebSocket、sendBeacon）；res 看页面加载过的全部资源', usage: '/net [on|off|clear|live|fail|slow 毫秒|ws|res [关键字|slow]|序号 [body]|关键字]',
    complete: function (tk) { return tk.length ? [] : ['on', 'off', 'clear', 'live', 'fail', 'slow', 'ws', 'res']; },
    run: function (a, c) {
      var s = (a[0] || '').toLowerCase();
      if (s === 'res') return netRes(a, c);
      if (!E) return c.print('没有加载 cmd-early.js：请求内容、WebSocket 这些需要它（放在 <head> 最前面）。资源加载可以用 /net res 看', 'err');
      if (s === 'on') { E.setNet(true); return '开始记录（含请求内容 / 响应内容 / WebSocket / sendBeacon / EventSource）。刷新后会从页面一开始就记；已经发出去的请求用 /net res 看。/net live 可以实时显示'; }
      if (s === 'off') { E.setNet(false); return '已停止记录（已有的记录还在）'; }
      if (s === 'clear') { E.net.length = 0; return '已清空'; }
      if (s === 'live') { netLiveSet(onoff(a[1], netLive)); return '请求完成时实时显示：' + (netLive ? '开' : '关'); }
      if (/^\d+$/.test(s)) {
        var id = parseInt(s, 10), r = E.net.filter(function (x) { return x.id === id; })[0];
        if (!r) throw new Error('没有 #' + id + '（只保留最近 200 条）');
        return c.print(netDetail(r, (a[1] || '').toLowerCase()), netKind(r) === 'err' ? 'err' : 'out');
      }
      var list = E.net, title = '';
      if (s === 'fail') { list = list.filter(netFailed); title = '，只看失败'; }
      else if (s === 'ws') { list = list.filter(function (x) { return x.via === 'ws' || x.via === 'sse'; }); title = '，只看 WebSocket / SSE'; }
      else if (s === 'slow') { var ms = parseInt(a[1], 10) || 500; list = list.filter(function (x) { return x.ms != null && x.ms >= ms; }); title = '，只看 ≥' + ms + 'ms'; }
      else if (s) { var kw = s; list = list.filter(function (x) { return x.url.toLowerCase().indexOf(kw) >= 0; }); title = '，关键字 ' + kw; }
      c.print('记录：' + (E.netOn ? '开' : '关') + '，共 ' + E.net.length + ' 条' + title, 'info');
      if (!list.length) return c.print(E.netOn ? '没有匹配的请求' : '先 /net on，再操作页面（刷新页面也会继续记）；之前的请求用 /net res 看', 'info');
      list.slice(-15).forEach(function (r) { c.print(netLine(r), netKind(r)); });
      if (list.length > 15) c.print('只显示最近 15 条，共 ' + list.length + ' 条；/net 序号 看请求和响应内容', 'info');
      else c.print('/net 序号 看请求头、请求内容、响应内容', 'info');
    }
  });

  /* ============================== 元素：树 / 选取 / 编辑 ============================== */
  var XCSS = '#cmRoot .xt{font-size:var(--cm-fs);line-height:1.5;white-space:normal}#cmRoot .xt-h{display:flex;align-items:flex-start;gap:2px}' +
    '#cmRoot .xt-t{flex:none;width:26px;height:28px;padding:0;border:none;background:transparent;color:#9fbcff;font:inherit;cursor:pointer}' +
    '#cmRoot .xt-t:disabled{color:rgba(255,255,255,.25)}' +
    '#cmRoot .xt-l{flex:1;min-width:0;text-align:left;border:none;background:transparent;color:#f5f5f7;font:inherit;padding:3px 6px;border-radius:9px;word-break:break-all;white-space:pre-wrap;cursor:pointer}' +
    '#cmRoot .xt-l.on{background:rgba(143,176,255,.2)}#cmRoot .xt-n{color:#ff9ecb}#cmRoot .xt-i{color:#ffd9a8}#cmRoot .xt-c{color:#9fbcff}#cmRoot .xt-s{color:#8ee0b0}#cmRoot .xt-m{color:var(--cm-sub)}' +
    '#cmRoot .xt-k{margin-left:12px;padding-left:6px;border-left:1px solid rgba(255,255,255,.14)}' +
    '#cmRoot .xt-d{margin:2px 0 8px 26px;padding:8px 10px;border-radius:12px;background:rgba(255,255,255,.07);color:#dbe5ff;word-break:break-all}' +
    '#cmRoot .xt-d pre{margin:0 0 4px;font:inherit;white-space:pre-wrap}' +
    '#cmRoot .xt-b{display:inline-block;margin:6px 6px 0 0;height:30px;padding:0 13px;border:none;border-radius:15px;background:rgba(143,176,255,.22);color:#c3d6ff;font-family:-apple-system,"PingFang SC",system-ui,sans-serif;font-size:13px;font-weight:600;cursor:pointer;-webkit-tap-highlight-color:transparent}' +
    '#cmRoot .xt-b:active{background:rgba(143,176,255,.45)}';
  var xcssOn = false;
  function ensureCss() { if (xcssOn) return; xcssOn = true; var st = document.createElement('style'); st.id = 'cmExtraStyle'; st.textContent = XCSS; document.head.appendChild(st); }
  function mk(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function btn(cls, txt) { var b = mk('button', cls, txt); b.type = 'button'; return b; }
  function span(cls, txt) { return mk('span', cls, txt); }
  function cssEsc(s) { return window.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/[^\w-]/g, '\\$&'); }
  function selOf(el) {
    var parts = [], cur = el;
    while (cur && cur.nodeType === 1 && parts.length < 6) {
      if (cur.id) { parts.unshift('#' + cssEsc(cur.id)); break; }
      var s = cur.nodeName.toLowerCase();
      if (cur === document.body || cur === document.documentElement) { parts.unshift(s); break; }
      s += Array.prototype.slice.call(cur.classList || []).slice(0, 2).map(function (x) { return '.' + cssEsc(x); }).join('');
      var p = cur.parentElement;
      if (p) { var same = Array.prototype.filter.call(p.children, function (x) { return x.nodeName === cur.nodeName; }); if (same.length > 1) s += ':nth-of-type(' + (same.indexOf(cur) + 1) + ')'; }
      parts.unshift(s); cur = p;
    }
    return parts.join(' > ');
  }
  function setDollar(el) { window.$1 = window.$0; window.$0 = el; }
  function frameDoc(n) {
    var f = document.querySelectorAll('iframe')[n];
    if (!f) return null;
    try { return f.contentDocument || null; } catch (_) { return null; }
  }
  function resolve(sel, doc) {
    if (sel === '$0') return window.$0 && window.$0.nodeType === 1 ? [window.$0] : [];
    if (sel === '$1') return window.$1 && window.$1.nodeType === 1 ? [window.$1] : [];
    var l; try { l = (doc || document).querySelectorAll(sel); } catch (e) { throw new Error('选择器不合法：' + sel); }
    return Array.prototype.slice.call(l, 0, 50);
  }
  function isOurs(el) { return el.id === 'cmRoot' || el.id === 'cmPick' || el.id === 'cmPickBox'; }

  /* ---- 编辑（带撤销） ---- */
  var undo = [];
  function pushUndo(fn, desc) { undo.push({ fn: fn, desc: desc }); if (undo.length > 40) undo.shift(); }
  function setStyle(el, prop, val) {
    var old = el.style.getPropertyValue(prop), oldP = el.style.getPropertyPriority(prop);
    var imp = /\s*!important\s*$/i.test(val); val = val.replace(/\s*!important\s*$/i, '');
    el.style.setProperty(prop, val, imp ? 'important' : '');
    var ok = el.style.getPropertyValue(prop) !== '' || val === '';
    pushUndo(function () { if (old) el.style.setProperty(prop, old, oldP); else el.style.removeProperty(prop); }, prop);
    return ok;
  }
  function setAttr(el, name, val) {
    var had = el.hasAttribute(name), old = el.getAttribute(name);
    el.setAttribute(name, val);
    pushUndo(function () { if (had) el.setAttribute(name, old); else el.removeAttribute(name); }, '@' + name);
  }
  function removeEl(el) {
    var p = el.parentNode, nx = el.nextSibling;
    if (!p) return;
    p.removeChild(el);
    pushUndo(function () { p.insertBefore(el, nx); }, '删除 ' + I.elTag(el));
  }
  function applyEdit(els, spec) {
    var m, bad = [];
    if (spec === 'hide') { els.forEach(function (e) { setStyle(e, 'display', 'none !important'); }); return '已隐藏 ' + els.length + ' 个（/edit 选择器 show 恢复，或 /edit undo）'; }
    if (spec === 'show') { els.forEach(function (e) { setStyle(e, 'display', ''); }); return '已恢复显示 ' + els.length + ' 个'; }
    if (spec === 'remove') { els.forEach(removeEl); return '已删除 ' + els.length + ' 个（/edit undo 可以放回去）'; }
    if ((m = /^@([\w:.-]+)\s*=\s*([\s\S]*)$/.exec(spec))) { els.forEach(function (e) { setAttr(e, m[1], m[2]); }); return '已设置属性 ' + m[1] + '，共 ' + els.length + ' 个'; }
    if ((m = /^text\s*=\s*([\s\S]*)$/.exec(spec))) {
      els.forEach(function (e) { var old = e.textContent; e.textContent = m[1]; pushUndo(function () { e.textContent = old; }, 'text'); });
      return '已改文字，共 ' + els.length + ' 个（子元素会被替换，撤销时只还原文字）';
    }
    if (spec.indexOf(':') > 0) {
      var n = 0;
      spec.split(';').forEach(function (d) {
        var i = d.indexOf(':'); if (i < 1) return;
        var prop = d.slice(0, i).trim(), val = d.slice(i + 1).trim();
        if (!/^[-\w]+$/.test(prop)) return;
        els.forEach(function (e) { if (!setStyle(e, prop, val)) bad.push(prop + ': ' + val); });
        n++;
      });
      return n ? '已改样式 ' + n + ' 项，共 ' + els.length + ' 个元素' + (bad.length ? '\n浏览器不认这些值：' + bad.slice(0, 4).join('；') : '') + '（/edit undo 撤销）' : '格式：属性: 值';
    }
    throw new Error('看不懂 “' + spec + '”。格式：属性: 值 | @属性=值 | text=文字 | hide | show | remove | undo');
  }
  reg('edit', {
    desc: '实时改页面元素（刷新就恢复）：样式、属性、文字、隐藏、删除，可撤销', usage: '/edit <选择器|$0> <属性: 值> | @属性=值 | text=文字 | hide | show | remove    /edit undo   例：/edit $0 color: red; font-size: 20px',
    complete: function (tk) { return tk.length ? ['hide', 'show', 'remove'] : ['undo', '$0', '$1']; },
    run: function (a, c) {
      if (!a.length) throw new Error('用法：/edit <选择器|$0> <属性: 值>   /edit undo');
      if (a[0] === 'undo') {
        var n = Math.max(1, parseInt(a[1], 10) || 1), done = [];
        while (n-- > 0 && undo.length) { var u = undo.pop(); try { u.fn(); done.push(u.desc); } catch (_) {} }
        return done.length ? '已撤销：' + done.join('、') : '没有可撤销的改动';
      }
      var els = resolve(a[0]);
      if (!els.length) return c.print(a[0] === '$0' ? '还没有 $0：先 /pick 点选一个元素，或在 /tree 里点一个标签' : '没有匹配的元素', 'warn');
      els = els.filter(function (e) { return !isOurs(e); });
      var spec = a.slice(1).join(' ').trim();
      if (!spec) return c.print('匹配 ' + els.length + ' 个。后面加上要改的内容，例：/edit ' + a[0] + ' color: red', 'info');
      return applyEdit(els, spec);
    }
  });

  /* ---- 命中的 CSS 规则 ---- */
  function rulesOf(el) {
    var out = [], blocked = 0, doc = el.ownerDocument || document, win = doc.defaultView || window;
    function walk(rules, name) {
      for (var i = 0; i < rules.length; i++) {
        var r = rules[i];
        if (r.selectorText !== undefined && r.style) { try { if (el.matches(r.selectorText)) out.push({ sel: r.selectorText, css: r.style.cssText, src: name }); } catch (_) {} }
        else if (r.cssRules) {
          if (r.media) { var ok = true; try { ok = win.matchMedia(r.media.mediaText).matches; } catch (_) {} if (!ok) continue; }
          walk(r.cssRules, name);
        }
      }
    }
    Array.prototype.forEach.call(doc.styleSheets || [], function (sh) {
      var rules; try { rules = sh.cssRules; } catch (_) { blocked++; return; }
      if (rules) walk(rules, sh.href ? sh.href.split('/').pop().split('?')[0] : '<style>');
    });
    return { list: out, blocked: blocked };
  }
  reg('rules', {
    desc: '看哪些 CSS 规则命中了某个元素（后面的覆盖前面的）', usage: '/rules <选择器|$0>',
    run: function (a, c) {
      if (!a.length) throw new Error('用法：/rules <选择器|$0>');
      var el = resolve(a.join(' '))[0];
      if (!el) return c.print('没有匹配的元素', 'warn');
      var r = rulesOf(el), rows = [I.elTag(el) + '  命中 ' + r.list.length + ' 条规则' + (r.blocked ? '（有 ' + r.blocked + ' 个跨域样式表读不了）' : '')];
      if (el.style && el.style.cssText) rows.push('style="" 内联：\n  ' + el.style.cssText.replace(/;\s*/g, ';\n  ').trim());
      r.list.slice(-40).forEach(function (x) { rows.push(x.sel + ' {\n  ' + x.css.replace(/;\s*/g, ';\n  ').trim() + '\n}  ← ' + x.src); });
      if (r.list.length > 40) rows.push('只显示最后 40 条（优先级靠后的）');
      c.print(rows.join('\n'), 'out');
    }
  });

  /* ---- 元素树 ---- */
  function fillLabel(lb, el) {
    lb.textContent = '';
    var tag = el.nodeName.toLowerCase();
    lb.appendChild(span('xt-m', '<')); lb.appendChild(span('xt-n', tag));
    if (el.id) lb.appendChild(span('xt-i', '#' + el.id));
    var cl = Array.prototype.slice.call(el.classList || [], 0, 3);
    if (cl.length) lb.appendChild(span('xt-c', '.' + cl.join('.') + (el.classList.length > 3 ? '…' : '')));
    lb.appendChild(span('xt-m', '>'));
    if (!el.children.length) { var t = (el.textContent || '').trim().replace(/\s+/g, ' '); if (t) lb.appendChild(span('xt-s', '  ' + short(t, 28))); }
    else lb.appendChild(span('xt-m', '  ·' + el.children.length));
    if (isOurs(el)) lb.appendChild(span('xt-m', '  （命令窗口）'));
    if (el.hidden || (el.style && el.style.display === 'none')) lb.appendChild(span('xt-m', '  [隐藏]'));
  }
  function flash(el) {
    var r = el.getBoundingClientRect(), b = mk('div');
    b.style.cssText = 'position:fixed;pointer-events:none;z-index:2147482951;box-sizing:border-box;border:2px solid #5b8cff;background:rgba(91,140,255,.28);border-radius:3px;left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px';
    var wasOpen = C.isOpen && C.isOpen();
    if (wasOpen) C.close();
    setTimeout(function () {
      document.body.appendChild(b);
      setTimeout(function () { b.remove(); if (wasOpen) C.open(); }, 1600);
    }, wasOpen ? 380 : 0);
  }
  function copyText(t) {
    function fb() { var ta = mk('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;left:-999px;top:0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (_) {} ta.remove(); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).catch(fb); else fb();
  }
  function detailText(el) {
    var rows = [], r = el.getBoundingClientRect(), win = (el.ownerDocument && el.ownerDocument.defaultView) || window, cs;
    try { cs = win.getComputedStyle(el); } catch (_) { cs = null; }
    rows.push('选择器  ' + selOf(el));
    rows.push('位置 ' + Math.round(r.left) + ', ' + Math.round(r.top) + '   尺寸 ' + Math.round(r.width) + ' × ' + Math.round(r.height));
    if (cs) rows.push(['display', 'position', 'color', 'background-color', 'font-size', 'opacity', 'z-index', 'overflow'].map(function (p) { return p + ': ' + cs.getPropertyValue(p); }).join('\n'));
    var at = Array.prototype.slice.call(el.attributes || [], 0, 10).map(function (x) { return x.name + '="' + short(x.value, 60) + '"'; });
    if (at.length) rows.push('属性  ' + at.join('  '));
    return rows.join('\n');
  }
  function row(el, opt) {
    opt = opt || {};
    var wrap = mk('div', 'xt'), h = mk('div', 'xt-h'), nk = el.children.length;
    var tg = btn('xt-t', nk ? '▸' : '·'); if (!nk) tg.disabled = true;
    var lb = btn('xt-l', ''); fillLabel(lb, el);
    h.appendChild(tg); h.appendChild(lb); wrap.appendChild(h);
    var kids = null, det = null;
    function addKids(box, from) {
      var all = el.children, end = Math.min(all.length, from + 60);
      for (var i = from; i < end; i++) box.appendChild(row(all[i]));
      if (end < all.length) {
        var more = btn('xt-b', '还有 ' + (all.length - end) + ' 个，点这里继续');
        more.onclick = function () { more.remove(); addKids(box, end); };
        box.appendChild(more);
      }
    }
    function toggleKids(open) {
      if (!nk || isOurs(el)) return;
      var show = open === undefined ? (!kids || kids.style.display === 'none') : open;
      if (!kids) { kids = mk('div', 'xt-k'); wrap.appendChild(kids); addKids(kids, 0); }
      kids.style.display = show ? '' : 'none'; tg.textContent = show ? '▾' : '▸';
    }
    function toggleDet(open) {
      var show = open === undefined ? (!det || det.style.display === 'none') : open;
      if (!det) {
        det = mk('div', 'xt-d'); det.appendChild(mk('pre', '', detailText(el)));
        var acts = [
          ['高亮', function () { flash(el); }],
          ['改样式', function () { setDollar(el); I.fill('/edit $0 '); }],
          ['命中规则', function () { setDollar(el); I.exec('/rules $0'); }],
          ['隐藏', function (b) { var hid = el.style.display === 'none'; setStyle(el, 'display', hid ? '' : 'none !important'); b.textContent = hid ? '隐藏' : '显示'; fillLabel(lb, el); }],
          ['删除', function () { removeEl(el); wrap.remove(); }],
          ['复制选择器', function (b) { copyText(selOf(el)); b.textContent = '已复制'; }]
        ];
        acts.forEach(function (x) { var b = btn('xt-b', x[0]); b.onclick = function () { x[1](b); }; det.appendChild(b); });
        wrap.insertBefore(det, kids || null);
      }
      det.style.display = show ? '' : 'none'; lb.classList.toggle('on', show);
      if (show) setDollar(el);
    }
    tg.onclick = function () { toggleKids(); };
    lb.onclick = function () { toggleDet(); };
    if (opt.expand) toggleKids(true);
    if (opt.detail) toggleDet(true);
    return wrap;
  }
  function showRow(el, opt) { ensureCss(); return I.printNode(row(el, opt), I.elTag(el)); }
  reg('tree', {
    desc: '可展开的元素树：点 ▸ 展开子元素，点标签看位置、样式、属性，并有改样式 / 隐藏 / 删除按钮。@n 表示第 n 个 iframe', usage: '/tree [@n] [选择器|$0]',
    run: function (a, c) {
      var doc = document, args = a.slice();
      if (args[0] && /^@\d+$/.test(args[0])) {
        var n = parseInt(args.shift().slice(1), 10); doc = frameDoc(n);
        if (!doc) throw new Error('iframe @' + n + ' 不存在，或者是跨域的，浏览器不让访问（/frames 看列表）');
      }
      var sel = args.join(' '), els = sel ? resolve(sel, doc) : [doc.documentElement];
      if (!els.length) return c.print(sel === '$0' ? '还没有 $0：先 /pick 点选一个元素' : '没有匹配的元素', 'warn');
      c.print(sel ? '匹配 ' + els.length + ' 个' + (els.length > 8 ? '，只显示前 8 个' : '') + '。点 ▸ 展开，点标签看详情' : '点 ▸ 展开，点标签看详情和操作', 'info');
      els.slice(0, 8).forEach(function (el) { showRow(el, { expand: els.length === 1 || !sel }); });
    }
  });

  /* ---- /pick 点选元素 ---- */
  var pk = null;
  function pickEnd(el) {
    if (!pk) return;
    pk.parts.forEach(function (x) { x.remove(); });
    pk = null;
    C.open();
    if (el) {
      setDollar(el);
      print('已选中 ' + I.elTag(el) + '  → $0\n' + selOf(el), 'ok');
      showRow(el, { detail: true });
    } else print('已取消选取', 'info');
  }
  function pickStart() {
    if (pk) return;
    var ov = mk('div'), box = mk('div'), tip = mk('div'), bar = mk('div'), cur = null, trail = [];
    ov.id = 'cmPick'; box.id = 'cmPickBox';
    ov.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:2147482950;touch-action:none;-webkit-user-select:none;user-select:none;background:rgba(0,0,0,.001)';
    box.style.cssText = 'position:fixed;pointer-events:none;display:none;box-sizing:border-box;z-index:2147482951;border:2px solid #5b8cff;background:rgba(91,140,255,.26);border-radius:3px';
    tip.style.cssText = 'position:fixed;pointer-events:none;left:10px;right:10px;top:calc(env(safe-area-inset-top,0px) + 8px);padding:8px 12px;border-radius:14px;z-index:2147482952;background:rgba(20,22,30,.93);color:#dbe5ff;font:12px/1.45 ui-monospace,Menlo,monospace;white-space:pre-wrap;word-break:break-all';
    bar.style.cssText = 'position:fixed;left:10px;right:10px;bottom:calc(env(safe-area-inset-bottom,0px) + 14px);display:flex;gap:6px;z-index:2147482952;touch-action:manipulation';
    tip.textContent = '手指在页面上按住滑动，选中的元素会高亮；松手后用下面的按钮微调';
    function draw() {
      if (!cur) { box.style.display = 'none'; return; }
      var r = cur.getBoundingClientRect();
      box.style.display = 'block'; box.style.left = r.left + 'px'; box.style.top = r.top + 'px'; box.style.width = r.width + 'px'; box.style.height = r.height + 'px';
      tip.textContent = selOf(cur) + '\n' + Math.round(r.width) + ' × ' + Math.round(r.height) + '  位置 ' + Math.round(r.left) + ', ' + Math.round(r.top);
    }
    function setCur(e) { if (e && e !== cur) { cur = e; draw(); } }
    function at(x, y) { ov.style.pointerEvents = 'none'; var e = document.elementFromPoint(x, y); ov.style.pointerEvents = ''; return e && !bar.contains(e) && !isOurs(e) ? e : null; }
    ov.addEventListener('pointerdown', function (e) { trail = []; setCur(at(e.clientX, e.clientY)); e.preventDefault(); });
    ov.addEventListener('pointermove', function (e) { setCur(at(e.clientX, e.clientY)); e.preventDefault(); });
    ov.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
    function b(txt, flex, fn, bg) {
      var x = btn('', txt);
      x.style.cssText = 'height:42px;border:none;border-radius:21px;color:#fff;font:700 15px -apple-system,"PingFang SC",sans-serif;flex:' + flex + ';background:' + (bg || 'rgba(60,64,80,.94)');
      x.addEventListener('click', fn); bar.appendChild(x);
    }
    b('▲', 1, function () { if (cur && cur.parentElement) { trail.push(cur); cur = cur.parentElement; draw(); } });
    b('▼', 1, function () { if (!cur) return; var t = trail.pop(); if (t && cur.contains(t) && t !== cur) { cur = t; } else if (cur.firstElementChild) cur = cur.firstElementChild; draw(); });
    b('◀', 1, function () { if (cur && cur.previousElementSibling) { cur = cur.previousElementSibling; trail = []; draw(); } });
    b('▶', 1, function () { if (cur && cur.nextElementSibling) { cur = cur.nextElementSibling; trail = []; draw(); } });
    b('选定', 2, function () { pickEnd(cur); }, '#5470c9');
    b('取消', 1.4, function () { pickEnd(null); }, 'rgba(217,83,74,.95)');
    pk = { parts: [ov, box, tip, bar] };
    pk.parts.forEach(function (x) { document.body.appendChild(x); });
  }
  reg('pick', {
    desc: '点选页面元素：命令窗口先收起，手指在页面上滑动选元素，可用 ▲▼◀▶ 微调；选定后回到这里并设为 $0', usage: '/pick',
    run: function () { ensureCss(); if (C.isOpen && C.isOpen()) C.close(); setTimeout(pickStart, 380); }
  });

  /* ============================== /prof 函数耗时调用树 ============================== */
  var P = { on: false, targets: [], root: { kids: {} }, flat: {}, stack: [], t0: 0, t1: 0, filter: '' };
  var NATIVE = /\{\s*\[native code\]\s*\}\s*$/;
  function lexList() { return window.__cmLexNames ? window.__cmLexNames() : []; }
  function profTargets(filter) {
    var res = [], seen = [], lf = (filter || '').toLowerCase();
    function ok(path) { return !lf || path.toLowerCase().indexOf(lf) >= 0; }
    function add(owner, key, path, lex) {
      if (res.length >= 400 || !ok(path)) return;
      var fn, d;
      if (lex) { fn = evalSafe(key); } else { d = Object.getOwnPropertyDescriptor(owner, key); if (!d || !('value' in d) || !d.writable) return; fn = d.value; }
      if (typeof fn !== 'function' || fn.__cmProf || seen.indexOf(fn) >= 0) return;
      var src; try { src = Function.prototype.toString.call(fn); } catch (_) { return; }
      if (NATIVE.test(src) || /^class[\s{]/.test(src)) return;
      seen.push(fn); res.push({ owner: owner, key: key, path: path, fn: fn, lex: !!lex });
    }
    function methodsOf(obj, name, sep) {
      var keys; try { keys = Object.keys(obj); } catch (_) { return; }
      keys.slice(0, 80).forEach(function (k) { add(obj, k, name + sep + k, false); });
    }
    I.appGlobals(true).forEach(function (n) {
      if (/^(CmdConsole|SysLog)/.test(n)) return;
      add(window, n, n, false);
      var f = window[n];
      if (f && f.prototype && /^[A-Z]/.test(n)) { try { Object.getOwnPropertyNames(f.prototype).slice(0, 60).forEach(function (k) { if (k !== 'constructor') add(f.prototype, k, n + '#' + k, false); }); } catch (_) {} }
    });
    I.appGlobals(false).forEach(function (n) {
      var v; try { v = window[n]; } catch (_) { return; }
      if (v && typeof v === 'object' && !v.nodeType && v !== window && !Array.isArray(v)) methodsOf(v, n, '.');
    });
    lexList().forEach(function (n) {
      var v = evalSafe(n);
      if (typeof v === 'function') add(null, n, n, true);
      else if (v && typeof v === 'object' && !v.nodeType && !Array.isArray(v)) methodsOf(v, n, '.');
    });
    return res;
  }
  function profPut(t, fn) {
    if (t.lex) return I.lexSet(t.key, fn);
    try { t.owner[t.key] = fn; return t.owner[t.key] === fn; } catch (_) { return false; }
  }
  function profWrap(t) {
    var orig = t.fn, path = t.path;
    var w = function () {
      if (!P.on) return orig.apply(this, arguments);
      var parent = P.stack.length ? P.stack[P.stack.length - 1] : null, holder = parent ? parent.node.kids : P.root.kids;
      var node = holder[path] || (holder[path] = { name: path, n: 0, total: 0, self: 0, kids: {} });
      node.n++;
      var f = { node: node, t0: performance.now(), child: 0 };
      P.stack.push(f);
      try { return orig.apply(this, arguments); }
      finally {
        var dt = performance.now() - f.t0; P.stack.pop();
        node.total += dt; node.self += dt - f.child;
        if (parent) parent.child += dt;
        var g = P.flat[path] || (P.flat[path] = { n: 0, total: 0, self: 0 });
        g.n++; g.total += dt; g.self += dt - f.child;
      }
    };
    try { Object.defineProperty(w, 'name', { value: orig.name || path }); } catch (_) {}
    if (orig.prototype) w.prototype = orig.prototype;
    w.__cmProf = true; w.__orig = orig;
    return w;
  }
  function profStart(filter) {
    if (P.on) return -1;
    P.root = { kids: {} }; P.flat = {}; P.stack = []; P.filter = filter || '';
    P.targets = [];
    profTargets(filter).forEach(function (t) { var w = profWrap(t); if (profPut(t, w)) { t.wrapper = w; P.targets.push(t); } });
    P.on = true; P.t0 = performance.now(); P.t1 = 0;
    return P.targets.length;
  }
  function profStop() {
    if (!P.on) return false;
    P.on = false; P.t1 = performance.now();
    P.targets.forEach(function (t) {
      try { var cur = t.lex ? evalSafe(t.key) : t.owner[t.key]; if (cur === t.wrapper) profPut(t, t.fn); } catch (_) {}
    });
    P.targets = []; P.stack = [];
    return true;
  }
  function ms(x) { return x >= 100 ? Math.round(x) + 'ms' : x.toFixed(x < 10 ? 2 : 1) + 'ms'; }
  function profReport() {
    var names = Object.keys(P.flat);
    if (!names.length) return ['没有记录到函数调用。监控的函数在这段时间里没被调用，或者逻辑都在闭包里（没挂在全局上）。试试 /prof start 去掉关键字，或者先 /lex'];
    var rows = [], rootTotal = 0, k;
    for (k in P.root.kids) rootTotal += P.root.kids[k].total;
    rows.push('统计 ' + names.length + ' 个函数，记录期间 ' + Math.round(((P.t1 || performance.now()) - P.t0)) + 'ms，其中被监控函数合计 ' + ms(rootTotal) + '（只算同步部分；异步回调之前的等待不计入）');
    rows.push('');
    rows.push('自身耗时排名：');
    names.sort(function (p, q) { return P.flat[q].self - P.flat[p].self; }).slice(0, 12).forEach(function (n) {
      var g = P.flat[n]; rows.push('  ' + n + '   ×' + g.n + '   自身 ' + ms(g.self) + '   累计 ' + ms(g.total));
    });
    rows.push('');
    rows.push('调用树（█ 的长度 = 累计耗时占比）：');
    var lines = 0;
    function walk(kids, depth) {
      Object.keys(kids).map(function (x) { return kids[x]; }).sort(function (p, q) { return q.total - p.total; }).forEach(function (nd) {
        if (lines >= 45 || depth > 7 || nd.total < rootTotal * 0.005) return;
        lines++;
        var frac = rootTotal ? nd.total / rootTotal : 0, w = Math.max(1, Math.round(frac * 12));
        rows.push(new Array(depth + 1).join('  ') + new Array(w + 1).join('█') + ' ' + Math.round(frac * 100) + '%  ' + nd.name + '  ×' + nd.n + '  ' + ms(nd.total) + (nd.self < nd.total - 0.05 ? '（自身 ' + ms(nd.self) + '）' : ''));
        walk(nd.kids, depth + 1);
      });
    }
    walk(P.root.kids, 0);
    if (lines >= 45) rows.push('…树太长，只显示前 45 行');
    return rows;
  }
  reg('prof', {
    desc: '函数耗时调用树（插桩，不是采样）：给全局函数和全局对象里的方法包一层计时。/prof 5 动画 = 记 5 秒并只看名字含“动画”的', usage: '/prof 秒数 [关键字]  |  /prof start [关键字]  |  /prof stop  |  /prof',
    complete: function (tk) { return tk.length ? [] : ['start', 'stop', 'clear', '3', '5', '10']; },
    run: async function (a, c) {
      var s = (a[0] || '').toLowerCase();
      if (s === 'start') {
        var n = profStart(a[1] || '');
        if (n === -1) return '已经在记录了，/prof stop 结束';
        return '已给 ' + n + ' 个函数包上计时' + (a[1] ? '（只含“' + a[1] + '”）' : '') + '。去操作页面，再 /prof stop。包装期间会略微拖慢这些函数；闭包里没挂在全局的函数看不到';
      }
      if (s === 'stop') { if (!profStop()) return '没有在记录'; return c.print(profReport().join('\n'), 'out'); }
      if (s === 'clear') { P.root = { kids: {} }; P.flat = {}; return '已清空'; }
      if (/^\d+(\.\d+)?$/.test(s)) {
        var sec = Math.min(60, parseFloat(s)), cnt = profStart(a[1] || '');
        if (cnt === -1) return '已经在记录了，/prof stop 结束';
        c.print('记录 ' + sec + ' 秒，监控 ' + cnt + ' 个函数。现在去操作页面…', 'info');
        await new Promise(function (r) { setTimeout(r, sec * 1000); });
        profStop();
        return c.print(profReport().join('\n'), 'out');
      }
      if (P.on) return c.print('正在记录（已记 ' + Object.keys(P.flat).length + ' 个函数），/prof stop 结束并看结果', 'info');
      if (!Object.keys(P.flat).length) return c.print('还没有记录。用法：/prof 5（记 5 秒）或 /prof start → 操作 → /prof stop', 'info');
      c.print(profReport().join('\n'), 'out');
    }
  });

  /* ============================== /mem ============================== */
  function sizeOf(root, budget) {
    var seen = new Set(), stack = [root], total = 0, n = 0, trunc = false;
    while (stack.length) {
      var v = stack.pop(), t = typeof v;
      if (v === null || t === 'undefined' || t === 'boolean') { total += 4; continue; }
      if (t === 'number') { total += 8; continue; }
      if (t === 'string') { total += v.length * 2; continue; }
      if (t === 'function' || t === 'symbol' || t === 'bigint') { total += 16; continue; }
      if (v.nodeType || v === window) { total += 16; continue; }
      if (seen.has(v)) continue;
      seen.add(v);
      if (++n > budget) { trunc = true; break; }
      if (v instanceof ArrayBuffer) { total += v.byteLength; continue; }
      if (ArrayBuffer.isView(v)) { total += v.byteLength; continue; }
      if (typeof Blob !== 'undefined' && v instanceof Blob) { total += v.size; continue; }
      if (v instanceof Map) { total += 32; v.forEach(function (x, k) { stack.push(k); stack.push(x); }); continue; }
      if (v instanceof Set) { total += 32; v.forEach(function (x) { stack.push(x); }); continue; }
      if (Array.isArray(v)) { total += 16 + 8 * v.length; var lim = Math.min(v.length, 60000); if (lim < v.length) trunc = true; for (var i = 0; i < lim; i++) stack.push(v[i]); continue; }
      var keys; try { keys = Object.keys(v); } catch (_) { continue; }
      total += 32 + 16 * keys.length;
      for (var j = 0; j < keys.length; j++) { try { var d = Object.getOwnPropertyDescriptor(v, keys[j]); if (d && 'value' in d) stack.push(d.value); } catch (_) {} }
    }
    return { bytes: total, trunc: trunc };
  }
  function globalSizes() {
    var names = I.appGlobals(false).concat(lexList()), res = [], t0 = performance.now(), cut = false, seen = {};
    names.forEach(function (n) {
      if (seen[n]) return; seen[n] = 1;
      if (performance.now() - t0 > 3000) { cut = true; return; }
      var v; try { v = n in window ? window[n] : evalSafe(n); } catch (_) { return; }
      if (v == null || typeof v === 'function' || v === window || v.nodeType) return;
      var r = sizeOf(v, 150000);
      res.push({ name: n, bytes: r.bytes, trunc: r.trunc, type: Array.isArray(v) ? 'Array(' + v.length + ')' : v && v.constructor && v.constructor.name || typeof v });
    });
    return { list: res.sort(function (p, q) { return q.bytes - p.bytes; }), cut: cut };
  }
  var snaps = {};
  reg('mem', {
    desc: '内存估算：DOM / 画布 / 图片 / 存储的占用，全局变量各占多少；snap 存快照、diff 对比（找内存涨在哪）。浏览器不提供真正的堆快照', usage: '/mem  |  /mem objs [条数]  |  /mem snap [名字]  |  /mem diff [名字]',
    complete: function (tk) { return tk.length ? [] : ['objs', 'snap', 'diff']; },
    run: async function (a, c) {
      var s = (a[0] || '').toLowerCase();
      if (s === 'objs') {
        var g = globalSizes(), n = parseInt(a[1], 10) || 15;
        if (!g.list.length) return '没有可统计的全局变量（挂在 window 上或 let/const 声明的对象、数组）';
        var sum = g.list.reduce(function (m, x) { return m + x.bytes; }, 0);
        c.print('全局变量里的数据（估算，不含闭包里的、DOM、画布和图片）：合计约 ' + fmtBytes(sum) + (g.cut ? '，统计超时，后面的没算' : ''), 'info');
        return c.print(g.list.slice(0, n).map(function (x) { return (x.trunc ? '≥' : '≈') + fmtBytes(x.bytes) + '   ' + x.name + '   ' + x.type; }).join('\n'), 'out');
      }
      if (s === 'snap') {
        var nm = a[1] || 'default', g2 = globalSizes(), m = {};
        g2.list.forEach(function (x) { m[x.name] = x.bytes; });
        snaps[nm] = m;
        return '已保存快照 ' + nm + '（' + g2.list.length + ' 个全局变量，合计约 ' + fmtBytes(g2.list.reduce(function (t, x) { return t + x.bytes; }, 0)) + '）。操作一阵之后 /mem diff ' + (nm === 'default' ? '' : nm);
      }
      if (s === 'diff') {
        var nm2 = a[1] || 'default', old = snaps[nm2];
        if (!old) throw new Error('没有快照 ' + nm2 + '，先 /mem snap');
        var g3 = globalSizes(), rows = [];
        g3.list.forEach(function (x) { var d = x.bytes - (old[x.name] || 0); if (Math.abs(d) >= 1024 || (!(x.name in old) && x.bytes > 256)) rows.push({ n: x.name, d: d, now: x.bytes, isNew: !(x.name in old) }); });
        Object.keys(old).forEach(function (k) { if (!g3.list.some(function (x) { return x.name === k; })) rows.push({ n: k, d: -old[k], now: 0, gone: true }); });
        if (!rows.length) return '和快照 ' + nm2 + ' 相比，全局数据没有明显变化（≥1KB 才算）。如果内存还在涨，多半在闭包、DOM、画布或图片里：用 /mem 看这几项';
        rows.sort(function (p, q) { return Math.abs(q.d) - Math.abs(p.d); });
        return c.print('相比快照 ' + nm2 + '：\n' + rows.slice(0, 20).map(function (x) { return (x.d >= 0 ? '+' : '-') + fmtBytes(Math.abs(x.d)) + '   ' + x.n + (x.isNew ? '（新增）' : x.gone ? '（已不存在）' : '   现在约 ' + fmtBytes(x.now)); }).join('\n'), 'out');
      }
      var rows2 = [], pm = performance.memory;
      rows2.push(pm ? 'JS 堆  用了 ' + fmtBytes(pm.usedJSHeapSize) + ' / 已分配 ' + fmtBytes(pm.totalJSHeapSize) + ' / 上限 ' + fmtBytes(pm.jsHeapSizeLimit) : 'JS 堆  这个浏览器（Safari / WebView）不提供堆大小，只能用 /mem objs 估算全局数据');
      var all = document.getElementsByTagName('*').length;
      rows2.push('DOM 节点  ' + all + '    iframe ' + document.querySelectorAll('iframe').length + '    视频/音频 ' + document.querySelectorAll('video,audio').length);
      var cv = Array.prototype.slice.call(document.querySelectorAll('canvas')), cb = 0;
      cv.forEach(function (x) { cb += x.width * x.height * 4; });
      rows2.push('画布  ' + cv.length + ' 个，像素约 ' + fmtBytes(cb) + (cv.length ? '（' + cv.map(function (x) { return x.width + '×' + x.height; }).slice(0, 4).join('、') + (cv.length > 4 ? '…' : '') + '）' : ''));
      var im = Array.prototype.slice.call(document.images), ib = 0;
      im.forEach(function (x) { if (x.complete) ib += x.naturalWidth * x.naturalHeight * 4; });
      rows2.push('图片  ' + im.length + ' 张，解码后约 ' + fmtBytes(ib));
      var lb = 0; try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); lb += (k.length + (localStorage.getItem(k) || '').length) * 2; } } catch (_) {}
      rows2.push('localStorage  约 ' + fmtBytes(lb));
      try { if (navigator.storage && navigator.storage.estimate) { var es = await navigator.storage.estimate(); rows2.push('站点存储  已用 ' + fmtBytes(es.usage) + ' / 配额 ' + fmtBytes(es.quota)); } } catch (_) {}
      rows2.push('JS 对象明细：/mem objs；找增长：/mem snap → 操作 → /mem diff');
      return c.print(rows2.join('\n'), 'out');
    }
  });

  /* ============================== /lex 找出 let / const / class ============================== */
  var lex = { names: [], info: {}, done: false, busy: null };
  window.__cmLexNames = function () { return lex.names; };
  function getText(url) {
    return new Promise(function (res) {
      function viaXhr() { try { var x = new XMLHttpRequest(); x.open('GET', url); x.onload = function () { res(x.responseText || null); }; x.onerror = function () { res(null); }; x.send(); } catch (_) { res(null); } }
      try { fetch(url).then(function (r) { return r.ok || r.status === 0 ? r.text() : null; }).then(function (t) { if (t == null) viaXhr(); else res(t); }, viaXhr); } catch (_) { viaXhr(); }
    });
  }
  async function lexScan() {
    var found = {}, failed = 0, skipped = 0, scanned = 0, ss = Array.prototype.slice.call(document.scripts);
    for (var i = 0; i < ss.length; i++) {
      var s = ss[i], text;
      if (s.id === 'cmFreeze') continue;
      if (!s.src) text = s.textContent;
      else { text = await getText(s.src); if (text == null) { failed++; continue; } if (text.length > 3e6) { skipped++; continue; } }
      scanned++;
      var re = /^[ \t]{0,4}(let|const|class)\s+([A-Za-z_$][\w$]*)/gm, m;
      while ((m = re.exec(text))) found[m[2]] = m[1];
    }
    var names = [], info = {};
    Object.keys(found).forEach(function (n) {
      if (n in window) return;                                       // var / function 声明的会挂在 window 上，不在这里找
      var t; try { t = (0, eval)('typeof ' + n); } catch (_) { t = 'TDZ'; }
      if (t === 'undefined') return;                                 // 其实是函数里面的局部名字
      names.push(n); info[n] = { kind: found[n], type: t };
    });
    lex.names = names.sort(); lex.info = info; lex.done = true;
    return { scanned: scanned, failed: failed, skipped: skipped };
  }
  reg('lex', {
    desc: '找出用 let / const / class 声明的全局名字（它们不挂在 window 上，/vars /fn 看不到）。找到后补全、/watch、/trace、/prof、/mem 都能用', usage: '/lex [关键字|rescan]',
    complete: function () { return ['rescan']; },
    run: async function (a, c) {
      var kw = (a[0] || '').toLowerCase(), r = null;
      if (!lex.done || kw === 'rescan') { c.print('正在读取并扫描页面脚本…', 'info'); r = await lexScan(); if (kw === 'rescan') kw = ''; }
      var list = lex.names.filter(function (n) { return !kw || n.toLowerCase().indexOf(kw) >= 0; });
      if (r) c.print('扫描了 ' + r.scanned + ' 个脚本' + (r.failed ? '，' + r.failed + ' 个读不到（file:// 下可能被拦）' : '') + (r.skipped ? '，' + r.skipped + ' 个超过 3MB 已跳过' : ''), 'info');
      if (!list.length) return c.print('没有找到' + (kw ? '含“' + kw + '”的' : '') + ' let / const / class 全局名字', 'info');
      c.print('共 ' + list.length + ' 个。const 声明的函数不能被 /trace 替换，但可以 /watch；对象里的方法都能 /trace 和 /prof', 'info');
      c.print(list.slice(0, 80).map(function (n) {
        var v, p; try { v = evalSafe(n); p = lex.info[n].type === 'TDZ' ? '（还没初始化）' : I.preview(v); } catch (_) { p = '?'; }
        return lex.info[n].kind + ' ' + n + (typeof v === 'function' ? '  ' + p : ' = ' + p);
      }).join('\n'), 'out');
      if (list.length > 80) c.print('只显示前 80 个，用关键字筛选', 'info');
    }
  });

  /* ============================== /bp 函数断点 ============================== */
  var bps = {}, bpRate = { t: 0, n: 0 };
  function bpOff(path) {
    var b = bps[path]; if (!b) return false;
    try { var cur = b.lex ? evalSafe(b.key) : b.owner[b.key]; if (cur === b.wrapper) { if (b.lex) I.lexSet(b.key, b.orig); else b.owner[b.key] = b.orig; } } catch (_) {}
    delete bps[path];
    return true;
  }
  reg('bp', {
    desc: '函数断点：函数一被调用就记下参数、this 和调用栈（网页里做不到真正暂停）。可加条件 args[0]>3，once 只触发一次，debugger 在连着 Mac 的 Web Inspector 时真暂停', usage: '/bp 函数名 [条件] [once] [debugger]  |  /bp -d 函数名|all  |  /bp',
    complete: function (tk) { if (tk.length) return ['once', 'debugger']; try { return ['-d'].concat(I.appGlobals(true)); } catch (_) { return ['-d']; } },
    run: function (a, c) {
      var ks = Object.keys(bps);
      if (!a.length) { return ks.length ? c.print(ks.map(function (k) { var b = bps[k]; return k + (b.cond ? '  条件 ' + b.cond : '') + (b.once ? '  once' : '') + (b.dbg ? '  debugger' : '') + '  触发 ' + b.n + ' 次'; }).join('\n'), 'out') : c.print('没有断点。例：/bp nextLine   /bp update args[0]>3 once', 'info'); }
      if (a[0] === '-d') { var key = a[1] || ''; if (key === 'all') { ks.forEach(bpOff); return '已取消全部断点'; } return bpOff(key) ? '已取消 ' + key : '没有断点 ' + key; }
      var path = a[0];
      if (bps[path]) return '已经有断点 ' + path + '，先 /bp -d ' + path;
      var flags = a.slice(1), once = flags.indexOf('once') >= 0, dbg = flags.indexOf('debugger') >= 0;
      var cond = flags.filter(function (x) { return x !== 'once' && x !== 'debugger'; }).join(' ').trim(), condFn = null;
      if (cond) { try { condFn = new Function('args', 'self', 'return (' + cond + ')'); } catch (e) { throw new Error('条件写错了：' + e.message); } }
      var parts = path.split('.'), name = parts.pop(), lexical = false, owner = parts.length ? evalSafe(parts.join('.')) : window;
      if (!parts.length && typeof window[name] !== 'function' && /^[A-Za-z_$][\w$]*$/.test(name) && typeof evalSafe(name) === 'function') lexical = true;
      if (!lexical && (owner == null || typeof owner[name] !== 'function')) throw new Error(path + ' 不是函数（/fn 或 /lex 看看有哪些）');
      var orig = lexical ? evalSafe(name) : owner[name], b = { owner: owner, key: name, orig: orig, lex: lexical, cond: cond, once: once, dbg: dbg, n: 0, wrapper: null };
      var w = function () {
        var args = arguments, self = this, hit = true;
        if (condFn) { try { hit = !!condFn(args, self); } catch (e) { print('断点 ' + path + ' 的条件出错：' + e.message, 'err'); hit = true; } }
        if (hit) {
          b.n++;
          if (once) bpOff(path);
          var now = Date.now();
          if (now - bpRate.t > 1000) { bpRate.t = now; bpRate.n = 0; }
          if (++bpRate.n <= 20) {
            var st = String(new Error().stack || '').split('\n').filter(function (l) { return l && l !== 'Error' && l.indexOf('cmd-extra') < 0; }).slice(0, 8).map(function (l) { return '    ' + l.trim(); });
            var as = Array.prototype.map.call(args, function (x) { return I.preview(x); }).join(', ');
            print('⏸ ' + path + '(' + short(as, 100) + ')\n  this = ' + short(I.preview(self), 60) + '\n  调用栈：\n' + (st.join('\n') || '    （浏览器没给栈）'), 'warn');
          }
          if (dbg) { debugger; }
        }
        return orig.apply(self, args);
      };
      if (orig.prototype) w.prototype = orig.prototype;
      if (lexical) { if (!I.lexSet(name, w)) throw new Error(name + ' 是用 const 声明的，不能被替换'); }
      else { try { owner[name] = w; } catch (e) { throw new Error('无法替换 ' + path + '：' + e.message); } if (owner[name] !== w) throw new Error(path + ' 是只读的'); }
      b.wrapper = w; bps[path] = b;
      return '已在 ' + path + ' 设断点' + (cond ? '，条件 ' + cond : '') + (once ? '，只触发一次' : '') + (dbg ? '，带 debugger' : '') + '。触发时只记录、不会暂停页面；别处提前保存的函数引用不受影响';
    }
  });

  /* ============================== /frames /in ============================== */
  function frameList() { return Array.prototype.slice.call(document.querySelectorAll('iframe')); }
  reg('frames', {
    desc: '列出页面里的 iframe，哪些能访问（同源），哪些不能（跨域）', usage: '/frames',
    run: function (a, c) {
      var fs = frameList();
      if (!fs.length) return c.print('页面里没有 iframe', 'info');
      fs.forEach(function (f, i) {
        var d = null; try { d = f.contentDocument; } catch (_) {}
        c.print('@' + i + '  ' + I.elTag(f) + '  ' + short(f.getAttribute('src') || f.src || '(无 src)', 70) + '   ' + (d ? '同源 · ' + d.getElementsByTagName('*').length + ' 个元素' : '跨域或未加载 · 浏览器不允许访问内容'), d ? 'log' : 'warn');
      });
      c.print('/tree @n 看里面的元素树，/in n 代码 在里面执行。跨域页面是浏览器的安全限制，从外面看不到内容', 'info');
    }
  });
  reg('in', {
    desc: '在同源 iframe 里执行 JS', usage: '/in <n> <代码>   例：/in 0 document.title',
    run: async function (a, c) {
      var n = parseInt(a[0], 10), f = frameList()[n];
      if (isNaN(n) || !f) throw new Error('用法：/in <n> <代码>；/frames 看有哪些 iframe');
      var w; try { w = f.contentWindow; void w.document; } catch (_) { throw new Error('iframe @' + n + ' 是跨域的，浏览器不允许访问它的内容'); }
      var code = I.restOf(c, 1).replace(/\s+$/, '');
      if (!code) throw new Error('后面写要执行的代码');
      var r;
      try { r = w.eval('(' + code + '\n)'); } catch (e) { if (e instanceof w.SyntaxError || e instanceof SyntaxError) r = w.eval(code); else throw e; }
      if (r && typeof r.then === 'function') r = await r;
      c.print(r === undefined ? 'undefined' : I.fmtTop(r), r === undefined ? 'info' : 'out');
    }
  });
})();
