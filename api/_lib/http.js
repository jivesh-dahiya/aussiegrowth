'use strict';
// Small helpers that work on both Vercel functions and the local dev server.
const crypto = require('crypto');

function send(res, status, body, headers = {}) {
  res.statusCode = status;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  if (body !== null && typeof body === 'object' && !Buffer.isBuffer(body)) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(body));
  } else {
    res.end(body == null ? '' : body);
  }
}

async function readJson(req, limit = 32 * 1024) {
  const fail = (status, msg) => Object.assign(new Error(msg), { status });
  const ctype = String(req.headers['content-type'] || '');
  if (!ctype.toLowerCase().startsWith('application/json')) throw fail(415, 'Expected JSON');
  let raw;
  try {
    if (req.body !== undefined && req.body !== null) {
      if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
        // Vercel already parsed it — the size limit still applies.
        if (Array.isArray(req.body) || JSON.stringify(req.body).length > limit) throw fail(413, 'Too large');
        return req.body;
      }
      raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body);
    } else {
      const chunks = [];
      let size = 0;
      for await (const c of req) {
        size += c.length;
        if (size > limit) throw fail(413, 'Too large');
        chunks.push(c);
      }
      raw = Buffer.concat(chunks).toString('utf8');
    }
  } catch (e) {
    if (e.status) throw e;
    throw fail(400, 'Bad body');
  }
  if (raw.length > limit) throw fail(413, 'Too large');
  try {
    const v = JSON.parse(raw || '{}');
    if (v === null || typeof v !== 'object' || Array.isArray(v)) throw new Error('shape');
    return v;
  } catch {
    throw fail(400, 'Bad JSON');
  }
}

function clientIp(req) {
  // x-real-ip is set by Vercel's edge and can't be supplied by the client.
  const real = String(req.headers['x-real-ip'] || '').trim();
  const xff = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return real || xff || (req.socket && req.socket.remoteAddress) || 'unknown';
}

// We only ever store a salted hash of the IP (for rate limiting), never the IP itself.
function hashIp(req) {
  return crypto.createHash('sha256').update(clientIp(req) + '|' + (process.env.SESSION_SECRET || 'ag')).digest('hex').slice(0, 24);
}

// CSRF defence in depth (cookies are also SameSite=Strict): browsers always send
// Origin / Sec-Fetch-Site on cross-site POSTs, so reject anything not same-origin.
function sameOrigin(req) {
  const sfs = req.headers['sec-fetch-site'];
  if (sfs && sfs !== 'same-origin' && sfs !== 'none') return false;
  const origin = req.headers.origin;
  if (origin) {
    try { if (new URL(origin).host !== req.headers.host) return false; } catch { return false; }
  }
  return true;
}

function parseCookies(req) {
  const out = {};
  String(req.headers.cookie || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

function isHttps(req) {
  return req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
}

module.exports = { send, readJson, clientIp, hashIp, sameOrigin, parseCookies, isHttps };
