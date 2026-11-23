// Finds the games uploaded to the GitHub repo, so nothing has to be listed by hand.
//
//   rom/<Console>/<Game Name>/<game file or parts>
//
//   <Console>    a folder name from CONSOLE_FOLDERS below, e.g. PS, PSP, DS, GBA
//   <Game Name>  a folder per game. A single, complete game file may also sit directly in
//                rom/<Console>/ (its file name is the title); parts must be in a game folder.
//   files        .zip and .7z archives or plain ROMs (.nds, .gba, ...)
//   parts        My Game.part001.zip, My Game.part002.zip, ... (or My Game.7z.001, .002, ...)
//                are downloaded in order and joined. Works both for one file cut into pieces
//                and for parts that are each their own zip.
//   cover        any .jpg / .png / .webp in the game's folder is used as its cover; for a loose
//                game file, a picture with the same name next to it (My Game.zip -> My Game.jpg)
//
// games.js can add details (genres, description, colors) to a game by its folder.
(function () {
  "use strict";

  // ---------- One-time reset for every visitor ----------
  // When RESET changes, each browser clears (once) the games imported into it, the downloaded game
  // copies, play times, history and saved settings. Games on GitHub and the owner's upload
  // connection are kept; so are the emulator's own game saves.
  var RESET = "2026-11-22";
  var resetDone = (function () {
    var done = Promise.resolve();
    try {
      if (localStorage.getItem("fruti:reset") === RESET) return done;
      Object.keys(localStorage).forEach(function (k) {
        if (k.indexOf("fruti:") === 0 && k !== "fruti:gh-token") localStorage.removeItem(k);
      });
      Object.keys(sessionStorage).forEach(function (k) { if (k.indexOf("fruti:") === 0) sessionStorage.removeItem(k); });
      var jobs = [];
      if (window.caches) jobs.push(caches.delete("fruti-games-v1").catch(function () {}));
      if (window.indexedDB) jobs.push(new Promise(function (ok) {
        var r = indexedDB.deleteDatabase("fruti-imports"); r.onsuccess = r.onerror = r.onblocked = function () { ok(); };
      }));
      done = Promise.all(jobs).then(function () { try { localStorage.setItem("fruti:reset", RESET); } catch (e) {} });
    } catch (e) {}
    return done;
  })();
  var REPO = "jogresh7-ship-it/fruti-emulr";   // used when the page isn't on <owner>.github.io/<repo>/
  var BRANCH = "main";
  var CACHE_MS = 3 * 60 * 1000;                // GitHub allows 60 lookups an hour per visitor (the ↻ button skips this)

  // Folder name (any letter case) -> console id from consoles.js
  var CONSOLE_FOLDERS = {
    "ps": "psx", "ps1": "psx", "psx": "psx", "playstation": "psx",
    "ds": "nds", "nds": "nds", "nintendo ds": "nds",
    "gba": "gba", "game boy advance": "gba",
    "gb": "gb", "gbc": "gb", "game boy": "gb", "game boy color": "gb",
    "n64": "n64", "nintendo 64": "n64",
    "snes": "snes", "super nintendo": "snes",
    "genesis": "segaMD", "sega genesis": "segaMD", "mega drive": "segaMD", "md": "segaMD",
    "ps2": "ps2", "playstation 2": "ps2",
    "psp": "psp", "playstation portable": "psp",
    "master system": "segaMS", "sms": "segaMS", "sega master system": "segaMS",
    "game gear": "segaGG", "gg": "segaGG", "sega game gear": "segaGG",
    "32x": "sega32x", "sega 32x": "sega32x",
    "saturn": "segaSaturn", "sega saturn": "segaSaturn",
    "jaguar": "jaguar", "atari jaguar": "jaguar",
    "wonderswan": "ws", "ws": "ws", "wonderswan color": "ws", "wsc": "ws",
    "pc engine": "pce", "pce": "pce", "turbografx-16": "pce", "turbografx": "pce", "tg16": "pce"
  };
  var UNSUPPORTED = {};

  var IMAGE = /\.(jpe?g|png|webp|gif)$/i;
  var SKIP = /(^|\/)\.|\.(md|txt|nfo|sfv|url|py|js|json|html|css)$|(^|\/)[^\/.]+$/i;   // hidden, notes, no extension

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
  // Games can live in a separate games repo (read first) as well as in the site's own repo.
  var GAMES = { owner: R.owner, name: "rom-games-fruti" };
  var SOURCES = [GAMES];   // all games live in rom-games-fruti now
  var pathSrc = {};   // "rom/DS/Game/file.zip" -> the source it came from
  var raw = function (s, path) { return "https://raw.githubusercontent.com/" + s.owner + "/" + s.name + "/" + BRANCH + "/" + enc(path); };
  function url(path) {
    var s = pathSrc[path];
    if (s && !s.site) return raw(s, path);
    return R.local ? enc(path) : raw(R, path);
  }
  // GitHub Pages takes a few minutes to publish a new upload, but GitHub itself has it at once:
  // if the site doesn't have a file yet, get it straight from GitHub.
  function getFile(u, opts) {
    return fetch(u, opts).then(function (r) {
      if (r.ok || r.status !== 404 || !R.local || /^[a-z]+:/i.test(u)) return r;
      return fetch("https://raw.githubusercontent.com/" + R.owner + "/" + R.name + "/" + BRANCH + "/" + u, opts)
        .then(function (r2) { return r2.ok ? r2 : r; }, function () { return r; });
    });
  }

  // ---------- Downloaded games are kept in the browser (Cache Storage) ----------
  // So a reload, or playing the same game again, doesn't download it all again. The few most
  // recently played games are kept (up to about 3 GB); older ones are removed.
  var GAME_CACHE = "fruti-games-v1", CACHE_MAX = 3 * 1073741824;
  function cachedFile(u, size) {
    if (!window.caches || !window.isSecureContext) return getFile(u);
    return caches.open(GAME_CACHE).then(function (c) {
      return c.match(u).then(function (hit) {
        var len = hit && +hit.headers.get("content-length");
        if (hit && (!size || !len || len === size)) return hit;
        return getFile(u).then(function (r) {
          if (r.ok && r.status === 200) { try { c.put(u, r.clone()).catch(function () {}); } catch (e) {} }
          return r;
        });
      });
    }).catch(function () { return getFile(u); });
  }
  function rememberCached(g) {
    if (!window.caches || g.local) return;
    var list = [];
    try { list = JSON.parse(localStorage.getItem("fruti:cached") || "[]"); } catch (e) {}
    list = list.filter(function (x) { return x.id !== g.id; });
    list.unshift({ id: g.id, urls: g.urls, size: g.size || 0 });
    var total = 0, keep = [], drop = [];
    list.forEach(function (x, i) { total += x.size; (i === 0 || total <= CACHE_MAX ? keep : drop).push(x); });
    try { localStorage.setItem("fruti:cached", JSON.stringify(keep)); } catch (e) {}
    if (drop.length) caches.open(GAME_CACHE).then(function (c) {
      drop.forEach(function (x) { x.urls.forEach(function (u) { c.delete(u); }); });
    }).catch(function () {});
  }

  function fetchTree(force) {
    return Promise.all(SOURCES.map(function (s) {
      return fetchTreeOf(s, force).then(function (files) { return { s: s, files: files }; }, function (e) { return { s: s, error: e }; });
    })).then(function (all) {
      var ok = all.filter(function (x) { return x.files; });
      if (!ok.length) throw all[all.length - 1].error;
      var seen = {}, out = [];
      pathSrc = {};
      ok.forEach(function (x) {
        x.files.forEach(function (f) { if (seen[f.path]) return; seen[f.path] = 1; pathSrc[f.path] = x.s; out.push(f); });
      });
      return out;
    });
  }
  function fetchTreeOf(S, force) {
    var KEY = "fruti:tree:" + S.owner + "/" + S.name;
    var readCache = function () { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } };
    var writeCache = function (v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} };
    var c = readCache();
    if (!force && c && Date.now() - c.at < CACHE_MS) return Promise.resolve(c.files);
    var api = "https://api.github.com/repos/" + S.owner + "/" + S.name + "/git/trees/" + BRANCH + "?recursive=1";
    return fetch(api).then(function (r) {
      if (r.status === 404 || r.status === 409) return { tree: [] };   // repo missing or still empty
      if (!r.ok) throw new Error(r.status === 403 || r.status === 429 ? "GitHub's limit of 60 lookups an hour was reached. Try again later." : "GitHub answered " + r.status + ".");
      return r.json();
    }).then(function (j) {
      var files = (j.tree || []).filter(function (t) { return t.type === "blob" && t.path.indexOf("rom/") === 0; })
        .map(function (t) { return { path: t.path, size: t.size || 0 }; });
      writeCache({ at: Date.now(), files: files });
      return files;
    }).catch(function (e) {
      // GitHub's hourly limit reached (or offline): use rom/files.json, the list a GitHub Action keeps
      // up to date in the repo. An old saved list is the last resort: it can be from before an upload
      // finished, which would make complete games look like they're missing parts.
      return fileList(S).catch(function () {
        if (c) return c.files;
        throw e;
      });
    });
  }
  function fileList(S) {
    // Straight from GitHub's file server: it has a new list sooner than the GitHub Pages site
    return fetch(raw(S, "rom/files.json"), { cache: "no-store" }).then(function (r) { return r.ok || !S.site ? r : getFile(enc("rom/files.json"), { cache: "no-store" }); }).then(function (r) {
      if (!r.ok) throw new Error("no file list");
      return r.json();
    }).then(function (j) {
      var files = (j.files || []).filter(function (f) { return f && typeof f.path === "string" && f.path.indexOf("rom/") === 0; })
        .map(function (f) { return { path: f.path, size: +f.size || 0 }; });
      if (!files.length) throw new Error("empty file list");
      return files;
    });
  }

  // "DS/Welcome to Animal Crossing_ Wild World" and "ds/welcome to animal crossing: wild world." match
  function coverKey(con, name) {
    return (con + "/" + String(name).replace(/_ /g, ": ").replace(/[\s.:_-]+$/, "")).toLowerCase();
  }

  var natural = function (a, b) { return a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: "base" }); };
  // The name with its part number removed:
  //   "My Game.part001.zip", "My Game part 2.zip", "My Game (Part 3).zip" -> "My Game.zip"
  //   "My Game.zip.001", "My Game.zip.part1" -> "My Game.zip"
  function joinedName(name) {
    return name.replace(/\.\d{1,3}$/, "").replace(/\.part\d+$/i, "")
      .replace(/[\s._-]*[([]?part[\s._-]*\d+[)\]]?(?=\.[a-z0-9]+$)/i, "");
  }

  function build(files) {
    var byGame = {}, looseCovers = {};
    files.sort(natural).forEach(function (f) {
      var parts = f.path.split("/");                       // rom / Console / Game / file
      if (parts.length < 3 || SKIP.test(f.path)) return;
      var loose = parts.length === 3;                      // rom/Console/file.ext
      var con = CONSOLE_FOLDERS[parts[1].toLowerCase()];
      if (!con) return;
      // A picture loose in rom/<Console>/ is the cover of the loose game with the same name:
      // rom/DS/My Game.jpg -> rom/DS/My Game.zip
      if (loose && IMAGE.test(f.path)) { looseCovers[coverKey(parts[1], parts[2].replace(/\.[^.]+$/, ""))] = url(f.path); return; }
      var folder = parts[1] + "/" + parts[2];
      var g = byGame[folder] || (byGame[folder] = {
        id: "rom/" + folder,
        folder: folder,
        // Downloads write ":" as "_" (not allowed in file names): "Grand Theft Auto_ Vice City" -> "Grand Theft Auto: Vice City"
        title: (loose ? parts[2].replace(/\.[^.]+$/, "") : parts[2]).replace(/_ /g, ": "),
        loose: loose,
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
    games.forEach(function (g) { if (g.loose && !g.image) g.image = looseCovers[coverKey(g.consoleFolder, g.title)]; });
    games.forEach(function (g) {
      // The game is the biggest set of files that belong together (one file, or its parts);
      // anything else in the folder (notes, placeholder files, ...) is ignored.
      var sets = {};
      g.files.forEach(function (f) {
        var k = joinedName(f.path.split("/").pop()).toLowerCase();
        (sets[k] || (sets[k] = { files: [], size: 0 })).files.push(f);
        sets[k].size += f.size;
      });
      var best = Object.keys(sets).map(function (k) { return sets[k]; }).sort(function (a, b) { return b.size - a.size; })[0];
      g.files = best.files; g.size = best.size;
      g.fileName = joinedName(g.files[0].path.split("/").pop());
      g.urls = g.files.map(function (f) { return url(f.path); });
      if (g.loose && g.fileName !== g.files[0].path.split("/").pop())
        g.problem = "This is one part of a game. Put all its parts in a folder named after the game, inside rom/" + g.consoleFolder + "/.";
    });
    // Extra details from games.js: { folder: "PS/Crash Bandicoot", tags: [...], desc: "...", color: [...] }
    (window.FRUTI_GAMES || []).forEach(function (x) {
      if (!x || !x.folder) return;
      var g = games.filter(function (y) { return y.folder.toLowerCase() === String(x.folder).replace(/^rom\//i, "").toLowerCase(); })[0];
      if (!g) return;
      ["title", "tags", "desc", "color"].forEach(function (k) { if (x[k]) g[k] = x[k]; });
      if (x.image) g.image = /^[a-z]+:/i.test(x.image) ? x.image : url(x.image);
    });
    // A cover named after the title shown in the library: rom/DS/Animal Crossing DS.jpeg
    games.forEach(function (g) { if (g.loose && !g.image) g.image = looseCovers[coverKey(g.consoleFolder, g.title)]; });
    return games.sort(function (a, b) { return a.title.localeCompare(b.title); });
  }

  // GitHub games + games this visitor imported into this browser
  function loadNow(force) {
    return Promise.all([fetchTree(force).then(build).catch(function (e) { return { error: e }; }), Local.games().catch(function () { return []; })])
      .then(function (r) {
        if (r[0].error && !r[1].length) throw r[0].error;
        return (r[0].error ? [] : r[0]).concat(r[1]).sort(function (a, b) { return a.title.localeCompare(b.title); });
      });
  }

  window.FrutiLibrary = {
    CONSOLE_FOLDERS: CONSOLE_FOLDERS,
    repo: R,
    gamesRepo: GAMES,
    url: url,
    // -> Promise of the game list
    load: function (force) {
      return resetDone.then(function () { return loadNow(force); });
    },
    local: null,   // set below
    // -> Promise of a message when parts are missing, else null. Reads only the start of the first part.
    checkParts: function (g) {
      if (g.local) return Promise.resolve(null);
      if (g.files.length < 2 && !/\.(7z|zip)$/i.test(g.fileName)) return Promise.resolve(null);
      return bytesAt(g.urls[0], 0, 4096).then(function (b) {
        if (isCso(b)) return csoMissing(g, b);
        return missingParts(g, b);
      }).catch(function () { return null; });
    },
    // Downloads a game (joining its parts) as a File. onProgress(loadedBytes, totalBytes)
    // Downloads a game as { data: Uint8Array, name } - the parts go straight into one block of memory,
    // which the emulator then uses as is (no extra copies: big PSP games need that on computers with
    // little memory). onProgress(loadedBytes, totalBytes)
    download: function (g, onProgress) {
      if (g.local) return Local.get(g.key).then(function (rec) {
        if (!rec) throw new Error("This imported game isn't in this browser any more.");
        return rec.rom.arrayBuffer().then(function (a) { var d = new Uint8Array(a); onProgress && onProgress(d.length, d.length); return { data: d, name: nameFor(rec.fileName, d) }; });
      });
      var total = g.size || 0, buf;
      try { buf = new Uint8Array(total); } catch (e) { return downloadAsFile(g, onProgress).then(fileToBytes); }
      var offset = 0, starts = [];
      return g.urls.reduce(function (p, u, i) {
        return p.then(function () {
          starts.push(offset);
          return cachedFile(u, g.files[i] && g.files[i].size).then(function (r) {
            if (!r.ok) throw new Error("Could not download " + decodeURIComponent(u.split("/").pop()) + " (" + r.status + ")");
            var reader = r.body.getReader();
            var pump = function () {
              return reader.read().then(function (x) {
                if (x.done) {
                  // Stop early (before downloading everything) when parts are missing
                  if (i === 0) { var m = missingParts(g, buf.subarray(0, Math.min(4096, offset))); if (m) throw new Error(m); }
                  return;
                }
                if (offset + x.value.length > buf.length) throw new Error("size-mismatch");
                buf.set(x.value, offset); offset += x.value.length; onProgress && onProgress(offset, total);
                return pump();
              });
            };
            return pump();
          });
        });
      }, Promise.resolve()).then(function () {
        if (offset !== buf.length) throw new Error("size-mismatch");
        rememberCached(g);
        // Parts that are each their own zip need unpacking first: do that the old way (rare)
        var check = g.urls.length < 2 ? Promise.resolve(false) : Promise.all([
          zipEntries(new Blob([buf.subarray(0, starts[1])])), zipEntries(new Blob([buf.subarray(starts[1], starts[2] || buf.length)]))
        ]).then(function (z) { return !!(z[0] && z[1]); });
        return check.then(function (separateZips) {
          if (!separateZips) return { data: buf, name: nameFor(g.fileName, buf) };
          var blobs = starts.map(function (s, k) { return new Blob([buf.subarray(s, starts[k + 1] || buf.length)]); });
          buf = null;
          return joinParts(blobs, g.fileName).then(nameByContent).then(fileToBytes);
        });
      }).catch(function (e) {
        if (e && e.message === "size-mismatch") { buf = null; return downloadAsFile(g, onProgress).then(fileToBytes); }
        throw e;
      });
    }
  };

  // ---------- Imported games: saved in this browser only (IndexedDB), never uploaded ----------
  var Local = (function () {
    var dbp = null;
    function db() {
      if (!dbp) dbp = resetDone.then(function () { return new Promise(function (ok, no) {
        if (!window.indexedDB) return no(new Error("This browser can't save games."));
        var r = indexedDB.open("fruti-imports", 1);
        r.onupgradeneeded = function () { r.result.createObjectStore("games", { keyPath: "key" }); };
        r.onsuccess = function () { ok(r.result); }; r.onerror = function () { no(r.error); };
      }); });
      return dbp;
    }
    function tx(mode, fn) {
      return db().then(function (d) { return new Promise(function (ok, no) {
        var t = d.transaction("games", mode), st = t.objectStore("games"), out = fn(st);
        t.oncomplete = function () { ok(out && "result" in out ? out.result : undefined); };
        t.onerror = function () { no(t.error); }; t.onabort = function () { no(t.error || new Error("Not saved (the browser may be out of space).")); };
      }); });
    }
    var coverUrls = {};
    function toGame(rec) {
      var con = rec.console;
      if (!coverUrls[rec.key]) coverUrls[rec.key] = rec.coverBlob ? URL.createObjectURL(rec.coverBlob) : rec.coverUrl || "";
      return { id: "local/" + rec.key, key: rec.key, local: true, folder: "Imported/" + rec.title, title: rec.title, console: con,
        consoleFolder: "Imported", unsupported: false, tags: [], files: [{ path: rec.fileName, size: rec.size }], size: rec.size,
        fileName: rec.fileName, urls: [], image: coverUrls[rec.key] || undefined, added: rec.added };
    }
    return {
      games: function () { return tx("readonly", function (st) { return st.getAll(); }).then(function (list) { return (list || []).map(toGame); }); },
      get: function (key) { return tx("readonly", function (st) { return st.get(key); }); },
      blob: function (key) { return this.get(key).then(function (r) { if (!r) throw new Error("This imported game isn't in this browser any more."); return r.rom; }); },
      add: function (rec) {
        rec.key = rec.key || Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
        rec.added = Date.now();
        return tx("readwrite", function (st) { st.put(rec); }).then(function () { return rec.key; });
      },
      remove: function (key) { delete coverUrls[key]; return tx("readwrite", function (st) { st.delete(key); }); }
    };
  })();
  window.FrutiLibrary.local = Local;

  // The extension the game really has (7z parts are often named .zip)
  function nameFor(name, b) {
    var ext = b[0] === 0x37 && b[1] === 0x7a && b[2] === 0xbc && b[3] === 0xaf ? ".7z"
      : b[0] === 0x50 && b[1] === 0x4b && b[2] === 3 && b[3] === 4 ? ".zip"
      : b[0] === 0x52 && b[1] === 0x61 && b[2] === 0x72 && b[3] === 0x21 ? ".rar"
      : b[0] === 0x43 && b[1] === 0x49 && b[2] === 0x53 && b[3] === 0x4f ? ".cso" : "";   // CISO = compressed PSP ISO
    if (!ext || name.toLowerCase().slice(-ext.length) === ext) return name;
    return name.replace(/\.(zip|7z|rar|cso)$/i, "") + ext;
  }
  function fileToBytes(file) {
    return file.arrayBuffer().then(function (a) { return { data: new Uint8Array(a), name: file.name }; });
  }

  // The old way: each part as a Blob, joined into a File (uses more memory)
  function downloadAsFile(g, onProgress) {
      var total = g.size || 0, done = 0, blobs = [];
      return g.urls.reduce(function (p, u, i) {
        return p.then(function () {
          var first = !blobs.length;
          return cachedFile(u, g.files[i] && g.files[i].size).then(function (r) {
            if (!r.ok) throw new Error("Could not download " + decodeURIComponent(u.split("/").pop()) + " (" + r.status + ")");
            if (!r.body || !r.body.getReader) return r.blob().then(function (b) { done += b.size; onProgress && onProgress(done, total); blobs.push(b); });
            var reader = r.body.getReader(), chunks = [];
            var pump = function () {
              return reader.read().then(function (x) {
                if (x.done) {
                  blobs.push(new Blob(chunks));
                  // Stop early (before downloading everything) when parts are missing
                  if (first) return bytes(blobs[0], 0, 4096).then(function (b) { var m = missingParts(g, b); if (m) throw new Error(m); });
                  return;
                }
                chunks.push(x.value); done += x.value.length; onProgress && onProgress(done, total);
                return pump();
              });
            };
            return pump();
          });
        });
      }, Promise.resolve()).then(function () { return joinParts(blobs, g.fileName); }).then(nameByContent);
  }

  // ---------- Missing parts ----------
  // n bytes of a file starting at `from`, without downloading all of it
  function bytesAt(u, from, n) {
    return getFile(u, { headers: { Range: "bytes=" + from + "-" + (from + n - 1) } }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      var skip = r.status === 206 ? 0 : from;      // server ignored the range: skip to `from` ourselves
      var reader = r.body.getReader(), got = new Uint8Array(0);
      var more = function () {
        return reader.read().then(function (x) {
          if (!x.done) { var a = new Uint8Array(got.length + x.value.length); a.set(got); a.set(x.value, got.length); got = a; }
          if (x.done || got.length >= skip + n) { reader.cancel().catch(function () {}); return got.subarray(skip, skip + n); }
          return more();
        });
      };
      return more();
    });
  }
  var isCso = function (b) { return b && b.length >= 24 && b[0] === 0x43 && b[1] === 0x49 && b[2] === 0x53 && b[3] === 0x4f; };
  // A CSO's index says where its last block ends, i.e. how big the whole file must be
  function csoMissing(g, b) {
    var total = u32(b, 8) + u32(b, 12) * 4294967296, bs = u32(b, 16), align = b[21];
    if (!bs) return Promise.resolve(null);
    var at = 24 + 4 * Math.ceil(total / bs);
    if (at + 4 > g.files[0].size) return Promise.resolve(null);
    return bytesAt(g.urls[0], at, 4).then(function (e) {
      var end = (u32(e, 0) & 0x7fffffff) * Math.pow(2, align);
      return end > g.size ? partsMessage(g, end) : null;
    });
  }
  // A 7z archive's first 32 bytes say how big the whole archive is; compare with what's uploaded.
  function missingParts(g, b) {
    if (b && b.length >= 30 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 3 && b[3] === 4) return zipMissing(g, b);
    if (!b || b.length < 32 || !(b[0] === 0x37 && b[1] === 0x7a && b[2] === 0xbc && b[3] === 0xaf && b[4] === 0x27 && b[5] === 0x1c)) return null;
    var u64 = function (i) { return u32(b, i) + u32(b, i + 4) * 4294967296; };
    var total = 32 + u64(12) + u64(20);
    return g.size >= total ? null : partsMessage(g, total);
  }
  // A zip's first entry says how big its packed data is; the whole zip is at least that big.
  // (A download that stopped early is still a valid-looking zip start, but far too short.)
  function zipMissing(g, b) {
    var u64 = function (i) { return u32(b, i) + u32(b, i + 4) * 4294967296; };
    var flags = b[6] | b[7] << 8, csize = u32(b, 18), usize = u32(b, 22), nameLen = b[26] | b[27] << 8, extraLen = b[28] | b[29] << 8;
    if (flags & 8) return null;                                  // sizes stored after the data: can't tell
    if (csize === 0xffffffff || usize === 0xffffffff) {          // zip64: real sizes are in the extra field
      for (var p = 30 + nameLen, end = Math.min(b.length, p + extraLen); p + 4 <= end;) {
        var id = b[p] | b[p + 1] << 8, len = b[p + 2] | b[p + 3] << 8;
        if (id === 1) { var q = p + 4; if (usize === 0xffffffff) q += 8; if (csize === 0xffffffff && q + 8 <= end) csize = u64(q); break; }
        p += 4 + len;
      }
      if (csize === 0xffffffff) return null;
    }
    var total = 30 + nameLen + extraLen + csize;
    return g.size >= total ? null : partsMessage(g, total);
  }
  function partsMessage(g, total) {
    var have = g.files.length, first = g.files[0].size, lastPart = g.files[have - 1];
    // A shorter last part is the real end of the file: every part is here, but the game file itself
    // was cut short (a download that stopped early). Otherwise, parts are missing.
    if (have < 2 || lastPart.size < first) {
      return "The game file is incomplete: only " + mb(g.size) + " of " + mb(total) + " is there. The download of this game stopped early, " +
        "so the file on your computer is incomplete too. Download the game again (the finished file should be about " + mb(total) + "), then upload it again.";
    }
    var need = Math.ceil(total / first);
    var m = /(\d+)(?!.*\d)/.exec(lastPart.path.split("/").pop()), pad = m ? m[1].length : 0;
    var num = function (n) { var s = String(n); while (s.length < pad) s = "0" + s; return s; };
    var list = need > have + 1 ? "parts " + num(have + 1) + " to " + num(need) : "part " + num(need);
    return "Only " + have + " of " + need + " parts are uploaded. Upload " + list +
      " to rom/" + g.folder + "/ on GitHub, then try again.";
  }

  var mb = function (n) { return Math.round(n / 1048576) + " MB"; };

  // ---------- Joining parts ----------
  var u32 = function (b, i) { return (b[i] | b[i + 1] << 8 | b[i + 2] << 16 | b[i + 3] << 24) >>> 0; };
  var u16 = function (b, i) { return b[i] | b[i + 1] << 8; };
  var bytes = function (blob, from, to) { return blob.slice(from, to).arrayBuffer().then(function (a) { return new Uint8Array(a); }); };

  // Is this blob a complete zip on its own? (ends with an end-of-central-directory record)
  function zipEntries(blob) {
    var tailStart = Math.max(0, blob.size - 65557);
    return bytes(blob, tailStart, blob.size).then(function (t) {
      for (var i = t.length - 22; i >= 0; i--) {
        if (t[i] === 0x50 && t[i + 1] === 0x4b && t[i + 2] === 5 && t[i + 3] === 6) {
          var count = u16(t, i + 10), cdSize = u32(t, i + 12), cdOff = u32(t, i + 16);
          if (cdOff === 0xffffffff || cdOff + cdSize > blob.size) return null;   // zip64 or not a whole zip
          return bytes(blob, cdOff, cdOff + cdSize).then(function (cd) {
            var out = [], p = 0;
            for (var n = 0; n < count && p + 46 <= cd.length; n++) {
              if (u32(cd, p) !== 0x02014b50) return null;
              var nameLen = u16(cd, p + 28), extra = u16(cd, p + 30), comment = u16(cd, p + 32);
              var name = new TextDecoder().decode(cd.subarray(p + 46, p + 46 + nameLen));
              out.push({ name: name, method: u16(cd, p + 10), csize: u32(cd, p + 20), size: u32(cd, p + 24), offset: u32(cd, p + 42) });
              p += 46 + nameLen + extra + comment;
            }
            return out.filter(function (e) { return !/\/$/.test(e.name); });
          });
        }
      }
      return null;
    });
  }

  function unzipEntry(blob, e) {
    return bytes(blob, e.offset, e.offset + 30).then(function (h) {
      if (u32(h, 0) !== 0x04034b50) throw new Error("A part is a damaged zip.");
      var start = e.offset + 30 + u16(h, 26) + u16(h, 28);
      var data = blob.slice(start, start + e.csize);
      if (e.method === 0) return data;
      if (e.method !== 8 || typeof DecompressionStream === "undefined") throw new Error("A part uses a zip format this browser can't open.");
      return new Response(data.stream().pipeThrough(new DecompressionStream("deflate-raw"))).blob();
    });
  }

  // Give the file the extension of what it really is (7z parts are often named .zip)
  function nameByContent(file) {
    return bytes(file, 0, 8).then(function (b) {
      var ext = b[0] === 0x37 && b[1] === 0x7a && b[2] === 0xbc && b[3] === 0xaf ? ".7z"
        : b[0] === 0x50 && b[1] === 0x4b && b[2] === 3 && b[3] === 4 ? ".zip"
        : b[0] === 0x52 && b[1] === 0x61 && b[2] === 0x72 && b[3] === 0x21 ? ".rar"
        : b[0] === 0x43 && b[1] === 0x49 && b[2] === 0x53 && b[3] === 0x4f ? ".cso" : "";   // CISO = compressed PSP ISO
      if (!ext || file.name.toLowerCase().slice(-ext.length) === ext) return file;
      return new File([file], file.name.replace(/\.(zip|7z|rar|cso)$/i, "") + ext);
    });
  }

  // One part: use it as is. Several parts: if every part is its own zip, take the file out of each
  // and join those; otherwise the parts are pieces of one file, so join them directly.
  function joinParts(blobs, fileName) {
    if (blobs.length < 2) return Promise.resolve(new File(blobs, fileName));
    return Promise.all([zipEntries(blobs[0]), zipEntries(blobs[1])]).then(function (z) {
      if (!z[0] || !z[1]) return new File(blobs, fileName);
      return blobs.reduce(function (p, b) {
        return p.then(function (acc) {
          return zipEntries(b).then(function (ents) {
            if (!ents || !ents.length) throw new Error("A part is not a complete zip.");
            return ents.reduce(function (q, e) {
              return q.then(function () { return unzipEntry(b, e).then(function (x) { acc.blobs.push(x); acc.names.push(e.name); return acc; }); });
            }, Promise.resolve(acc));
          });
        });
      }, Promise.resolve({ blobs: [], names: [] })).then(function (acc) {
        var inner = joinedName(acc.names[0].split("/").pop());
        return new File(acc.blobs, inner);
      });
    });
  }
})();
