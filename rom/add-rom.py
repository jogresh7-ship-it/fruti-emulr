#!/usr/bin/env python3
"""Add a ROM game to Fruti so it plays without a server (even from file://).

  python3 rom/add-rom.py path/to/my-game.nds my-game nds

console = an id from consoles.js: nds, n64, gba, gb, snes, nes, segaMD, psx
Writes rom/<console>/<id>.js (the ROM stored as base64). Then add the game to games.js:

  { id: "my-game", title: "My Game", tags: ["Action"], rom: "my-game", console: "nds" }
"""
import base64, os, sys

if len(sys.argv) < 4:
    sys.exit(__doc__)
src, gid, con = sys.argv[1], sys.argv[2], sys.argv[3]
here = os.path.dirname(os.path.abspath(__file__))
os.makedirs(os.path.join(here, con), exist_ok=True)
out = os.path.join(here, con, gid + ".js")
b64 = base64.b64encode(open(src, "rb").read()).decode()
with open(out, "w") as f:
    f.write('(window.FRUTI_ROM=window.FRUTI_ROM||{})["%s"]="%s";\n' % (gid, b64))
print(out, len(b64) // 1024, "KB")
