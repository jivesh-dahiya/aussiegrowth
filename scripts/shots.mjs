// Dev QA: screenshots the page at given scroll positions.
// Usage: node scripts/shots.mjs <width> <height> <outDir> <y1,y2,...> [--reduced]
import { chromium } from 'playwright';

const [w, h, out, ys, flag] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: +w, height: +h }, reducedMotion: flag === '--reduced' ? 'reduce' : 'no-preference' });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto('http://localhost:5188/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2200);
for (const y of ys.split(',')) {
  const target = y.startsWith('#') ? await page.evaluate((s) => document.querySelector(s).getBoundingClientRect().top + scrollY, y) : +y;
  // step towards the target so scrubbed timelines settle naturally
  await page.evaluate((t) => window.scrollTo(0, t), target);
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${out}/${w}-${y.replace('#', '')}.jpg`, type: 'jpeg', quality: 70 });
}
console.log(JSON.stringify({ height: await page.evaluate(() => document.documentElement.scrollHeight), errors }));
await browser.close();
