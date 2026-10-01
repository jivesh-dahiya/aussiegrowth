#!/usr/bin/env node
// Usage: node scripts/hash-password.js            (prompts)
//        node scripts/hash-password.js "my password"
// Prints the ADMIN_PASSWORD_HASH value to put in your Vercel env vars. The password itself is never stored.
const readline = require('readline');
const { hashPassword } = require('../api/_lib/auth');
const done = (pw) => {
  if (!pw || pw.length < 12) { console.error('Use a password of at least 12 characters.'); process.exit(1); }
  console.log('\nADMIN_PASSWORD_HASH=' + hashPassword(pw));
  console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex') + '   (a fresh random one, if you need it)\n');
};
if (process.argv[2]) done(process.argv[2]);
else { const rl = readline.createInterface({ input: process.stdin, output: process.stdout }); rl.question('New admin password (12+ chars): ', (p) => { rl.close(); done(p); }); }
