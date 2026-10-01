'use strict';
// Server-side validation for public quote submissions.
// NOTE: option lists must match js/content.js (tests/full-journey.mjs checks they do).
const SERVICES = ['Web Development', 'Paid Ads', 'AI & Automations', 'A combination', 'Not sure'];
const BUSINESS_TYPES = ['Tradie', 'Home service', 'Local business', 'Other'];
const BUDGETS = ['$1–2K', '$2–5K', '$5–10K+', 'Not sure'];
const TIMELINES = ['ASAP', 'This month', 'Next 1–3 months', 'Just researching'];
const STATUSES = ['NEW', 'CONTACTED', 'IN_PROGRESS', 'CLOSED', 'ARCHIVED'];

const EMAIL = /^[^\s@<>"'(),;:\\]+@[^\s@<>"'(),;:\\]+\.[^\s@<>"'(),;:\\]{2,}$/;
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

const clean = (v, max) => (typeof v === 'string' ? v.replace(CONTROL, '').trim().slice(0, max + 1) : '');

function validateQuote(body, pageUrl) {
  const errors = {};
  const v = {
    name: clean(body.name, 100),
    business: clean(body.business, 120),
    email: clean(body.email, 254).toLowerCase(),
    phone: clean(body.phone, 30),
    service_requested: clean(body.service, 40),
    business_type: clean(body.businessType, 40),
    budget: clean(body.budget, 20),
    timeline: clean(body.timeline, 30),
    message: clean(body.message, 2000),
  };
  if (v.name.length < 2 || v.name.length > 100) errors.name = 'Name looks off.';
  if (v.business.length > 120) errors.business = 'Business name is too long.';
  if (!EMAIL.test(v.email) || v.email.length > 254) errors.email = 'Email looks off.';
  if (v.phone) {
    const digits = v.phone.replace(/\D/g, '');
    if (!/^[0-9+()\-.\s]+$/.test(v.phone) || digits.length < 8 || digits.length > 15) errors.phone = 'Phone looks off.';
  }
  if (!SERVICES.includes(v.service_requested)) errors.service = 'Pick a service.';
  if (!BUSINESS_TYPES.includes(v.business_type)) errors.businessType = 'Pick a business type.';
  if (!BUDGETS.includes(v.budget)) errors.budget = 'Pick a budget.';
  if (!TIMELINES.includes(v.timeline)) errors.timeline = 'Pick a timeline.';
  if (v.message.length > 2000) errors.message = 'Message is too long.';
  const page = clean(pageUrl, 200);
  v.page_url = /^https?:\/\/[^\s]+$/i.test(page) && page.length <= 200 ? page : '';
  return { ok: Object.keys(errors).length === 0, errors, value: v };
}

module.exports = { SERVICES, BUSINESS_TYPES, BUDGETS, TIMELINES, STATUSES, validateQuote };
