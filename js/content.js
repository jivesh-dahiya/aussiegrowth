/*
 * Aussie Growth — site content.
 * Everything editable lives here. Components render from these arrays,
 * so adding a project, FAQ or review never means touching layout code.
 *
 * HONESTY RULES: only add real projects, real reviews (with permission)
 * and real numbers. Leave a field empty rather than inventing it.
 */

export const site = {
  name: 'Aussie Growth',
  phoneDisplay: '+61 493 721 273',
  phoneHref: 'tel:+61493721273',
  email: 'meharmalik2026@gmail.com',
  // Quote requests are POSTed here and stored server-side (see api/quote.js). Viewable at /admin.
  formEndpoint: '/api/quote',
};

/* Portfolio. Media is captured from the live sites by scripts/capture-projects.mjs. */
export const projects = [
  {
    slug: 'silk',
    name: 'Silk Building Group',
    industry: 'Construction · Builder',
    description: 'A premium home for a Canberra builder. Big imagery, clear services, and a quote button that never wanders off.',
    url: 'https://silk-building-group-vercel-v3.vercel.app/',
    services: ['Web Development'],
    year: '',
  },
  {
    slug: 'hartwell',
    name: 'Hartwell Media',
    industry: 'Creative agency',
    description: 'A loud, playful agency site with personality in every scroll. Proof we can do “fun” without losing the plot.',
    url: 'https://hulululu-five.vercel.app/',
    services: ['Web Development'],
    year: '',
  },
  {
    slug: 'mazzia',
    name: 'Mazzia Resorts',
    industry: 'Hospitality · Resort',
    description: 'A slow, cinematic site for a resort brand. Designed to make you want to book before you’ve finished scrolling.',
    url: 'https://mazzia.netlify.app/',
    services: ['Web Development'],
    year: '',
  },
  // Corptube Solutions (corptube.in) removed: the domain currently shows a parked GoDaddy page.
  // Re-add once the live site is back, then run: node scripts/capture-projects.mjs corptube
  {
    slug: 'holarize',
    name: 'Holarize',
    industry: 'AI · Technology',
    description: 'A dark, futuristic launch site for an AI hologram startup. Big idea, explained without the jargon.',
    url: 'https://holarize.netlify.app/',
    services: ['Web Development'],
    year: '',
  },
  {
    slug: 'capital-solar',
    name: 'Capital Solar Energy',
    industry: 'Solar · Home services',
    description: 'A home-services site built to turn “just looking” into “can you come out Thursday?”.',
    url: 'https://www.capitalsolarenergy.com.au/',
    services: ['Web Development'],
    year: '',
  },
  {
    slug: 'harborview',
    name: 'Harborview',
    industry: 'Hospitality · Operations prototype',
    description: 'A hotel-and-café operations dashboard: bookings, housekeeping, orders and follow-ups in one place. The boring stuff, handled.',
    url: 'https://harborview-v1.netlify.app/',
    services: ['AI & Automations'],
    year: '',
  },
];

/*
 * Testimonials — ONLY genuine reviews the business has permission to reuse.
 * Shape: { quote, client, business, project }
 * While this is empty the Testimonials section stays hidden.
 */
export const testimonials = [];

export const audiences = [
  {
    id: 'trades',
    title: 'Tradies + home services',
    line: 'You’re on the tools all day. Your website should be on the phones.',
    items: ['Builders', 'Electricians', 'Plumbers', 'Landscapers', 'Roofers', 'Solar', 'HVAC', 'Renovations'],
    image: 'tradies',
    alt: 'A builder marking up plans on a workbench inside a timber house frame',
  },
  {
    id: 'local',
    title: 'Local businesses',
    line: 'Being the best in the suburb only counts if the suburb knows.',
    items: ['Clinics', 'Gyms', 'Hospitality', 'Automotive', 'Retail', 'Professional services'],
    image: 'local-business',
    alt: 'A café owner carrying the footpath sign out as the shop opens for the morning',
  },
];

export const problems = [
  {
    say: 'Our website looks ancient.',
    type: 'Web Development',
    reply: 'Sounds like a WEB DEVELOPMENT problem.',
    detail: 'Let’s sort the front door first. A fast, good-looking site that tells people what you do and how to book you.',
  },
  {
    say: 'We get traffic but no enquiries.',
    type: 'Web Development',
    reply: 'Still a WEB DEVELOPMENT problem, just a sneakier one.',
    detail: 'People are turning up and leaving without a word. Clearer offers, better pages, fewer dead ends.',
  },
  {
    say: 'We need more customers.',
    type: 'Paid Ads',
    reply: 'That’s a PAID ADS problem.',
    detail: 'Google and Meta ads pointed at people who actually need you, landing on pages built to turn clicks into calls.',
  },
  {
    say: 'We get leads but we’re terrible at following up.',
    type: 'AI & Automations',
    reply: 'Sounds like an AI & AUTOMATIONS problem.',
    detail: 'Let’s stop letting good leads disappear. Instant replies, reminders and a CRM that does the remembering.',
  },
  {
    say: 'We waste too much time doing the same things.',
    type: 'AI & Automations',
    reply: 'Also AI & AUTOMATIONS — the boring stuff.',
    detail: 'Quotes, follow-ups, bookings, admin. If you’re typing the same thing twice, we can probably automate it.',
  },
  {
    say: 'We honestly have no idea.',
    type: 'Chat',
    reply: 'Honestly? That’s most people.',
    detail: 'Tell us what’s going on and we’ll tell you what we’d do first — and what you can skip.',
  },
];

export const faqs = [
  {
    question: 'How much does a website cost?',
    answer: 'Depends on what you actually need. We don’t think your business should pay for 47 features you’ll never use. Tell us what you’re trying to achieve and we’ll give you a clear quote — the budget options in our quote form give you a rough idea of where most projects sit.',
  },
  {
    question: 'How long does it take?',
    answer: 'Most small-business sites land in a few weeks, bigger builds take longer. The biggest variable is usually content — photos, copy, sign-off. We’ll give you a realistic timeline up front, not an optimistic one.',
  },
  {
    question: 'Do you work with small businesses?',
    answer: 'Mostly, yes. Tradies, home-service businesses and local operators are who we build for. If you answer your own phone, you’re our people.',
  },
  {
    question: 'Do you manage Google Ads?',
    answer: 'Yep. Google Ads and Meta ads, pointed at pages built to turn clicks into calls. We’d rather spend less and get more jobs than burn budget on vanity clicks.',
  },
  {
    question: 'How much should I spend on ads?',
    answer: 'Depends on your industry, area and how many jobs you can actually take on. We’ll give you a realistic starting budget rather than a made-up number designed to sound impressive.',
  },
  {
    question: 'Can you build the website and run the ads?',
    answer: 'That’s usually how it works best — a site built to convert, with ads sending it people worth converting. One team, no passing you between agencies.',
  },
  {
    question: 'Can you automate my existing business?',
    answer: 'Often, yes. Instant replies, follow-ups, booking confirmations, CRM updates — the repetitive stuff that eats your evenings. We’ll tell you honestly if it’s worth it for your setup.',
  },
  {
    question: 'What happens after I enquire?',
    answer: 'A real person gets back to you, has a quick chat about what’s going on, then sends a clear recommendation and quote. No 40-slide deck, no pressure.',
  },
  {
    question: 'Do I need a long contract?',
    answer: 'We’d rather keep you because it’s working than because a contract says so. We’ll be upfront about terms before anything starts.',
  },
  {
    question: 'Do I need to know exactly what I want?',
    answer: 'No. Most people show up with a vague sense that something’s not working. Tell us what’s going on and we’ll help you figure out what actually needs fixing.',
  },
];

export const quoteSteps = [
  { id: 'service', title: 'What do you need?', type: 'radio', options: ['Web Development', 'Paid Ads', 'AI & Automations', 'A combination', 'Not sure'] },
  { id: 'businessType', title: 'What type of business are you?', type: 'radio', options: ['Tradie', 'Home service', 'Local business', 'Other'] },
  { id: 'budget', title: 'Rough budget?', hint: 'Ballpark is fine. No judgement.', type: 'radio', options: ['$1–2K', '$2–5K', '$5–10K+', 'Not sure'] },
  { id: 'timeline', title: 'When do you want to start?', type: 'radio', options: ['ASAP', 'This month', 'Next 1–3 months', 'Just researching'] },
  { id: 'contact', title: 'Where do we send it?', type: 'contact' },
];
