// Consoles supported by emu.html (EmulatorJS). Games go in rom/<folder>/ (folder names: library.js).
// id:   EmulatorJS system name.
// tag:  short label shown on the console badge.
// ext:  game file types (zip and 7z archives of them work too).
// icon: picture shown in the sidebar (optional; without one the tag is shown). Folder = rom/<folder>/.
// box:  shape of the game posters, width / height of that console's game box.
window.FRUTI_CONSOLES = [
  { id: "nds",    name: "Nintendo DS",      tag: "DS",   folder: "DS",      icon: "icons/nds.png", box: 1.1, ext: [".nds"] },
  { id: "n64",    name: "Nintendo 64",      tag: "N64",  folder: "N64",     icon: "icons/n64.png", box: 1.38, ext: [".z64", ".n64", ".v64"] },
  { id: "gba",    name: "Game Boy Advance", tag: "GBA",  folder: "GBA",     icon: "icons/gba.png", box: 1, ext: [".gba"] },
  { id: "gb",     name: "Game Boy / Color", tag: "GB",   folder: "GB",      icon: "icons/gb.png?v=2", box: 1, ext: [".gb", ".gbc"] },
  { id: "snes",   name: "Super Nintendo",   tag: "SNES", folder: "SNES",    box: 1.38, ext: [".sfc", ".smc"] },
  { id: "nes",    name: "NES",              tag: "NES",  folder: "NES",     box: 0.72, ext: [".nes"] },
  { id: "segaMD", name: "Sega Genesis",     tag: "MD",   folder: "Genesis", box: 0.7, ext: [".md", ".gen", ".bin", ".smd"] },
  { id: "psx",    name: "PlayStation",      tag: "PS1",  folder: "PS",      box: 1, ext: [".chd", ".pbp", ".cue", ".bin", ".iso"] },
  { id: "psp",    name: "PlayStation Portable", tag: "PSP", folder: "PSP", icon: "icons/psp.png", box: 0.58, ext: [".iso", ".cso", ".pbp"] },
  { id: "segaMS",     name: "Sega Master System", tag: "SMS",  folder: "Master System",  box: 0.72, ext: [".sms"] },
  { id: "segaGG",     name: "Sega Game Gear",     tag: "GG",   folder: "Game Gear",      box: 0.8,  ext: [".gg"] },
  { id: "sega32x",    name: "Sega 32X",           tag: "32X",  folder: "32X",            box: 0.7,  ext: [".32x"] },
  { id: "segaSaturn", name: "Sega Saturn",        tag: "SAT",  folder: "Saturn",         box: 0.62, ext: [".cue", ".chd", ".iso", ".ccd"] },
  { id: "atari2600",  name: "Atari 2600",         tag: "2600", folder: "Atari 2600",     box: 0.75, ext: [".a26", ".bin"] },
  { id: "atari7800",  name: "Atari 7800",         tag: "7800", folder: "Atari 7800",     box: 0.75, ext: [".a78"] },
  { id: "jaguar",     name: "Atari Jaguar",       tag: "JAG",  folder: "Jaguar",         box: 0.72, ext: [".j64", ".jag"] },
  { id: "ngp",        name: "Neo Geo Pocket",     tag: "NGP",  folder: "Neo Geo Pocket", box: 0.8,  ext: [".ngp", ".ngc"] },
  { id: "ws",         name: "WonderSwan",         tag: "WS",   folder: "WonderSwan",     box: 0.8,  ext: [".ws", ".wsc"] },
  { id: "vb",         name: "Virtual Boy",        tag: "VB",   folder: "Virtual Boy",    box: 0.72, ext: [".vb", ".vboy"] },
  { id: "pce",        name: "PC Engine / TurboGrafx-16", tag: "PCE", folder: "PC Engine", box: 0.75, ext: [".pce"] }
];
