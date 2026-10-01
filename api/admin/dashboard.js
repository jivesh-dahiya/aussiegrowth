'use strict';
// The dashboard HTML is only ever returned to an authenticated session.
// (It lives in api/_lib so it is never served as a public static file.)
const crypto = require('crypto');
const { send } = require('../_lib/http');
const auth = require('../_lib/auth');
const html = require('../_lib/dashboard');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' }, { Allow: 'GET' });
  if (!(await auth.getLiveSession(req).catch(() => null))) return send(res, 302, '', { Location: '/admin/' });
  const nonce = crypto.randomBytes(16).toString('base64');
  return send(res, 200, html.replace('<script>', `<script nonce="${nonce}">`), {
    'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; img-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`,
    'Content-Type': 'text/html; charset=utf-8',
    'X-Frame-Options': 'DENY',
    'X-Robots-Tag': 'noindex, nofollow',
    'Referrer-Policy': 'no-referrer',
  });
};
