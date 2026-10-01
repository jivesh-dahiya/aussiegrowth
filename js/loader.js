// First-visit brand loader. The markup + entrance are pure HTML/CSS (so it paints with the
// very first frame); this module only decides when the page is ready and plays the exit.
// Shown once per session, never for Save-Data, and CSS removes it on its own if JS dies.
export function initLoader() {
  const html = document.documentElement;
  const el = document.querySelector('[data-loader]');
  let done; const revealed = new Promise((r) => { done = r; });
  if (!el || !html.classList.contains('is-loading')) { el?.remove(); done(); return { revealed, reveal() {} }; }

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let anime = null; // only used if it has already arrived — the page never waits on it
  if (!reduced) import('./vendor/anime.esm.min.js').then((m) => { anime = m; }).catch(() => {});
  const finish = () => { el.remove(); html.classList.remove('is-loading'); };

  async function reveal() {
    // Not a staged delay: just long enough that the wordmark never strobes on an instant (cached) load.
    const floor = reduced ? 0 : 480 - performance.now();
    if (floor > 0) await new Promise((r) => setTimeout(r, floor));
    try { sessionStorage.setItem('ag-seen', '1'); } catch { /* private mode: loader simply shows again */ }
    done(); // hero intro starts now, underneath the lifting curtain
    if (!anime) { el.classList.add('is-leaving'); return setTimeout(finish, reduced ? 160 : 520); }
    el.classList.add('is-exiting'); // hands the elements from the CSS keyframes to Anime.js
    const { createTimeline } = anime;
    createTimeline({ defaults: { ease: 'outQuart' }, onComplete: finish })
      .add(el.querySelector('.loader-line i'), { scaleX: [0.82, 1], duration: 220, ease: 'outExpo' })
      .add(el.querySelector('.loader-mark'), { opacity: [1, 0], translateY: [0, -14], duration: 340 }, 120)
      .add(el.querySelector('.loader-line'), { opacity: [1, 0], duration: 260 }, 160)
      .add(el, { opacity: [1, 0], duration: 460, ease: 'inOutQuad' }, 200);
  }
  return { revealed, reveal };
}
