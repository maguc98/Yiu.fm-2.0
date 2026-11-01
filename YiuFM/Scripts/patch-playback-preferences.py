#!/usr/bin/env python3
"""Move play-mode persistence behind YiuPlaybackPreferences in the build copy.

The legacy playModeV1 key and window.playMode contract remain unchanged.
"""
from pathlib import Path

path = Path("YiuFM/Resources/Web/APP/mini-player.js")
source = path.read_text(encoding="utf-8")

old_load = '''  var PM_KEY = "playModeV1", PM_NAMES = ["顺序播放", "随机播放", "重复播放"];
  window.playMode = 0;
  try { var pm0 = parseInt(localStorage.getItem(PM_KEY), 10); if (pm0 === 1 || pm0 === 2) window.playMode = pm0; } catch (_) {}'''
new_load = '''  var PM_NAMES = ["顺序播放", "随机播放", "重复播放"];
  var playbackPreferences = window.YiuPlaybackPreferences;
  window.playMode = playbackPreferences ? playbackPreferences.getPlayMode() : 0;'''
old_save = '''      try { localStorage.setItem(PM_KEY, String(window.playMode)); } catch (_) {}'''
new_save = '''      if (playbackPreferences) playbackPreferences.setPlayMode(window.playMode);
      else { try { localStorage.setItem("playModeV1", String(window.playMode)); } catch (_) {} }'''

for old, new, label in [
    (old_load, new_load, "play-mode read"),
    (old_save, new_save, "play-mode write"),
]:
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one {label} anchor, found {count}; refusing to patch.")
    source = source.replace(old, new, 1)

path.write_text(source, encoding="utf-8")
print("Routed mini-player play-mode persistence through YiuPlaybackPreferences; legacy fallback retained.")
