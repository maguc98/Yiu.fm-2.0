/* partita-connect.js：云阶的备用数据流 / 时间轴
   - 切到云阶时补灌一次真实歌词
   - 备用时钟：只有当播放器主循环没有在给云阶喂时间时才生效（避免两个时钟互相拉扯导致文字抽搐）
   - 对 audio.currentTime 做平滑插值，避免 iOS 上时间戳一格一格地跳 */
(function() {
    'use strict';
    var timer = null;
    var lastMode = null;
    var baseT = 0, baseAt = 0, lastRaw = -1;

    function smoothTime(audioEl) {
        var now = performance.now();
        var raw = audioEl.currentTime || 0;
        if (raw !== lastRaw) {
            // 读数变了：重新对齐；如果和插值结果相差很大（拖动进度条）就直接跳过去
            lastRaw = raw; baseT = raw; baseAt = now;
            return raw;
        }
        if (audioEl.paused) return raw;
        var est = baseT + (now - baseAt) / 1000 * (audioEl.playbackRate || 1);
        return Math.min(est, raw + 0.25);   // 最多比真实读数领先 0.25 秒
    }

    // 每 100ms 检查一次当前引擎状态
    setInterval(function() {
        if (!window.VisualizerManager) return;
        var current = window.VisualizerManager.current;

        if (current === 'partita') {
            if (lastMode !== 'partita') {
                lastMode = 'partita';
                lastRaw = -1;
                var realLN = window.LN || [];
                if (realLN.length > 0) {
                    window.VisualizerManager.loadLyrics(window.TS || [], window.WT || [], realLN);
                }
            }
            if (!timer) {
                var audioEl = document.getElementById('audio');
                timer = setInterval(function() {
                    if (window.VisualizerManager.current !== 'partita') {
                        clearInterval(timer); timer = null; return;
                    }
                    var A = window.PartitaAdapter;
                    if (audioEl && A && A.drive) A.drive(smoothTime(audioEl), true);
                }, 33);
            }
        } else if (lastMode === 'partita') {
            lastMode = current;
            if (timer) { clearInterval(timer); timer = null; }
        }
    }, 100);
})();
