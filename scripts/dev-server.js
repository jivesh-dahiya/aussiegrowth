'use strict';
// Local dev/test server: serves the static site and runs the same /api handlers Vercel runs.
// Not used in production (lives in scripts/ so Vercel never mistakes it for an app entry point). Usage: node scripts/dev-server.js  (PORT=5188 by default)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const ROOT = path.join(__dirname, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.webm': 'video/webm', '.mp4': 'video/mp4', '.xml': 'application/xml', '.txt': 'text/plain', '.ico': 'image/x-icon' };
const VERCEL = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
const HEADER_RULES = VERCEL.headers.map((h) => [new RegExp('^' + h.source + '$'), h.headers]);
const REDIRECTS = (VERCEL.redirects || []).map((r) => [new RegExp('^' + r.source + '$'), r.destination]);
const notFound = (res) => {
  res.statusCode = 404; res.setHeader('Content-Type', 'text/html; charset=utf-8');
  try { res.end(fs.readFileSync(path.join(ROOT, '404.html'))); } catch { res.end('Not found'); }
};
const BLOCKED = /^\/(api|\.data|node_modules|tests|scripts|dev-server\.js|package(-lock)?\.json|vercel\.json|\.env|\.vercelignore|ADMIN-SETUP\.md|\.git)(\/|$)/i;

function resolveApi(segs) {
  let dir = path.join(ROOT, 'api'); const params = {};
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i]; if (!s || s.startsWith('_') || s.includes('..')) return null;
    const last = i === segs.length - 1;
    if (last) {
      const exact = path.join(dir, s + '.js'); if (fs.existsSync(exact)) return { file: exact, params };
      const dyn = fs.existsSync(dir) && fs.readdirSync(dir).find((f) => /^\[.+\]\.js$/.test(f));
      if (dyn) { params[dyn.slice(1, -4)] = s; return { file: path.join(dir, dyn), params }; }
      return null;
    }
    const sub = path.join(dir, s);
    if (fs.existsSync(sub) && fs.statSync(sub).isDirectory()) dir = sub;
    else { const dd = fs.existsSync(dir) && fs.readdirSync(dir).find((f) => /^\[.+\]$/.test(f)); if (!dd) return null; params[dd.slice(1, -1)] = s; dir = path.join(dir, dd); }
  }
  return null;
}

async function handleApi(req, res, url, segs) {
  const r = resolveApi(segs);
  if (!r) { res.statusCode = 404; return res.end('{"error":"Not found"}'); }
  req.query = { ...Object.fromEntries(url.searchParams), ...r.params };
  try { await require(r.file)(req, res); } catch (e) { console.error('handler error', e.message); if (!res.headersSent) { res.statusCode = 500; res.end('{"error":"Server error"}'); } }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let p; try { p = decodeURIComponent(url.pathname); } catch { res.statusCode = 400; return res.end(); }
  for (const [re, headers] of HEADER_RULES) if (re.test(p)) headers.forEach((h) => { if (h.key !== 'Strict-Transport-Security') res.setHeader(h.key, h.value.replace('; upgrade-insecure-requests', '')); }); // plain-http localhost: skip the https-only bits
  for (const [re, dest] of REDIRECTS) if (re.test(p)) { res.statusCode = 307; res.setHeader('Location', dest); return res.end(); }
  if (p === '/admin/dashboard') return handleApi(req, res, url, ['admin', 'dashboard']);
  if (p.startsWith('/api/')) return handleApi(req, res, url, p.slice(5).split('/').filter(Boolean));
  if (BLOCKED.test(p) || p.includes('..')) return notFound(res);
  let f = path.join(ROOT, p);
  if (!f.startsWith(ROOT)) { res.statusCode = 403; return res.end(); }
  try {
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) {
      if (!p.endsWith('/')) { res.statusCode = 301; res.setHeader('Location', p + '/' + url.search); return res.end(); }
      f = path.join(f, 'index.html');
    }
    const data = fs.readFileSync(f);
    res.setHeader('Content-Type', MIME[path.extname(f).toLowerCase()] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.end(data);
  } catch { notFound(res); }
});

if (require.main === module) {
  const port = process.env.PORT || 5188;
  server.listen(port, () => console.log('Aussie Growth dev server on http://localhost:' + port));
}
module.exports = server;
