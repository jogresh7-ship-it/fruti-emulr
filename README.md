# Fruti Emulr

A ROM game launcher made of plain HTML, CSS and JavaScript. **No server needed:** download the folder and double-click `index.html`. It also works on GitHub Pages.

Consoles: Nintendo DS, Nintendo 64, Game Boy Advance, Game Boy / Color, SNES, NES, Sega Genesis and PlayStation. Games run through [EmulatorJS](https://github.com/EmulatorJS/EmulatorJS) 4.2.3, bundled in `emulatorjs/` (GPL-3.0).

## Folders

- `rom/`: your ROM games, one folder per console (`rom/nds/`, `rom/gba/`, ...), plus `add-rom.py` for adding them.
- `emulatorjs/`: the emulator engine. The games can't run without it.

## Adding a ROM game

1. Convert the ROM once:

   ```bash
   python3 rom/add-rom.py path/to/my-game.nds my-game nds
   ```

   This writes `rom/nds/my-game.js`. Console ids are in `consoles.js`: `nds`, `n64`, `gba`, `gb`, `snes`, `nes`, `segaMD`, `psx`.
2. Add an entry to `games.js`:

   ```js
   { id: "my-game", title: "My Game", tags: ["Action"], rom: "my-game", console: "nds", image: "rom/nds/my-game.jpg", desc: "..." }
   ```

   `image` is an optional cover picture; put it in `rom/` too.

To play a ROM without adding it, open **Emulators** (top right) and pick **Play a ROM**. The file stays on your computer.

### Why ROMs are `.js` files

Browsers block `fetch()` for pages opened from disk (`file://`), so plain ROM files can't load without a server. Script tags are allowed, so each ROM is stored as base64 inside a `.js` file and loaded that way.

## Features

- Toolbar with search, favorites filter, group by (genre / console / none), sort, console filter, random game, and a "Filter Active" chip that clears filters
- Page buttons at the top right: Library, Emulators, Statistics, Settings
- Three views: **Details** (grouped game list + a big details page with Play button and time played), **Grid** (cover cards with a console badge) and **List** (sortable table)
- Keyboard: `/` search, arrow keys to select, `Enter` to play, `F` to favorite; double-click a game to play it
- Settings: accent color, grid cover size, background art and grid titles
