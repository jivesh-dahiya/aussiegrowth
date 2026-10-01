'use strict';
const { send } = require('../_lib/http');
const { requireAdmin } = require('../_lib/auth');
const store = require('../_lib/store');
const { queryQuotes, stats, paramsFrom } = require('../_lib/query');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' }, { Allow: 'GET' });
  if (!(await requireAdmin(req, res))) return;                       // <- authorisation happens BEFORE any data access
  try {
    const all = await store.listAll();
    const rows = queryQuotes(all, paramsFrom(req.query || {})).map(({ notes, ...q }) => q); // notes only in detail view
    return send(res, 200, { quotes: rows, stats: stats(all) });
  } catch (e) { console.error('list failed:', e.code || e.name); return send(res, 500, { error: 'Could not load quotations.' }); }
};
