// Captures real project media (poster + short scroll reel) for the portfolio.
// Usage: node scripts/capture-projects.mjs [slug]
// Requires ffmpeg on PATH. Output: assets/projects/<slug>.{jpg,mp4,webm}
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const OUT = resolve('assets/projects');
const TMP = resolve('scripts/.tmp');
const VIEW = { width: 1440, height: 900 };

const PROJECTS = [
  { slug: 'silk', url: 'https://silk-building-group-vercel-v3.vercel.app/' },
  { slug: 'hartwell', url: 'https://hulululu-five.vercel.app/' },
  { slug: 'mazzia', url: 'https://mazzia.netlify.app/' },
  { slug: 'holarize', url: 'https://holarize.netlify.app/' },
  { slug: 'harborview', url: 'https://harborview-v1.netlify.app/' },
  { slug: 'capital-solar', url: 'https://www.capitalsolarenergy.com.au/' },
];

const only = process.argv[2];
mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

const browser = await chromium.launch();

for (const p of PROJECTS.filter((x) => !only || x.slug === only)) {
  const dir = join(TMP, p.slug);
  rmSync(dir, { recursive: true, force: true });
  const ctx = await browser.newContext({
    viewport: VIEW,
    deviceScaleFactor: 1,
    recordVideo: { dir, size: VIEW },
  });
  const t0 = Date.now();
  const page = await ctx.newPage();
  try {
    await page.goto(p.url, { waitUntil: 'networkidle', timeout: 60000 });
  } catch {
    console.warn(`[${p.slug}] networkidle timeout, continuing`);
  }
  await page.waitForTimeout(3500); // let intro animations settle
  await page.screenshot({ path: join(OUT, `${p.slug}.png`) });

  const start = (Date.now() - t0) / 1000;
  // Smooth wheel scroll so the site's own scroll animations play.
  const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  const distance = Math.min(total, 4200);
  const steps = 180;
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, distance / steps);
    await page.waitForTimeout(50);
  }
  await page.waitForTimeout(800);
  const dur = (Date.now() - t0) / 1000 - start;
  await ctx.close();

  const raw = join(dir, readdirSync(dir).find((f) => f.endsWith('.webm')));
  const trim = ['-ss', start.toFixed(2), '-t', dur.toFixed(2), '-i', raw, '-an', '-vf', 'scale=1200:-2,fps=30'];
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...trim, '-c:v', 'libx264', '-preset', 'slow', '-crf', '30', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', join(OUT, `${p.slug}.mp4`)]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...trim, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '42', '-row-mt', '1', join(OUT, `${p.slug}.webm`)]);
  // Posters: large jpg + small jpg for mobile.
  const png = join(OUT, `${p.slug}.png`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', png, '-vf', 'scale=1200:-2', '-q:v', '5', join(OUT, `${p.slug}.jpg`)]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', png, '-vf', 'scale=640:-2', '-q:v', '6', join(OUT, `${p.slug}-sm.jpg`)]);
  rmSync(png);
  const kb = (f) => Math.round(statSync(join(OUT, f)).size / 1024);
  console.log(`[${p.slug}] mp4 ${kb(`${p.slug}.mp4`)}KB  webm ${kb(`${p.slug}.webm`)}KB  poster ${kb(`${p.slug}.jpg`)}KB`);
}

await browser.close();
rmSync(TMP, { recursive: true, force: true });
