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
  function play(g) {
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
      const img = h("img"); img.src = g.image; img.alt = ""; img.loading = "lazy"; a.appendChild(img);
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
    a.style.aspectRatio = String(c.box || 0.72);   // shaped like that console's game box
    a.appendChild(h("div", "play", blocked ? ICON.warn : ICON.play));
    if (g.problem) a.appendChild(h("span", "warn", problemLabel(g.problem)));
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
      ${g.local ? `<span class="pill mine">Imported</span>` : ""}${g.problem ? `<span class="pill" style="background:#8a2020;border-color:#8a2020">${esc(problemLabel(g.problem))}</span>` : ""}</div>`));
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
    $("#imp").hidden = false; $("#imp-rom").focus();
  }
  function closeImport() { $("#imp").hidden = true; }
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
    if (con === "ps2" && /\.(zip|7z|rar)$/i.test(rom.name)) return impError("PS2 games can't be zipped: import the .iso (or .cso / .chd) instead.");
    const btn = $("#imp-save"); btn.disabled = true; btn.textContent = "Saving…";
    FrutiLibrary.local.add({ title, console: con, fileName: rom.name, size: rom.size, rom, coverBlob: impCover || null, coverUrl: impCover ? "" : url })
      .then(() => { closeImport(); toast(`Imported ${title}. It's saved in this browser.`); ui.page = "catalogue"; saveUi(); load(false); })
      .catch((err) => impError("Couldn't save it: " + (err && err.message || err) + (rom.size > 1073741824 ? " Big games may not fit in the browser's storage." : "")))
      .then(() => { btn.disabled = false; btn.textContent = "Import"; });
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
    if (e.key === "Escape") { $("#search").value = ""; $("#search").blur(); document.body.classList.remove("menu-open"); render(); }
  });
  // Coming back from a game (back button / bfcache): refresh play times
  addEventListener("pageshow", () => { times = store.get("times", {}); history = store.get("history", []); if (state === "ok") render(); });

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
