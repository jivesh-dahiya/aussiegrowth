'use strict';
const { send } = require('../_lib/http');
const { requireAdmin } = require('../_lib/auth');
const store = require('../_lib/store');
const { queryQuotes, paramsFrom } = require('../_lib/query');

const FIELDS = ['id', 'created_at', 'name', 'business', 'email', 'phone', 'business_type', 'service_requested', 'budget', 'timeline', 'message', 'status']; // notes deliberately excluded
// Neutralise spreadsheet formula injection (=, +, -, @, tab, CR) then quote.
const cell = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
};

module.exports = async (req, res) => {
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' }, { Allow: 'GET' });
  if (!(await requireAdmin(req, res))) return;
  try {
    const rows = queryQuotes(await store.listAll(), paramsFrom(req.query || {}));
    const csv = '\uFEFF' + [FIELDS.join(','), ...rows.map((q) => FIELDS.map((f) => cell(q[f])).join(','))].join('\r\n') + '\r\n';
    return send(res, 200, csv, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="aussie-growth-quotes-${new Date().toISOString().slice(0, 10)}.csv"`,
    });
  } catch (e) { console.error('export failed:', e.code || e.name); return send(res, 500, { error: 'Export failed.' }); }
};
