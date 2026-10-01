// Admin login form. Auth itself is enforced server-side (api/admin/login.js).
(function () {
  var f = document.getElementById('f'), err = document.getElementById('err'), go = document.getElementById('go');
  // Already signed in? Skip straight to the dashboard (the server still verifies the session).
  fetch('/api/admin/session', { credentials: 'same-origin' }).then(function (r) { if (r.ok) location.replace('/admin/dashboard'); }).catch(function () {});
  f.addEventListener('submit', function (e) {
    e.preventDefault(); err.textContent = '';
    var email = f.email.value.trim(), password = f.password.value;
    if (!email || !password) { err.textContent = 'Enter your email and password.'; return; }
    go.disabled = true;
    fetch('/api/admin/login', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email, password: password }) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) {
        if (x.ok) { location.href = '/admin/dashboard'; return; }
        err.textContent = x.j.error || 'Something went wrong.'; go.disabled = false; f.password.value = ''; f.password.focus();
      })
      .catch(function () { err.textContent = 'Couldn’t reach the server. Try again.'; go.disabled = false; });
  });
})();
