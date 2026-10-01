'use strict';
// Admin dashboard markup. Served only by /api/admin/dashboard after session verification.
// NOTE: the inline script must not contain backticks or ${ } (this file is a template literal).
module.exports = String.raw`<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="color-scheme" content="dark">
<title>Quotations — Aussie Growth Admin</title>
<link rel="icon" href="/assets/aussie-growth-mark-96.png" type="image/png">
<style>
:root{--bg:#080808;--panel:#101010;--panel2:#151515;--line:rgba(255,255,255,.09);--line2:rgba(255,255,255,.16);--text:#f4f1ea;--muted:#9a9a9a;--gold:#c9a46a;--gold-lt:#e8cf9c;--red:#d9776a}
*{box-sizing:border-box;margin:0}
body{background:var(--bg);color:var(--text);font:15px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;min-height:100vh}
button,input,select,textarea{font:inherit;color:inherit}
button{cursor:pointer;background:none;border:0}
a{color:inherit}
:focus-visible{outline:2px solid var(--gold-lt);outline-offset:2px;border-radius:4px}
.wrap{max-width:1240px;margin:0 auto;padding:0 24px}
header.top{border-bottom:1px solid var(--line);padding:16px 0}
header.top .wrap{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.brand{display:flex;align-items:center;gap:11px;margin-right:auto}
.brand img{width:34px;height:34px}
.brand b{display:block;font-size:.95rem;letter-spacing:.02em;text-transform:uppercase}
.brand span{display:block;font-size:.68rem;letter-spacing:.22em;color:var(--muted);text-transform:uppercase}
.btn{border:1px solid var(--line2);border-radius:8px;padding:9px 14px;font-size:.8rem;letter-spacing:.04em;text-decoration:none;display:inline-block;transition:border-color .2s,color .2s}
.btn:hover{border-color:var(--gold);color:var(--gold-lt)}
.btn.gold{background:var(--gold);color:#0b0906;border-color:var(--gold)}
.btn.gold:hover{background:var(--gold-lt);color:#0b0906}
h1{font-size:1.5rem;margin:28px 0 18px;letter-spacing:-.01em}
.stats{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}
.stat{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:16px}
.stat small{display:block;color:var(--muted);font-size:.68rem;letter-spacing:.16em;text-transform:uppercase}
.stat b{display:block;font-size:1.9rem;margin-top:4px;font-variant-numeric:tabular-nums}
.stat.new b{color:var(--gold-lt)}
.filters{display:grid;grid-template-columns:2fr repeat(3,1fr) 1fr 1fr auto;gap:10px;margin:22px 0 14px}
.filters input,.filters select{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:10px 12px;width:100%;min-width:0}
.filters label{display:grid;gap:4px;font-size:.66rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.filters .clr{align-self:end}
table{width:100%;border-collapse:collapse;background:var(--panel);border:1px solid var(--line);border-radius:10px;overflow:hidden}
th,td{text-align:left;padding:12px 14px;border-bottom:1px solid var(--line);font-size:.88rem;vertical-align:middle}
th{font-size:.66rem;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);font-weight:600;background:var(--panel2);white-space:nowrap}
th button{color:inherit;letter-spacing:inherit;text-transform:inherit;font-size:inherit;font-weight:inherit}
th button:hover{color:var(--gold-lt)}
tbody tr{cursor:pointer;transition:background .15s}
tbody tr:hover,tbody tr:focus-visible{background:var(--panel2)}
tr.is-new td:first-child{box-shadow:inset 3px 0 0 var(--gold)}
tr.is-new .nm{font-weight:700}
.badge{display:inline-block;font-size:.66rem;letter-spacing:.12em;font-weight:700;padding:3px 8px;border-radius:5px;border:1px solid var(--line2);color:var(--muted);white-space:nowrap}
.badge.NEW{background:var(--gold);border-color:var(--gold);color:#0b0906}
.badge.CONTACTED{color:#9cc4e8;border-color:rgba(156,196,232,.4)}
.badge.IN_PROGRESS{color:var(--gold-lt);border-color:rgba(201,164,106,.5)}
.badge.CLOSED{color:#8fc79a;border-color:rgba(143,199,154,.4)}
.badge.ARCHIVED{opacity:.6}
.muted{color:var(--muted)}
.empty{padding:56px 20px;text-align:center;color:var(--muted);background:var(--panel);border:1px solid var(--line);border-radius:10px;letter-spacing:.12em;text-transform:uppercase;font-size:.8rem}
.count{color:var(--muted);font-size:.8rem;margin:10px 2px 24px}
/* drawer */
.scrim{position:fixed;inset:0;background:rgba(0,0,0,.6);display:none;z-index:20}
.scrim.on{display:block}
.drawer{position:fixed;top:0;right:0;bottom:0;width:min(560px,100%);background:var(--panel);border-left:1px solid var(--line2);z-index:21;padding:24px;overflow:auto;transform:translateX(100%);transition:transform .25s ease;visibility:hidden}
.drawer.on{transform:none;visibility:visible}
.drawer h2{font-size:1.3rem;margin:10px 0 2px}
.drawer .sub{color:var(--muted);margin-bottom:18px}
.dl{display:grid;grid-template-columns:130px 1fr;gap:10px 14px;margin:18px 0;font-size:.9rem}
.dl dt{color:var(--muted);font-size:.68rem;letter-spacing:.14em;text-transform:uppercase;padding-top:3px}
.dl dd{margin:0;overflow-wrap:anywhere}
.dl dd.msg{white-space:pre-wrap}
.row{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}
.sec{margin-top:22px;padding-top:18px;border-top:1px solid var(--line)}
.sec h3{font-size:.68rem;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin-bottom:10px;font-weight:600}
textarea{width:100%;min-height:110px;background:var(--bg);border:1px solid var(--line2);border-radius:8px;padding:10px 12px;resize:vertical}
.note-hint{font-size:.75rem;color:var(--muted);margin:6px 0}
.status-msg{font-size:.8rem;min-height:1.2em;color:var(--gold-lt)}
.status-msg.err{color:var(--red)}
.expired{position:fixed;inset:0;background:rgba(8,8,8,.96);z-index:40;display:none;place-items:center;text-align:center;padding:24px}
.expired.on{display:grid}
.expired h2{font-size:1.4rem;margin-bottom:8px}
@media (max-width:980px){.filters{grid-template-columns:1fr 1fr}.filters .search{grid-column:1/-1}.stats{grid-template-columns:repeat(3,1fr)}}
@media (max-width:720px){
 .wrap{padding:0 14px}.stats{grid-template-columns:repeat(2,1fr)}
 table,thead,tbody,tr,td{display:block}thead{display:none}
 table{background:none;border:0}
 tr{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px 14px;margin-bottom:10px;position:relative}
 td{border:0;padding:2px 0;font-size:.85rem}
 td[data-l]::before{content:attr(data-l) ": ";color:var(--muted);font-size:.66rem;letter-spacing:.12em;text-transform:uppercase}
 td.act{display:none}td.st{position:absolute;top:12px;right:14px}
 .dl{grid-template-columns:1fr}
}
</style>
</head>
<body>
<header class="top"><div class="wrap">
  <div class="brand"><img src="/assets/aussie-growth-mark-96.png" alt="" width="34" height="34"><div><b>Aussie Growth</b><span>Admin</span></div></div>
  <a class="btn" id="export" href="/api/admin/export">Export CSV</a>
  <button class="btn" id="logout" type="button">Log out</button>
</div></header>
<main class="wrap">
  <h1>Quotations</h1>
  <section class="stats" id="stats" aria-label="Totals"></section>
  <form class="filters" id="filters" role="search" autocomplete="off">
    <label class="search">Search<input type="search" id="f-search" placeholder="Name, business, email, phone" maxlength="100"></label>
    <label>Service<select id="f-service"><option value="">All</option><option>Web Development</option><option>Paid Ads</option><option>AI &amp; Automations</option><option>A combination</option><option>Not sure</option></select></label>
    <label>Status<select id="f-status"><option value="">Active</option><option value="NEW">New</option><option value="CONTACTED">Contacted</option><option value="IN_PROGRESS">In progress</option><option value="CLOSED">Closed</option><option value="ARCHIVED">Archived</option><option value="ALL">All (incl. archived)</option></select></label>
    <label>Business type<select id="f-type"><option value="">All</option><option>Tradie</option><option>Home service</option><option>Local business</option><option>Other</option></select></label>
    <label>From<input type="date" id="f-from"></label>
    <label>To<input type="date" id="f-to"></label>
    <button type="button" class="btn clr" id="clear">Clear</button>
  </form>
  <div id="list" aria-live="polite"></div>
  <p class="count" id="count"></p>
</main>

<div class="scrim" id="scrim"></div>
<aside class="drawer" id="drawer" role="dialog" aria-modal="true" aria-labelledby="d-title" aria-hidden="true">
  <button class="btn" type="button" id="d-close">← Back to list</button>
  <h2 id="d-title"></h2><p class="sub" id="d-sub"></p>
  <span class="badge" id="d-badge"></span>
  <dl class="dl" id="d-dl"></dl>
  <div class="row"><a class="btn gold" id="d-email" href="#">Email client →</a><a class="btn" id="d-call" href="#">Call client →</a></div>
  <div class="sec"><h3>Status</h3>
    <div class="row" id="d-status"></div></div>
  <div class="sec"><h3>Internal notes</h3>
    <textarea id="d-notes" maxlength="5000" aria-label="Internal notes"></textarea>
    <p class="note-hint">Only visible to the Aussie Growth team. Never shown to the client.</p>
    <div class="row"><button class="btn" type="button" id="d-save">Save notes</button><button class="btn" type="button" id="d-archive"></button></div>
    <p class="status-msg" id="d-msg" role="status"></p></div>
</aside>
<div class="expired" id="expired"><div><h2>Session expired</h2><p class="muted" style="margin-bottom:18px">Please log in again.</p><a class="btn gold" href="/admin/">Log in →</a></div></div>

<script>
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var STATUS_LABEL = { NEW: 'NEW', CONTACTED: 'CONTACTED', IN_PROGRESS: 'IN PROGRESS', CLOSED: 'CLOSED', ARCHIVED: 'ARCHIVED' };
  var sort = { key: 'created_at', dir: 'desc' };
  var current = null, timer = 0, opener = null;

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function expired() { $('expired').classList.add('on'); }
  function api(path, opts) {
    opts = opts || {};
    opts.credentials = 'same-origin';
    return fetch(path, opts).then(function (r) {
      if (r.status === 401) { expired(); throw new Error('auth'); }
      return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'Request failed'); return j; });
    });
  }
  function fmtDate(iso, long) {
    var d = new Date(iso);
    if (long) return d.toLocaleString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    var o = { day: 'numeric', month: 'short' };
    if (d.getFullYear() !== new Date().getFullYear()) o.year = 'numeric';
    return d.toLocaleDateString('en-AU', o);
  }
  function badge(s) { var b = el('span', 'badge ' + s, STATUS_LABEL[s] || s); return b; }

  function params() {
    var p = new URLSearchParams();
    if ($('f-search').value.trim()) p.set('search', $('f-search').value.trim());
    if ($('f-service').value) p.set('service', $('f-service').value);
    if ($('f-status').value) p.set('status', $('f-status').value);
    if ($('f-type').value) p.set('businessType', $('f-type').value);
    if ($('f-from').value) p.set('from', new Date($('f-from').value + 'T00:00:00').toISOString());
    if ($('f-to').value) p.set('to', new Date($('f-to').value + 'T23:59:59.999').toISOString());
    p.set('sort', sort.key); p.set('dir', sort.dir);
    return p.toString();
  }

  function renderStats(s) {
    var box = $('stats'); box.textContent = '';
    [['Total quotations', s.total, ''], ['New', s.NEW, 'new'], ['In progress', s.IN_PROGRESS, ''], ['Contacted', s.CONTACTED, ''], ['Closed', s.CLOSED, '']].forEach(function (x) {
      var d = el('div', 'stat ' + x[2]); d.appendChild(el('small', '', x[0])); d.appendChild(el('b', '', String(x[1]))); box.appendChild(d);
    });
  }

  var COLS = [['created_at', 'Date'], ['name', 'Name'], ['business', 'Business'], ['service_requested', 'Service'], ['business_type', 'Business type'], ['budget', 'Budget'], ['status', 'Status']];
  function renderList(rows, stats) {
    var host = $('list'); host.textContent = '';
    if (!rows.length) {
      host.appendChild(el('div', 'empty', stats.total === 0 ? 'No quotations yet.' : 'No quotations match those filters.'));
      $('count').textContent = ''; return;
    }
    var t = el('table'); var thead = el('thead'); var hr = el('tr');
    COLS.forEach(function (c) {
      var th = el('th'); th.setAttribute('scope', 'col');
      var b = el('button', '', c[1] + (sort.key === c[0] ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '')); b.type = 'button';
      b.addEventListener('click', function () { sort = { key: c[0], dir: sort.key === c[0] && sort.dir === 'desc' ? 'asc' : 'desc' }; load(); });
      th.setAttribute('aria-sort', sort.key === c[0] ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none');
      th.appendChild(b); hr.appendChild(th);
    });
    hr.appendChild(el('th', '', 'Actions')); thead.appendChild(hr); t.appendChild(thead);
    var tb = el('tbody');
    rows.forEach(function (q) {
      var tr = el('tr', q.status === 'NEW' ? 'is-new' : ''); tr.tabIndex = 0;
      tr.setAttribute('aria-label', 'Open quotation from ' + q.name);
      var cells = [[fmtDate(q.created_at), 'Date', ''], [q.name, 'Name', 'nm'], [q.business || '—', 'Business', ''], [q.service_requested, 'Service', ''], [q.business_type, 'Type', ''], [q.budget, 'Budget', '']];
      cells.forEach(function (c) { var td = el('td', c[2], c[0]); td.setAttribute('data-l', c[1]); tr.appendChild(td); });
      var st = el('td', 'st'); st.appendChild(badge(q.status)); tr.appendChild(st);
      var act = el('td', 'act'); var v = el('span', 'muted', 'View →'); act.appendChild(v); tr.appendChild(act);
      tr.addEventListener('click', function () { opener = tr; openDetail(q.id); });
      tr.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); opener = tr; openDetail(q.id); } });
      tb.appendChild(tr);
    });
    t.appendChild(tb); host.appendChild(t);
    $('count').textContent = rows.length + (rows.length === 1 ? ' quotation' : ' quotations') + ' shown';
  }

  function load() {
    var qs = params();
    $('export').href = '/api/admin/export?' + qs;
    return api('/api/admin/quotes?' + qs).then(function (j) { renderStats(j.stats); renderList(j.quotes, j.stats); }).catch(function (e) {
      if (e.message !== 'auth') { $('list').textContent = ''; $('list').appendChild(el('div', 'empty', 'Could not load quotations.')); }
    });
  }

  /* ---- detail drawer ---- */
  function openDrawer(on) {
    $('drawer').classList.toggle('on', on); $('scrim').classList.toggle('on', on);
    $('drawer').setAttribute('aria-hidden', String(!on));
    if (on) $('d-close').focus(); else if (opener && document.contains(opener)) opener.focus();
  }
  function fillDetail(q) {
    current = q;
    $('d-title').textContent = q.name;
    $('d-sub').textContent = q.business || 'No business name given';
    var b = $('d-badge'); b.className = 'badge ' + q.status; b.textContent = STATUS_LABEL[q.status] || q.status;
    var dl = $('d-dl'); dl.textContent = '';
    [['Client name', q.name], ['Business', q.business || '—'], ['Email', q.email], ['Phone', q.phone || '—'], ['Business type', q.business_type], ['Requested service', q.service_requested], ['Budget', q.budget], ['Timeline', q.timeline], ['Message', q.message || '—'], ['Submitted', fmtDate(q.created_at, true)], ['Status', STATUS_LABEL[q.status] || q.status]].forEach(function (r) {
      dl.appendChild(el('dt', '', r[0])); dl.appendChild(el('dd', r[0] === 'Message' ? 'msg' : '', r[1]));
    });
    $('d-email').href = 'mailto:' + encodeURI(q.email);
    var digits = (q.phone || '').replace(/[^0-9+]/g, '');
    $('d-call').style.display = digits ? '' : 'none'; if (digits) $('d-call').href = 'tel:' + digits;
    var sb = $('d-status'); sb.textContent = '';
    [['NEW', 'Mark new'], ['CONTACTED', 'Mark contacted'], ['IN_PROGRESS', 'Mark in progress'], ['CLOSED', 'Mark closed']].forEach(function (s) {
      var bt = el('button', 'btn', s[1]); bt.type = 'button'; if (q.status === s[0]) { bt.disabled = true; bt.style.opacity = '.5'; }
      bt.addEventListener('click', function () { patch({ status: s[0] }, 'Status updated.'); }); sb.appendChild(bt);
    });
    $('d-notes').value = q.notes || '';
    $('d-archive').textContent = q.status === 'ARCHIVED' ? 'Restore from archive' : 'Archive';
    $('d-msg').textContent = ''; $('d-msg').className = 'status-msg';
  }
  function openDetail(id) {
    api('/api/admin/quotes/' + encodeURIComponent(id)).then(function (j) { fillDetail(j.quote); openDrawer(true); }).catch(function () {});
  }
  function patch(body, okMsg) {
    if (!current) return;
    api('/api/admin/quotes/' + encodeURIComponent(current.id), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (j) { fillDetail(j.quote); $('d-msg').textContent = okMsg; return load(); })
      .catch(function (e) { if (e.message !== 'auth') { $('d-msg').textContent = e.message; $('d-msg').className = 'status-msg err'; } });
  }
  $('d-save').addEventListener('click', function () { patch({ notes: $('d-notes').value }, 'Notes saved.'); });
  $('d-archive').addEventListener('click', function () {
    if (!current) return;
    if (current.status === 'ARCHIVED') return patch({ status: 'NEW' }, 'Restored.');
    if (window.confirm('Archive this quotation? It will be hidden from the main list (not deleted).')) patch({ status: 'ARCHIVED' }, 'Archived.');
  });
  $('d-close').addEventListener('click', function () { openDrawer(false); });
  $('scrim').addEventListener('click', function () { openDrawer(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && $('drawer').classList.contains('on')) openDrawer(false); });

  /* ---- filters ---- */
  $('filters').addEventListener('submit', function (e) { e.preventDefault(); });
  $('f-search').addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(load, 250); });
  ['f-service', 'f-status', 'f-type', 'f-from', 'f-to'].forEach(function (id) { $(id).addEventListener('change', load); });
  $('clear').addEventListener('click', function () { $('filters').reset(); sort = { key: 'created_at', dir: 'desc' }; load(); });

  $('logout').addEventListener('click', function () {
    fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      .finally(function () { location.href = '/admin/'; });
  });

  load();
})();
</script>
</body>
</html>`;
