'use strict';
// Real server-side auth: scrypt password hash + HMAC-signed, HttpOnly session cookie.
// Config (env only, never committed): ADMIN_EMAIL, ADMIN_PASSWORD_HASH, SESSION_SECRET (>=32 chars).
const crypto = require('crypto');
const { send, parseCookies, isHttps } = require('./http');
const store = require('./store');

const COOKIE = 'ag_admin';
const TTL_SECONDS = 8 * 60 * 60;

const b64u = (b) => Buffer.from(b).toString('base64url');
const secret = () => { const s = process.env.SESSION_SECRET; return s && s.length >= 32 ? s : null; };
const mac = (data) => crypto.createHmac('sha256', secret()).update(data).digest('base64url');
const eq = (a, b) => { const x = Buffer.from(String(a)); const y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

function adminConfigured() { return !!(secret() && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD_HASH); }

// Hash format: scrypt$N$r$p$saltB64$hashB64  (create one with scripts/hash-password.js)
function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const N = 16384; const r = 8; const p = 1;
  const h = crypto.scryptSync(password, salt, 64, { N, r, p });
  return ['scrypt', N, r, p, salt.toString('base64'), h.toString('base64')].join('$');
}
function verifyPassword(password, stored) {
  try {
    const [alg, N, r, p, saltB, hashB] = String(stored).split('$');
    if (alg !== 'scrypt') return false;
    const hash = Buffer.from(hashB, 'base64');
    const test = crypto.scryptSync(password, Buffer.from(saltB, 'base64'), hash.length, { N: +N, r: +r, p: +p, maxmem: 128 * +N * +r * 2 });
    return crypto.timingSafeEqual(test, hash);
  } catch { return false; }
}
const DUMMY = ['scrypt', 16384, 8, 1, Buffer.alloc(16).toString('base64'), Buffer.alloc(64).toString('base64')].join('$');

// Always does the same amount of work whether or not the email is right.
function checkCredentials(email, password) {
  const emailOk = eq(String(email).trim().toLowerCase(), String(process.env.ADMIN_EMAIL || '').trim().toLowerCase());
  const pwOk = verifyPassword(String(password), process.env.ADMIN_PASSWORD_HASH || DUMMY);
  return emailOk && pwOk;
}

// Ties every session to the current password hash: change the password => all sessions die.
const pv = () => crypto.createHash('sha256').update(String(process.env.ADMIN_PASSWORD_HASH || '')).digest('hex').slice(0, 12);

function issueCookie(req, res) {
  const now = Math.floor(Date.now() / 1000);
  const body = b64u(JSON.stringify({ sub: String(process.env.ADMIN_EMAIL).trim().toLowerCase(), iat: now, exp: now + TTL_SECONDS, pv: pv(), jti: crypto.randomBytes(12).toString('base64url') }));
  const token = body + '.' + mac(body);
  const flags = ['HttpOnly', 'SameSite=Strict', 'Path=/', 'Max-Age=' + TTL_SECONDS];
  if (isHttps(req)) flags.push('Secure');
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; ${flags.join('; ')}`);
}
function clearCookie(req, res) {
  const flags = ['HttpOnly', 'SameSite=Strict', 'Path=/', 'Max-Age=0'];
  if (isHttps(req)) flags.push('Secure');
  res.setHeader('Set-Cookie', `${COOKIE}=; ${flags.join('; ')}`);
}

function getSession(req) {
  if (!adminConfigured()) return null;
  const token = parseCookies(req)[COOKIE];
  if (!token || token.length > 1000) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig || !eq(sig, mac(body))) return null;
  try {
    const s = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!s.exp || s.exp < Math.floor(Date.now() / 1000)) return null;
    if (s.pv !== pv() || s.sub !== String(process.env.ADMIN_EMAIL).trim().toLowerCase()) return null;
    return s;
  } catch { return null; }
}

// Logout is enforced server-side: the token's id is recorded as revoked, so a copied
// cookie stops working immediately instead of living on until its expiry.
const revokedKey = (s) => 'revoked:' + s.jti;
async function getLiveSession(req) {
  const s = getSession(req);
  if (!s || !s.jti) return null;
  return (await store.count(revokedKey(s), TTL_SECONDS * 1000)) ? null : s;
}
async function revoke(req) {
  const s = getSession(req);
  if (s && s.jti) await store.hit(revokedKey(s), TTL_SECONDS * 1000);
}

// Every protected endpoint calls this FIRST.
async function requireAdmin(req, res) {
  if (!adminConfigured()) { send(res, 503, { error: 'Admin is not configured.', code: 'NOT_CONFIGURED' }); return null; }
  let s;
  try { s = await getLiveSession(req); } catch (e) { console.error('session check failed:', e.code || e.name); send(res, 500, { error: 'Something went wrong.' }); return null; }
  if (!s) { send(res, 401, { error: 'Not signed in.', code: 'UNAUTHENTICATED' }); return null; }
  return s;
}

module.exports = { adminConfigured, hashPassword, verifyPassword, checkCredentials, issueCookie, clearCookie, getSession, getLiveSession, revoke, requireAdmin };
