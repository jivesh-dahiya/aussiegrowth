'use strict';
// Persistence layer. Production = Postgres (DATABASE_URL, parameterised queries only).
// Local development without DATABASE_URL = a JSON file in .data/ (refused on Vercel/production,
// so quotes can never silently vanish on an ephemeral serverless filesystem).
const fs = require('fs');
const path = require('path');

let mode = null;
let pool = null;
let initPromise = null;

const COLS = ['id', 'created_at', 'updated_at', 'name', 'business', 'email', 'phone', 'business_type', 'service_requested', 'budget', 'timeline', 'message', 'status', 'notes', 'source', 'page_url'];

function getMode() {
  if (mode) return mode;
  if (process.env.DATABASE_URL) mode = 'pg';
  else if (!process.env.VERCEL && process.env.NODE_ENV !== 'production') mode = 'file';
  else throw Object.assign(new Error('No database configured'), { code: 'NO_DB' });
  return mode;
}

function getPool() {
  if (!pool) {
    const { Pool } = require('pg');
    pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, idleTimeoutMillis: 10000 });
  }
  return pool;
}

// Test hook: inject a Pool-compatible object (pg-mem).
function _useTestPool(p) { pool = p; mode = 'pg'; initPromise = null; }
function _reset() { mode = null; pool = null; initPromise = null; }

/* ---------------- file store (dev only) ---------------- */
const filePath = () => process.env.QUOTES_FILE || path.join(__dirname, '..', '..', '.data', 'quotes.json');
let chain = Promise.resolve();
const locked = (fn) => { const p = chain.then(fn); chain = p.catch(() => {}); return p; };
function readFile() {
  try { return JSON.parse(fs.readFileSync(filePath(), 'utf8')); } catch { return { quotes: [], hits: [] }; }
}
function writeFile(data) {
  const f = filePath();
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const tmp = f + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, f);
}

/* ---------------- postgres ---------------- */
async function init() {
  if (getMode() !== 'pg') return;
  if (!initPromise) {
    initPromise = (async () => {
      const p = getPool();
      await p.query(`CREATE TABLE IF NOT EXISTS quotes (
        id text PRIMARY KEY, created_at text NOT NULL, updated_at text NOT NULL,
        name text NOT NULL, business text NOT NULL, email text NOT NULL, phone text NOT NULL,
        business_type text NOT NULL, service_requested text NOT NULL, budget text NOT NULL, timeline text NOT NULL,
        message text NOT NULL, status text NOT NULL, notes text NOT NULL, source text NOT NULL, page_url text NOT NULL)`);
      await p.query('CREATE TABLE IF NOT EXISTS rate_limits (key text NOT NULL, ts bigint NOT NULL)');
      await p.query('CREATE INDEX IF NOT EXISTS rate_limits_key_ts ON rate_limits (key, ts)');
    })().catch((e) => { initPromise = null; throw e; });
  }
  return initPromise;
}

const fromRow = (r) => (r ? Object.fromEntries(COLS.map((c) => [c, r[c]])) : null);

async function insertQuote(q) {
  const now = new Date().toISOString();
  const rec = { id: require('crypto').randomUUID(), created_at: now, updated_at: now, status: 'NEW', notes: '', source: 'website', ...q };
  if (getMode() === 'file') {
    await locked(() => { const d = readFile(); d.quotes.push(rec); writeFile(d); });
    return rec;
  }
  await init();
  await getPool().query(`INSERT INTO quotes (${COLS.join(',')}) VALUES (${COLS.map((_, i) => '$' + (i + 1)).join(',')})`, COLS.map((c) => rec[c] ?? ''));
  return rec;
}

async function listAll() {
  if (getMode() === 'file') return readFile().quotes.slice();
  await init();
  const r = await getPool().query('SELECT * FROM quotes ORDER BY created_at DESC');
  return r.rows.map(fromRow);
}

async function getQuote(id) {
  if (getMode() === 'file') return readFile().quotes.find((q) => q.id === id) || null;
  await init();
  const r = await getPool().query('SELECT * FROM quotes WHERE id = $1', [id]);
  return fromRow(r.rows[0]);
}

async function updateQuote(id, patch) {
  const now = new Date().toISOString();
  if (getMode() === 'file') {
    return locked(() => {
      const d = readFile();
      const q = d.quotes.find((x) => x.id === id);
      if (!q) return null;
      if (patch.status !== undefined) q.status = patch.status;
      if (patch.notes !== undefined) q.notes = patch.notes;
      q.updated_at = now;
      writeFile(d);
      return q;
    });
  }
  await init();
  const cur = await getQuote(id);
  if (!cur) return null;
  const status = patch.status !== undefined ? patch.status : cur.status;
  const notes = patch.notes !== undefined ? patch.notes : cur.notes;
  await getPool().query('UPDATE quotes SET status = $1, notes = $2, updated_at = $3 WHERE id = $4', [status, notes, now, id]);
  return getQuote(id);
}

// Records a hit and returns how many hits this key has had inside the window.
async function hit(key, windowMs) {
  const now = Date.now();
  if (getMode() === 'file') {
    return locked(() => {
      const d = readFile();
      d.hits = (d.hits || []).filter((h) => h.ts > now - 86400000);
      d.hits.push({ key, ts: now });
      writeFile(d);
      return d.hits.filter((h) => h.key === key && h.ts > now - windowMs).length;
    });
  }
  await init();
  const p = getPool();
  await p.query('INSERT INTO rate_limits (key, ts) VALUES ($1, $2)', [key, now]);
  if (Math.random() < 0.05) await p.query('DELETE FROM rate_limits WHERE ts < $1', [now - 86400000]);
  const r = await p.query('SELECT COUNT(*) AS n FROM rate_limits WHERE key = $1 AND ts > $2', [key, now - windowMs]);
  return parseInt(r.rows[0].n, 10);
}

// How many hits a key has inside the window, without recording a new one.
async function count(key, windowMs) {
  const since = Date.now() - windowMs;
  if (getMode() === 'file') return (readFile().hits || []).filter((h) => h.key === key && h.ts > since).length;
  await init();
  const r = await getPool().query('SELECT COUNT(*) AS n FROM rate_limits WHERE key = $1 AND ts > $2', [key, since]);
  return parseInt(r.rows[0].n, 10);
}

module.exports = { count, insertQuote, listAll, getQuote, updateQuote, hit, init, _useTestPool, _reset };
