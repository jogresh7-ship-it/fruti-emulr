// Consoles supported by emu.html (EmulatorJS). Games go in rom/<folder>/ (folder names: library.js).
// id:   EmulatorJS system name.
// tag:  short label shown on the console badge.
// ext:  game file types (zip and 7z archives of them work too).
window.FRUTI_CONSOLES = [
  { id: "nds",    name: "Nintendo DS",      tag: "DS",   ext: [".nds"] },
  { id: "n64",    name: "Nintendo 64",      tag: "N64",  ext: [".z64", ".n64", ".v64"] },
  { id: "gba",    name: "Game Boy Advance", tag: "GBA",  ext: [".gba"] },
  { id: "gb",     name: "Game Boy / Color", tag: "GB",   ext: [".gb", ".gbc"] },
  { id: "snes",   name: "Super Nintendo",   tag: "SNES", ext: [".sfc", ".smc"] },
  { id: "nes",    name: "NES",              tag: "NES",  ext: [".nes"] },
  { id: "segaMD", name: "Sega Genesis",     tag: "MD",   ext: [".md", ".gen", ".bin", ".smd"] },
  { id: "psx",    name: "PlayStation",      tag: "PS1",  ext: [".chd", ".pbp", ".cue", ".bin", ".iso"] },
  { id: "psp",    name: "PlayStation Portable", tag: "PSP", ext: [".iso", ".cso", ".pbp"] }
];
