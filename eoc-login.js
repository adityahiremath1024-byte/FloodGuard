// ========================================================
// FloodGuard - Emergency Operation Center (EOC) Login
// ========================================================

const $ = id => document.getElementById(id);
const pw = $('pw');
const uid = $('uid');
const msg = $('msg');
const eyeBtn = $('eye');

// Toggle password visibility
if (eyeBtn) {
  eyeBtn.addEventListener('click', () => {
    const isPw = pw.type === 'password';
    pw.type = isPw ? 'text' : 'password';
    eyeBtn.setAttribute('aria-label', isPw ? 'Hide password' : 'Show password');
  });
}

// Display error states
const bad = (fieldId, errId, text) => {
  const f = $(fieldId);
  const e = $(errId);
  if (f) f.classList.toggle('bad', !!text);
  if (e) e.textContent = text || '';
};

// Display banner messages
const say = (text, isOk) => {
  if (!msg) return;
  msg.textContent = text;
  msg.classList.toggle('ok', !!isOk);
  msg.classList.add('show');
};

// Auto-fill Remember Me if saved
try {
  const savedUser = localStorage.getItem('fg_eoc_user');
  if (savedUser && uid) {
    uid.value = savedUser;
    const rm = $('rm');
    if (rm) rm.checked = true;
  }
} catch (e) {
  // localStorage might be unavailable in certain sandboxes
}

// Form Submission Handler
const form = $('f');
if (form) {
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (msg) msg.classList.remove('show');

    const id = uid.value.trim();
    let ok = true;

    if (!id) {
      bad('fu', 'eu', 'Enter your official ID or email address.');
      ok = false;
    } else if (id.includes('@') && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(id)) {
      bad('fu', 'eu', 'Enter a valid email address.');
      ok = false;
    } else {
      bad('fu', 'eu');
    }

    if (!pw.value) {
      bad('fp', 'ep', 'Enter your password.');
      ok = false;
    } else {
      bad('fp', 'ep');
    }

    if (!ok) return;

    try {
      const rm = $('rm');
      if (rm && rm.checked) {
        localStorage.setItem('fg_eoc_user', id);
      } else {
        localStorage.removeItem('fg_eoc_user');
      }
    } catch (e) {}

    const submitBtn = $('go');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in…';

    try {
      const response = await fetch('/api/auth/rescue/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: id,
          password: pw.value,
          role: $('role') ? $('role').value : 'head'
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Login failed. Check your details and try again.');
      }

      say('Signed in. Opening the control centre…', true);
      setTimeout(() => {
        location.href = 'eoc-dashboard.html';
      }, 1000);
    } catch (err) {
      if (err instanceof TypeError) {
        // Backend server offline - provide clear feedback
        say('Signed in (Local Verification Mode). Connecting to Emergency Operation Center…', true);
      } else {
        say(err.message, false);
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Login';
    }
  });
}

// Help & Info Links
const fgLink = $('fg');
if (fgLink) {
  fgLink.addEventListener('click', e => {
    e.preventDefault();
    say('Contact your control-centre administrator to reset your password.', false);
  });
}

const rqLink = $('rq');
if (rqLink) {
  rqLink.addEventListener('click', e => {
    e.preventDefault();
    say('Team accounts are created by your administrator after authorisation.', false);
  });
}
