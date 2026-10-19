import { build } from "vite";
import react from "@vitejs/plugin-react";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve, relative } from "node:path";

const root = process.cwd();
const output = resolve(root, "../shengguan");
rmSync(output, { recursive: true, force: true });
await build({
  configFile: false,
  root: resolve(root, "github-web"),
  base: "./",
  publicDir: false,
  plugins: [react()],
  build: { outDir: output, emptyOutDir: true, sourcemap: false },
});
cpSync(resolve(root, "public/icons"), resolve(output, "icons"), { recursive: true });
cpSync(resolve(root, "public/art"), resolve(output, "art"), { recursive: true });
cpSync(resolve(root, "public/favicon.svg"), resolve(output, "favicon.svg"));
const manifest = JSON.parse(readFileSync(resolve(root, "public/manifest.webmanifest"), "utf8"));
manifest.id = "./";
manifest.start_url = "./";
manifest.scope = "./";
manifest.icons = manifest.icons.map(icon => ({ ...icon, src: "." + icon.src }));
writeFileSync(resolve(output, "manifest.webmanifest"), JSON.stringify(manifest, null, 2) + "\n");
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(resolve(dir, e.name)) : [resolve(dir, e.name)]);
}
const resources = files(output).sort();
const version = createHash("sha256");
for (const file of resources) version.update(readFileSync(file));
const assets = resources.map(file => "./" + relative(output, file).replaceAll("\\", "/"));
writeFileSync(resolve(output, "sw.js"), `const ROOT = new URL("./", self.location.href);
const PREFIX = "tongyou-pages-" + encodeURIComponent(ROOT.pathname) + "-";
const CACHE = PREFIX + ${JSON.stringify(version.digest("hex").slice(0, 16))};
const ASSETS = ${JSON.stringify(assets)}.map(path => new URL(path, ROOT).href);
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== ROOT.origin || !url.pathname.startsWith(ROOT.pathname)) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match(new URL("index.html", ROOT).href)));
  } else if (ASSETS.includes(url.href)) {
    event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
  }
});
`);

