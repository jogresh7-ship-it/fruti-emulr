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
| `Genesis` | Sega Genesis / Mega Drive |
| `PS2` | PlayStation 2 (experiment, see below) |
| `PSP` | PlayStation Portable |
| `Master System` | Sega Master System |
| `Game Gear` | Sega Game Gear |
| `32X` | Sega 32X |
| `Saturn` | Sega Saturn |
| `Jaguar` | Atari Jaguar |
| `WonderSwan` | WonderSwan / Color |
| `PC Engine` | PC Engine / TurboGrafx-16 |

Every game needs its own folder, named after the game. Put the game file, or all of its parts, inside:

```
rom/PS/
  My Game/
    My Game.part001.zip
    My Game.part002.zip
```

On GitHub: open the console folder, then **Add file → Upload files**, and drag in the game's folder.

- **Title:** the folder name.
- **One-file games** can also go straight into the console folder, like `rom/DS/New Super Mario Bros..zip`; the file name is the title. Games in parts must have their own folder.
- **Parts:** the GitHub website takes files up to 25 MB (git and GitHub Desktop: 100 MB), so split big games and upload every part to the game's folder. The launcher downloads them in order and joins them. Names like `My Game.part001.zip`, `My Game part 1.zip`, `My Game (Part 1).zip` and `My Game.zip.001` all work, both for one file cut into pieces and for parts that are each their own zip.
- **File types:** `.zip`, `.7z` or the plain ROM (`.nds`, `.gba`, ...). Parts of a `.7z` work too, even when they're named `.zip` (like `My Game.part001.zip`), and so do 7-Zip volumes (`My Game.7z.001`, `.002`, ...).
- **Cover:** put a `.jpg` or `.png` in the game's folder. For a one-file game, give the picture the same name as the game file, next to it (`rom/DS/My Game.zip` → `rom/DS/My Game.jpg`). Posters take the shape of that console's game box (tall for PSP, almost square for DS), set by `box` in `consoles.js`.
- **PlayStation `.cue` + `.bin`:** put them in one `.zip`.
- **PS2** games: the disc as `.iso`, `.cso` or `.chd` (cut into parts if big), **not** zipped. They open in their own player (`ps2.html`), which reads the disc straight from the site while you play. It uses [Play!](https://github.com/jpd002/Play-) (BSD-2-Clause), built for the browser by the **Build PS2 emulator (Play!)** GitHub Action into `ps2/`. It's an experiment: it needs a fast computer, and many games run slowly or don't start. Controls: W A S D move, T F G H camera, I J K L face buttons, Q / E L1 / R1, 1 / 3 L2 / R2, Enter Start, V Select; a game controller works too.
- **Details (optional):** genres, a description or colors go in `games.js`, by folder.
- **PSP** games (`.iso`, `.cso`, `.pbp`, or zipped / 7z) only play on the website (GitHub Pages), on a computer with an up-to-date Chrome, Edge or Firefox. The PSP emulator needs multi-threading, which GitHub Pages doesn't switch on by itself, so `sw.js` switches it on for the player page. Big PSP games take a while to load and need a lot of memory.

The game list comes from GitHub, so the launcher needs internet, also when you double-click `index.html`. Only games in the repo's `rom/` folder can be played; visitors can't load their own ROMs. Anything in this public repo can be downloaded by anyone.

Games run through [EmulatorJS](https://github.com/EmulatorJS/EmulatorJS) 4.2.3, bundled in `emulatorjs/` (GPL-3.0). PSP games use its [PPSSPP](https://github.com/EmulatorJS/ppsspp) core (GPL-2.0 or later).

## Big games and sound

- **Big PSP games** packed as `.7z` / `.zip` are unpacked inside the browser, which runs out of memory above about 1 GB unpacked. The **Make big PSP games playable (.cso)** GitHub Action (`.github/workflows/psp-cso.yml`) fixes that: start it from the **Actions** tab (**Run workflow**) and it unpacks each such game on GitHub's computer, compresses it to `.cso` (which the PSP emulator reads without unpacking), checks it, and **replaces that game's archive parts with `.cso` parts** in the same folder; covers and smaller games are left alone. It only runs when started by hand. Uploading `.cso` parts yourself works too.
- **Sound:** browsers only allow sound after a click or key press on the page, and some games freeze until sound starts, so the player shows **Click to play** when needed.

## Using it

- **Sidebar:** Home, Catalogue, and **My library**: every game, recently played first (type in *Filter library* to narrow it). Click a game and it starts right away in the same tab; the **Library** button at the top left of the player goes back. On a phone the sidebar opens with **☰**.
- **Home:** a big banner with the game you played last (or a featured one) and a **Play** button, then cards for *Recently played*, *All games* or *With box art*.
- **Catalogue:** every game as a list, with console filters on the right (tick one or more consoles).
- **Import** (top right): anyone can add a game of their own: choose the game file, the console it's for, a title, and a cover (a PNG / JPG file or a link to a picture). It's saved only in that browser, on that device (nothing is uploaded, other visitors don't see it), marked *Imported*, and can be removed with the bin icon in the Catalogue. Big games may not fit in the browser's storage.
- **Search** (top, or press `/`) looks through every console. **↻** checks GitHub for newly uploaded games.
- While a game downloads and unpacks, the page shows how much time is left.
- Console pictures are in `icons/` and set in `consoles.js` (`icon`); consoles without one show their short name.
