'use strict';
const { send, readJson, hashIp, sameOrigin } = require('../_lib/http');
const auth = require('../_lib/auth');
const store = require('../_lib/store');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' }, { Allow: 'POST' });
  if (!sameOrigin(req)) return send(res, 403, { error: 'Forbidden' });
  if (!auth.adminConfigured()) return send(res, 503, { error: 'Admin login isn’t set up yet.', code: 'NOT_CONFIGURED' });
  let body;
  try { body = await readJson(req, 4096); } catch (e) { return send(res, e.status || 400, { error: 'Invalid request.' }); }
  const email = typeof body.email === 'string' ? body.email : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email || !password || email.length > 254 || password.length > 200) return send(res, 400, { error: 'Enter your email and password.' });
  try {
    // Brute-force protection: 10 attempts / 15 min per client.
    if ((await store.hit('login:' + hashIp(req), 15 * 60 * 1000)) > 10) return send(res, 429, { error: 'Too many attempts. Wait a few minutes.' });
  } catch (e) { console.error('login ratelimit failed:', e.code || e.name); return send(res, 500, { error: 'Something went wrong.' }); }
  if (!auth.checkCredentials(email, password)) return send(res, 401, { error: 'Those details didn’t work.' });
  auth.issueCookie(req, res);
  return send(res, 200, { ok: true });
};
