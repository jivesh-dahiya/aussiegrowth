// The signature interaction: one pinned stage that transforms
// GET SEEN → GET BOOKED → GET PAID as the visitor scrolls.
// Only runs in cinematic mode (GSAP present + motion allowed).

const URLS = [
  [0, 'Silk Building Group · live site'],
  [1.3, 'google.com.au/search?q=builder+near+me'],
  [3.0, 'maps · builders near you'],
  [4.8, 'your phone · right now'],
  [8.3, 'jobs · this week'],
];

export function initStory({ gsap, ScrollTrigger, ready = Promise.resolve() }) {
  const story = document.querySelector('[data-story]');
  const stage = story?.querySelector('[data-story-stage]');
  if (!stage) return;

  const q = (s) => stage.querySelector(s);
  const qa = (s) => [...stage.querySelectorAll(s)];
  const panel = (id) => q(`[data-panel="${id}"]`);
  const parts = (id) => {
    const p = panel(id);
    return { word: p.querySelector('.hl-word'), rest: [p.querySelector('.panel-index'), p.querySelector('.lede'), p.querySelector('.chips')], kicker: p.querySelector('[data-kicker]') };
  };
  const seen = parts('seen');
  const booked = parts('booked');
  const paid = parts('paid');
  const scene = (id) => q(`[data-scene="${id}"]`);
  const scribble = (id) => q(`[data-scribble="${id}"]`);
  const notes = qa('.note');
  const statuses = qa('.status i');
  const url = q('[data-url]');
  const progress = document.querySelector('[data-progress]');
  const steps = progress ? [...progress.children] : [];
  const hint = q('[data-scroll-hint]');
  const mobile = matchMedia('(max-width: 999px)').matches;

  // ---------- initial state ----------
  gsap.set([...booked.rest, ...paid.rest, seen.kicker, booked.kicker, paid.kicker], { opacity: 0, y: 18 });
  gsap.set(booked.word, { yPercent: 115 });
  gsap.set(paid.word, { yPercent: -115, scale: 1.25, transformOrigin: '0% 100%' });
  gsap.set([scene('search'), scene('map'), scene('leads'), scene('paid')], { opacity: 0 });
  gsap.set([scribble('booked'), scribble('paid')], { opacity: 0, y: 10 });
  gsap.set(notes, { opacity: 0, y: 40, scale: 0.94 });
  gsap.set(q('[data-typed]'), { clipPath: 'inset(0 100% 0 0)' });
  gsap.set(q('.result.is-you'), { opacity: 0, y: 16 });
  gsap.set(q('.map-card'), { opacity: 0, y: 18 });
  gsap.set(q('[data-pipe]'), { scaleX: 0 });
  gsap.set(q('.jobs'), { opacity: 0, y: 24 });

  // ---------- intro (not scroll-linked) ----------
  // Held until the loader starts lifting, so the hero arrives out of it rather than behind it.
  const intro = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } })
    .from(panel('seen').querySelector('.hl-get'), { yPercent: 60, opacity: 0, duration: 1.2 }, 0.1)
    .from(seen.word, { yPercent: 110, duration: 1.3 }, 0.22)
    .from([...seen.rest, q('.story-ctas'), q('.eyebrow')], { opacity: 0, y: 20, duration: 1, stagger: 0.07 }, 0.45)
    .from(q('.story-visual'), { opacity: 0, y: 60, duration: 1.4 }, 0.35)
    .from(scribble('seen'), { opacity: 0, rotate: -14, duration: 1 }, 1);
  ready.then(() => intro.play());

  // ---------- the scroll story ----------
  const tl = gsap.timeline({ defaults: { ease: 'power2.inOut', duration: 0.8 } });
  tl.addLabel('seen', 0)
    // website → search
    .to(scene('site'), { opacity: 0, scale: 0.94 }, 1.0)
    .to(scene('search'), { opacity: 1 }, 1.2)
    .fromTo(scene('search'), { y: 24 }, { y: 0 }, 1.2)
    .to(q('[data-typed]'), { clipPath: 'inset(0 0% 0 0)', ease: 'steps(15)', duration: 0.7 }, 1.7)
    .to(q('.result.is-you'), { opacity: 1, y: 0 }, 2.2)
    // search → map
    .to(scene('search'), { opacity: 0, scale: 1.04 }, 2.9)
    .to(scene('map'), { opacity: 1 }, 3.0)
    .fromTo(scene('map'), { scale: 1.12 }, { scale: 1, duration: 1.2 }, 3.0)
    .to(q('.map-card'), { opacity: 1, y: 0 }, 3.5)
    .to(seen.kicker, { opacity: 1, y: 0 }, 3.8)

    // SEEN leaves sideways, BOOKED rises from below
    .addLabel('booked', 4.8)
    .to(seen.word, { x: () => innerWidth * 0.75, skewX: -14, opacity: 0, ease: 'power3.in', duration: 1 }, 4.4)
    .to([...seen.rest, seen.kicker], { opacity: 0, y: -18, stagger: 0.05 }, 4.4)
    .to(scribble('seen'), { opacity: 0, y: -10 }, 4.4)
    .to(booked.word, { yPercent: 0, ease: 'power3.out', duration: 1 }, 4.9)
    .to(booked.rest, { opacity: 1, y: 0, stagger: 0.08 }, 5.2)
    .to(scribble('booked'), { opacity: 1, y: 0 }, 5.4)
    .to(q('.map-card'), { opacity: 0 }, 4.8)
    .to(scene('map'), { opacity: 0.35 }, 4.8)
    .to(scene('leads'), { opacity: 1 }, 5.0)
    .to(notes, { opacity: 1, y: 0, scale: 1, ease: 'back.out(1.6)', stagger: 0.42 }, 5.3)
    .to(booked.kicker, { opacity: 1, y: 0 }, 7.2)

    // BOOKED slides out left, PAID lands from above with weight
    .addLabel('paid', 8.3)
    .to(booked.word, { x: () => -innerWidth * 0.6, skewX: 12, opacity: 0, ease: 'power3.in', duration: 1 }, 7.9)
    .to([...booked.rest, booked.kicker], { opacity: 0, y: -18, stagger: 0.05 }, 7.9)
    .to(scribble('booked'), { opacity: 0 }, 7.9)
    .to(paid.word, { yPercent: 0, scale: 1, ease: 'back.out(1.4)', duration: 1.1 }, 8.4)
    .to(paid.rest, { opacity: 1, y: 0, stagger: 0.08 }, 8.8)
    .to(scribble('paid'), { opacity: 1, y: 0 }, 9)
    .to(notes, { opacity: 0, y: -24, stagger: 0.05, duration: 0.5 }, 8.0)
    .to([scene('map'), scene('leads')], { opacity: 0 }, 8.3)
    .to(scene('paid'), { opacity: 1 }, 8.5)
    .to(q('.jobs'), { opacity: 1, y: 0 }, 8.7)
    // lead → quote → job → paid
    .to(q('[data-pipe]'), { scaleX: 0.36, ease: 'none', duration: 0.5 }, 9.2)
    .to(statuses, { yPercent: -100 / 3, stagger: 0.12, duration: 0.4 }, 9.6)
    .to(q('[data-pipe]'), { scaleX: 1, ease: 'none', duration: 0.8 }, 10.1)
    .to(statuses, { yPercent: -200 / 3, stagger: 0.12, duration: 0.4 }, 10.3)
    .to(paid.kicker, { opacity: 1, y: 0 }, 10.9)
    .to(hint, { opacity: 0, duration: 0.4 }, 11.2)
    .to({}, { duration: 0.8 }, 11.6); // breathing room before release

  let lastStep = -1;
  let lastUrl = '';
  const sync = () => {
    const t = tl.time();
    const step = t < tl.labels.booked ? 0 : t < tl.labels.paid ? 1 : 2;
    if (step !== lastStep) {
      steps.forEach((li, i) => li.classList.toggle('is-active', i === step));
      lastStep = step;
    }
    const u = URLS.filter(([at]) => t >= at).pop()[1];
    if (u !== lastUrl) { url.textContent = u; lastUrl = u; }
  };

  ScrollTrigger.create({
    trigger: story,
    pin: stage,
    start: 'top top',
    end: () => `+=${innerHeight * (mobile ? 4.2 : 5.6)}`,
    scrub: 0.7,
    animation: tl,
    invalidateOnRefresh: true,
    onToggle: (self) => progress?.classList.toggle('is-on', self.isActive),
  });
  // Follow the timeline, not the scroll event: with scrub the timeline is still catching up after
  // the last scroll event, which left the step indicator and address bar a scene behind.
  tl.eventCallback('onUpdate', sync);
  sync();
}
