// Consoles supported by emu.html (EmulatorJS). Games go in rom/<folder>/ (folder names: library.js).
// id:   EmulatorJS system name.
// tag:  short label shown on the console badge.
// ext:  game file types (zip and 7z archives of them work too).
// icon: picture shown in the sidebar (optional; without one the tag is shown). Folder = rom/<folder>/.
window.FRUTI_CONSOLES = [
  { id: "nds",    name: "Nintendo DS",      tag: "DS",   folder: "DS",      icon: "icons/nds.png", ext: [".nds"] },
  { id: "n64",    name: "Nintendo 64",      tag: "N64",  folder: "N64",     icon: "icons/n64.png", ext: [".z64", ".n64", ".v64"] },
  { id: "gba",    name: "Game Boy Advance", tag: "GBA",  folder: "GBA",     ext: [".gba"] },
  { id: "gb",     name: "Game Boy / Color", tag: "GB",   folder: "GB",      ext: [".gb", ".gbc"] },
  { id: "snes",   name: "Super Nintendo",   tag: "SNES", folder: "SNES",    ext: [".sfc", ".smc"] },
  { id: "nes",    name: "NES",              tag: "NES",  folder: "NES",     ext: [".nes"] },
  { id: "segaMD", name: "Sega Genesis",     tag: "MD",   folder: "Genesis", ext: [".md", ".gen", ".bin", ".smd"] },
  { id: "psx",    name: "PlayStation",      tag: "PS1",  folder: "PS",      ext: [".chd", ".pbp", ".cue", ".bin", ".iso"] },
  { id: "psp",    name: "PlayStation Portable", tag: "PSP", folder: "PSP", icon: "icons/psp.png", ext: [".iso", ".cso", ".pbp"] }
];
