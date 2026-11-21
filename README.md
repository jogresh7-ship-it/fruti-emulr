# Fruti Emulr

A ROM game launcher made of plain HTML, CSS and JavaScript. Open it on GitHub Pages, or download the folder and double-click `index.html`.

## Adding a game

Upload it on GitHub. The launcher finds it by itself; nothing else to edit.

```
rom/<Console>/<Game Name>/<game file>
```

| Console folder | Console |
|---|---|
| `PS` | PlayStation (PS1) |
| `DS` | Nintendo DS |
| `GBA` | Game Boy Advance |
| `GB` | Game Boy / Game Boy Color |
| `N64` | Nintendo 64 |
| `SNES` | Super Nintendo |
| `NES` | NES |
| `Genesis` | Sega Genesis / Mega Drive |

Every game needs its own folder, named after the game. Put the game file, or all of its parts, inside:

```
rom/PS/
  My Game/
    My Game.part001.zip
    My Game.part002.zip
```

On GitHub: open the console folder, then **Add file → Upload files**, and drag in the game's folder.

- **Title:** the folder name. Files put straight into a console folder, without a game folder, are ignored.
- **Parts:** the GitHub website takes files up to 25 MB (git and GitHub Desktop: 100 MB), so split big games and upload every part to the game's folder. The launcher downloads them in order and joins them. Names like `My Game.part001.zip`, `My Game part 1.zip`, `My Game (Part 1).zip` and `My Game.zip.001` all work, both for one file cut into pieces and for parts that are each their own zip.
- **Cover:** put a `.jpg` or `.png` in the game's folder.
- **PlayStation `.cue` + `.bin`:** put them in one `.zip`.
- **Details (optional):** genres, a description or colors go in `games.js`, by folder.
- **PSP** isn't supported yet: a `rom/PSP/` game shows up but can't be played.

The game list comes from GitHub, so the launcher needs internet, also when you double-click `index.html`. Only games in the repo's `rom/` folder can be played; visitors can't load their own ROMs. Anything in this public repo can be downloaded by anyone.

Games run through [EmulatorJS](https://github.com/EmulatorJS/EmulatorJS) 4.2.3, bundled in `emulatorjs/` (GPL-3.0).

## Features

- Toolbar with search, favorites filter, group by (genre / console / none), sort, console filter, random game, and a "Filter Active" chip that clears filters
- Page buttons at the top right: Library, Statistics, Settings
- Three views: **Details** (grouped game list + a big details page with Play button and time played), **Grid** (cover cards with a console badge) and **List** (sortable table)
- Keyboard: `/` search, arrow keys to select, `Enter` to play, `F` to favorite; double-click a game to play it
- Settings: accent color, grid cover size, background art, grid titles and **Reload games from GitHub**
