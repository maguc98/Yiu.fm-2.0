// app/boot.js — 启动
applyPreset(0);render();$("gbox").classList.toggle("hide",bgMode!=="grad");$("ibox").classList.toggle("hide",bgMode!=="img");$("solidbox").classList.toggle("hide",bgMode!=="solid");applyBg();startTick();

/* ===== Original script block separator ===== */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // 仅在 HTTPS 或 localhost 环境下注册，避免本地 file:// 或编辑器预览时报错
    if (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('SW ready:', reg.scope))
        .catch(err => console.log('SW bypassed:', err.message));
    }
  });
}


/* ===== 配合原生 WebFilePicker.swift：记录最近一次文件选择的 accept ===== */
(function () {
  function remember(input) {
    if (input && input.tagName === 'INPUT' && input.type === 'file') {
      window.__lastFileAccept = input.accept || '';
    }
  }

  // 1) 直接点击 <input type="file">，或点击关联的 <label>（捕获阶段，早于原生弹窗）
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t) return;
    if (t.tagName === 'INPUT' && t.type === 'file') {
      remember(t);
    } else if (t.closest) {
      var label = t.closest('label');
      if (label) remember(label.control || label.querySelector('input[type="file"]'));
    }
  }, true);

  // 2) 脚本触发 input.click() 的情况
  var rawClick = HTMLInputElement.prototype.click;
  HTMLInputElement.prototype.click = function () {
    remember(this);
    return rawClick.apply(this, arguments);
  };
})();

/* ===== 可视化引擎登记（商籁 / 凝彩）：只登记宿主元素、绑定音频事件，不创建 WebGL，也不改 #stage 的 mode 类。
   真正创建发生在切到对应风格时（Sonnet 由 renderer.js 调 show()；凝彩由 VisualizerManager.switchTo('tempera')）。
   适配器 / Manager 未加载时静默跳过。 ===== */
if (window.VisualizerManager && typeof window.VisualizerManager.boot === 'function') {
    window.VisualizerManager.boot();
} else if (window.SonnetAdapter && typeof window.SonnetAdapter.init === 'function') {
    window.SonnetAdapter.init();
}
