#!/usr/bin/env python3
"""Route the legacy player’s library consumer through YiuLibrary first.

Only the restored Run #13 build-workspace copy is modified. SongLibrary remains
the implementation owner and the legacy global remains a runtime fallback.
"""
from pathlib import Path

path = Path("YiuFM/Resources/Web/APP/player.js")
source = path.read_text(encoding="utf-8")

replacements = [
    (
        "  var SL = window.SongLibrary;",
        "  var SL = window.YiuLibrary || window.SongLibrary;"
    ),
    (
        "  if(window.SongLibrary && SongLibrary.step && SongLibrary.step(1)) return;",
        "  var library = window.YiuLibrary || window.SongLibrary;\n"
        "  if(library && library.step && library.step(1)) return;"
    ),
]

for old, new in replacements:
    count = source.count(old)
    if count != 1:
        raise SystemExit(
            f"Expected exactly one player library-consumer anchor, found {count}: {old!r}"
        )
    source = source.replace(old, new, 1)

path.write_text(source, encoding="utf-8")
print("Migrated player end-of-track and next-track consumers to YiuLibrary with legacy fallback.")
