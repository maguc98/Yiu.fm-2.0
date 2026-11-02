#!/usr/bin/env python3
"""Harden visualizer lifecycle fan-out and Partita suspension in the build copy only."""
from pathlib import Path

root = Path("YiuFM/Resources/Web/APP")

def ensure_replace(name, old, new):
    path = root / name
    source = path.read_text(encoding="utf-8")
    if source.count(new) == 1:
        return
    count = source.count(old)
    if count != 1:
        raise SystemExit(
            f"{name}: expected one old or already-patched lifecycle anchor; "
            f"old={count}, new={source.count(new)}"
        )
    path.write_text(source.replace(old, new, 1), encoding="utf-8")

# Correct the manager's legacy header: it coordinates four renderers, not three WebGL engines.
ensure_replace(
    "visualizer-manager.js",
    """/* VisualizerManager：串行管理可视化引擎（Sonnet / Tempera / Lumiere），保证同一时刻最多一个 WebGL Context。""",
    """/* VisualizerManager：串行协调四个视觉引擎（Sonnet / Tempera / Lumiere / Partita）。
   同一时刻只挂载一个引擎；前三者使用 WebGL，Partita 使用 React/DOM。"""
)

# The workflow copies the branch's Partita adapter, which may already contain
# some or all of the suspension work. Make the build patch safe for both that
# newer adapter and the older pinned baseline.
ensure_replace(
    "partita-adapter.js",
    "  var active = false;\n",
    "  var active = false;\n  var suspended = false;\n"
)
ensure_replace(
    "partita-adapter.js",
    "      if (!root || !window.Partita || !active) return;",
    "      if (!root || !window.Partita || !active || suspended) return;"
)
ensure_replace(
    "partita-adapter.js",
    "      if (!active || !currentTimeObj) return;",
    "      if (!active || suspended || !currentTimeObj) return;"
)

# Keep an existing reversible suspension implementation. Upgrade only the old
# destructive hide() implementation used by the pinned baseline.
partita = root / "partita-adapter.js"
source = partita.read_text(encoding="utf-8")
old_suspend = "    setSuspended: function (v) { this.hide(); },"
new_suspend = """    setSuspended: function (v) {
      v = !!v;
      if (v === suspended) return;
      suspended = v;
      if (!active || !hostEl) return;
      hostEl.style.display = suspended ? 'none' : 'block';
      if (!suspended) this._render();
    },"""
if source.count(old_suspend) == 1:
    source = source.replace(old_suspend, new_suspend, 1)
elif source.count("setSuspended: function (v) {") != 1 or not (
    "if (!suspended && active) this._render();" in source
    or "if (!suspended) this._render();" in source
):
    raise SystemExit("Partita adapter has no recognized reversible suspension implementation.")

# Repeated suspend/resume calls must not trigger duplicate renders.
idempotent_guard = "      if (v === suspended) return;\n"
if idempotent_guard not in source:
    normalize_anchor = "      suspended = !!v;\n"
    if source.count(normalize_anchor) != 1:
        raise SystemExit("Partita suspension state cannot be made idempotent safely.")
    source = source.replace(normalize_anchor, "      v = !!v;\n" + idempotent_guard + "      suspended = v;\n", 1)
partita.write_text(source, encoding="utf-8")

print("Hardened visualizer drive fan-out and verified idempotent Partita suspension.")
