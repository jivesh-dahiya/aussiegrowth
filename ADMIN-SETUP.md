# Quotes + Admin — setup (5 minutes, one time)

Quote requests are stored server-side in Postgres and read only through the authenticated admin.
Nothing works in production until these 4 environment variables exist (Vercel → Project → Settings → Environment Variables):

| Variable | What it is |
|---|---|
| `DATABASE_URL` | Postgres connection string. Easiest: Vercel → Storage → add **Neon Postgres** (Marketplace) and connect it to the project; it sets this for you. Tables are created automatically on first use. |
| `ADMIN_EMAIL` | The login email/username. |
| `ADMIN_PASSWORD_HASH` | Run `npm install && node scripts/hash-password.js`, type a 12+ char password, paste the printed hash. **The password itself is never stored anywhere.** |
| `SESSION_SECRET` | 32+ random characters (the same script prints one). Changing it, or changing the password hash, logs everyone out. |

Then redeploy. Visit `/admin`, log in, and you'll see `NO QUOTATIONS YET.` until the first real submission.

Without `DATABASE_URL` the site **refuses to accept quotes on Vercel** (it returns an error instead of silently losing them). Locally (`npm run dev`) it falls back to a JSON file in `.data/` so you can try it.

## Security model
- Auth is server-side: scrypt-hashed password (env var), HMAC-signed session cookie — `HttpOnly`, `SameSite=Strict`, `Secure` on https, 8-hour expiry, bound to the current password hash.
- Every `/api/admin/*` endpoint checks the session **before** touching data. `/admin/dashboard` HTML is only ever sent to a signed-in session (it is not a public static file).
- Login: generic error for any bad credential, 10 attempts / 15 min per client. Quote form: honeypot, 5 / hour per client, strict allow-list validation, parameterised SQL only, CSRF/origin checks.
- Only a salted hash of the visitor IP is kept (for rate limiting). Internal notes are never exported or sent to clients. No delete — archive only.

## Before launch
- Contact details live in `js/content.js` (`site.*`) and are also written into the HTML/JSON-LD. After editing `js/content.js` (projects, FAQs, audiences) run `npm run prerender`.
- After the first deploy, confirm `https://YOURSITE/api/_lib/store.js` and `https://YOURSITE/admin-private/` both 404, and `https://YOURSITE/api/admin/quotes` returns 401.

## Tests
`npm run dev` then `node scripts/qa.mjs` sweeps every route at 10 viewport widths for overflow, broken images and console errors.

`npm test` runs the full quote → admin → CSV → logout journey in headless Chromium against both the file store and a Postgres-compatible in-memory database.
