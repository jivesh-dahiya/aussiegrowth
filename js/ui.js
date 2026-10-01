// Small UI behaviours: nav, menu, contact links, reveals, magnetic CTAs, cursor tag, dock.
import { site } from './content.js';

export function initContactLinks() {
  document.querySelectorAll('[data-phone]').forEach((a) => { a.href = site.phoneHref; });
  document.querySelectorAll('[data-email]').forEach((a) => { a.href = `mailto:${site.email}`; });
  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
}

export function initNav() {
  const nav = document.querySelector('[data-nav]');
  const onScroll = () => nav.classList.toggle('is-scrolled', scrollY > 24);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Active section highlight
  const links = new Map([...nav.querySelectorAll('.nav-links a')].map((a) => [a.hash.slice(1), a]));
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    links.forEach((a, id) => a.classList.toggle('is-active', id === e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  links.forEach((_, id) => { const el = document.getElementById(id); if (el) io.observe(el); });

  // Mobile menu
  const btn = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-menu]');
  const set = (open) => {
    btn.setAttribute('aria-expanded', open);
    menu.hidden = !open;
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (open) menu.querySelector('a').focus();
  };
  btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { set(false); btn.focus(); } });
}

/* "What we do" — the two-option service selector in the primary nav.
   Works on hover (desktop, fine pointer), click/tap and keyboard alike;
   mobile gets its own flat vertical links in the slide-out menu instead. */
export function initWhatWeDo() {
  const root = document.querySelector('[data-wwd]');
  if (!root) return;
  const trigger = root.querySelector('[data-wwd-trigger]');
  const panel = root.querySelector('[data-wwd-panel]');
  const opts = [...panel.querySelectorAll('.wwd-opt')];
  const imgs = [...panel.querySelectorAll('[data-wwd-img]')];
  const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;
  let openTimer = 0;
  let closeTimer = 0;

  const showPreview = (key) => imgs.forEach((img) => img.classList.toggle('is-on', img.dataset.wwdImg === key));

  const set = (open) => {
    clearTimeout(openTimer); clearTimeout(closeTimer);
    trigger.setAttribute('aria-expanded', open);
    panel.classList.toggle('is-open', open);
    if (open) showPreview(opts[0].dataset.wwdPreview);
  };

  trigger.addEventListener('click', () => set(trigger.getAttribute('aria-expanded') !== 'true'));
  opts.forEach((a) => a.addEventListener('mouseenter', () => showPreview(a.dataset.wwdPreview)));
  opts.forEach((a) => a.addEventListener('focus', () => showPreview(a.dataset.wwdPreview)));

  if (canHover) {
    root.addEventListener('mouseenter', () => { clearTimeout(closeTimer); openTimer = setTimeout(() => set(true), 60); });
    root.addEventListener('mouseleave', () => { clearTimeout(openTimer); closeTimer = setTimeout(() => set(false), 140); });
  }
  root.addEventListener('focusout', (e) => { if (!root.contains(e.relatedTarget)) set(false); });
  document.addEventListener('click', (e) => { if (!root.contains(e.target)) set(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && trigger.getAttribute('aria-expanded') === 'true') { set(false); trigger.focus(); } });
}

export function initReveals() {
  const els = document.querySelectorAll('.reveal, .reveal-lines, .final');
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -12% 0px' });
  els.forEach((el) => io.observe(el));
}

export function initDock() {
  const dock = document.querySelector('[data-dock]');
  const quote = document.getElementById('quote');
  if (!dock) return;
  let quoteVisible = false;
  const update = () => dock.classList.toggle('is-on', scrollY > innerHeight * 0.6 && !quoteVisible);
  // The quote form only lives on the homepage — service pages link back to it,
  // so the dock just stays available based on scroll position there.
  if (quote) new IntersectionObserver(([e]) => { quoteVisible = e.isIntersecting; update(); }).observe(quote);
  addEventListener('scroll', update, { passive: true });
}

/* Desktop-only niceties. Skipped for touch and reduced motion. */
export function initPointer() {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.querySelectorAll('.magnetic').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * 0.25;
      const y = (e.clientY - r.top - r.height / 2) * 0.35;
      el.style.transform = `translate(${x}px, ${y}px)`;
    });
    el.addEventListener('pointerleave', () => {
      el.style.transition = 'transform .6s cubic-bezier(.22,1,.36,1), background .35s, box-shadow .35s';
      el.style.transform = '';
      setTimeout(() => { el.style.transition = ''; }, 600);
    });
  });

  const tag = document.querySelector('[data-cursor-tag]');
  if (!tag) return;
  let x = 0; let y = 0; let tx = 0; let ty = 0; let raf = 0;
  const loop = () => {
    x += (tx - x) * 0.22; y += (ty - y) * 0.22;
    tag.style.transform = `translate(${x + 14}px, ${y + 14}px)`;
    raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.3 ? requestAnimationFrame(loop) : 0;
  };
  addEventListener('pointermove', (e) => {
    tx = e.clientX; ty = e.clientY;
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive: true });
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest('[data-cursor]');
    tag.classList.toggle('is-on', !!t);
    if (t) tag.textContent = t.dataset.cursor;
  });
}

/* Automation/process flows: light up step by step as you scroll past them.
   Supports any number of `[data-flow]` lists on a page (e.g. the two flows
   on /growth — ad→booking and enquiry→automation→booking). */
export function initFlow(ScrollTrigger) {
  const flows = [...document.querySelectorAll('[data-flow]')];
  flows.forEach((flow) => {
    const items = [...flow.children];
    const paint = (p) => {
      flow.style.setProperty('--lit', p.toFixed(3));
      items.forEach((li, i) => li.classList.toggle('is-lit', p >= i / (items.length - 1) - 0.001));
    };
    if (!ScrollTrigger) return paint(1);
    ScrollTrigger.create({ trigger: flow, start: 'top 85%', end: 'bottom 45%', scrub: true, onUpdate: (s) => paint(s.progress) });
    paint(0);
  });
}
