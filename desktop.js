// Fruti - ROM game launcher: consoles in the sidebar, game posters in the middle, click to play.
(() => {
  "use strict";
  const VERSION = "13";
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
  let console_ = store.get("console", null);   // selected console id

  let games = [], state = "loading", error = "";
  const fmt = (ms) => { const m = Math.floor((ms || 0) / 60000); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`; };
  const initials = (t) => t.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).filter(Boolean).map((w) => /^\d+$/.test(w) ? w : w[0]).join("").slice(0, 3).toUpperCase();
  const byConsole = (id) => games.filter((g) => g.console === id);
  const consoleOf = (id) => CONSOLES.find((c) => c.id === id);

  // ---------- Sidebar: consoles ----------
  function consoleIcon(c, cls) {
    return c.icon
      ? `<span class="${cls} pic"><img src="${esc(abs(c.icon))}" alt=""></span>`
      : `<span class="${cls} tag">${esc(c.tag)}</span>`;
  }
  function renderConsoles() {
    const nav = $("#consoles"); nav.innerHTML = `<div class="nav-title">Consoles</div>`;
    // Consoles with games first, then the rest
    const list = [...CONSOLES].sort((a, b) => (byConsole(b.id).length > 0) - (byConsole(a.id).length > 0));
    list.forEach((c) => {
      const n = byConsole(c.id).length;
      const b = h("button", "con" + (c.id === console_ && !query() ? " on" : "") + (n ? "" : " empty"),
        `${consoleIcon(c, "con-icon")}<span class="con-txt"><b>${esc(c.name)}</b><small>${state === "loading" ? "…" : n + (n === 1 ? " game" : " games")}</small></span>`);
      b.onclick = () => { console_ = c.id; store.set("console", c.id); $("#search").value = ""; render(); $("#shelf").scrollTop = 0; };
      nav.appendChild(b);
    });
  }

  // ---------- Middle: game posters ----------
  const query = () => $("#search").value.trim().toLowerCase();
  function poster(g) {
    const c = consoleOf(g.console) || { tag: g.console };
    const blocked = g.problem || g.unsupported;
    const p = h("button", "poster" + (blocked ? " blocked" : ""));
    p.title = blocked ? g.problem || "Can't be played" : "Play " + g.title;
    const art = h("div", "art");
    if (c.box) art.style.aspectRatio = String(c.box);   // shaped like that console's game box
    if (g.image) art.style.backgroundImage = `url("${g.image}")`;
    else {
      art.classList.add("plain");
      if (g.color) art.style.background = `linear-gradient(160deg, ${g.color[0]}, ${g.color[1]})`;
      art.appendChild(h("div", "art-mark", esc(initials(g.title))));
    }
    if (!g.image) art.appendChild(h("span", "badge", esc(c.tag)));   // box art already shows the console
    art.appendChild(h("span", "play", blocked
      ? `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.5"/></svg>`
      : `<svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/></svg>`));
    if (g.problem) art.appendChild(h("span", "warn", /^Only \d/.test(g.problem) ? "Missing parts" : /incomplete/.test(g.problem) ? "Incomplete file" : "Can't play"));
    p.appendChild(art);
    p.appendChild(h("div", "p-title", esc(g.title)));
    if (times[g.id] >= 60000) p.appendChild(h("div", "p-sub", `Played ${fmt(times[g.id])}`));
    p.onclick = () => play(g);
    // Check split games for missing parts in the background
    if (!blocked && g.files.length > 1 && g.partsChecked === undefined) {
      g.partsChecked = null;
      FrutiLibrary.checkParts(g).then((m) => { g.partsChecked = m; if (m) { g.problem = m; renderShelf(); } });
    }
    return p;
  }

  function renderShelf() {
    const box = $("#shelf"); box.innerHTML = "";
    const q = query();
    const c = consoleOf(console_);
    if (state === "loading") { box.appendChild(h("div", "note", "Loading games from GitHub…")); return; }
    if (state === "error" && !games.length) {
      box.appendChild(h("div", "note", `Couldn't load games from GitHub. ${esc(error)} <button class="link" id="retry">Try again</button>`));
      $("#retry").onclick = () => load(true); return;
    }
    const list = q ? games.filter((g) => g.title.toLowerCase().includes(q)) : byConsole(console_);
    const head = h("div", "shelf-head");
    if (q) head.innerHTML = `<h1>Search</h1><span>${list.length} result${list.length === 1 ? "" : "s"} for “${esc(q)}”</span>`;
    else if (c) head.innerHTML = `${consoleIcon(c, "head-icon")}<h1>${esc(c.name)}</h1><span>${list.length} game${list.length === 1 ? "" : "s"}</span>`;
    box.appendChild(head);
    if (!list.length) {
      box.appendChild(h("div", "note", q ? "No games found."
        : `No ${esc(c ? c.name : "")} games yet. Upload one on GitHub to <b>rom/${esc(c ? c.folder : "")}/&lt;game name&gt;/</b>, then press <b>↻</b> at the top.`));
      return;
    }
    const grid = h("div", "posters");
    list.forEach((g) => grid.appendChild(poster(g)));
    box.appendChild(grid);
  }

  function render() { renderConsoles(); renderShelf(); }

  // ---------- Play: switch this tab to the player ----------
  let toastTimer;
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 6000);
  }
  function play(g) {
    if (g.problem || g.unsupported) { toast(g.problem || "This game can't be played."); return; }
    const history = [{ id: g.id, at: Date.now() }, ...store.get("history", []).filter((x) => x.id !== g.id)].slice(0, 40);
    store.set("history", history);
    location.href = abs(`emu.html?v=${VERSION}&game=${encodeURIComponent(g.id)}`);
  }

  // ---------- Load games from GitHub ----------
  function load(force) {
    state = "loading"; render();
    FrutiLibrary.load(force).then((list) => {
      games = list; state = "ok";
      // Pick a console: the last one used, else the first with games
      if (!consoleOf(console_) || (!byConsole(console_).length && games.length)) {
        const first = CONSOLES.find((c) => byConsole(c.id).length);
        console_ = (first || CONSOLES[0] || {}).id;
      }
    }).catch((e) => { state = "error"; error = e.message; })
      .then(render);
  }

  $("#search").oninput = render;
  $("#reload").onclick = () => load(true);
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement !== $("#search")) { e.preventDefault(); $("#search").focus(); }
    if (e.key === "Escape") { $("#search").value = ""; $("#search").blur(); render(); }
  });
  // Coming back from a game (back button / bfcache): refresh play times
  addEventListener("pageshow", () => { times = store.get("times", {}); if (state === "ok") renderShelf(); });

  const clock = () => { $("#clock").textContent = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); };
  clock(); setInterval(clock, 10000);
  load(false);
})();
