/**
 * Local test server: runs the real Worker (src/index.js) with a temporary D1 database and R2 bucket,
 * and serves the website files from public/ like Cloudflare does. Used by the browser test.
 * Start: node tests/server.mjs [port]
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { getPlatformProxy } from 'wrangler';
import app from '../src/index.js';

const port = Number(process.argv[2] || 8899);
const root = new URL('../public/', import.meta.url).pathname;
const { env: raw } = await getPlatformProxy({ configPath: new URL('../wrangler.jsonc', import.meta.url).pathname, persist: false });
for (const n of fs.readdirSync(new URL('../migrations/', import.meta.url)).filter((f) => f.endsWith('.sql')).sort())
  for (const st of fs.readFileSync(new URL('../migrations/' + n, import.meta.url), 'utf8').split('\n').filter((l) => !l.trim().startsWith('--')).join('\n').split(';').map((s) => s.trim()).filter(Boolean))
    await raw.DB.prepare(st).run();

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.csv': 'text/csv', '.txt': 'text/plain' };
const ASSETS = {
  async fetch(req) {
    let p = decodeURIComponent(new URL(req.url).pathname);
    const candidates = [p, p + '.html', path.join(p, 'index.html')];
    for (const c of candidates) {
      const f = path.join(root, c);
      if (f.startsWith(root) && fs.existsSync(f) && fs.statSync(f).isFile())
        return new Response(fs.readFileSync(f), { headers: { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' } });
    }
    return new Response('Not found', { status: 404 });
  },
};
const env = { ...raw, ASSETS, BETTER_AUTH_SECRET: 'local-test-secret-'.repeat(3), BASE_URL: 'http://localhost:' + port, PRO_ENABLED: process.env.PRO_ENABLED || 'true', DEFAULT_PLAN: process.env.DEFAULT_PLAN || raw.DEFAULT_PLAN || 'pro' };

http.createServer(async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const request = new Request('http://localhost:' + port + req.url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : body });
  try {
    const r = await app.fetch(request, env);
    const headers = {}; r.headers.forEach((v, k) => { if (k !== 'set-cookie') headers[k] = v; });
    const cookies = r.headers.getSetCookie ? r.headers.getSetCookie() : [];
    if (cookies.length) headers['set-cookie'] = cookies;
    res.writeHead(r.status, headers); res.end(Buffer.from(await r.arrayBuffer()));
  } catch (e) { console.error(e); res.writeHead(500); res.end('error'); }
}).listen(port, () => console.log('READY http://localhost:' + port));
