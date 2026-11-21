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
| `PSP` | PlayStation Portable |

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
- **Details (optional):** genres, a description or colors go in `games.js`, by folder.
- **PSP** games (`.iso`, `.cso`, `.pbp`, or zipped / 7z) only play on the website (GitHub Pages), on a computer with an up-to-date Chrome, Edge or Firefox. The PSP emulator needs multi-threading, which GitHub Pages doesn't switch on by itself, so `sw.js` switches it on for the player page. Big PSP games take a while to load and need a lot of memory.

The game list comes from GitHub, so the launcher needs internet, also when you double-click `index.html`. Only games in the repo's `rom/` folder can be played; visitors can't load their own ROMs. Anything in this public repo can be downloaded by anyone.

Games run through [EmulatorJS](https://github.com/EmulatorJS/EmulatorJS) 4.2.3, bundled in `emulatorjs/` (GPL-3.0). PSP games use its [PPSSPP](https://github.com/EmulatorJS/ppsspp) core (GPL-2.0 or later).

## Game Splitter

Open **Game Splitter** (top of the library, or `splitter/`) to cut a game into parts for GitHub:

1. Drop the game file on the page. The console is picked from the file (a `.iso` is checked for "PSP GAME").
2. Choose the part size: **25 MB** for the GitHub website, up to **95 MB** for GitHub Desktop or git (GitHub's limit is 100 MB per file).
3. Click **Make parts**. In Chrome or Edge you pick a folder and the parts are saved in a folder named after the game; other browsers download the parts one by one.
4. Upload that folder to `rom/<Console>/` on GitHub.

**Big PSP games:** the browser can't unpack a big `.7z` / `.zip` (it runs out of memory; for example a 1.75 GB game). Unpack it on your computer to get the `.iso`, then drop the `.iso` on the splitter: it's shrunk to **`.cso`**, which the PSP emulator reads directly without unpacking. The file never leaves your computer. Compression uses [fflate](https://github.com/101arrowz/fflate) (MIT, `splitter/fflate.js`).

**Sound:** browsers only allow sound after a click or key press on the page, and some games freeze until sound starts, so the player shows **Click to play** when needed.

## Using it

- **Sidebar:** the consoles, with how many games each has. Consoles with games are listed first.
- **Middle:** the selected console's games as posters. Click a poster and the game starts right away in the same tab; the **Library** button at the top left goes back (it hides while you play and comes back when you move the mouse).
- **Search** (top, or press `/`) looks through every console. **↻** checks GitHub for newly uploaded games.
- While a game downloads and unpacks, the page shows how much time is left.
- Console pictures are in `icons/` and set in `consoles.js` (`icon`); consoles without one show their short name.
