// Aussie Growth — boot.
// Progressive enhancement: the page is complete without JS or motion.
// "Cinematic" mode (pinned scroll story + reel) only switches on when GSAP
// loaded AND the visitor hasn't asked for reduced motion.
//
// GSAP/ScrollTrigger load deterministically: index.html loads them as plain,
// non-deferred classic <script> tags immediately before this module, so the
// browser fetches+executes them synchronously, in order, before this file's
// top-level code runs at all. window.gsap/window.ScrollTrigger are therefore
// guaranteed to exist here — this is not a timing check, it's just reading
// what's already there. (Previously this relied on two separate CDN requests
// racing a `defer`'d script; any slow/blocked request silently produced a
// static fallback page. Self-hosting + synchronous load order removes that
// race entirely, rather than papering over it with a browser/OS check.)
import { renderWho, renderReel, renderSays, renderFaq, renderReviews } from './render.js';
import { initStory } from './story.js';
import { initReel, initVideos } from './reel.js';
import { initQuote } from './quote.js';
import { initFilm } from './film.js';
import { initMotion } from './motion.js';
import { initLoader } from './loader.js';
import { initContactLinks, initNav, initWhatWeDo, initReveals, initDock, initPointer, initFlow } from './ui.js';

const $ = (s) => document.querySelector(s);
const loader = initLoader();
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const { gsap, ScrollTrigger } = window;
const cinematic = !reduced && !!gsap && !!ScrollTrigger;

if (!reduced && (!gsap || !ScrollTrigger)) {
  // Genuinely unexpected (e.g. a corrupted/missing local file) — not a
  // Mac/browser thing. Fail open to the accessible no-motion layout rather
  // than a broken page, and say so where it'll actually be seen.
  console.warn('Aussie Growth: GSAP failed to load — showing the static layout.');
}

document.documentElement.classList.toggle('cinematic', cinematic);
document.documentElement.classList.toggle('no-motion', !cinematic);

renderWho($('[data-who]'));
renderReel($('[data-reel]'));
renderSays($('[data-says]'), $('[data-verdict]'));
renderFaq($('[data-faq]'));
renderReviews($('[data-reviews]'));
initQuote($('[data-quote]'));
initFilm($('[data-film]'));
initMotion({ cinematic, ready: loader.revealed });
initContactLinks();
initNav();
initWhatWeDo();
initReveals();
initDock();
initPointer();

if (cinematic) {
  gsap.registerPlugin(ScrollTrigger);
  initStory({ gsap, ScrollTrigger, ready: loader.revealed });
  if (matchMedia('(min-width: 1000px)').matches) initReel($('[data-reel]'), { gsap, ScrollTrigger });
  else initVideos($('[data-reel]'));
  initFlow(ScrollTrigger);
  // Layout can shift once fonts land; re-measure pins.
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  // Crossing the desktop/mobile breakpoint changes the choreography — rebuild cleanly.
  const mq = matchMedia('(min-width: 1000px)');
  mq.addEventListener('change', () => location.reload());
} else {
  initVideos($('[data-reel]'));
  initFlow(null);
}

// Everything above is synchronous, so the page is laid out. Lift the loader once the display
// font is in (so the hero doesn't re-flow under it) — or after 1.2s regardless.
Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 1200))]).then(loader.reveal);
