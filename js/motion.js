// Anime.js micro-interactions. Deliberately small, and never on anything GSAP owns:
// GSAP runs the pinned story, the work reel and the flow scrubbers; Anime.js only touches
// service-page heroes, the dropdown options, card groups, list-mode project notes,
// FAQ icons and button arrows. Loaded lazily; skipped entirely for reduced motion.
export async function initMotion({ cinematic, ready = Promise.resolve() }) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const hero = [...document.querySelectorAll('.page-hero h1, .page-hero .lede, .page-hero .page-ctas')];
  let anime;
  try { anime = await import('./vendor/anime.esm.min.js'); } catch { return; } // CSS failsafe reveals the hero
  const { animate, stagger, createSpring } = anime;
  const rise = { opacity: [0, 1], translateY: [22, 0], duration: 900, ease: 'outExpo' };

  // Service-page hero: headline, lede, buttons settle in order.
  await ready; // first visit: wait for the loader to start lifting
  if (hero.length) animate(hero, { ...rise, delay: stagger(110), onComplete: () => hero.forEach((el) => el.classList.add('is-shown')) });

  // Dropdown: the two options arrive just behind the panel.
  const panel = document.querySelector('[data-wwd-panel]');
  if (panel) {
    const opts = panel.querySelectorAll('.wwd-opt > *');
    new MutationObserver(() => {
      if (panel.classList.contains('is-open')) animate(opts, { opacity: [0, 1], translateY: [8, 0], duration: 420, ease: 'outQuart', delay: stagger(28) });
    }).observe(panel, { attributes: true, attributeFilter: ['class'] });
  }

  // Card groups and list-mode project notes: children stagger in once, when the group arrives.
  const groups = [
    ...[...document.querySelectorAll('.trio-list, .caps-grid, .process-list, .split-grid')].map((g) => [g, [...g.children]]),
    // The pinned desktop reel animates its own notes with GSAP; only the list layout gets this.
    ...(cinematic && matchMedia('(min-width: 1000px)').matches ? [] : [...document.querySelectorAll('.project .meta')].map((m) => [m, [...m.children]])),
  ];
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    animate(e.target._kids, { ...rise, translateY: [18, 0], duration: 760, delay: stagger(70) });
  }), { rootMargin: '0px 0px -10% 0px' });
  groups.forEach(([group, kids]) => {
    if (group.getBoundingClientRect().top < innerHeight * 0.9) return; // already on screen: leave it be
    [group, ...kids].forEach((el) => { el.classList.remove('reveal'); });   // hand over from the CSS reveal
    kids.forEach((k) => { k.style.opacity = 0; });
    group._kids = kids;
    io.observe(group);
  });

  // FAQ: the plus icon gets a small springy press when toggled.
  const spring = createSpring({ stiffness: 260, damping: 14 });
  document.querySelector('[data-faq]')?.addEventListener('click', (e) => {
    const icon = e.target.closest('.faq-q')?.querySelector('.faq-icon');
    if (icon) animate(icon, { scale: [0.82, 1], duration: 500, ease: spring });
  });

  // Buttons: the arrow springs forward on hover instead of sliding linearly.
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.btn, .trio-go, .wwd-opt').forEach((btn) => {
      const arrow = btn.querySelector('.arrow');
      if (!arrow) return;
      btn.addEventListener('pointerenter', () => animate(arrow, { translateX: 5, duration: 600, ease: spring }));
      btn.addEventListener('pointerleave', () => animate(arrow, { translateX: 0, duration: 400, ease: 'outQuart' }));
    });
  }
}
