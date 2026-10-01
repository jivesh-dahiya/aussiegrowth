// Project video loading + the cinematic work reel.
// Videos: muted, looped, lazy, only fetched near the viewport, paused off-screen,
// skipped entirely on Save-Data / 2G (posters only).

const conn = navigator.connection || {};
const constrained = conn.saveData || /(^|-)2g/.test(conn.effectiveType || '');

function load(video) {
  if (constrained || video.dataset.loaded) return;
  video.dataset.loaded = '1';
  for (const [type, src] of [['video/webm', video.dataset.webm], ['video/mp4', video.dataset.mp4]]) {
    const s = document.createElement('source');
    s.type = type;
    s.src = src;
    video.appendChild(s);
  }
  video.addEventListener('playing', () => video.classList.add('is-playing'), { once: true });
  video.load();
}
function play(video) {
  if (constrained) return;
  load(video);
  video.play().catch(() => {}); // autoplay can be refused (Low Power Mode) — poster stays.
}
const pause = (video) => { if (!video.paused) video.pause(); };

/** List mode: every video manages itself by visibility. */
export function initVideos(root) {
  const videos = [...root.querySelectorAll('[data-video]')];
  if (!videos.length || constrained) return;
  const near = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && load(e.target)), { rootMargin: '400px 0px' });
  const seen = new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? play(e.target) : pause(e.target))), { threshold: 0.2 });
  videos.forEach((v) => { near.observe(v); seen.observe(v); });
}

/** Cinematic mode (desktop): pinned reel, every project lands in the same frame. */
export function initReel(root, { gsap, ScrollTrigger }) {
  const frames = [...root.querySelectorAll('.frame')];
  const metas = [...root.querySelectorAll('.meta')];
  const videos = frames.map((f) => f.querySelector('video'));
  const n = frames.length;
  const counter = root.querySelector('[data-reel-n]');
  const bar = root.querySelector('[data-reel-bar]');
  if (n < 2) return initVideos(root);

  const R = 'round 22px';
  frames.forEach((f, i) => { f.style.zIndex = i + 1; });
  gsap.set(frames.slice(1), { clipPath: `inset(100% 0% 0% 0% ${R})` });
  gsap.set(frames[0], { clipPath: `inset(0% 0% 0% 0% ${R})` });
  gsap.set(metas.slice(1), { opacity: 0, y: 40 });
  // Give the dim-out an explicit starting value. Tweening from the computed `filter: none`
  // made GSAP start at brightness(0): the active project went black the moment you scrolled.
  gsap.set(frames, { filter: 'brightness(1)' });
  // Queued frames are scaled + rotated behind a zero-height clip, which still anti-aliased
  // into a thin line under the active project. Keep them fully hidden until their turn.
  gsap.set(frames.slice(1), { autoAlpha: 0 });

  const tl = gsap.timeline({ defaults: { ease: 'power2.inOut', duration: 1 } });
  for (let i = 0; i < n - 1; i++) {
    const out = frames[i];
    const inn = frames[i + 1];
    tl.set(inn, { autoAlpha: 1 }, i + 0.001)
      .to(out, { scale: 0.88, yPercent: -4, rotate: -1.2, filter: 'brightness(0.45)' }, i)
      .fromTo(inn, { scale: 1.14, rotate: 1 }, { scale: 1, rotate: 0 }, i)
      .to(inn, { clipPath: `inset(0% 0% 0% 0% ${R})`, ease: 'power3.inOut' }, i)
      .to(metas[i], { opacity: 0, y: -40, duration: 0.45, ease: 'power2.in' }, i)
      .to(metas[i + 1], { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, i + 0.5);
  }

  let active = -1;
  let st = null;
  const syncVideos = () => {
    const live = st?.isActive;
    videos.forEach((v, k) => {
      if (live && k === active) play(v);
      else if (live && k === active + 1) load(v); // warm up the next one
      else pause(v);
    });
  };
  const setActive = (i) => {
    if (i === active) return;
    active = i;
    counter.textContent = String(i + 1).padStart(2, '0');
    frames.forEach((f, k) => { f.style.pointerEvents = k === i ? '' : 'none'; });
    metas.forEach((m, k) => { m.style.pointerEvents = k === i ? '' : 'none'; });
    syncVideos();
  };
  // Fetch the first reel video just before the section arrives.
  new IntersectionObserver((es, io) => {
    if (es[0].isIntersecting) { load(videos[0]); io.disconnect(); }
  }, { rootMargin: '600px 0px' }).observe(root);

  st = ScrollTrigger.create({
    trigger: root,
    pin: true,
    start: 'top top',
    end: () => `+=${innerHeight * 0.85 * (n - 1)}`,
    scrub: 0.6,
    animation: tl,
    invalidateOnRefresh: true,
    onUpdate: (self) => {
      bar.style.transform = `scaleX(${self.progress})`;
      setActive(Math.round(self.progress * (n - 1)));
    },
    onToggle: syncVideos,
  });
  setActive(0);

  // Keyboard users: tabbing into a stacked project scrolls the reel to it.
  root.addEventListener('focusin', (e) => {
    const el = e.target.closest('.frame, .meta');
    if (!el) return;
    const i = Math.max(frames.indexOf(el), metas.indexOf(el.closest('.meta')));
    if (i < 0 || i === active) return;
    window.scrollTo({ top: st.start + (st.end - st.start) * (i / (n - 1)), behavior: 'instant' });
  });
}
