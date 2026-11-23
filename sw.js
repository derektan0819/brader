/* Brader 财务目标：没网也能打开。
   有网时永远先拿最新版本，所以上传新版后用户下次打开就是新的；没网或网络太慢才用存好的版本。
   用户的资料在浏览器里，这个文件不会读取或上传任何资料。 */
const CACHE = "brader-v1";
const FILES = ["./", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(FILES.map(f => c.add(new Request(f, { cache: "reload" })).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(K => Promise.all(K.filter(k => k.startsWith("brader-") && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(fresh(req, e));
});

async function fresh(req, e) {
  const nav = req.mode === "navigate";
  const cache = await caches.open(CACHE);
  const key = nav ? new URL("./", location.href).href : req;
  const net = (nav ? fetch(req.url, { cache: "no-cache" }) : fetch(req)).then(res => {
    if (res.ok) e.waitUntil(cache.put(key, res.clone()));
    return res;
  });
  const old = await cache.match(key, { ignoreSearch: true });
  if (!old) return net;
  net.catch(() => {});
  // 网站回 404 / 500 这类错误页时，用存好的版本，不要显示错误页
  return Promise.race([
    net.then(res => res.ok ? res : old, () => old),
    new Promise(r => setTimeout(() => r(old), 3500))
  ]);
}
