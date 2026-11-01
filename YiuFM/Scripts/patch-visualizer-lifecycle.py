#!/usr/bin/env python3
"""Harden visualizer lifecycle fan-out and Partita suspension in the build copy only."""
from pathlib import Path

root = Path("YiuFM/Resources/Web/APP")

def replace_once(name, old, new):
    path = root / name
    source = path.read_text(encoding="utf-8")
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"{name}: expected exactly one lifecycle patch anchor, found {count}: {old!r}")
    path.write_text(source.replace(old, new, 1), encoding="utf-8")

# Correct the manager's legacy header: it coordinates four renderers, not three WebGL engines.
replace_once(
    "visualizer-manager.js",
    """/* VisualizerManager：串行管理可视化引擎（Sonnet / Tempera / Lumiere），保证同一时刻最多一个 WebGL Context。""",
    """/* VisualizerManager：串行协调四个视觉引擎（Sonnet / Tempera / Lumiere / Partita）。
   同一时刻只挂载一个引擎；前三者使用 WebGL，Partita 使用 React/DOM。"""
)

# Partita suspension is temporary: retain active state, stop DOM work while suspended,
# and render the latest cached lyric/time state when resumed.
replace_once(
    "partita-adapter.js",
    "  var active = false;\n",
    "  var active = false;\n  var suspended = false;\n"
)
replace_once(
    "partita-adapter.js",
    """      if (hostEl) hostEl.style.display = 'block';
      applyVars();
      applyRes();
      if (!lastLines.length && window.LN && window.LN.length) this.loadLyrics(window.TS || [], window.WT || [], window.LN);
      this._render();""",
    """      if (hostEl) hostEl.style.display = suspended ? 'none' : 'block';
      applyVars();
      applyRes();
      if (!lastLines.length && window.LN && window.LN.length) this.loadLyrics(window.TS || [], window.WT || [], window.LN);
      if (!suspended) this._render();"""
)
replace_once(
    "partita-adapter.js",
    """    hide: function () {
      active = false;
      if (hostEl) hostEl.style.display = 'none';
    },

    _render: function () {
      if (!root || !window.Partita || !active) return;""",
    """    hide: function () {
      active = false;
      if (hostEl) hostEl.style.display = 'none';
    },

    _render: function () {
      if (!root || !window.Partita || !active || suspended) return;"""
)
replace_once(
    "partita-adapter.js",
    "      if (!active || !currentTimeObj) return;",
    "      if (!active || suspended || !currentTimeObj) return;"
)
replace_once(
    "partita-adapter.js",
    "    setSuspended: function (v) { this.hide(); },",
    """    setSuspended: function (v) {
      v = !!v;
      if (v === suspended) return;
      suspended = v;
      if (!active || !hostEl) return;
      hostEl.style.display = suspended ? 'none' : 'block';
      if (!suspended) this._render();
    },"""
)

# Cancel delayed DOM measurements and resolution frames while Partita is suspended,
# and release all adapter-owned references when the renderer is destroyed.
replace_once(
    "partita-adapter.js",
    "    if (!active || !hostEl || idx !== lineIndex || idx < 0) return;",
    "    if (!active || suspended || !hostEl || idx !== lineIndex || idx < 0) return;"
)
replace_once(
    "partita-adapter.js",
    """    hide: function () {
      active = false;
      if (hostEl) hostEl.style.display = 'none';
    },""",
    """    hide: function () {
      active = false;
      if (fitTimer) { clearTimeout(fitTimer); fitTimer = 0; }
      if (resTimer) { cancelAnimationFrame(resTimer); resTimer = 0; }
      if (hostEl) { hostEl.style.display = 'none'; hostEl.style.opacity = ''; }
    },"""
)
replace_once(
    "partita-adapter.js",
    """    setSuspended: function (v) {
      v = !!v;
      if (v === suspended) return;
      suspended = v;
      if (!active || !hostEl) return;
      hostEl.style.display = suspended ? 'none' : 'block';
      if (!suspended) this._render();
    },""",
    """    setSuspended: function (v) {
      v = !!v;
      if (v === suspended) return;
      suspended = v;
      if (!active || !hostEl) return;
      if (suspended) {
        if (fitTimer) { clearTimeout(fitTimer); fitTimer = 0; }
        if (resTimer) { cancelAnimationFrame(resTimer); resTimer = 0; }
        hostEl.style.display = 'none';
        hostEl.style.opacity = '';
      } else {
        hostEl.style.display = 'block';
        applyRes();
        this._render();
      }
    },"""
)
replace_once(
    "partita-adapter.js",
    """    destroy: function () {
      active = false;
      if (root) { try { root.unmount(); } catch (e) {} root = null; }
      if (hostEl) hostEl.innerHTML = '';
      // 彻底清空内存中的假数据和游标
      lastLines = [];
      lineIndex = -1;
    },""",
    """    destroy: function () {
      active = false;
      suspended = false;
      if (fitTimer) { clearTimeout(fitTimer); fitTimer = 0; }
      if (resTimer) { cancelAnimationFrame(resTimer); resTimer = 0; }
      if (root) { try { root.unmount(); } catch (e) {} root = null; }
      if (hostEl) hostEl.innerHTML = '';
      hostEl = null;
      currentTimeObj = null;
      lastLines = [];
      lineIndex = -1;
    },"""
)

# The audio clock can call drive() every frame. Locate the active lyric line with
# an upper-bound binary search instead of scanning every preceding line.
replace_once(
    "partita-adapter.js",
    """  function findIndex(ct) {
    var r = -1;
    for (var i = 0; i < lastLines.length; i++) {
      if (lastLines[i].startTime <= ct) r = i; else break;
    }
    return r;
  }""",
    """  function findIndex(ct) {
    var low = 0, high = lastLines.length - 1, result = -1;
    // Find the final line whose startTime is <= ct (upper-bound search).
    // Lyrics are built in timestamp order by loadLyrics().
    while (low <= high) {
      var mid = low + ((high - low) >> 1);
      if (lastLines[mid].startTime <= ct) {
        result = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return result;
  }"""
)

print("Hardened Partita lifecycle and changed per-frame lyric lookup to O(log n).")
