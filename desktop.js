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
    location.href = abs(`emu.html?v=${VERSION}&game=${encodeURIComponent(g.id)}`);
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
      ${g.problem ? `<span class="pill" style="background:#8a2020;border-color:#8a2020">${esc(problemLabel(g.problem))}</span>` : ""}</div>`));
    el.appendChild(h("span", "row-play", blocked ? ICON.warn : ICON.play));
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

  // ---------- Pages ----------
  function renderHome(box) {
    const recent = history.map((x) => games.find((g) => g.id === x.id)).filter(Boolean);
    const withCover = games.filter((g) => g.image && !g.problem);
    const featured = recent.find((g) => !g.problem) || withCover[Math.floor(Date.now() / 3600000) % Math.max(1, withCover.length)] || games[0];
    if (featured) {
      const c = consoleOf(featured.console), wasPlayed = recent.includes(featured);
      const hero = h("div", "hero"); hero.setAttribute("role", "button"); hero.tabIndex = 0;
      if (featured.image) {
        const bg = h("div", "hero-bg"); bg.style.backgroundImage = `url("${featured.image}")`; hero.appendChild(bg);
      }
      hero.appendChild(h("div", "hero-text", `<div class="hero-kicker">${wasPlayed ? "Continue playing" : "Featured"} · ${esc(c.name)}</div>
        <h2 class="hero-title">${esc(featured.title)}</h2>
        <div class="hero-meta">${times[featured.id] >= 60000 ? esc(fmt(times[featured.id])) + " played" : esc(mb(featured.size))}</div>
        <span class="btn btn-white">${ICON.play}Play</span>`));
      hero.onclick = () => play(featured);
      hero.onkeydown = (e) => { if (e.key === "Enter") play(featured); };
      box.appendChild(hero);
    }
    const tabs = h("div", "tabs");
    const TABS = [["recent", "Recently played"], ["all", "All games"], ["covers", "With box art"]];
    if (!recent.length && ui.tab === "recent") ui.tab = "all";
    TABS.forEach(([id, label]) => {
      const b = h("button", "tab" + (ui.tab === id ? " on" : ""), esc(label));
      b.onclick = () => { ui.tab = id; saveUi(); render(); };
      tabs.appendChild(b);
    });
    box.appendChild(tabs);
    const list = ui.tab === "recent" ? recent : ui.tab === "covers" ? withCover : [...games].sort((a, b) => a.title.localeCompare(b.title));
    if (!list.length) { box.appendChild(h("div", "note", ui.tab === "recent" ? "Nothing played yet. Pick a game below or from your library." : "No games here yet.")); return; }
    const grid = h("div", "cards"); list.forEach((g) => grid.appendChild(card(g))); box.appendChild(grid);
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
    if (state === "loading") { page.appendChild(h("div", "note", "Loading games from GitHub…")); return; }
    if (state === "error" && !games.length) {
      page.appendChild(h("div", "note", `Couldn't load games from GitHub. ${esc(error)} <button class="clear" id="retry">Try again</button>`));
      $("#retry").onclick = () => load(true); return;
    }
    if (q || ui.page === "catalogue") renderCatalogue(page, q); else renderHome(page);
    // Status bar
    const consolesUsed = new Set(games.map((g) => g.console)).size;
    $("#status-left").textContent = `${games.length} game${games.length === 1 ? "" : "s"} · ${consolesUsed} console${consolesUsed === 1 ? "" : "s"}`;
    const total = Object.values(times).reduce((a, b) => a + b, 0);
    $("#status-right").textContent = total >= 60000 ? "Total play time " + fmt(total) : "Fruti Emulr";
  }

  // ---------- Load games from GitHub ----------
  function load(force) {
    state = "loading"; render();
    FrutiLibrary.load(force).then((list) => { games = list; state = "ok"; })
      .catch((e) => { state = "error"; error = e.message; })
      .then(render);
  }

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
    if (e.key === "Escape") { $("#search").value = ""; $("#search").blur(); document.body.classList.remove("menu-open"); render(); }
  });
  // Coming back from a game (back button / bfcache): refresh play times
  addEventListener("pageshow", () => { times = store.get("times", {}); history = store.get("history", []); if (state === "ok") render(); });

  load(false);
})();
