#!/usr/bin/env python3
"""Patch complete state-change events into the pinned legacy UI build copy only."""
from pathlib import Path

root = Path("YiuFM/Resources/Web/APP")

def replace_once(path, old, new):
    p = root / path
    s = p.read_text(encoding="utf-8")
    n = s.count(old)
    if n != 1:
        raise SystemExit(f"{path}: expected one patch anchor, found {n}: {old[:90]!r}")
    p.write_text(s.replace(old, new, 1), encoding="utf-8")

# The branch player.js already contains the lyric-animation handoff before idx
# changes, so match the stable inner assignment sequence rather than assuming
# the older one-line if-block formatting from the pinned baseline.
replace_once("player.js",
    "idx = i; prog = 0; deferUpdate(); return;",
    "idx = i; prog = 0; if(window.YiuPlayback) window.YiuPlayback.notify('lyricindexchange'); deferUpdate(); return;")
replace_once("player.js",
    "if(prog >= 1){ prog = 0; idx = nextIdx(true); deferUpdate(); return; }",
    "if(prog >= 1){ prog = 0; idx = nextIdx(true); if(window.YiuPlayback) window.YiuPlayback.notify('lyricindexchange'); deferUpdate(); return; }")
replace_once("player.js",
    "for(var k = 0; k < n; k++) TS.push(d * k / n);",
    "for(var k = 0; k < n; k++) TS.push(d * k / n);\n      if(window.YiuPlayback) window.YiuPlayback.notify('lyricschange');")

# Manual card edits, package restores, and bulk card replacement rebuild LN in renderer.applyItems().
# Publish only when the actual lyric text array changes; visual-setting-only renders stay silent.
replace_once("renderer.js",
    "  if(chg)LN=arr;",
    "  if(chg){ LN=arr; if(window.YiuPlayback) window.YiuPlayback.notify('lyricschange'); }")

# Song title/cover and mode changes are synchronized through this one function.
replace_once("song-library.js",
    "window.__musicCover = on ? curCover : '';\n    syncNextLabel();",
    "window.__musicCover = on ? curCover : '';\n    syncNextLabel();\n    if(window.YiuLibrary) window.YiuLibrary.notify('librarychange');")

# The mini-bar used to poll LN[idx] and __musicTitle every 200ms. It now reacts
# to explicit lyric and library events; cover participates in the dedupe key.
replace_once("mini-player.js",
    "var key=mt+\"\\u0001\"+s;",
    "var cc=window.__musicTitle?(window.__musicCover||\"\"):(window.__musicCover||window.customCoverData||\"\");\n    var key=mt+\"\\u0001\"+s+\"\\u0001\"+(cc||\"\");")
replace_once("mini-player.js",
    "  tick();setInterval(tick,200);",
    "  tick();\n  if(window.YiuPlayback&&typeof window.YiuPlayback.subscribe===\"function\"){\n    window.YiuPlayback.subscribe(function(e){\n      if(e&&(e.type===\"lyricindexchange\"||e.type===\"lyricschange\"))tick();\n    });\n  }\n  if(window.YiuLibrary&&typeof window.YiuLibrary.subscribe===\"function\"){\n    window.YiuLibrary.subscribe(function(){tick();});\n  }")

print("Applied lyric-index, library metadata, and mini-bar event-driven refresh patches.")
