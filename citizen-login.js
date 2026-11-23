(function () {
  var form = document.getElementById('login');
  var idEl = document.getElementById('id'), pwEl = document.getElementById('pw');
  var idErr = document.getElementById('id-err'), pwErr = document.getElementById('pw-err');
  var banner = document.getElementById('banner'), btn = document.getElementById('go'), btnT = document.getElementById('go-t');
  var toggle = document.getElementById('toggle');

  toggle.addEventListener('click', function () {
    var show = pwEl.type === 'password';
    pwEl.type = show ? 'text' : 'password';
    toggle.setAttribute('aria-pressed', String(show));
    toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });

  function setErr(input, el, msg) {
    el.textContent = msg || '';
    if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  }
  function validId(v) {
    var p = v.replace(/[\s-]/g, '').replace(/^(\+91|0)/, '');
    return /^[6-9]\d{9}$/.test(p) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }
  function reset() { btn.disabled = false; btnT.textContent = 'Login'; }
  function fail(msg) { banner.textContent = msg; banner.classList.add('show'); reset(); }

  // Clear an error as soon as the person starts correcting it
  [idEl, pwEl].forEach(function (el) {
    el.addEventListener('input', function () {
      el.removeAttribute('aria-invalid');
      (el === idEl ? idErr : pwErr).textContent = '';
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    banner.classList.remove('show');
    var id = idEl.value.trim(), ok = true;

    if (!id) { setErr(idEl, idErr, 'Enter your mobile number or email.'); ok = false; }
    else if (!validId(id)) { setErr(idEl, idErr, 'Enter a 10-digit mobile number or a valid email address.'); ok = false; }
    else setErr(idEl, idErr, '');

    if (!pwEl.value) { setErr(pwEl, pwErr, 'Enter your password.'); ok = false; }
    else setErr(pwEl, pwErr, '');

    if (!ok) { (idEl.getAttribute('aria-invalid') ? idEl : pwEl).focus(); return; }

    btn.disabled = true; btnT.textContent = 'Signing in…';

    // Change this URL to match your Express route.
    fetch('/api/auth/citizen/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ identifier: id, password: pwEl.value, remember: form.remember.checked })
    })
    .then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (d) { return { res: res, d: d }; });
    })
    .then(function (r) {
      if (r.res.ok) { window.location.href = r.d.redirect || '/citizen/dashboard.html'; return; }
      fail(r.res.status === 401 ? 'The number/email or password is incorrect. Check both and try again.'
         : r.res.status === 429 ? 'Too many attempts. Wait a few minutes and try again.'
         : (r.d.message || 'Something went wrong on our side. Try again in a moment.'));
    })
    .catch(function () { fail('Could not reach the server. Check your internet connection and try again.'); });
  });

  var lang = document.getElementById('lang');
  lang.addEventListener('change', function () {
    try { localStorage.setItem('fg-lang', lang.value); } catch (e) {}
    // Hook your translation loader in here.
  });
  try { var l = localStorage.getItem('fg-lang'); if (l) lang.value = l; } catch (e) {}
})();
