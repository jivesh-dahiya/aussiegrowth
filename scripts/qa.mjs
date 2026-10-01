// Responsive QA sweep: every public route × every target viewport.
// Fails on horizontal overflow (measured, not masked by overflow clipping), broken images, or console/page errors.
// Usage: node scripts/qa.mjs [outDir]   (dev server must be running: npm run dev)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:5188';
const out = process.argv[2];
const WIDTHS = [320, 375, 390, 430, 768, 820, 1024, 1280, 1440, 1920];
const ROUTES = ['/', '/web-development/', '/growth/', '/not-a-real-page', '/admin/'];
if (out) mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
let failures = 0;
for (const w of WIDTHS) {
  const h = w < 700 ? 780 : w < 1100 ? 1100 : 900;
  // reducedMotion: the static layout puts every section in normal flow, which is the strictest overflow test.
  for (const reduced of [false, true]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
    for (const r of ROUTES) {
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => { if (m.type() === 'error' && !(r === '/not-a-real-page' && /404/.test(m.text())) && !/api\/admin\/session|401|503/.test(m.text())) errors.push(m.text()); });
      await page.goto(BASE + r, { waitUntil: 'load' });
      await page.waitForTimeout(500);
      const res = await page.evaluate(async () => {
        document.querySelectorAll('img').forEach((i) => { i.loading = 'eager'; });
        await Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((ok) => { i.onload = i.onerror = ok; setTimeout(ok, 4000); })));
        const vw = document.documentElement.clientWidth;
        // anything whose box pokes past the viewport and isn't inside a clipping ancestor
        const clipped = (el) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p); if (/hidden|clip|auto|scroll/.test(o.overflowX)) return true; } return false; };
        const wide = [...document.querySelectorAll('body *')].filter((el) => { const b = el.getBoundingClientRect(); return b.width > 0 && b.right > vw + 1 && getComputedStyle(el).position !== 'fixed' && !clipped(el) && !el.closest('.wwd-panel, .cursor-tag'); })
          .slice(0, 4).map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} [${Math.round(el.getBoundingClientRect().left)}→${Math.round(el.getBoundingClientRect().right)}]`);
        return { wide, broken: [...document.images].filter((i) => !i.naturalWidth).map((i) => i.currentSrc || i.src), h1: document.querySelectorAll('h1').length };
      });
      const bad = res.wide.length || res.broken.length || errors.length || res.h1 !== 1;
      if (bad) { failures += 1; console.log(`✗ ${w}${reduced ? ' reduced' : ''} ${r}`, JSON.stringify({ ...res, errors })); }
      // full-page shots come from the static (reduced-motion) layout: pinned scroll sections can't be captured in one frame
      if (out && reduced && [320, 390, 820, 1024, 1440].includes(w)) await page.screenshot({ path: `${out}/${w}${r.replace(/\W+/g, '_')}.jpg`, type: 'jpeg', quality: 55, fullPage: true });
      await page.close();
    }
    await ctx.close();
  }
}
await browser.close();
console.log(failures ? `\n${failures} FAILURE(S)` : `\nQA sweep clean: ${WIDTHS.length} widths × ${ROUTES.length} routes × motion on/off`);
process.exit(failures ? 1 : 0);
