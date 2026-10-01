'use strict';
const { send, sameOrigin } = require('../_lib/http');
const auth = require('../_lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' }, { Allow: 'POST' });
  if (!sameOrigin(req)) return send(res, 403, { error: 'Forbidden' });
  try { await auth.revoke(req); } catch (e) { console.error('revoke failed:', e.code || e.name); }
  auth.clearCookie(req, res);
  return send(res, 200, { ok: true });
};
