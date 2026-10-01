'use strict';
// Filtering + sorting shared by the list and CSV export endpoints.
const SORTS = ['created_at', 'name', 'business', 'service_requested', 'business_type', 'budget', 'status'];

function queryQuotes(all, p) {
  const term = String(p.search || '').trim().toLowerCase().slice(0, 100);
  const status = String(p.status || '');
  let rows = all.filter((q) => {
    if (status === 'ALL') { /* everything */ } else if (status) { if (q.status !== status) return false; } else if (q.status === 'ARCHIVED') return false;
    if (p.service && q.service_requested !== p.service) return false;
    if (p.businessType && q.business_type !== p.businessType) return false;
    if (p.from && q.created_at < p.from) return false;
    if (p.to && q.created_at > p.to) return false;
    if (term && ![q.name, q.business, q.email, q.phone].some((f) => String(f).toLowerCase().includes(term))) return false;
    return true;
  });
  const key = SORTS.includes(p.sort) ? p.sort : 'created_at';
  const dir = p.dir === 'asc' ? 1 : -1;
  rows = rows.sort((a, b) => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0) * dir || (a.created_at < b.created_at ? 1 : -1));
  return rows;
}

function stats(all) {
  const s = { total: all.length, NEW: 0, CONTACTED: 0, IN_PROGRESS: 0, CLOSED: 0, ARCHIVED: 0 };
  all.forEach((q) => { if (s[q.status] !== undefined) s[q.status] += 1; });
  return s;
}

const isoOrEmpty = (v) => { const d = new Date(String(v || '')); return String(v || '') && !Number.isNaN(d.getTime()) ? d.toISOString() : ''; };
function paramsFrom(query) {
  const g = (k) => (Array.isArray(query[k]) ? query[k][0] : query[k]);
  return {
    search: g('search'), status: g('status'), service: g('service'), businessType: g('businessType'),
    from: isoOrEmpty(g('from')), to: isoOrEmpty(g('to')), sort: g('sort'), dir: g('dir'),
  };
}

module.exports = { queryQuotes, stats, paramsFrom };
