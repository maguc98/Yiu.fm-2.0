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
print("Hardened visualizer drive fan-out and implemented reversible Partita suspension.")
