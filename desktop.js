// Fruti - ROM game launcher, Hydra-style: sidebar with the library, Home (featured game, tabs, cards)
// and Catalogue (list + console filters). Clicking a game starts it straight away.
(() => {
  "use strict";
  const VERSION = "20";
  // Without its files (e.g. served from a blob: URL), open the player from GitHub Pages.
  const SITE = "https://jogresh7-ship-it.github.io/fruti-emulr/";
  const BASE = /^(https?|file):$/.test(location.protocol) ? "" : SITE;
  const abs = (p) => (!p || /^[a-z]+:/i.test(p) ? p : BASE + p);

  const CONSOLES = window.FRUTI_CONSOLES || [];
  const $ = (s, r = document) => r.querySelector(s);
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---------- Storage (emu.html saves play time under the same keys) ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem("fruti:" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem("fruti:" + k, JSON.stringify(v)); } catch {} },
  };
  let times = store.get("times", {});
  let history = store.get("history", []);
  const ui = Object.assign({ page: "home", tab: "recent", filters: [] }, store.get("hydra", {}));
  const saveUi = () => store.set("hydra", ui);

  let games = [], state = "loading", error = "";
  const ICON = {
    play: `<svg viewBox="0 0 24 24"><path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="none"/></svg>`,
    trash: `<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>`,
    warn: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.5"/></svg>`,
  };
  const fmt = (ms) => { const m = Math.floor((ms || 0) / 60000); return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`; };
  const mb = (n) => n >= 1073741824 ? (n / 1073741824).toFixed(1) + " GB" : Math.max(1, Math.round(n / 1048576)) + " MB";
  const ago = (t) => { const m = Math.round((Date.now() - t) / 60000); if (m < 60) return m < 2 ? "just now" : m + " min ago"; const hr = Math.round(m / 60); if (hr < 24) return hr + " h ago"; const d = Math.round(hr / 24); return d === 1 ? "yesterday" : d + " days ago"; };
  const initials = (t) => t.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).filter(Boolean).map((w) => /^\d+$/.test(w) ? w : w[0]).join("").slice(0, 3).toUpperCase();
  const consoleOf = (id) => CONSOLES.find((c) => c.id === id) || { id, name: id, tag: String(id).toUpperCase() };
  const lastPlayed = (g) => (history.find((x) => x.id === g.id) || {}).at || 0;
  const query = () => $("#search").value.trim().toLowerCase();
  const problemLabel = (p) => /^Only \d/.test(p) ? "Missing parts" : /incomplete/.test(p) ? "Incomplete file" : "Can't play";

  // Check split games for missing parts in the background (once per game)
  function checkGame(g) {
    if (g.problem || g.unsupported || g.files.length < 2 || g.partsChecked !== undefined) return;
    g.partsChecked = null;
    FrutiLibrary.checkParts(g).then((m) => { g.partsChecked = m; if (m) { g.problem = m; render(); } });
  }

  // ---------- Playing: straight into the player in this tab ----------
  let toastTimer;
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 6000);
  }
  // Opened inside another page (iframe)? PSP and PS2 need multi-threading, which browsers
  // don't allow there, so those games are marked and can't be opened.
  const IN_FRAME = (() => { try { return window.self !== window.top; } catch { return true; } })();
  const FRAME_BLOCKED = { psp: true, ps2: true };
  const frameBlocked = (g) => IN_FRAME && FRAME_BLOCKED[g.console];
  // Their own window can switch multi-threading on, so in an iframe these games open in a pop-up player.
  function playInPopup(g) {
    const url = abs(`${g.console === "ps2" ? "ps2" : "emu"}.html?v=${VERSION}&popup=1&game=${encodeURIComponent(g.id)}`);
    const w = Math.min(1280, screen.availWidth - 40), hgt = Math.min(800, screen.availHeight - 60);
    const win = window.open(url, "fruti-game", `popup=yes,width=${w},height=${hgt},left=${Math.max(0, (screen.availWidth - w) / 2)},top=${Math.max(0, (screen.availHeight - hgt) / 3)}`);
    if (!win) { toast("Your browser blocked the pop-up. Allow pop-ups for this site, then click the game again."); return; }
    try { win.focus(); } catch {}
    toast(`${g.title} opened in a pop-up window.`);
  }

  function play(g) {
    if (frameBlocked(g) && !g.problem && !g.unsupported) {
      history = [{ id: g.id, at: Date.now() }, ...history.filter((x) => x.id !== g.id)].slice(0, 40);
      store.set("history", history);
      playInPopup(g); return;
    }
    if (g.problem || g.unsupported) { toast(g.problem || "This game can't be played."); return; }
    history = [{ id: g.id, at: Date.now() }, ...history.filter((x) => x.id !== g.id)].slice(0, 40);
    store.set("history", history);
    location.href = abs(`${g.console === "ps2" ? "ps2" : "emu"}.html?v=${VERSION}&game=${encodeURIComponent(g.id)}`);
  }

  // ---------- Pieces ----------
  function art(g, cls) {
    const a = h("div", cls);
    if (g.image) {
      const b = h("div", "blur"); b.style.backgroundImage = `url("${g.image}")`; a.appendChild(b);
      const img = h("img"); img.alt = ""; img.loading = "lazy"; img.onload = () => img.classList.add("ok"); img.onerror = () => img.classList.add("ok"); img.src = g.image; if (img.complete) img.classList.add("ok"); a.appendChild(img);
    } else {
      const c = consoleOf(g.console);
      a.appendChild(h("div", "mark", esc(initials(g.title))));
      if (g.color) a.lastChild.style.background = `linear-gradient(135deg, ${g.color[0]}, ${g.color[1]})`;
      void c;
    }
    return a;
  }
  function card(g) {
    checkGame(g);
    const c = consoleOf(g.console), blocked = g.problem || g.unsupported;
    const el = h("button", "card"); el.title = blocked ? (g.problem || "Can't be played") : "Play " + g.title;
    const a = art(g, "card-art");
    if (g.image) el.style.setProperty("--cover", `url("${g.image}")`);
    a.appendChild(h("span", "shine"));
    a.style.aspectRatio = String(c.box || 0.72);   // shaped like that console's game box
    a.appendChild(h("div", "play", blocked ? ICON.warn : ICON.play));
    if (g.problem) a.appendChild(h("span", "warn", problemLabel(g.problem)));
    else if (frameBlocked(g)) a.appendChild(h("span", "warn popup", "↗ Plays in pop-up"));
    if (false) a.appendChild(h("span", "warn", problemLabel(g.problem)));
    el.appendChild(a);
    const played = times[g.id] >= 60000 ? fmt(times[g.id]) + " played" : mb(g.size);
    el.appendChild(h("div", "card-info", `<div class="card-title">${esc(g.title)}</div>
      <div class="card-meta"><span class="pill">${esc(c.tag)}</span><span class="sep">${esc(played)}</span></div>`));
    el.onclick = () => play(g);
    return el;
  }
  function row(g) {
    checkGame(g);
    const c = consoleOf(g.console), blocked = g.problem || g.unsupported;
    const el = h("button", "row"); el.title = blocked ? (g.problem || "Can't be played") : "Play " + g.title;
    el.appendChild(art(g, "row-art"));
    const last = lastPlayed(g);
    el.appendChild(h("div", "row-info", `<div class="row-title">${esc(g.title)}</div>
      <div class="row-meta"><span class="pill">${esc(c.tag)}</span><span>${esc(c.name)}</span><span>· ${esc(mb(g.size))}</span>
      ${times[g.id] >= 60000 ? `<span>· ${esc(fmt(times[g.id]))} played</span>` : ""}${last ? `<span>· last played ${esc(ago(last))}</span>` : ""}
      ${g.local ? `<span class="pill mine">Imported</span>` : ""}${frameBlocked(g) ? `<span class="pill" style="background:#2a3a5a;border-color:#2a3a5a;color:#cfe0ff">↗ Plays in pop-up</span>` : ""}${g.problem ? `<span class="pill" style="background:#8a2020;border-color:#8a2020">${esc(problemLabel(g.problem))}</span>` : ""}</div>`));
    el.appendChild(h("span", "row-play", blocked ? ICON.warn : ICON.play));
    if (g.local) {
      const del = h("span", "row-del", ICON.trash); del.setAttribute("role", "button"); del.title = "Remove from this browser";
      del.onclick = (e) => {
        e.stopPropagation();
        if (!confirm(`Remove "${g.title}" from this browser?`)) return;
        FrutiLibrary.local.remove(g.key).then(() => { toast(`Removed ${g.title}.`); load(false); });
      };
      el.appendChild(del);
    }
    el.onclick = () => play(g);
    return el;
  }

  // ---------- Sidebar: menu + library list ----------
  function renderSidebar() {
    document.querySelectorAll(".sb-link").forEach((b) => b.classList.toggle("on", b.dataset.page === ui.page && !query()));
    const f = $("#sb-filter").value.trim().toLowerCase();
    const list = $("#sb-list"); list.innerHTML = "";
    $("#sb-count").textContent = state === "ok" ? "(" + games.length + ")" : "";
    if (state === "loading") { list.appendChild(h("div", "sb-empty", "Loading…")); return; }
    // Recently played first, then A to Z
    const sorted = [...games].sort((a, b) => (lastPlayed(b) - lastPlayed(a)) || a.title.localeCompare(b.title));
    const shown = sorted.filter((g) => !f || g.title.toLowerCase().includes(f));
    if (!shown.length) list.appendChild(h("div", "sb-empty", games.length ? "No games match." : "No games yet."));
    shown.forEach((g) => {
      const c = consoleOf(g.console);
      const el = h("button", "sb-game" + (g.problem || g.unsupported ? " blocked" : ""));
      const th = h("span", "thumb");
      if (g.image) th.style.backgroundImage = `url("${g.image}")`; else th.textContent = c.tag;
      el.appendChild(th);
      el.appendChild(h("span", "nm", esc(g.title)));
      el.appendChild(h("span", "tag", esc(c.tag)));
      el.title = g.title + " · " + c.name;
      el.onclick = () => { document.body.classList.remove("menu-open"); play(g); };
      list.appendChild(el);
    });
  }

  // Sliding highlight under the chosen tab
  let lastInd = null;
  function moveInd() {
    const nav = $("#hd-tabs"), on = nav.querySelector(".tab.on"), ind = nav.querySelector(".ind");
    if (!on || !ind) return;
    ind.style.width = on.offsetWidth + "px"; ind.style.transform = `translateX(${on.offsetLeft}px)`;
    lastInd = { w: ind.style.width, t: ind.style.transform };
  }
  addEventListener("resize", () => requestAnimationFrame(moveInd));
  // Boxes and rows fade in one after another
  function stagger(root) {
    root.querySelectorAll(".card, .row, .con-head").forEach((el, i) => el.style.setProperty("--i", Math.min(i, 24)));
  }

  // ---------- Pages ----------
  function renderHome(box) {
    const recent = history.map((x) => games.find((g) => g.id === x.id)).filter(Boolean);
    const withCover = games.filter((g) => g.image && !g.problem);
    const tabs = $("#hd-tabs"); tabs.innerHTML = "";
    const TABS = [["recent", "Recently played"], ["all", "All games"], ["covers", "With box art"]];
    if (!recent.length && ui.tab === "recent") ui.tab = "all";
    TABS.forEach(([id, label]) => {
      const b = h("button", "tab" + (ui.tab === id ? " on" : ""), esc(label));
      b.onclick = () => { ui.tab = id; saveUi(); render(); };
      b.dataset.tab = id;
      tabs.appendChild(b);
    });
    const ind = h("span", "ind"); tabs.appendChild(ind);
    if (lastInd) { ind.style.transition = "none"; ind.style.width = lastInd.w; ind.style.transform = lastInd.t; }
    requestAnimationFrame(() => { ind.style.transition = ""; moveInd(); });
    const list = ui.tab === "recent" ? recent : ui.tab === "covers" ? withCover : [...games].sort((a, b) => a.title.localeCompare(b.title));
    if (!list.length) { box.appendChild(h("div", "note", ui.tab === "recent" ? "Nothing played yet. Pick a game below or from your library." : "No games here yet.")); return; }
    if (ui.tab === "all") {
      // One area per console (in the console list's order), each with its own heading
      const ORDER = ["psx", "ps2", "psp", "nds", "gba", "gb", "n64", "snes"];
      const rank = (c) => { const i = ORDER.indexOf(c.id); return i < 0 ? 99 : i; };
      [...CONSOLES].sort((a, b) => rank(a) - rank(b)).forEach((c) => {
        const mine = list.filter((g) => g.console === c.id);
        if (!mine.length) return;
        const sec = h("section", "con-sec");
        const head = h("button", "con-head", `${c.icon ? `<img src="${esc(abs(c.icon))}" alt="">` : `<span class="tag">${esc(c.tag)}</span>`}<span>${esc(c.name)}</span><span class="n">${mine.length}</span>`);
        head.title = "Show only " + c.name + " games";
        head.onclick = () => { ui.page = "catalogue"; ui.filters = [c.id]; saveUi(); render(); $("#content").scrollTop = 0; };
        sec.appendChild(head);
        const grid = h("div", "cards boxes"); mine.forEach((g) => grid.appendChild(card(g))); sec.appendChild(grid);
        box.appendChild(sec);
      });
      return;
    }
    const grid = h("div", "cards boxes"); list.forEach((g) => grid.appendChild(card(g))); box.appendChild(grid);
  }

  function renderCatalogue(box, q) {
    const wrap = h("div", "catalogue");
    const active = ui.filters.filter((id) => games.some((g) => g.console === id));
    let list = games.filter((g) => (!active.length || active.includes(g.console)) && (!q || g.title.toLowerCase().includes(q) || consoleOf(g.console).name.toLowerCase().includes(q)));
    list.sort((a, b) => a.title.localeCompare(b.title));
    const rows = h("div", "rows");
    if (!list.length) rows.appendChild(h("div", "note", games.length ? "No games match." : "No games yet. Upload one on GitHub to <b>rom/&lt;console&gt;/&lt;game name&gt;/</b>, then press <b>↻</b> at the top."));
    list.forEach((g) => rows.appendChild(row(g)));
    wrap.appendChild(rows);
    // Console filters (consoles with games first)
    const f = h("aside", "filters", "<h3>Consoles</h3>");
    const fl = h("div", "list");
    const count = (id) => games.filter((g) => g.console === id).length;
    [...CONSOLES].sort((a, b) => (count(b.id) > 0) - (count(a.id) > 0)).forEach((c) => {
      const n = count(c.id), on = active.includes(c.id);
      const b = h("button", "flt" + (on ? " on" : "") + (n ? "" : " empty"),
        `<span class="box"></span>${c.icon ? `<span class="ic"><img src="${esc(abs(c.icon))}" alt=""></span>` : `<span class="ic tag">${esc(c.tag)}</span>`}<span class="nm">${esc(c.name)}</span><span class="n">${n}</span>`);
      b.onclick = () => { ui.filters = on ? ui.filters.filter((x) => x !== c.id) : [...ui.filters, c.id]; saveUi(); render(); };
      fl.appendChild(b);
    });
    f.appendChild(fl);
    if (active.length) { const cl = h("button", "clear", "Clear filters"); cl.onclick = () => { ui.filters = []; saveUi(); render(); }; f.appendChild(cl); }
    wrap.appendChild(f);
    box.appendChild(wrap);
  }

  function render() {
    renderSidebar();
    const q = query();
    const box = $("#content"); box.innerHTML = "";
    const page = h("div", "page"); box.appendChild(page);
    $("#hd-title").textContent = q ? "Search" : ui.page === "catalogue" ? "Catalogue" : "Home";
    if (q || ui.page !== "home" || state !== "ok") $("#hd-tabs").innerHTML = "";
    document.body.dataset.page = q ? "search" : ui.page;
    if (state === "loading") { page.appendChild(h("div", "note", "Loading games from GitHub…")); return; }
    if (state === "error" && !games.length) {
      page.appendChild(h("div", "note", `Couldn't load games from GitHub. ${esc(error)} <button class="clear" id="retry">Try again</button>`));
      $("#retry").onclick = () => load(true); return;
    }
    if (q || ui.page === "catalogue") renderCatalogue(page, q); else renderHome(page);
    stagger(page);
    // Status bar
    const consolesUsed = new Set(games.map((g) => g.console)).size;
    $("#status-left").textContent = `${games.length} game${games.length === 1 ? "" : "s"} · ${consolesUsed} console${consolesUsed === 1 ? "" : "s"}`;
    const total = Object.values(times).reduce((a, b) => a + b, 0);
    $("#status-right").textContent = total >= 60000 ? "Total play time " + fmt(total) : "Fruti Emulr";
  }

  // A cover uploaded a moment ago isn't on GitHub Pages yet: use GitHub's own copy until it is
  function checkCovers(list) {
    const R = FrutiLibrary.repo;
    if (!R.local) return;
    list.forEach((g) => {
      if (!g.image || /^[a-z]+:/i.test(g.image)) return;
      const test = new Image();
      test.onerror = () => {
        g.image = `https://raw.githubusercontent.com/${R.owner}/${R.name}/main/${g.image}`;
        render();
      };
      test.src = g.image;
    });
  }

  // ---------- Load games from GitHub ----------
  function load(force) {
    state = "loading"; render();
    FrutiLibrary.load(force).then((list) => { games = list; state = "ok"; checkCovers(list); })
      .catch((e) => { state = "error"; error = e.message; })
      .then(render);
  }

  // ---------- Import a game (saved in this browser only) ----------
  const EXT_GUESS = {};
  CONSOLES.forEach((c) => (c.ext || []).forEach((e) => { if (!EXT_GUESS[e]) EXT_GUESS[e] = c.id; }));
  Object.assign(EXT_GUESS, { ".iso": "psp", ".cso": "psp", ".bin": "psx", ".cue": "psx", ".chd": "psx" });
  let impCover = null;   // Blob
  function openImport() {
    const sel = $("#imp-console");
    if (!sel.options.length) {
      sel.appendChild(new Option("Choose the console…", ""));
      CONSOLES.forEach((c) => sel.appendChild(new Option(c.name, c.id)));
    }
    $("#imp-form").reset(); impCover = null; showPrev(""); $("#imp-err").hidden = true;
    ownerUi();
    $("#imp").hidden = false; $("#imp-rom").focus();
  }
  function closeImport() { $("#imp").hidden = true; $("#owner").hidden = true; }
  function showPrev(url) { const p = $("#imp-prev"); p.style.backgroundImage = url ? `url("${url}")` : ""; p.classList.toggle("has", !!url); }
  function impError(msg) { const e = $("#imp-err"); e.textContent = msg; e.hidden = !msg; }
  $("#import").onclick = openImport;
  $("#imp-close").onclick = $("#imp-cancel").onclick = closeImport;
  $("#imp-form").addEventListener("input", () => impError(""));
  $("#imp-form").addEventListener("change", () => impError(""));
  $("#imp").addEventListener("mousedown", (e) => { if (e.target.id === "imp") closeImport(); });
  $("#imp-rom").onchange = () => {
    const f = $("#imp-rom").files[0]; if (!f) return;
    const ext = (/\.[a-z0-9]+$/i.exec(f.name) || [""])[0].toLowerCase();
    if (!$("#imp-title").value) $("#imp-title").value = f.name.replace(/\.[^.]+$/, "").replace(/_ /g, ": ").replace(/\s*\((USA|Europe|Japan|En|[A-Z][a-z]?(,[A-Z][a-z]?)*)[^)]*\)/g, "").trim();
    if (EXT_GUESS[ext] && !$("#imp-console").value) $("#imp-console").value = EXT_GUESS[ext];
    if (/\.iso$/i.test(f.name) && f.size > 760 * 1048576) $("#imp-console").value = "ps2";
  };
  $("#imp-cover").onchange = () => {
    const f = $("#imp-cover").files[0];
    impCover = f || null; if (f) { $("#imp-url").value = ""; showPrev(URL.createObjectURL(f)); } else showPrev("");
  };
  $("#imp-url").oninput = () => {
    const u = $("#imp-url").value.trim();
    if (u) { impCover = null; $("#imp-cover").value = ""; }
    showPrev(/^https?:\/\/\S+$/i.test(u) ? u : "");
  };
  $("#imp-form").onsubmit = (e) => {
    e.preventDefault(); impError("");
    const rom = $("#imp-rom").files[0], con = $("#imp-console").value, title = $("#imp-title").value.trim(), url = $("#imp-url").value.trim();
    if (!rom) return impError("Choose the game file.");
    if (!con) return impError("Choose which console the game is for.");
    if (!title) return impError("Type the game's name.");
    if (!impCover && !url) return impError("Add a cover picture: choose a PNG / JPG, or paste a link to one.");
    if (url && !/^https?:\/\/\S+$/i.test(url)) return impError("The picture link must start with https://");
    if (/\.(7z|zip|rar)\.\d{3}$|\.\d{3}$|\.part\d+\.rar$/i.test(rom.name)) return impError("This is one piece of a split archive (" + rom.name + "). Open it with 7-Zip with all its pieces in the same folder, extract the game, and import the extracted file instead.");
    const toGitHub = ownerToken() && (document.querySelector('input[name="dest"]:checked') || {}).value === "github";
    if (con === "ps2" && /\.rar$/i.test(rom.name)) return impError("PS2 games can't be .rar: extract it with 7-Zip and import the .iso instead.");
    if (con === "ps2" && !toGitHub && /\.(zip|7z)$/i.test(rom.name)) return impError("PS2 games can't be zipped when saved in this browser: extract it with 7-Zip and import the .iso. (Uploading to GitHub works: GitHub unpacks it for you.)");
    const btn = $("#imp-save");
    btn.disabled = true;
    const archiveFor = () => con !== "ps2" || toGitHub ? Promise.resolve("") : bytesOf(rom, 0, 4).then((b) =>
      (b[0] === 0x37 && b[1] === 0x7a) || (b[0] === 0x50 && b[1] === 0x4b) || (b[0] === 0x52 && b[1] === 0x61)
        ? "This PS2 game is inside an archive (zip / 7z / rar). Extract it with 7-Zip and import the .iso instead: the PS2 player can't read archives." : "");
    Promise.all([incompleteMsg(rom).catch(() => ""), archiveFor().catch(() => "")]).then((r) => r[0] || r[1]).then((bad) => { btn.disabled = false; if (bad) impError(bad); else finishImport(); });
    function finishImport() {
    if (ownerToken() && (document.querySelector('input[name="dest"]:checked') || {}).value === "github") {
      btn.disabled = true; btn.textContent = "Uploading…";
      return ghUpload({ rom, con, title, cover: impCover, coverUrl: impCover ? "" : url })
        .then((n) => {
          closeImport();
          toast(converting === "started" ? `Uploaded ${title}. GitHub is now unpacking it into a playable disc: it's ready in about 10–20 minutes (press ↻ then).`
            : converting === "manual" ? `Uploaded ${title}. To make it playable, start "Make big PSP games playable" in your repo's Actions tab (your token can't start it).`
            : `Uploaded ${title} to GitHub (${n} file${n === 1 ? "" : "s"}). It shows for everyone in a minute.`);
          setTimeout(() => load(true), 1500);
        })
        .catch((err) => impError(err.message || String(err)))
        .then(() => { btn.disabled = false; btn.textContent = "Upload"; $("#imp-prog").hidden = true; });
    }
    btn.disabled = true; btn.textContent = "Saving…";
    FrutiLibrary.local.add({ title, console: con, fileName: rom.name, size: rom.size, rom, coverBlob: impCover || null, coverUrl: impCover ? "" : url })
      .then(() => { closeImport(); toast(`Imported ${title}. It's saved in this browser.`); ui.page = "catalogue"; saveUi(); load(false); })
      .catch((err) => impError("Couldn't save it: " + (err && err.message || err) + (rom.size > 1073741824 ? " Big games may not fit in the browser's storage." : "")))
      .then(() => { btn.disabled = false; btn.textContent = "Import"; });
    }
  };

  // ---------- Events ----------
  document.querySelectorAll(".sb-link").forEach((b) => b.onclick = () => {
    ui.page = b.dataset.page; saveUi(); $("#search").value = ""; document.body.classList.remove("menu-open"); render(); $("#content").scrollTop = 0;
  });
  $("#search").oninput = render;
  $("#sb-filter").oninput = renderSidebar;
  $("#reload").onclick = () => load(true);
  $("#hd-menu").onclick = () => document.body.classList.toggle("menu-open");
  $("#scrim").onclick = () => document.body.classList.remove("menu-open");
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); $("#search").focus(); }
    if (e.key === "Escape" && !$("#imp").hidden) { closeImport(); return; }
    if (e.key === "Escape" && !$("#req").hidden) { closeReq(); return; }
    if (e.key === "Escape") { $("#search").value = ""; $("#search").blur(); document.body.classList.remove("menu-open"); render(); }
  });
  // Coming back from a game (back button / bfcache): refresh play times
  addEventListener("pageshow", () => { times = store.get("times", {}); history = store.get("history", []); if (state === "ok") render(); });

  // ---------- Owner: upload to GitHub (cut into parts) ----------
  const MB = 1048576, PART = 25 * MB;
  const ownerToken = () => { try { return localStorage.getItem("fruti:gh-token") || ""; } catch { return ""; } };
  function ownerUi() {
    const on = !!ownerToken();
    $("#imp-dest").hidden = !on;
    $("#owner-off").hidden = !on;
    $("#owner-toggle").textContent = on ? "GitHub connected ✓" : "Owner: upload to GitHub";
    const dest = (document.querySelector('input[name="dest"]:checked') || {}).value;
    $("#imp-save").textContent = on && dest === "github" ? "Upload" : "Import";
    $(".dlg-note").textContent = on && dest === "github"
      ? "Checked, cut into 25 MB parts and uploaded to your GitHub repo (rom/<console>/<game>/). Everyone will see it."
      : "Saved only in this browser, on this device. Nothing is uploaded and nobody else sees it.";
  }
  document.querySelectorAll('input[name="dest"]').forEach((r) => r.onchange = ownerUi);
  $("#owner-toggle").onclick = () => { $("#owner").hidden = !$("#owner").hidden; $("#owner-msg").textContent = ""; };
  $("#owner-off").onclick = () => { try { localStorage.removeItem("fruti:gh-token"); } catch {} $("#owner-msg").textContent = "Disconnected."; ownerUi(); };
  $("#owner-save").onclick = () => {
    const t = $("#owner-token").value.trim(), R = FrutiLibrary.repo;
    if (!t) { $("#owner-msg").textContent = "Paste the token first."; return; }
    $("#owner-msg").textContent = "Checking…";
    fetch(`https://api.github.com/repos/${R.owner}/${R.name}`, { headers: { Authorization: "Bearer " + t, Accept: "application/vnd.github+json" } })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) throw new Error(j.message || "Token not accepted");
        if (!j.permissions || !j.permissions.push) throw new Error("This token can't write to " + R.name + ". Give it Contents: Read and write.");
        // Make sure the token itself may write (a tiny test blob; it's never added to any folder)
        return fetch(`https://api.github.com/repos/${R.owner}/${R.name}/git/blobs`, { method: "POST",
          headers: { Authorization: "Bearer " + t, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
          body: JSON.stringify({ content: "fruti write check", encoding: "utf-8" }) })
          .then((r) => { if (!r.ok) throw new Error("this token can only read. On GitHub, edit the token: Repository permissions → Contents → Read and write, then click Connect again."); return j; });
      })
      .then((j) => {
        try { localStorage.setItem("fruti:gh-token", t); } catch {}
        $("#owner-token").value = ""; $("#owner-msg").textContent = "Connected to " + R.owner + "/" + R.name + " ✓"; ownerUi();
        const gh = document.querySelector('input[name="dest"][value="github"]'); gh.checked = true; ownerUi();
      })
      .catch((e) => { $("#owner-msg").textContent = "Not connected: " + e.message; });
  };

  // Is the file complete? (catches downloads that stopped early) -> message or ""
  const u32 = (b, i) => (b[i] | b[i + 1] << 8 | b[i + 2] << 16 | b[i + 3] << 24) >>> 0;
  const u64 = (b, i) => u32(b, i) + u32(b, i + 4) * 4294967296;
  const bytesOf = (f, a, z) => f.slice(a, z).arrayBuffer().then((x) => new Uint8Array(x));
  async function incompleteMsg(f) {
    const b = await bytesOf(f, 0, 64), cut = (need) => `This file is incomplete: only ${mb(f.size)} of ${mb(need)}. The download stopped early; download it again.`;
    if (b[0] === 0x37 && b[1] === 0x7a && b[2] === 0xbc && b[3] === 0xaf) { const need = 32 + u64(b, 12) + u64(b, 20); return f.size < need ? cut(need) : ""; }
    if (b[0] === 0x50 && b[1] === 0x4b) {
      const t = await bytesOf(f, Math.max(0, f.size - 65600), f.size);
      for (let i = t.length - 22; i >= 0; i--) if (t[i] === 0x50 && t[i + 1] === 0x4b && t[i + 2] === 5 && t[i + 3] === 6) return "";
      return "This zip is incomplete (its end is missing). The download stopped early; download it again.";
    }
    if (b[0] === 0x43 && b[1] === 0x49 && b[2] === 0x53 && b[3] === 0x4f) {
      const n = Math.ceil(u64(b, 8) / (u32(b, 16) || 2048)), t = await bytesOf(f, 24 + n * 4, 28 + n * 4), end = t.length ? u32(t, 0) & 0x7fffffff : f.size + 1;
      return f.size < end ? cut(end) : "";
    }
    const t = await bytesOf(f, 0x8000, 0x8100);
    if (t.length >= 0x84 && String.fromCharCode(t[1], t[2], t[3], t[4], t[5]) === "CD001") { const need = u32(t, 0x50) * ((t[0x80] | t[0x81] << 8) || 2048); return f.size < need ? cut(need) : ""; }
    return "";
  }
  const b64 = (blob) => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1] || ""); r.onerror = () => no(r.error); r.readAsDataURL(blob); });
  let converting = "";
  const archiveKind = (f) => bytesOf(f, 0, 4).then((b) => b[0] === 0x37 && b[1] === 0x7a ? "7z" : b[0] === 0x50 && b[1] === 0x4b ? "zip" : "");
  async function ghUpload({ rom, con, title, cover, coverUrl }) {
    converting = "";
    const R = FrutiLibrary.repo, api = `https://api.github.com/repos/${R.owner}/${R.name}`;
    const H = { Authorization: "Bearer " + ownerToken(), Accept: "application/vnd.github+json", "Content-Type": "application/json" };
    const call = (path, opts) => fetch(api + path, Object.assign({ headers: H }, opts)).then((r) => r.json().then((j) => { if (!r.ok) throw new Error(/not accessible by (personal access|integration)/i.test(j.message || "")
      ? "Your GitHub token can only read. On GitHub, edit the token: Repository permissions → Contents → Read and write (and make sure fruti-emulr is selected). Then try again."
      : `GitHub: ${j.message || r.status}`); return j; }));
    const prog = $("#imp-prog"), bar = prog.querySelector("i"), note = prog.querySelector("small");
    const say = (t, p) => { prog.hidden = false; note.textContent = t; if (p != null) bar.style.width = Math.round(p * 100) + "%"; };
    say("Checking the file…", 0);
    const bad = await incompleteMsg(rom); if (bad) throw new Error(bad);
    const c = consoleOf(con), name = title.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim();
    const ext = (/\.[a-z0-9]+$/i.exec(rom.name) || [""])[0].toLowerCase();
    const dir = `rom/${c.folder || c.tag}/${name}/`;
    const n = Math.max(1, Math.ceil(rom.size / PART)), tree = [];
    for (let i = 0; i < n; i++) {
      say(`Uploading part ${i + 1} of ${n}…`, i / (n + 1));
      const content = await b64(rom.slice(i * PART, Math.min(rom.size, (i + 1) * PART)));
      const blob = await call("/git/blobs", { method: "POST", body: JSON.stringify({ content, encoding: "base64" }) });
      const file = n === 1 ? name + ext : `${name}.part${String(i + 1).padStart(3, "0")}${ext}`;
      tree.push({ path: dir + file, mode: "100644", type: "blob", sha: blob.sha });
    }
    let pic = cover;
    if (!pic && coverUrl) {
      say("Getting the cover picture…", n / (n + 1));
      // Straight from the site; most image sites block that, so then through images.weserv.nl
      // (a free image service that allows it). Only real pictures are kept.
      const tries = [coverUrl, "https://images.weserv.nl/?url=" + encodeURIComponent(coverUrl.replace(/^https?:\/\//, "")) + "&output=png"];
      for (const u of tries) {
        try {
          const r = await fetch(u);
          if (!r.ok) continue;
          const b = await r.blob();
          if (/^image\//.test(b.type) && b.size > 200) { pic = b; break; }
        } catch {}
      }
    }
    if (pic) {
      const pext = /png/.test(pic.type) ? ".png" : /webp/.test(pic.type) ? ".webp" : ".jpg";
      const blob = await call("/git/blobs", { method: "POST", body: JSON.stringify({ content: await b64(pic), encoding: "base64" }) });
      tree.push({ path: dir + "cover" + pext, mode: "100644", type: "blob", sha: blob.sha });
    }
    // A picture link that can't be downloaded here (most image sites block that): save the link
    // itself in games.js instead; the launcher shows covers from links too.
    let linkOnly = !pic && coverUrl ? coverUrl : "";
    say("Saving to GitHub…", n / (n + 1));
    for (let attempt = 0; attempt < 3; attempt++) {
      const ref = await call("/git/ref/heads/main"), base = await call("/git/commits/" + ref.object.sha);
      let entries = tree;
      if (linkOnly) {
        const cur = await call("/contents/games.js?ref=" + ref.object.sha);
        let text = new TextDecoder().decode(Uint8Array.from(atob(cur.content.replace(/\s/g, "")), (ch) => ch.charCodeAt(0)));
        const folder = `${c.folder || c.tag}/${name}`;
        const line = `  { folder: ${JSON.stringify(folder)}, image: ${JSON.stringify(linkOnly)} },\n`;
        const at = text.lastIndexOf("];");
        text = at < 0 ? text + `\nwindow.FRUTI_GAMES = (window.FRUTI_GAMES || []).concat([\n${line}]);\n` : text.slice(0, at) + line + text.slice(at);
        const gb = await call("/git/blobs", { method: "POST", body: JSON.stringify({ content: text, encoding: "utf-8" }) });
        entries = tree.concat([{ path: "games.js", mode: "100644", type: "blob", sha: gb.sha }]);
      }
      const t = await call("/git/trees", { method: "POST", body: JSON.stringify({ base_tree: base.tree.sha, tree: entries }) });
      const cm = await call("/git/commits", { method: "POST", body: JSON.stringify({ message: `Add ${name} (${c.name})`, tree: t.sha, parents: [ref.object.sha] }) });
      try {
        await call("/git/refs/heads/main", { method: "PATCH", body: JSON.stringify({ sha: cm.sha }) });
        // A zipped PS2 game (or big zipped PSP game): have GitHub unpack it into a playable disc
        if ((con === "ps2" || (con === "psp" && rom.size > 400 * MB)) && /^(7z|zip)$/.test(await archiveKind(rom))) {
          say("Asking GitHub to unpack it into a playable disc…", 1);
          const r = await fetch(api + "/actions/workflows/psp-cso.yml/dispatches", { method: "POST", headers: H, body: JSON.stringify({ ref: "main", inputs: { game: name } }) });
          converting = r.ok ? "started" : "manual";
        }
        say("Done.", 1); return tree.length;
      }
      catch (e) { if (attempt === 2) throw e; }   // main moved meanwhile: try again on top of it
    }
  }

  // ---------- Request a game (opens a ready-filled GitHub issue) ----------
  $("#request").onclick = () => {
    const sel = $("#req-console");
    if (!sel.options.length) { sel.appendChild(new Option("Choose the console…", "")); CONSOLES.forEach((c) => sel.appendChild(new Option(c.name, c.id))); }
    $("#req-form").reset(); $("#req-err").hidden = true; $("#req").hidden = false; $("#req-title").focus();
  };
  const closeReq = () => { $("#req").hidden = true; };
  $("#req-close").onclick = $("#req-cancel").onclick = closeReq;
  $("#req").addEventListener("mousedown", (e) => { if (e.target.id === "req") closeReq(); });
  $("#req-form").onsubmit = (e) => {
    e.preventDefault();
    const t = $("#req-title").value.trim(), c = $("#req-console").value, note = $("#req-note").value.trim();
    const err = (m) => { $("#req-err").textContent = m; $("#req-err").hidden = false; };
    if (!t) return err("Type the game's name.");
    if (!c) return err("Choose the console.");
    const R = FrutiLibrary.repo, con = consoleOf(c);
    const body = `**Game:** ${t}\n**Console:** ${con.name}\n` + (note ? `**Notes:** ${note}\n` : "") + "\n_Sent from the Fruti game launcher's Request button._";
    window.open(`https://github.com/${R.owner}/${R.name}/issues/new?title=${encodeURIComponent("Game request: " + t + " (" + con.tag + ")")}&body=${encodeURIComponent(body)}`, "_blank", "noopener");
    closeReq(); toast("Opening your request on GitHub. Press Submit there to send it.");
  };

  // ---------- 3D tilt + light shine that follow the mouse over a game box ----------
  if (matchMedia("(hover: hover) and (pointer: fine)").matches && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    let raf = 0, tgt = null, ev = null;
    document.addEventListener("pointermove", (e) => {
      ev = e; if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const art = ev.target.closest && ev.target.closest(".cards.boxes .card-art");
        if (tgt && tgt !== art) { tgt.style.removeProperty("--rx"); tgt.style.removeProperty("--ry"); tgt = null; }
        if (!art) return;
        tgt = art;
        const r = art.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width, y = (ev.clientY - r.top) / r.height;
        art.style.setProperty("--rx", ((0.5 - y) * 10).toFixed(2) + "deg");
        art.style.setProperty("--ry", ((x - 0.5) * 12).toFixed(2) + "deg");
        art.style.setProperty("--mx", (x * 100).toFixed(1) + "%");
        art.style.setProperty("--my", (y * 100).toFixed(1) + "%");
      });
    }, { passive: true });
  }
  // Top bar turns glassy once the page is scrolled
  $("#content").addEventListener("scroll", () => document.body.classList.toggle("scrolled", $("#content").scrollTop > 8), { passive: true });

  // ---------- Notice shown once per visit when the site is inside an iframe ----------
  if (IN_FRAME) {
    let seen = false; try { seen = sessionStorage.getItem("fruti:frame-note") === "1"; } catch {}
    const box = h("div", "frame-note");
    const chip = (id) => { const c = consoleOf(id); return `<span class="fn-chip">${c.icon ? `<img src="${esc(abs(c.icon))}" alt="">` : ""}${esc(c.name)}</span>`; };
    box.innerHTML = `<div class="fn-card" role="dialog" aria-modal="true" aria-labelledby="fn-t">
      <button class="fn-x" type="button" aria-label="Close">✕</button>
      <div class="fn-top">
        <div class="fn-icon"><svg viewBox="0 0 24 24"><path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.3v.2"/></svg></div>
        <div><h2 id="fn-t">Some games open in a pop-up</h2><p>The site is open inside another page.</p></div>
      </div>
      <div class="fn-chips">${chip("psp")}${chip("ps2")}</div>
      <p class="fn-text">These consoles need multi-threading, which browsers turn off inside embedded pages. So their games open in their own pop-up player window (allow pop-ups if your browser asks). Everything else plays right here.</p>
      <div class="fn-foot"><a class="fn-link" href="${esc(location.href)}" target="_blank" rel="noopener">Open in a new tab ↗</a><button class="btn btn-white fn-ok" type="button">Got it</button></div>
    </div>`;
    const closeNote = () => { box.classList.add("out"); setTimeout(() => box.remove(), 220); try { sessionStorage.setItem("fruti:frame-note", "1"); } catch {} };
    box.querySelector(".fn-ok").onclick = box.querySelector(".fn-x").onclick = closeNote;
    box.addEventListener("mousedown", (e) => { if (e.target === box) closeNote(); });
    if (!seen) document.body.appendChild(box);
  }

  // ---------- Game controller in the library: D-pad / stick moves, A plays, B goes back, LB / RB switch tabs ----------
  (() => {
    const prev = {}; let last = 0, padOn = false;
    const items = () => [...document.querySelectorAll(".sb-link, .hd-tabs .tab, .card, .row, .flt")].filter((el) => el.offsetParent);
    function move(dx, dy) {
      const list = items(); if (!list.length) return;
      const cur = document.activeElement && list.includes(document.activeElement) ? document.activeElement : null;
      if (!cur) { (list.find((el) => el.matches(".card, .row")) || list[0]).focus(); return; }
      const a = cur.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
      let best = null, bestScore = Infinity;
      list.forEach((el) => {
        if (el === cur) return;
        const b = el.getBoundingClientRect(), bx = b.left + b.width / 2, by = b.top + b.height / 2;
        const ddx = bx - ax, ddy = by - ay;
        const along = dx ? ddx * dx : ddy * dy, across = dx ? Math.abs(ddy) : Math.abs(ddx);
        if (along <= 4) return;
        const score = along + across * 2.5;
        if (score < bestScore) { bestScore = score; best = el; }
      });
      if (best) { best.focus({ preventScroll: true }); best.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" }); }
    }
    function tab(step) {
      const t = [...document.querySelectorAll(".hd-tabs .tab")]; if (!t.length) return;
      const i = t.findIndex((x) => x.classList.contains("on")); t[(i + step + t.length) % t.length].click();
      requestAnimationFrame(() => { const first = document.querySelector(".card, .row"); if (first) first.focus({ preventScroll: true }); });
    }
    function press(i) {
      if (i === 12) move(0, -1); else if (i === 13) move(0, 1); else if (i === 14) move(-1, 0); else if (i === 15) move(1, 0);
      else if (i === 0) { const el = document.activeElement; if (el && el !== document.body) el.click(); else move(0, 1); }
      else if (i === 1) { if (!$("#imp").hidden) closeImport(); else if ($("#search").value) { $("#search").value = ""; render(); } else document.body.classList.remove("menu-open"); }
      else if (i === 4) tab(-1); else if (i === 5) tab(1);
      else if (i === 9) $("#search").focus();
    }
    function poll(t) {
      const pad = [...(navigator.getGamepads ? navigator.getGamepads() : [])].find(Boolean);
      if (pad) {
        if (!padOn) { padOn = true; toast("Controller connected: D-pad / stick to move, A to play, B back, LB / RB tabs."); }
        const btn = (i) => pad.buttons[i] && pad.buttons[i].pressed;
        const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
        const dirs = { 12: btn(12) || ay < -0.6, 13: btn(13) || ay > 0.6, 14: btn(14) || ax < -0.6, 15: btn(15) || ax > 0.6 };
        [0, 1, 4, 5, 9].forEach((i) => { const d = btn(i); if (d && !prev[i]) press(i); prev[i] = d; });
        Object.keys(dirs).forEach((k) => {
          const d = dirs[k];
          if (d && (!prev[k] || t - last > 180)) { if (!prev[k] || t - last > 180) { press(+k); last = t; } }
          if (d && !prev[k]) last = t + 220;   // short pause before repeating when held
          prev[k] = d;
        });
      }
      requestAnimationFrame(poll);
    }
    addEventListener("gamepadconnected", () => { document.body.classList.add("pad"); });
    requestAnimationFrame(poll);
  })();

  load(false);
})();
