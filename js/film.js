// Brand film: never downloaded until it is near the viewport, plays only while
// visible, a smaller encode on phones, and poster-only (tap to play) for
// reduced-motion and Save-Data visitors.
export function initFilm(root) {
  const video = root?.querySelector('[data-film-video]');
  const btn = root?.querySelector('[data-film-toggle]');
  if (!video || !btn) return;
  const label = btn.querySelector('[data-film-label]');
  const conn = navigator.connection || {};
  const manual = matchMedia('(prefers-reduced-motion: reduce)').matches || conn.saveData || /(^|-)2g/.test(conn.effectiveType || '');
  let wanted = !manual; // does the visitor (or the default) want it playing?

  const load = () => {
    if (video.dataset.loaded) return;
    video.dataset.loaded = '1';
    const size = matchMedia('(max-width: 700px)').matches ? '-mobile' : '';
    for (const [type, ext] of [['video/webm', 'webm'], ['video/mp4', 'mp4']]) {
      const s = document.createElement('source');
      s.type = type;
      s.src = `/assets/video/aussie-growth-film${size}.${ext}`;
      video.appendChild(s);
    }
    video.load();
  };
  const paint = () => {
    const playing = !video.paused;
    btn.setAttribute('aria-pressed', playing);
    label.textContent = playing ? 'Pause film' : 'Play film';
    root.classList.toggle('is-playing', playing);
  };
  const play = () => { load(); video.play().catch(() => {}).finally(paint); };

  video.addEventListener('play', paint);
  video.addEventListener('pause', paint);
  btn.addEventListener('click', () => {
    wanted = video.paused;
    if (wanted) play(); else video.pause();
  });
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && wanted) play();
    else if (!e.isIntersecting) video.pause();
  }, { threshold: 0.35 }).observe(root);
  if (!manual) new IntersectionObserver(([e], io) => { if (e.isIntersecting) { load(); io.disconnect(); } }, { rootMargin: '500px 0px' }).observe(root);
  paint();
}
