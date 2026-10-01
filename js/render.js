// Renders data-driven sections from content.js. Pure DOM, no framework.
import { projects, testimonials, audiences, problems, faqs } from './content.js';

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pad = (n) => String(n).padStart(2, '0');
// Root-absolute: these pages live at /, /web-development/ and /growth/, so a
// document-relative path only ever worked on the homepage.
const media = (slug) => `/assets/projects/${slug}`;

const photo = (name) => `/assets/images/about/aussie-growth-${name}`;
// The markup builders below are pure strings so scripts/prerender.mjs can bake the
// same HTML into the pages (crawlable without JS). In the browser, fill() only
// renders when the page wasn't prerendered.
const fill = (root, html) => { if (!root.children.length) root.innerHTML = html; };

/* ---------- Who we help (tabs; hover also activates on desktop) ---------- */
export const whoHTML = () => `
    <div class="who-tabs" role="tablist" aria-label="Who we help">
      ${audiences.map((a, i) => `
        <button class="who-tab" role="tab" id="who-tab-${a.id}" aria-controls="who-panel-${a.id}"
          aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">
          <span class="n">${pad(i + 1)}</span><span class="t">${esc(a.title)}</span><span class="go" aria-hidden="true">→</span>
        </button>`).join('')}
    </div>
    <div>
      ${audiences.map((a, i) => `
        <div class="who-panel ${i === 0 ? 'is-in' : ''}" role="tabpanel" id="who-panel-${a.id}" aria-labelledby="who-tab-${a.id}" ${i ? 'hidden' : ''}>
          <div class="who-media"><picture>
            <source type="image/webp" srcset="${photo(a.image)}-800.webp 800w, ${photo(a.image)}-1400.webp 1400w" sizes="(min-width: 900px) 45vw, 100vw">
            <img src="${photo(a.image)}-800.jpg" srcset="${photo(a.image)}-800.jpg 800w, ${photo(a.image)}-1400.jpg 1400w" sizes="(min-width: 900px) 45vw, 100vw" alt="${esc(a.alt)}" loading="lazy" decoding="async" width="1400" height="781">
          </picture></div>
          <p class="who-line">${esc(a.line)}</p>
          <ul class="who-items">${a.items.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        </div>`).join('')}
    </div>`;

export function renderWho(root) {
  if (!root) return;
  fill(root, whoHTML());

  const tabs = [...root.querySelectorAll('.who-tab')];
  const select = (tab, focus = false) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      const panel = root.querySelector(`#${t.getAttribute('aria-controls')}`);
      panel.hidden = !on;
      panel.classList.toggle('is-in', false);
      if (on) requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add('is-in')));
    });
    if (focus) tab.focus();
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    if (matchMedia('(hover: hover)').matches) tab.addEventListener('mouseenter', () => tab.getAttribute('aria-selected') !== 'true' && select(tab));
    tab.addEventListener('keydown', (e) => {
      const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (!d) return;
      e.preventDefault();
      select(tabs[(i + d + tabs.length) % tabs.length], true);
    });
  });
}

/* ---------- Work reel (one unified frame for every project) ---------- */
export const reelHTML = () => projects.map((p, i) => `
    <article class="project" data-project="${i}" aria-labelledby="p-${p.slug}">
      <a class="frame" href="${esc(p.url)}" target="_blank" rel="noopener" data-cursor="View site ↗" aria-label="Visit the ${esc(p.name)} website (opens in a new tab)">
        <picture>
          <source type="image/webp" srcset="${media(p.slug)}-sm.webp 640w, ${media(p.slug)}.webp 1200w" sizes="(min-width: 1000px) 60vw, 100vw">
          <img src="${media(p.slug)}.jpg" srcset="${media(p.slug)}-sm.jpg 640w, ${media(p.slug)}.jpg 1200w"
            sizes="(min-width: 1000px) 60vw, 100vw" alt="${esc(p.name)} website homepage" loading="lazy" decoding="async" width="1200" height="750">
        </picture>
        <video muted loop playsinline preload="none" aria-hidden="true" tabindex="-1" data-video
          data-webm="${media(p.slug)}.webm" data-mp4="${media(p.slug)}.mp4"></video>
      </a>
      <div class="meta">
        <span class="meta-n">${pad(i + 1)}</span>
        <h3 class="meta-name" id="p-${p.slug}">${esc(p.name)}</h3>
        <p class="meta-desc">${esc(p.description)}</p>
        <ul class="meta-tags">${[p.industry, ...p.services, p.year].filter(Boolean).map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        <a class="meta-link" href="${esc(p.url)}" target="_blank" rel="noopener">Visit site ↗<span class="sr"> (${esc(p.name)}, opens in a new tab)</span></a>
      </div>
    </article>`).join('') + `
    <p class="reel-counter" aria-hidden="true"><b data-reel-n>01</b> / ${pad(projects.length)}</p>
    <span class="reel-bar" aria-hidden="true"><i data-reel-bar></i></span>`;

export function renderReel(root) {
  if (root) fill(root, reelHTML());
}

/* ---------- Not sure what you need? ---------- */
export function renderSays(list, out) {
  if (!list || !out) return;
  list.innerHTML = problems.map((p, i) => `
    <li><button class="say" type="button" aria-pressed="false" data-say="${i}">“${esc(p.say)}”</button></li>`).join('');
  const empty = '<p class="verdict-empty">Pick one on the left. We’ll tell you what we’d do first.</p>';
  out.innerHTML = empty;
  list.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-say]');
    if (!btn) return;
    const on = btn.getAttribute('aria-pressed') !== 'true';
    list.querySelectorAll('[data-say]').forEach((b) => b.setAttribute('aria-pressed', b === btn && on));
    if (!on) { out.innerHTML = empty; return; }
    const p = problems[btn.dataset.say];
    out.innerHTML = `
      <p class="verdict-type">Diagnosis · ${esc(p.type)}</p>
      <p class="verdict-reply">${esc(p.reply)}</p>
      <p class="verdict-detail">${esc(p.detail)}</p>
      <a class="btn btn-gold" href="#quote" data-prefill="${esc(p.type)}">Let’s fix it <span class="arrow" aria-hidden="true">→</span></a>`;
  });
}

/* ---------- FAQ (animated disclosure, plus FAQPage structured data) ---------- */
export const faqHTML = () => faqs.map((f, i) => `
    <div class="faq-item">
      <h3><button class="faq-q" type="button" aria-expanded="false" aria-controls="faq-a-${i}" id="faq-q-${i}">
        <span>${esc(f.question)}</span><span class="faq-icon" aria-hidden="true"></span></button></h3>
      <div class="faq-a" id="faq-a-${i}" role="region" aria-labelledby="faq-q-${i}"><div><p>${esc(f.answer)}</p></div></div>
    </div>`).join('');

export const faqSchema = () => ({
  '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
});

export function renderFaq(root) {
  if (!root) return;
  fill(root, faqHTML());
  // Closed answers are inert (unfocusable + hidden from AT) only once JS can reopen them.
  root.querySelectorAll('.faq-a').forEach((a) => { a.inert = true; });
  root.addEventListener('click', (e) => {
    const q = e.target.closest('.faq-q');
    if (!q) return;
    const item = q.closest('.faq-item');
    const open = !item.classList.contains('is-open');
    item.classList.toggle('is-open', open);
    q.setAttribute('aria-expanded', open);
    item.querySelector('.faq-a').inert = !open;
  });
}

/* ---------- Testimonials (real ones only; hidden until there are some) ---------- */
export function renderReviews(root) {
  if (!root) return;
  if (!testimonials.length) return; // section ships [hidden]; nothing is invented to fill it
  root.closest('section').hidden = false;
  root.innerHTML = `
    <div class="review-track" aria-roledescription="carousel" aria-label="Client testimonials">
      ${testimonials.map((t, i) => `
        <figure class="review" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${testimonials.length}" ${i ? 'hidden' : ''}>
          <blockquote>${esc(t.quote)}</blockquote>
          <figcaption><b>${esc(t.client)}</b> — ${esc(t.business)}${t.project ? ` · ${esc(t.project)}` : ''}</figcaption>
        </figure>`).join('')}
    </div>
    ${testimonials.length > 1 ? `<div class="review-nav">
      <button type="button" data-dir="-1" aria-label="Previous testimonial">←</button>
      <button type="button" data-dir="1" aria-label="Next testimonial">→</button>
      <span class="review-count" aria-live="polite"><b data-rn>1</b> / ${testimonials.length}</span></div>` : ''}`;
  const slides = [...root.querySelectorAll('.review')];
  let at = 0;
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-dir]');
    if (!b) return;
    const dir = +b.dataset.dir;
    const prev = slides[at];
    at = (at + dir + slides.length) % slides.length;
    const next = slides[at];
    prev.hidden = true;
    next.hidden = false;
    next.animate?.([{ opacity: 0, transform: `translateX(${dir * 60}px)` }, { opacity: 1, transform: 'none' }], { duration: 650, easing: 'cubic-bezier(.22,1,.36,1)' });
    root.querySelector('[data-rn]').textContent = at + 1;
  });
}
