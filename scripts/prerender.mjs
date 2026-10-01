// Bakes the data-driven sections (work reel, FAQ, who-we-help, FAQ schema) from
// js/content.js into the static HTML, so the content is crawlable without JS.
// Run after editing js/content.js:  npm run prerender   (idempotent)
import { readFileSync, writeFileSync } from 'node:fs';
import { reelHTML, faqHTML, whoHTML, faqSchema } from '../js/render.js';

const blocks = {
  reel: reelHTML(),
  faq: faqHTML(),
  who: whoHTML(),
  'faq-schema': `<script type="application/ld+json">${JSON.stringify(faqSchema()).replace(/</g, '\\u003c')}</script>`,
};

for (const file of ['index.html', 'web-development/index.html', 'growth/index.html']) {
  const path = new URL('../' + file, import.meta.url);
  let html = readFileSync(path, 'utf8');
  let n = 0;
  for (const [name, content] of Object.entries(blocks)) {
    const re = new RegExp(`(<!--prerender:${name}-->)[\\s\\S]*?(<!--/prerender:${name}-->)`);
    if (re.test(html)) { html = html.replace(re, (_, a, b) => a + content + b); n += 1; }
  }
  writeFileSync(path, html);
  console.log(`${file}: ${n} block(s) prerendered`);
}
