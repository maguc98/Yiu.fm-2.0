// app/boot.js — 启动
applyPreset(0);render();$("gbox").classList.toggle("hide",bgMode!=="grad");$("ibox").classList.toggle("hide",bgMode!=="img");$("solidbox").classList.toggle("hide",bgMode!=="solid");applyBg();startTick();

/* ===== Original script block separator ===== */

/* 仓库没有 sw.js；原注册逻辑在 HTTPS 环境必然失败并制造无效请求。当前 WKWebView 使用 file://，暂不注册不存在的 Service Worker。 */

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
