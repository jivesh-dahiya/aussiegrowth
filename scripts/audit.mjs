// SEO / content / link audit against the running dev server (npm run dev). Usage: node scripts/audit.mjs
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:5188';
const ROUTES = ['/', '/web-development/', '/growth/'];
let fail = 0; const bad = (m) => { fail += 1; console.log('  ✗', m); }; const ok = (m) => console.log('  ✓', m);

// 1. Raw HTML (what a crawler gets before any JS runs)
for (const r of ROUTES) {
  const html = await (await fetch(BASE + r)).text();
  const text = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
  const need = ['Silk Building Group', 'Hartwell Media', 'Mazzia Resorts', 'Holarize', 'Capital Solar Energy', 'Harborview', 'How much does a website cost?', 'Depends on what you actually need', 'Web Development', '+61 493 721 273', 'meharmalik2026@gmail.com'];
  const missing = need.filter((n) => !text.includes(n));
  missing.length ? bad(`${r} raw HTML missing: ${missing}`) : ok(`${r} raw HTML contains projects, FAQ answers, services and contact details`);
  const heads = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => +m[1]);
  const skips = heads.filter((h, i) => i && h > heads[i - 1] + 1);
  (heads.filter((h) => h === 1).length !== 1 || skips.length) ? bad(`${r} heading order ${heads.join('')}`) : ok(`${r} one h1, no skipped levels (${heads.join('')})`);
  const noAlt = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]).filter((t) => !/\balt=/.test(t));
  const noDims = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]).filter((t) => !/\bwidth=/.test(t) || !/\bheight=/.test(t));
  noAlt.length ? bad(`${r} images without alt: ${noAlt.length}`) : ok(`${r} every <img> has an alt attribute`);
  noDims.length ? bad(`${r} images without width/height: ${noDims.map((t) => t.match(/src="([^"]+)"/)?.[1])}`) : ok(`${r} every <img> has width + height`);
  for (const k of ['<html lang="en-AU">', 'name="viewport"', 'rel="canonical"', 'og:title', 'og:description', 'og:image', 'og:url', 'og:type', 'twitter:card', 'rel="icon"', 'apple-touch-icon']) if (!html.includes(k)) bad(`${r} missing ${k}`);
  if ((html.match(/rel="canonical"/g) || []).length !== 1) bad(`${r} canonical count`);
}

// 2. Every internal link + asset reference resolves; every #anchor exists
const seen = new Map();
const get = async (u) => { if (!seen.has(u)) seen.set(u, fetch(BASE + u, { redirect: 'manual' }).then((x) => x.status)); return seen.get(u); };
for (const r of [...ROUTES, '/404.html', '/admin/']) {
  const html = await (await fetch(BASE + r)).text();
  const refs = new Set([...html.matchAll(/\b(?:href|src|poster)="([^"]+)"/g)].map((m) => m[1]).concat([...html.matchAll(/srcset="([^"]+)"/g)].flatMap((m) => m[1].split(',').map((s) => s.trim().split(' ')[0]))));
  for (const ref of refs) {
    if (/^(https?:|mailto:|tel:|data:)/.test(ref)) continue;
    const [path, hash] = ref.split('#');
    const target = path || r;
    const status = await get(target);
    if (status !== 200) bad(`${r} → ${ref} returned ${status}`);
    if (hash) { const t = await (await fetch(BASE + target)).text(); if (!new RegExp(`id="${hash}"`).test(t)) bad(`${r} → ${ref}: no element with id="${hash}"`); }
  }
}
ok(`internal links, anchors and asset references checked (${seen.size} unique URLs)`);
const ext = new Set(); for (const r of ROUTES) for (const m of (await (await fetch(BASE + r)).text()).matchAll(/href="(https?:\/\/[^"]+)"/g)) if (!m[1].includes('aussiegrowth.agency')) ext.add(m[1]);
for (const u of ext) { let s; try { s = (await fetch(u, { redirect: 'follow', signal: AbortSignal.timeout(15000) })).status; } catch (e) { s = e.name; } (s === 200 ? ok : bad)(`external link ${u} → ${s}`); }

// 3. Rendered page: nothing left invisible after animations, no console errors, CSP not blocking anything
const browser = await chromium.launch();
for (const [w, h] of [[1440, 900], [390, 780]]) for (const r of ROUTES) {
  const page = await browser.newPage({ viewport: { width: w, height: h } }); const errs = [];
  page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await page.goto(BASE + r, { waitUntil: 'load' }); await page.waitForTimeout(1200);
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= total; y += h * 0.6) { await page.mouse.wheel(0, h * 0.6); await page.waitForTimeout(160); }
  await page.waitForTimeout(1600);
  const stuck = await page.evaluate(() => [...document.querySelectorAll('main h1, main h2, main h3, main p, main li, main a, main figure, .cap, .split-col, footer a')].filter((el) => {
    if (el.closest('[hidden], [data-story], .reel, .faq-a, .wwd-panel, [aria-hidden="true"]') || !el.getClientRects().length) return false;
    let o = 1; for (let n = el; n && n !== document.body; n = n.parentElement) o *= +getComputedStyle(n).opacity; return o < 0.9;
  }).map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}`).slice(0, 6));
  (stuck.length || errs.length) ? bad(`${w}px ${r} stuck-invisible: ${stuck} errors: ${errs}`) : ok(`${w}px ${r}: all content visible after scroll, no console/CSP errors`);
  await page.close();
}
// no-JS: content still readable, FAQ answers open
const nojs = await browser.newContext({ javaScriptEnabled: false }); const np = await nojs.newPage(); await np.goto(BASE + '/');
const njs = await np.evaluate(() => ({ faq: [...document.querySelectorAll('.faq-a p')].every((p) => p.getBoundingClientRect().height > 10 && getComputedStyle(p).opacity === '1'), projects: document.querySelectorAll('.project').length, h1: getComputedStyle(document.querySelector('h1')).opacity }));
(njs.faq && njs.projects === 6 && njs.h1 === '1') ? ok('JavaScript disabled: 6 projects present, FAQ answers open and readable') : bad('no-JS: ' + JSON.stringify(njs));
await browser.close();
console.log(fail ? `\n${fail} FAILURE(S)` : '\nAudit clean'); process.exit(fail ? 1 : 0);
