// Conversational multi-step quote form. Works with keyboard, screen readers and touch.
import { quoteSteps, site } from './content.js';

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const PREFILL = { 'Web Development': 'Web Development', 'Paid Ads': 'Paid Ads', 'AI & Automations': 'AI & Automations', Chat: 'Not sure' };
const FIELD_STEP = { service: 0, businessType: 1, budget: 2, timeline: 3, name: 4, email: 4, phone: 4, business: 4, message: 4 };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function stepHTML(step, i, total) {
  const head = `<legend tabindex="-1">${esc(step.title)}</legend>${step.hint ? `<p class="q-hint">${esc(step.hint)}</p>` : ''}`;
  if (step.type === 'contact') {
    const f = (id, label, type, req, auto, wide = false) => `
      <div class="q-field ${wide ? 'wide' : ''}">
        <label for="q-${id}">${label}${req ? ' <i aria-hidden="true">*</i>' : ''}</label>
        ${type === 'textarea'
          ? `<textarea id="q-${id}" name="${id}" rows="4" placeholder="Anything we should know? Links, timelines, pet peeves…"></textarea>`
          : `<input id="q-${id}" name="${id}" type="${type}" autocomplete="${auto}" ${req ? 'required aria-required="true"' : ''} aria-describedby="q-${id}-err">`}
        <span class="q-err" id="q-${id}-err"></span>
      </div>`;
    return `<fieldset class="q-step" data-step="${i}" ${i ? 'hidden' : ''}>${head}
      <div class="q-fields">
        ${f('name', 'Name', 'text', true, 'name')}
        ${f('business', 'Business', 'text', false, 'organization')}
        ${f('email', 'Email', 'email', true, 'email')}
        ${f('phone', 'Phone', 'tel', false, 'tel')}
        ${f('message', 'Message', 'textarea', false, 'off', true)}
      </div>
      <input type="text" name="company_site" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px">
    </fieldset>`;
  }
  return `<fieldset class="q-step" data-step="${i}" ${i ? 'hidden' : ''}>${head}
    <div class="q-options">
      ${step.options.map((o) => `<label class="q-opt"><input type="${step.type}" name="${step.id}" value="${esc(o)}"><span>${esc(o)}</span></label>`).join('')}
    </div>
    <p class="q-err" data-err aria-live="polite"></p>
  </fieldset>`;
}

export function initQuote(form) {
  if (!form) return;
  const total = quoteSteps.length;
  form.innerHTML = `
    <div class="q-top">
      <p class="q-count" aria-live="polite">Step <b data-qn>1</b> of ${total}</p>
      <div class="q-bar" aria-hidden="true"><i data-qbar></i></div>
    </div>
    ${quoteSteps.map((s, i) => stepHTML(s, i, total)).join('')}
    <div class="q-nav">
      <button type="button" class="q-back" data-back hidden>← Back</button>
      <button type="submit" class="btn btn-gold" data-next>Next <span class="arrow" aria-hidden="true">→</span></button>
    </div>
    <p class="q-status" data-qstatus role="alert"></p>`;

  const steps = [...form.querySelectorAll('.q-step')];
  const back = form.querySelector('[data-back]');
  const next = form.querySelector('[data-next]');
  const status = form.querySelector('[data-qstatus]');
  let at = 0;

  const show = (i, dir = 1) => {
    steps[at].hidden = true;
    at = i;
    const s = steps[at];
    s.hidden = false;
    s.classList.remove('is-entering', 'from-back');
    void s.offsetWidth;
    s.classList.add('is-entering', ...(dir < 0 ? ['from-back'] : []));
    form.querySelector('[data-qn]').textContent = at + 1;
    form.querySelector('[data-qbar]').style.transform = `scaleX(${(at + 1) / total})`;
    back.hidden = at === 0;
    next.innerHTML = at === total - 1
      ? 'Let’s see what makes sense <span class="arrow" aria-hidden="true">→</span>'
      : 'Next <span class="arrow" aria-hidden="true">→</span>';
    status.textContent = '';
    s.querySelector('legend').focus({ preventScroll: true });
    const top = form.getBoundingClientRect().top;
    if (top < 0 || top > innerHeight * 0.6) form.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  };
  form.querySelector('[data-qbar]').style.transform = `scaleX(${1 / total})`;

  const valid = () => {
    const step = quoteSteps[at];
    const s = steps[at];
    if (step.type !== 'contact') {
      const ok = !!s.querySelector('input:checked');
      s.querySelector('[data-err]').textContent = ok ? '' : step.type === 'checkbox' ? 'Pick at least one — “Not sure” counts.' : 'Pick one to keep going.';
      return ok;
    }
    let first = null;
    const check = (name, test, msg) => {
      const el = form.elements[name];
      const ok = test(el.value.trim());
      el.setAttribute('aria-invalid', !ok);
      form.querySelector(`#q-${name}-err`).textContent = ok ? '' : msg;
      if (!ok && !first) first = el;
      return ok;
    };
    const a = check('name', (v) => v.length > 1, 'We’ll need something to call you.');
    const b = check('email', (v) => EMAIL.test(v), 'That email doesn’t look quite right.');
    const c = check('phone', (v) => !v || v.replace(/\D/g, '').length >= 8, 'Double-check that number?');
    first?.focus();
    return a && b && c;
  };

  // Mouse/touch picks on single-choice steps move on automatically. Keyboard users use Next.
  form.addEventListener('click', (e) => {
    const input = e.target.closest('.q-opt')?.querySelector('input[type="radio"]');
    if (!input || e.detail === 0) return;
    setTimeout(() => { if (input.checked && at < total - 1) show(at + 1); }, 320);
  });
  form.addEventListener('change', (e) => {
    const err = steps[at].querySelector('[data-err]');
    if (err) err.textContent = '';
  });
  back.addEventListener('click', () => at > 0 && show(at - 1, -1));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!valid()) return;
    if (at < total - 1) return show(at + 1);
    if (form.elements.company_site.value) return; // bot
    const data = Object.fromEntries(quoteSteps.filter((s) => s.type !== 'contact').map((s) => [s.id, (form.querySelector(`input[name="${s.id}"]:checked`) || {}).value || '']));
    for (const k of ['name', 'business', 'email', 'phone', 'message']) data[k] = form.elements[k].value.trim();
    data.company_site = form.elements.company_site.value; // honeypot (server discards these)
    data.page_url = location.href;
    next.disabled = true;
    status.textContent = '';
    try {
      const res = await fetch(site.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
      const out = await res.json().catch(() => ({}));
      if (res.ok) return done();
      if (res.status === 400 && out.fields) {
        const first = Object.keys(out.fields)[0];
        const stepAt = FIELD_STEP[first] ?? at;
        if (stepAt !== at) show(stepAt, -1);
        status.textContent = out.error || 'Please check your details.';
        Object.entries(out.fields).forEach(([k, msg]) => { const e = form.querySelector(`#q-${k}-err`); if (e) e.textContent = msg; });
      } else {
        status.textContent = res.status === 429 ? (out.error || 'Too many requests — try again later, or call us.') : `That didn’t send. Mind trying again, or call us on ${site.phoneDisplay}?`;
      }
    } catch {
      status.textContent = `That didn’t send. Mind trying again, or call us on ${site.phoneDisplay}?`;
    }
    next.disabled = false;
  });

  function done() {
    const name = esc(form.elements.name.value.trim().split(' ')[0]);
    form.innerHTML = `<div class="q-done" tabindex="-1">
      <p class="label">Sent</p>
      <h3>Nice one, ${name}.<br><span class="gold">Talk soon.</span></h3>
      <p>A real person will get back to you shortly with what we’d do first — and roughly what it costs.</p>
      <p>Can’t wait? <a class="meta-link" href="${esc(site.phoneHref)}">Call ${esc(site.phoneDisplay)}</a></p>
    </div>`;
    form.querySelector('.q-done').focus();
  }

  // "Let's fix it" buttons elsewhere on the page pre-select a need.
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-prefill]');
    const box = b && form.querySelector(`input[name="service"][value="${PREFILL[b.dataset.prefill]}"]`);
    if (box) box.checked = true;
  });
}
