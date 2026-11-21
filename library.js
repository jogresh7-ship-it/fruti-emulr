// Finds the games uploaded to the GitHub repo, so nothing has to be listed by hand.
//
//   rom/<Console>/<Game Name>/<game file or parts>
//
//   <Console>  a folder name from CONSOLE_FOLDERS below, e.g. PS, DS, GBA
//   parts      a game split into pieces (My Game.zip.001, .002, ...) is joined back together
//   cover      any .jpg / .png / .webp in the game's folder is used as its cover
//
// A file directly inside rom/<Console>/ also counts as one game.
// games.js can add details (genres, description, colors) to a game by its folder.
(function () {
  "use strict";
  var REPO = "jogresh7-ship-it/fruti-emulr";   // used when the page isn't on <owner>.github.io/<repo>/
  var BRANCH = "main";
  var CACHE_MS = 60 * 1000;                    // GitHub allows 60 lookups an hour per visitor

  // Folder name (any letter case) -> console id from consoles.js
  var CONSOLE_FOLDERS = {
    "ps": "psx", "ps1": "psx", "psx": "psx", "playstation": "psx",
    "ds": "nds", "nds": "nds", "nintendo ds": "nds",
    "gba": "gba", "game boy advance": "gba",
    "gb": "gb", "gbc": "gb", "game boy": "gb", "game boy color": "gb",
    "n64": "n64", "nintendo 64": "n64",
    "snes": "snes", "super nintendo": "snes",
    "nes": "nes",
    "genesis": "segaMD", "sega genesis": "segaMD", "mega drive": "segaMD", "md": "segaMD",
    "psp": "psp"                                 // listed, but not playable yet
  };
  var UNSUPPORTED = { psp: true };

  var IMAGE = /\.(jpe?g|png|webp|gif)$/i;
  var SKIP = /(^|\/)\.|\.(md|txt|py|js|json|html|css)$/i;

  function repo() {
    var host = /^([\w-]+)\.github\.io$/i.exec(location.hostname);
    var first = location.pathname.split("/").filter(Boolean)[0];
    if (host && first) return { owner: host[1], name: first, local: true };
    var r = REPO.split("/");
    return { owner: r[0], name: r[1], local: false };
  }
  var R = repo();
  var enc = function (path) { return path.split("/").map(encodeURIComponent).join("/"); };
  // On GitHub Pages files come from the site itself; anywhere else (or from disk) from GitHub directly.
  function url(path) {
    return R.local ? enc(path) : "https://raw.githubusercontent.com/" + R.owner + "/" + R.name + "/" + BRANCH + "/" + enc(path);
  }

  var KEY = "fruti:tree:" + R.owner + "/" + R.name;
  function readCache() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function writeCache(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }

  function fetchTree(force) {
    var c = readCache();
    if (!force && c && Date.now() - c.at < CACHE_MS) return Promise.resolve(c.files);
    var api = "https://api.github.com/repos/" + R.owner + "/" + R.name + "/git/trees/" + BRANCH + "?recursive=1";
    return fetch(api).then(function (r) {
      if (!r.ok) throw new Error(r.status === 403 || r.status === 429 ? "GitHub's limit of 60 lookups an hour was reached. Try again later." : "GitHub answered " + r.status + ".");
      return r.json();
    }).then(function (j) {
      var files = (j.tree || []).filter(function (t) { return t.type === "blob" && t.path.indexOf("rom/") === 0; })
        .map(function (t) { return { path: t.path, size: t.size || 0 }; });
      writeCache({ at: Date.now(), files: files });
      return files;
    }).catch(function (e) {
      if (c) return c.files;                    // use the last list we had
      throw e;
    });
  }

  var natural = function (a, b) { return a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: "base" }); };
  // "My Game.zip.001" -> "My Game.zip", "My Game.part2.nds" -> "My Game.nds"
  function joinedName(name) {
    return name.replace(/\.(\d{1,3}|part\d+)$/i, "").replace(/\.part\d+(\.[a-z0-9]+)$/i, "$1");
  }

  function build(files) {
    var byGame = {};
    files.sort(natural).forEach(function (f) {
      var parts = f.path.split("/");                       // rom / Console / Game / file
      if (parts.length < 3 || SKIP.test(f.path)) return;
      var con = CONSOLE_FOLDERS[parts[1].toLowerCase()];
      if (!con) return;
      var single = parts.length === 3;                     // rom/Console/file.ext
      var folder = parts[1] + "/" + parts[2];
      var g = byGame[folder] || (byGame[folder] = {
        id: "rom/" + folder,
        folder: folder,
        title: single ? parts[2].replace(/\.[^.]+$/, "") : parts[2],
        console: con,
        consoleFolder: parts[1],
        unsupported: !!UNSUPPORTED[con],
        tags: [],
        files: [],
        size: 0
      });
      if (IMAGE.test(f.path)) { if (!g.image) g.image = url(f.path); return; }
      g.files.push(f);
      g.size += f.size;
    });
    var games = Object.keys(byGame).map(function (k) { return byGame[k]; }).filter(function (g) { return g.files.length; });
    games.forEach(function (g) {
      g.fileName = joinedName(g.files[0].path.split("/").pop());
      g.urls = g.files.map(function (f) { return url(f.path); });
      // Several files that aren't parts of one file (e.g. .cue + .bin) can't be joined
      if (g.files.some(function (f) { return joinedName(f.path.split("/").pop()) !== g.fileName; }))
        g.problem = "This folder has several different files. Put them in one .zip, or name the parts " + g.fileName + ".001, .002, ...";
    });
    // Extra details from games.js: { folder: "PS/Crash Bandicoot", tags: [...], desc: "...", color: [...] }
    (window.FRUTI_GAMES || []).forEach(function (x) {
      if (!x || !x.folder) return;
      var g = games.filter(function (y) { return y.folder.toLowerCase() === String(x.folder).replace(/^rom\//i, "").toLowerCase(); })[0];
      if (!g) return;
      ["title", "tags", "desc", "color"].forEach(function (k) { if (x[k]) g[k] = x[k]; });
      if (x.image) g.image = /^[a-z]+:/i.test(x.image) ? x.image : url(x.image);
    });
    return games.sort(function (a, b) { return a.title.localeCompare(b.title); });
  }

  window.FrutiLibrary = {
    CONSOLE_FOLDERS: CONSOLE_FOLDERS,
    repo: R,
    url: url,
    // -> Promise of the game list
    load: function (force) { return fetchTree(force).then(build); },
    // Downloads a game (joining its parts) as a File. onProgress(loadedBytes, totalBytes)
    download: function (g, onProgress) {
      var total = g.size || 0, done = 0, blobs = [];
      return g.urls.reduce(function (p, u) {
        return p.then(function () {
          return fetch(u).then(function (r) {
            if (!r.ok) throw new Error("Could not download " + decodeURIComponent(u.split("/").pop()) + " (" + r.status + ")");
            if (!r.body || !r.body.getReader) return r.blob().then(function (b) { done += b.size; onProgress && onProgress(done, total); blobs.push(b); });
            var reader = r.body.getReader(), chunks = [];
            var pump = function () {
              return reader.read().then(function (x) {
                if (x.done) { blobs.push(new Blob(chunks)); return; }
                chunks.push(x.value); done += x.value.length; onProgress && onProgress(done, total);
                return pump();
              });
            };
            return pump();
          });
        });
      }, Promise.resolve()).then(function () { return new File(blobs, g.fileName); });
    }
  };
})();
