'use strict';
const { send, readJson, sameOrigin } = require('../../_lib/http');
const { requireAdmin } = require('../../_lib/auth');
const { STATUSES } = require('../../_lib/validate');
const store = require('../../_lib/store');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

module.exports = async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const id = String((req.query && req.query.id) || '');
  if (!UUID.test(id)) return send(res, 404, { error: 'Not found.' });
  try {
    if (req.method === 'GET') {
      const q = await store.getQuote(id);
      return q ? send(res, 200, { quote: q }) : send(res, 404, { error: 'Not found.' });
    }
    if (req.method === 'PATCH') {
      if (!sameOrigin(req)) return send(res, 403, { error: 'Forbidden' });
      const body = await readJson(req, 16 * 1024);
      const patch = {};
      if (body.status !== undefined) {
        if (!STATUSES.includes(body.status)) return send(res, 400, { error: 'Invalid status.' });
        patch.status = body.status;
      }
      if (body.notes !== undefined) {
        if (typeof body.notes !== 'string' || body.notes.length > 5000) return send(res, 400, { error: 'Notes are too long.' });
        patch.notes = body.notes;
      }
      if (!Object.keys(patch).length) return send(res, 400, { error: 'Nothing to update.' });
      const q = await store.updateQuote(id, patch);
      return q ? send(res, 200, { quote: q }) : send(res, 404, { error: 'Not found.' });
    }
    return send(res, 405, { error: 'Method not allowed' }, { Allow: 'GET, PATCH' });
  } catch (e) {
    if (e.status) return send(res, e.status, { error: 'Invalid request.' });
    console.error('quote op failed:', e.code || e.name);
    return send(res, 500, { error: 'Something went wrong.' });
  }
};
