// PSP games need SharedArrayBuffer (multi-threading), which browsers only allow on pages sent with
// two "cross-origin isolation" headers. GitHub Pages can't send custom headers, so this service
// worker adds them to the player page (emu.html) only. emu.html installs it when a PSP game starts.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.mode !== "navigate" || !/\/emu\.html$/.test(new URL(req.url).pathname)) return;
  e.respondWith(fetch(req).then((res) => {
    if (!res || res.status === 0 || res.type === "opaqueredirect") return res;
    const headers = new Headers(res.headers);
    headers.set("Cross-Origin-Opener-Policy", "same-origin");
    headers.set("Cross-Origin-Embedder-Policy", "require-corp");
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  }));
});
