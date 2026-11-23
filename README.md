# Fruti Emulr

A ROM game launcher made of plain HTML, CSS and JavaScript. Open it on GitHub Pages, or download the folder and double-click `index.html`.

## Adding a game

Games live in a separate repo: **[rom-games-fruti](https://github.com/jogresh7-ship-it/rom-games-fruti)**, in
`rom/<Console>/<Game Name>/` (see its README). The launcher reads the game list from there. The easiest way to
add one is the launcher's **Import → Upload to GitHub** (owner only), which checks the file, cuts it into
25 MB parts and uploads it there. This repo holds only the site.

## Big games and sound

- **Big PSP games** packed as `.7z` / `.zip` are unpacked inside the browser, which runs out of memory above about 1 GB unpacked. The **Make big PSP games playable (.cso)** GitHub Action (`.github/workflows/psp-cso.yml`) fixes that: start it from the **Actions** tab (**Run workflow**) and it unpacks each such game on GitHub's computer, compresses it to `.cso` (which the PSP emulator reads without unpacking), checks it, and **replaces that game's archive parts with `.cso` parts** in the same folder; covers and smaller games are left alone. It only runs when started by hand. Uploading `.cso` parts yourself works too.
- **Sound:** browsers only allow sound after a click or key press on the page, and some games freeze until sound starts, so the player shows **Click to play** when needed.

## Using it

- **Sidebar:** Home, Catalogue, and **My library**: every game, recently played first (type in *Filter library* to narrow it). Click a game and it starts right away in the same tab; the **Library** button at the top left of the player goes back. On a phone the sidebar opens with **☰**.
- **Home:** a big banner with the game you played last (or a featured one) and a **Play** button, then cards for *Recently played*, *All games* or *With box art*.
- **Catalogue:** every game as a list, with console filters on the right (tick one or more consoles).
- **Import** (top right): anyone can add a game of their own: choose the game file, the console it's for, a title, and a cover (a PNG / JPG file or a link to a picture). It's saved only in that browser, on that device (nothing is uploaded, other visitors don't see it), marked *Imported*, and can be removed with the bin icon in the Catalogue. Big games may not fit in the browser's storage.
- **Upload to GitHub (owner only):** in Import, click *Owner: upload to GitHub* and paste a fine-grained GitHub token with *Contents: Read and write* for this repo (kept only in that browser). Then *Save to → Upload to GitHub* checks the file is complete, cuts it into 25 MB parts and uploads them with the cover to `rom/<console>/<game>/` in one commit.
- **Search** (top, or press `/`) looks through every console. **↻** checks GitHub for newly uploaded games.
- While a game downloads and unpacks, the page shows how much time is left.
- Console pictures are in `icons/` and set in `consoles.js` (`icon`); consoles without one show their short name.
