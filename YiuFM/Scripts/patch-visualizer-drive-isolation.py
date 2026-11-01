#!/usr/bin/env python3
"""Isolate visualizer adapter drive failures so one engine cannot starve others."""
from pathlib import Path

path = Path("YiuFM/Resources/Web/APP/visualizer-manager.js")
source = path.read_text(encoding="utf-8")

old_state = "  var lastError = null;"
new_state = "  var lastError = null;\n  var driveFaults = {};   // 避免单个适配器抛错中断其余引擎的播放时钟分发"
if source.count(old_state) != 1:
    raise SystemExit(f"Expected one drive fault state anchor, found {source.count(old_state)}")
source = source.replace(old_state, new_state, 1)

old_drive = """    drive: function (ct) {
      for (var i = 0; i < NAMES.length; i++) {
        var ad = adapterOf(NAMES[i]);
        if (ad && typeof ad.drive === 'function') ad.drive(ct);
      }
    },"""
new_drive = """    drive: function (ct) {
      for (var i = 0; i < NAMES.length; i++) {
        var name = NAMES[i], ad = adapterOf(name);
        if (!ad || typeof ad.drive !== 'function') continue;
        try {
          // Every registered adapter exposes isActive(); don't call inactive renderers
          // on the audio frame path. Keep the fallback for older third-party adapters.
          if (typeof ad.isActive === 'function' && !ad.isActive()) continue;
          ad.drive(ct);
          if (driveFaults[name]) { delete driveFaults[name]; warn('drive recovered ' + name); }
        } catch (e) {
          if (!driveFaults[name]) warn('drive ' + name, e);
          driveFaults[name] = true;
        }
      }
    },"""
if source.count(old_drive) != 1:
    raise SystemExit(f"Expected one drive fan-out anchor, found {source.count(old_drive)}")
source = source.replace(old_drive, new_drive, 1)

path.write_text(source, encoding="utf-8")
print("Isolated visualizer drive errors per adapter; other engines continue receiving clock updates.")
