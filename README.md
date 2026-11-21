# Fruti Emulr

A ROM game launcher made of plain HTML, CSS and JavaScript. **No server needed:** download the folder and double-click `index.html`. It also works on GitHub Pages.

Consoles: Nintendo DS, Nintendo 64, Game Boy Advance, Game Boy / Color, SNES, NES, Sega Genesis and PlayStation. Games run through [EmulatorJS](https://github.com/EmulatorJS/EmulatorJS) 4.2.3, bundled in `emulatorjs/` (GPL-3.0).

## Folders

- `rom/`: your ROM games, one folder per console (`rom/nds/`, `rom/gba/`, ...), plus `add-rom.py` for adding them.
- `emulatorjs/`: the emulator engine. The games can't run without it.

## Adding a ROM game

Console ids (also the folder names inside `rom/`): `nds`, `n64`, `gba`, `gb`, `snes`, `nes`, `segaMD`, `psx`.

### Easy way: upload the file (plays on GitHub Pages)

1. Upload the game file (`.nds`, `.gba`, `.zip`, ...) to `rom/<console>/`, for example `rom/nds/New Super Mario Bros.zip`. The GitHub website takes files up to 25 MB, so zip big games.
2. Add an entry to `games.js` with `rom` set to the exact file name:

   ```js
   { id: "nsmb", title: "New Super Mario Bros.", tags: ["Platformer"], rom: "New Super Mario Bros.zip", console: "nds" },
   ```

These games play on the website. Browsers don't let pages opened from disk load plain files, so they won't play when you double-click `index.html`; use the offline way for that.

### Offline way: convert the file (also plays from disk)

1. Convert the ROM once:

   ```bash
   python3 rom/add-rom.py path/to/my-game.nds my-game nds
   ```

   This writes `rom/nds/my-game.js`.
2. Add an entry to `games.js` with `rom` set to the id, without an extension:

   ```js
   { id: "my-game", title: "My Game", tags: ["Action"], rom: "my-game", console: "nds" },
   ```

Optional fields: `image` (a cover picture; put it in `rom/` too), `color` (two colors for the gradient used when there's no cover) and `desc` (description).

Only games listed in `games.js` can be played. Visitors can't load or run their own ROMs.

### Why ROMs are `.js` files

Browsers block `fetch()` for pages opened from disk (`file://`), so plain ROM files can't load without a server. Script tags are allowed, so each ROM is stored as base64 inside a `.js` file and loaded that way.

## Features

- Toolbar with search, favorites filter, group by (genre / console / none), sort, console filter, random game, and a "Filter Active" chip that clears filters
- Page buttons at the top right: Library, Statistics, Settings
- Three views: **Details** (grouped game list + a big details page with Play button and time played), **Grid** (cover cards with a console badge) and **List** (sortable table)
- Keyboard: `/` search, arrow keys to select, `Enter` to play, `F` to favorite; double-click a game to play it
- Settings: accent color, grid cover size, background art and grid titles
