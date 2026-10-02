// End-to-end: public quote -> server storage -> admin login -> dashboard -> status/search/filter/CSV -> logout.
// Runs twice: file store, and the Postgres code path (pg-mem). Usage: node tests/full-journey.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const CHROME = process.env.CHROME_PATH || undefined; // default: Playwright's own Chromium
const PASSWORD = 'correct horse battery staple';
const EMAIL = 'boss@aussiegrowth.test';
let passed = 0;
const ok = (msg) => { passed += 1; console.log('  ✓', msg); };

async function suite(label, usePg) {
  console.log(`\n=== ${label} ===`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-'));
  process.env.QUOTES_FILE = path.join(tmp, 'quotes.json');
  process.env.ADMIN_EMAIL = EMAIL;
  process.env.SESSION_SECRET = 'x'.repeat(16) + 'y'.repeat(24);
  const auth = require('../api/_lib/auth');
  process.env.ADMIN_PASSWORD_HASH = auth.hashPassword(PASSWORD);
  const store = require('../api/_lib/store');
  store._reset();
  if (usePg) { const { newDb } = require('pg-mem'); const { Pool } = newDb().adapters.createPg(); store._useTestPool(new Pool()); }
  delete require.cache[require.resolve('../scripts/dev-server.js')];
  const server = require('../scripts/dev-server.js');
  await new Promise((r) => server.listen(0, r));
  const base = `http://localhost:${server.address().port}`;
  const j = (p, o = {}) => fetch(base + p, { redirect: 'manual', ...o, headers: { 'Content-Type': 'application/json', ...(o.headers || {}) } });
  const good = { service: 'Paid Ads', businessType: 'Tradie', budget: '$2–5K', timeline: 'This month', name: 'John Smith', business: 'Smith Electrical', email: 'john@smithelectrical.com.au', phone: '0412 345 678', message: 'Need leads for sparkies.' };

  // ---------- unauthenticated access is blocked server-side ----------
  assert.equal((await j('/api/admin/quotes')).status, 401);
  assert.equal((await j('/api/admin/export')).status, 401);
  assert.equal((await j('/api/admin/quotes/3f2b8c1e-1111-4222-8333-444455556666')).status, 401);
  assert.equal((await j('/api/admin/quotes/3f2b8c1e-1111-4222-8333-444455556666', { method: 'PATCH', body: '{"status":"CLOSED"}' })).status, 401);
  const dash = await j('/admin/dashboard'); assert.equal(dash.status, 302); assert.equal(dash.headers.get('location'), '/admin/');
  assert.ok(!(await (await j('/admin/')).text()).includes('Total quotations'), 'login page has no dashboard');
  assert.equal((await j('/api/admin/quotes', { headers: { Cookie: 'ag_admin=forged.token' } })).status, 401);
  ok('admin API, export and dashboard reject unauthenticated + forged-cookie requests (401/302)');

  // ---------- public submission validation / abuse protection ----------
  assert.equal((await j('/api/quote', { method: 'POST', body: JSON.stringify({ ...good, email: 'nope' }) })).status, 400);
  assert.equal((await j('/api/quote', { method: 'POST', body: JSON.stringify({ ...good, service: 'SEO' }) })).status, 400);
  assert.equal((await j('/api/quote', { method: 'POST', headers: { Origin: 'https://evil.example' }, body: JSON.stringify(good) })).status, 403);
  assert.equal((await j('/api/quote', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(good) })).status, 415);
  assert.equal((await j('/api/quote', { method: 'GET' })).status, 405);
  const bot = await j('/api/quote', { method: 'POST', body: JSON.stringify({ ...good, company_site: 'spam.biz' }) });
  assert.equal(bot.status, 200);
  assert.equal((await store.listAll()).length, 0, 'validation failures + honeypot stored nothing');
  ok('server-side validation, allow-lists, CSRF/origin check, content-type check, honeypot');

  // hostile payloads are stored inertly (parameterised SQL) and shown as text
  const evil = { ...good, name: `Robert'); DROP TABLE quotes;--`, business: '<img src=x onerror="window.__xss=1">', message: '=HYPERLINK("http://evil","x")' };
  assert.equal((await j('/api/quote', { method: 'POST', body: JSON.stringify(evil) })).status, 201);
  const rows = await store.listAll(); assert.equal(rows.length, 1); assert.equal(rows[0].name, evil.name);
  ok('SQL-injection / XSS / CSV-formula payload stored as inert text');

  // ---------- browser: full quote journey ----------
  const browser = await chromium.launch({ executablePath: CHROME });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/403|401|fonts\.g/.test(m.text())) errors.push(m.text()); });
  await page.goto(base + '/', { waitUntil: 'load' });
  assert.ok(await page.evaluate(() => !!window.gsap && !!window.ScrollTrigger), 'gsap + ScrollTrigger present');
  assert.ok(await page.evaluate(() => document.documentElement.classList.contains('cinematic')), 'cinematic mode on');
  ok('homepage: GSAP deterministic, cinematic mode on');

  await page.locator('#quote').scrollIntoViewIfNeeded();
  const pick = async (label) => { await page.locator('.q-step:not([hidden]) .q-opt', { hasText: label }).first().click(); await page.waitForTimeout(450); };
  await pick('AI & Automations'); await pick('Home service'); await pick('$5–10K+'); await pick('ASAP');
  await page.fill('#q-name', 'Jane Citizen'); await page.fill('#q-business', 'Citizen Plumbing');
  await page.fill('#q-email', 'jane@citizenplumbing.com.au'); await page.fill('#q-phone', '02 6100 0000');
  await page.fill('#q-message', 'Follow-ups are killing us.');
  await page.click('[data-next]');
  await page.waitForSelector('.q-done', { timeout: 8000 });
  assert.match(await page.textContent('.q-done'), /Jane/);
  ok('quote form: 5 steps completed, confirmation shown');

  const stored = (await store.listAll()).find((q) => q.email === 'jane@citizenplumbing.com.au');
  assert.ok(stored, 'stored server-side');
  assert.deepEqual([stored.name, stored.business, stored.phone, stored.business_type, stored.service_requested, stored.budget, stored.timeline, stored.message, stored.status],
    ['Jane Citizen', 'Citizen Plumbing', '02 6100 0000', 'Home service', 'AI & Automations', '$5–10K+', 'ASAP', 'Follow-ups are killing us.', 'NEW']);
  assert.ok(stored.id && stored.created_at);
  ok('submission persisted server-side with every field correct (business type ≠ business name bug fixed)');

  // ---------- admin ----------
  await page.goto(base + '/admin/dashboard'); await page.waitForURL(/\/admin\/$/);
  ok('/admin/dashboard redirects to login when signed out');
  await page.fill('#email', EMAIL); await page.fill('#password', 'wrong password here');
  await page.click('#go'); await page.waitForSelector('#err:not(:empty)');
  assert.match(await page.textContent('#err'), /didn.t work/);
  await page.fill('#email', 'someone@else.com'); await page.fill('#password', PASSWORD); await page.click('#go');
  await page.waitForSelector('#err:not(:empty)');
  ok('wrong password and wrong email give the same generic error');
  await page.fill('#email', EMAIL); await page.fill('#password', PASSWORD); await page.click('#go');
  await page.waitForURL(/\/admin\/dashboard/); await page.waitForSelector('table');
  const cookie = (await ctx.cookies()).find((c) => c.name === 'ag_admin');
  assert.ok(cookie.httpOnly && cookie.sameSite === 'Strict', 'HttpOnly + SameSite=Strict cookie');
  assert.match((await ctx.request.get(base + '/admin/dashboard')).headers()['content-security-policy'], /script-src 'nonce-[^']+'/);
  ok('login works; session cookie is HttpOnly + SameSite=Strict; dashboard served with a nonce CSP');

  const stat = async (name) => Number(await page.locator('.stat', { hasText: name }).locator('b').textContent());
  assert.equal(await stat('Total'), 2); assert.equal(await stat('New'), 2);
  assert.ok(await page.locator('tr.is-new').count() === 2, 'NEW rows highlighted');
  assert.equal(await page.evaluate(() => window.__xss), undefined, 'no XSS executed');
  ok('dashboard stats come from the real store; NEW rows highlighted; hostile row rendered as text');

  await page.locator('tr', { hasText: 'Jane Citizen' }).click();
  await page.waitForSelector('#drawer.on');
  const detail = await page.locator('#d-dl').innerText();
  for (const v of ['Jane Citizen', 'Citizen Plumbing', 'jane@citizenplumbing.com.au', '02 6100 0000', 'Home service', 'AI & Automations', '$5–10K+', 'ASAP', 'Follow-ups are killing us.']) assert.ok(detail.includes(v), 'detail shows ' + v);
  assert.equal(await page.getAttribute('#d-email', 'href'), 'mailto:jane@citizenplumbing.com.au');
  assert.equal(await page.getAttribute('#d-call', 'href'), 'tel:0261000000');
  ok('detail view shows every field; email/call links correct');

  await page.click('#d-status button:has-text("Mark contacted")');
  await page.waitForFunction(() => document.getElementById('d-msg').textContent === 'Status updated.');
  await page.fill('#d-notes', 'Rang Tuesday, keen.'); await page.click('#d-save');
  await page.waitForFunction(() => document.getElementById('d-msg').textContent === 'Notes saved.');
  await page.reload(); await page.waitForSelector('table');
  assert.equal(await stat('Contacted'), 1); assert.equal(await stat('New'), 1);
  await page.locator('tr', { hasText: 'Jane Citizen' }).click(); await page.waitForSelector('#drawer.on');
  assert.equal(await page.inputValue('#d-notes'), 'Rang Tuesday, keen.');
  assert.match(await page.textContent('#d-badge'), /CONTACTED/);
  ok('status + internal notes persisted across reload');
  await page.click('#d-close');

  await page.fill('#f-search', 'citizen plumb'); await page.waitForTimeout(600);
  assert.equal(await page.locator('tbody tr').count(), 1);
  await page.fill('#f-search', 'zzzz-nothing'); await page.waitForTimeout(600);
  assert.match(await page.textContent('#list'), /No quotations match/i);
  await page.fill('#f-search', ''); await page.waitForTimeout(600);
  await page.selectOption('#f-service', 'AI & Automations'); await page.waitForTimeout(400);
  assert.equal(await page.locator('tbody tr').count(), 1);
  await page.selectOption('#f-service', ''); await page.selectOption('#f-status', 'NEW'); await page.waitForTimeout(400);
  assert.equal(await page.locator('tbody tr').count(), 1);
  await page.selectOption('#f-status', ''); await page.selectOption('#f-type', 'Home service'); await page.waitForTimeout(400);
  assert.equal(await page.locator('tbody tr').count(), 1);
  await page.click('#clear'); await page.waitForTimeout(400);
  ok('search + service / status / business-type filters');

  await page.locator('th button', { hasText: 'Name' }).click(); await page.waitForTimeout(400);
  assert.match(await page.locator('tbody tr td.nm').first().textContent(), /^Robert/); // first click = descending
  await page.locator('th button', { hasText: 'Name' }).click(); await page.waitForTimeout(400);
  assert.equal(await page.locator('tbody tr td.nm').first().textContent(), 'Jane Citizen'); // second click = ascending
  ok('column sorting');

  // archive (with confirm) hides from default list
  await page.locator('tr', { hasText: 'Robert' }).click(); await page.waitForSelector('#drawer.on');
  page.once('dialog', (d) => d.accept()); await page.click('#d-archive');
  await page.waitForFunction(() => document.getElementById('d-msg').textContent === 'Archived.');
  await page.click('#d-close'); await page.waitForTimeout(300);
  assert.equal(await page.locator('tbody tr').count(), 1);
  ok('archive (confirmed) removes from default list; nothing is permanently deletable');

  const csvRes = await ctx.request.get(base + '/api/admin/export?status=ALL');
  assert.equal(csvRes.status(), 200); assert.match(csvRes.headers()['content-type'], /text\/csv/);
  const csv = await csvRes.text();
  assert.ok(csv.includes('jane@citizenplumbing.com.au') && csv.includes('Citizen Plumbing'));
  assert.ok(!csv.includes('Rang Tuesday'), 'internal notes not exported');
  assert.ok(csv.includes(`"'=HYPERLINK`), 'formula injection neutralised');
  ok('CSV export contains the quotation; notes excluded; formulas neutralised');

  await page.screenshot({ path: path.join(tmp, 'admin-desktop.png') });
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mp = await mobile.newPage(); await mp.context().addCookies([cookie]);
  await mp.goto(base + '/admin/dashboard'); await mp.waitForSelector('tbody tr');
  assert.ok(await mp.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no horizontal overflow on mobile');
  await mp.screenshot({ path: path.join(tmp, 'admin-mobile.png') });
  await mobile.close();
  ok('admin usable on mobile (card layout, no overflow)');

  const stolen = (await ctx.cookies()).find((c) => c.name === 'ag_admin').value;
  await page.click('#logout'); await page.waitForURL(/\/admin\/$/);
  assert.equal((await j('/api/admin/quotes', { headers: { Cookie: 'ag_admin=' + stolen } })).status, 401, 'cookie copied before logout is revoked server-side');
  assert.equal((await j('/admin/dashboard', { headers: { Cookie: 'ag_admin=' + stolen } })).status, 302);
  assert.equal((await ctx.request.get(base + '/api/admin/quotes')).status(), 401);
  await page.goto(base + '/admin/dashboard'); await page.waitForURL(/\/admin\/$/);
  ok('logout ends the session server-side: API 401, dashboard inaccessible, replayed cookie rejected');

  // old cookie can't be replayed after logout? (stateless, but expiry + password-bound) — expired cookie check
  const past = auth.getSession({ headers: { cookie: 'ag_admin=' + encodeURIComponent('e30.bad') } });
  assert.equal(past, null);

  // ---------- V2 guarantees: assets, SEO, headers, 404 ----------
  const SITE = 'https://www.aussiegrowth.agency';
  for (const [p, canon] of [['/', SITE + '/'], ['/web-development/', SITE + '/web-development/'], ['/growth/', SITE + '/growth/']]) {
    const res = await j(p); const html = await res.text();
    assert.ok(html.includes(`<link rel="canonical" href="${canon}">`), p + ' canonical');
    assert.ok(html.includes(`<meta property="og:url" content="${canon}">`), p + ' og:url');
    assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, p + ' has exactly one h1');
    assert.ok(!/noindex/.test(html), p + ' is indexable');
    for (const bad of ['aussiegrowth.com.au', '0000 000 000', 'example.com', 'localhost', '127.0.0.1', 'fonts.googleapis']) assert.ok(!html.includes(bad), `${p} contains "${bad}"`);
    assert.ok(!/content="[^"]*vercel\.app/.test(html) && !/"(url|item|@id)": "[^"]*vercel\.app/.test(html), p + ' has a vercel.app URL in SEO metadata');
    for (const slug of ['silk', 'hartwell', 'mazzia', 'holarize', 'capital-solar', 'harborview']) assert.ok(html.includes(`src="/assets/projects/${slug}.jpg"`), `${p} prerendered root-absolute image for ${slug}`);
    assert.match(res.headers.get('content-security-policy') || '', /script-src 'self' 'sha256-/, p + ' CSP');
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
    for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(m[1]); // structured data is valid JSON
  }
  const titles = await Promise.all(['/', '/web-development/', '/growth/'].map(async (p) => (await (await j(p)).text()).match(/<title>(.*?)<\/title>/)[1]));
  const descs = await Promise.all(['/', '/web-development/', '/growth/'].map(async (p) => (await (await j(p)).text()).match(/name="description" content="(.*?)"/)[1]));
  assert.equal(new Set(titles).size, 3, 'unique titles'); assert.equal(new Set(descs).size, 3, 'unique descriptions');
  ok('canonical / og:url on .agency, one h1, unique titles + descriptions, valid JSON-LD, no placeholders or old domain, CSP + frame headers');

  const sitemap = await (await j('/sitemap.xml')).text(); const robots = await (await j('/robots.txt')).text();
  assert.deepEqual([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]), [SITE + '/', SITE + '/web-development/', SITE + '/growth/']);
  assert.ok(robots.includes('Sitemap: ' + SITE + '/sitemap.xml') && /Disallow: \/admin/.test(robots) && !/Disallow: \/\s*$/m.test(robots));
  const lost = await j('/definitely/not-here'); assert.equal(lost.status, 404); assert.match(await lost.text(), /not a page/i);
  for (const p of ['/ADMIN-SETUP.md', '/api/_lib/store.js', '/.env', '/.git/config', '/scripts/dev-server.js', '/.data/quotes.json']) assert.equal((await j(p)).status, 404, p + ' must not be served');
  assert.notEqual((await j('/package.json')).status, 200);
  for (const f of ['/assets/video/aussie-growth-film.mp4', '/assets/video/aussie-growth-film.webm', '/assets/video/aussie-growth-film-mobile.mp4', '/assets/video/aussie-growth-film-poster.jpg', '/assets/fonts/archivo-var.woff2']) assert.equal((await j(f)).status, 200, f);
  ok('sitemap + robots on .agency (admin/api excluded), real 404 page, internal files not served, film + font assets present');

  for (const p of ['/', '/web-development/', '/growth/']) {
    const pg = await ctx.newPage(); const failed = [];
    pg.on('requestfailed', (r) => failed.push(r.url())); pg.on('response', (r) => { if (r.status() >= 400) failed.push(r.status() + ' ' + r.url()); });
    await pg.goto(base + p, { waitUntil: 'load' });
    const broken = await pg.evaluate(async () => {
      document.querySelectorAll('img').forEach((i) => { i.loading = 'eager'; });
      await Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; })));
      return [...document.images].filter((i) => !i.naturalWidth).map((i) => i.src);
    });
    assert.deepEqual(broken, [], p + ' broken images'); assert.equal(await pg.locator('.project .frame img').count(), 6);
    assert.deepEqual(failed.filter((u) => !/api\/admin\/session/.test(u)), [], p + ' failed requests');
    await pg.close();
  }
  ok('all six portfolio images (and every other image) load on /, /web-development/ and /growth/; no failed requests');

  { // film: lazy, plays when scrolled to, pausable, and poster-only under reduced motion
    const pg = await ctx.newPage(); await pg.goto(base + '/', { waitUntil: 'load' });
    assert.equal(await pg.locator('[data-film-video] source').count(), 0, 'film not requested on load');
    await pg.locator('[data-film]').scrollIntoViewIfNeeded(); await pg.waitForFunction(() => !document.querySelector('[data-film-video]').paused, null, { timeout: 8000 });
    await pg.click('[data-film-toggle]'); assert.equal(await pg.evaluate(() => document.querySelector('[data-film-video]').paused), true);
    await pg.close();
    const rc = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' }); const rp = await rc.newPage();
    await rp.goto(base + '/', { waitUntil: 'load' }); await rp.locator('[data-film]').scrollIntoViewIfNeeded(); await rp.waitForTimeout(800);
    assert.equal(await rp.evaluate(() => document.querySelector('[data-film-video]').paused), true, 'no autoplay under reduced motion');
    assert.ok(await rp.evaluate(() => document.documentElement.classList.contains('no-motion')));
    await rp.click('[data-film-toggle]'); await rp.waitForFunction(() => !document.querySelector('[data-film-video]').paused, null, { timeout: 8000 });
    assert.match(await rp.evaluate(() => document.querySelector('[data-film-video] source').src), /film-mobile\./, 'phones get the smaller encode');
    await rc.close();
  }
  ok('film: not downloaded on load, autoplays in view, pause works; reduced motion = poster + tap to play; mobile encode on phones');

  { // first-visit loader: shows once, lifts by itself, never traps the page
    const lc = await browser.newContext({ viewport: { width: 390, height: 844 } }); const lp = await lc.newPage(); const lerr = [];
    lp.on('console', (m) => m.type() === 'error' && lerr.push(m.text()));
    await lp.goto(base + '/', { waitUntil: 'domcontentloaded' });
    assert.equal(await lp.evaluate(() => document.querySelector('[data-loader]')?.getAttribute('aria-hidden')), 'true', 'loader present + hidden from assistive tech on first visit');
    await lp.waitForFunction(() => !document.querySelector('[data-loader]') && !document.documentElement.classList.contains('is-loading'), null, { timeout: 6000 });
    await lp.goto(base + '/growth/', { waitUntil: 'domcontentloaded' });
    assert.equal(await lp.evaluate(() => document.documentElement.classList.contains('is-loading')), false, 'no loader on later pages in the session');
    assert.deepEqual(lerr, [], 'inline loader script allowed by CSP'); await lc.close();
    const dead = await browser.newContext(); const dp = await dead.newPage(); await dp.route('**/js/**', (r) => r.abort());
    await dp.goto(base + '/', { waitUntil: 'domcontentloaded' });
    await dp.waitForFunction(() => getComputedStyle(document.querySelector('[data-loader]')).visibility === 'hidden', null, { timeout: 9000 });
    await dead.close();
  }
  ok('loader: first visit only, removes itself when ready, CSP-clean, and clears via CSS even if every script fails');

  // ---------- public pages ----------
  for (const p of ['/', '/web-development/', '/growth/']) {
    const pg = await ctx.newPage(); const errs = [];
    pg.on('pageerror', (e) => errs.push(e.message));
    await pg.goto(base + p, { waitUntil: 'load' });
    const text = (await pg.evaluate(() => document.body.innerText + ' ' + document.head.innerHTML)).toLowerCase();
    for (const bad of ['seo', 'google business profile', 'social media', 'graphic design', 'branding', 'full-service', 'content creation']) assert.ok(!text.includes(bad), `${p} mentions "${bad}"`);
    assert.equal(errs.length, 0, `${p} page errors: ${errs}`);
    assert.equal(await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 || ['clip', 'hidden'].includes(getComputedStyle(document.body).overflowX)), true, p + ' user-scrollable horizontal overflow');
    await pg.close();
  }
  ok('/, /web-development/, /growth/: no outdated service references, no JS errors, no horizontal overflow');
  await page.goto(base + '/'); await page.hover('[data-wwd-trigger]'); await page.waitForTimeout(300);
  assert.ok(await page.locator('[data-wwd-panel].is-open').count());
  assert.equal(await page.locator('.wwd-opt').count(), 2);
  // the option cards are links inside .nav-links: the plain nav-link rules must not restyle them
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.wwd-opt')).paddingLeft), '24px', 'dropdown option lost its padding');
  await page.click('[data-wwd-trigger]'); await page.waitForTimeout(200);
  assert.ok(await page.locator('[data-wwd-panel].is-open').count(), 'clicking the hovered trigger closed the panel');
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  assert.equal(await page.locator('[data-wwd-panel].is-open').count(), 0);
  ok('What we do: exactly two padded options, opens on hover, stays open on click, closes on Escape');
  await page.mouse.move(700, 450);
  const steps = new Set();
  for (let i = 0; i < 40; i++) { await page.mouse.wheel(0, 300); await page.waitForTimeout(90); steps.add(await page.evaluate(() => document.querySelector('[data-progress] li.is-active')?.dataset.step)); }
  assert.ok(steps.has('seen') && steps.has('booked') && steps.has('paid'), 'story advanced through: ' + [...steps]);
  ok('scroll story: wheel scrolling moves GET SEEN -> GET BOOKED -> GET PAID (saw: ' + [...steps].join(', ') + ')');
  assert.equal(errors.length, 0, 'console/page errors: ' + errors.join(' | '));

  // ---------- rate limits (last, they lock this IP out) ----------
  let limited = false;
  for (let i = 0; i < 8 && !limited; i++) limited = (await j('/api/quote', { method: 'POST', body: JSON.stringify(good) })).status === 429;
  assert.ok(limited, 'quote rate limit');
  limited = false;
  for (let i = 0; i < 14 && !limited; i++) limited = (await j('/api/admin/login', { method: 'POST', body: JSON.stringify({ email: EMAIL, password: 'nope' + i }) })).status === 429;
  assert.ok(limited, 'login rate limit');
  ok('rate limiting on quote submissions and login attempts');

  await browser.close(); server.close();
  return tmp;
}

// option lists in the browser code must match what the server accepts
const content = await import('data:text/javascript;base64,' + fs.readFileSync(new URL('../js/content.js', import.meta.url)).toString('base64'));
const v = require('../api/_lib/validate');
const opts = (id) => content.quoteSteps.find((s) => s.id === id).options;
assert.deepEqual(opts('service'), v.SERVICES); assert.deepEqual(opts('businessType'), v.BUSINESS_TYPES);
assert.deepEqual(opts('budget'), v.BUDGETS); assert.deepEqual(opts('timeline'), v.TIMELINES);
console.log('  ✓ quote options in js/content.js match server allow-lists'); passed += 1;

const t1 = await suite('FILE STORE (local dev)', false);
const t2 = await suite('POSTGRES CODE PATH (pg-mem)', true);
console.log(`\nALL ${passed} CHECKS PASSED\nscreenshots: ${t1}, ${t2}`);
process.exit(0);
