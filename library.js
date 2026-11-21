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
//   cover        any .jpg / .png / .webp in the game's folder is used as its cover
//
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
    "psp": "psp", "playstation portable": "psp"
  };
  var UNSUPPORTED = {};

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
  // The name with its part number removed:
  //   "My Game.part001.zip", "My Game part 2.zip", "My Game (Part 3).zip" -> "My Game.zip"
  //   "My Game.zip.001", "My Game.zip.part1" -> "My Game.zip"
  function joinedName(name) {
    return name.replace(/\.\d{1,3}$/, "").replace(/\.part\d+$/i, "")
      .replace(/[\s._-]*[([]?part[\s._-]*\d+[)\]]?(?=\.[a-z0-9]+$)/i, "");
  }

  function build(files) {
    var byGame = {};
    files.sort(natural).forEach(function (f) {
      var parts = f.path.split("/");                       // rom / Console / Game / file
      if (parts.length < 3 || SKIP.test(f.path)) return;
      var loose = parts.length === 3;                      // rom/Console/file.ext
      var con = CONSOLE_FOLDERS[parts[1].toLowerCase()];
      if (!con) return;
      var folder = parts[1] + "/" + parts[2];
      var g = byGame[folder] || (byGame[folder] = {
        id: "rom/" + folder,
        folder: folder,
        title: loose ? parts[2].replace(/\.[^.]+$/, "") : parts[2],
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
    games.forEach(function (g) {
      g.fileName = joinedName(g.files[0].path.split("/").pop());
      g.urls = g.files.map(function (f) { return url(f.path); });
      // Several files that aren't parts of one file (e.g. .cue + .bin) can't be joined
      if (g.loose && g.fileName !== g.files[0].path.split("/").pop())
        g.problem = "This is one part of a game. Put all its parts in a folder named after the game, inside rom/" + g.consoleFolder + "/.";
      else if (g.files.some(function (f) { return joinedName(f.path.split("/").pop()) !== g.fileName; }))
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
      }, Promise.resolve()).then(function () { return joinParts(blobs, g.fileName); }).then(nameByContent);
    }
  };

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
        : b[0] === 0x52 && b[1] === 0x61 && b[2] === 0x72 && b[3] === 0x21 ? ".rar" : "";
      if (!ext || file.name.toLowerCase().slice(-ext.length) === ext) return file;
      return new File([file], file.name.replace(/\.(zip|7z|rar)$/i, "") + ext);
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
