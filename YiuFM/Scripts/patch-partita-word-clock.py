from pathlib import Path

path = Path("YiuFM/Resources/Web/APP/P1.js")
source = path.read_text(encoding="utf-8")

replacements = {
    'g>=t.startTime-u.wordLookahead&&g<=E?y="active":g>E&&(y="passed")':
    'g>=t.startTime&&g<=E+0.08?y="active":g>E+0.08&&(y="passed")',
    'y>=b-c.wordLookahead&&y<=E?S="active":y>E&&(S="passed")':
    'y>=b&&y<=E+0.08?S="active":y>E+0.08&&(S="passed")',
}

for old, new in replacements.items():
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one Partita timing gate, found {count}: {old}")
    source = source.replace(old, new, 1)

if "startTime-u.wordLookahead" in source or "b-c.wordLookahead" in source:
    raise SystemExit("A Partita early-reveal gate remains; refusing to continue.")

path.write_text(source, encoding="utf-8")
print("Partita word clock patched: exact start timestamps + 80ms completion grace.")
