'use strict';
const { send } = require('../_lib/http');
const auth = require('../_lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' }, { Allow: 'GET' });
  const s = await auth.getLiveSession(req).catch(() => null);
  return s ? send(res, 200, { ok: true }) : send(res, 401, { error: 'Not signed in.', code: 'UNAUTHENTICATED' });
};
