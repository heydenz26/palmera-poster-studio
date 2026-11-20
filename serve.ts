// Tiny static server for trying Palmera Poster Studio locally (Node 22, stdlib
// only). Serves app/ at http://localhost:8080 — open it in desktop Chrome.
// While developing, the browser must always re-read the latest editor files, so
// every response carries no-store cache headers (the app is static, so these are
// safe and only matter locally).
//   node serve.ts [port]          # default port 8080

import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('app/', import.meta.url));
const port = Number(process.argv[2] ?? 8080);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`serve.ts: invalid port ${process.argv[2] ?? ''} (use a number 1-65535)`);
  process.exit(1);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

// Cache headers: never let the browser keep a stale editor file around. The
// kit's gate forbids network loads, and this server is for the developer only,
// so disabling the cache here cannot affect the offline app itself.
const NO_CACHE = {
  'cache-control': 'no-store, no-cache, must-revalidate, max-age=0',
  'pragma': 'no-cache',
  'expires': '0',
};

const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = join(root, path === '/' ? 'index.html' : path);
  if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8', ...NO_CACHE });
    res.end(`404 — ${path === '/' ? 'index' : basename(file)} not found in app/\n`);
    return;
  }
  const type = TYPES[extname(file)] ?? 'application/octet-stream';
  res.writeHead(200, { 'content-type': type, ...NO_CACHE });
  createReadStream(file).pipe(res);
});

server.listen(port, () => {
  console.log(`Palmera Poster Studio at http://localhost:${port} (no-cache, port ${port})`);
});
