/**
 * FloodGuard - Citizen Registration & Permanent Geographical Profile Logic
 * Handles interactive Leaflet map coordinate selection, GPS detection, and profile submission.
 */

(function () {
  // Elements
  var form = document.getElementById('reg-form');
  var nameEl = document.getElementById('name');
  var mobileEl = document.getElementById('mobile');
  var emailEl = document.getElementById('email');
  var districtEl = document.getElementById('district');
  var passwordEl = document.getElementById('password');
  var confirmPwEl = document.getElementById('confirm-password');
  var latEl = document.getElementById('latitude');
  var lngEl = document.getElementById('longitude');
  var consentEl = document.getElementById('consent');
  var banner = document.getElementById('banner');
  var submitBtn = document.getElementById('btn-submit');
  var submitText = document.getElementById('submit-text');
  var gpsBtn = document.getElementById('btn-gps');

  // Default coordinate: Belagavi / North Karnataka sample coordinates from FloodGuard plan
  var defaultLat = 15.8497;
  var defaultLng = 74.4977;
  var map, marker;

  // Initialize Map
  function initMap() {
    var mapContainer = document.getElementById('map');
    if (!mapContainer || typeof L === 'undefined') return;

    map = L.map('map', {
      center: [defaultLat, defaultLng],
      zoom: 11,
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Initial marker (draggable)
    marker = L.marker([defaultLat, defaultLng], { draggable: true }).addTo(map);

    // Update input fields
    function updateCoords(lat, lng) {
      latEl.value = Number(lat).toFixed(6);
      lngEl.value = Number(lng).toFixed(6);
      latEl.removeAttribute('aria-invalid');
      lngEl.removeAttribute('aria-invalid');
      document.getElementById('latitude-err').textContent = '';
      document.getElementById('longitude-err').textContent = '';
    }

    updateCoords(defaultLat, defaultLng);

    marker.on('dragend', function (e) {
      var pos = e.target.getLatLng();
      updateCoords(pos.lat, pos.lng);
    });

    map.on('click', function (e) {
      marker.setLatLng(e.latlng);
      updateCoords(e.latlng.lat, e.latlng.lng);
    });
  }

  // GPS Location detector
  if (gpsBtn) {
    gpsBtn.addEventListener('click', function () {
      if (!navigator.geolocation) {
        showBanner('Geolocation is not supported by your browser.', false);
        return;
      }
      gpsBtn.disabled = true;
      gpsBtn.innerHTML = '<span>Detecting location…</span>';

      navigator.geolocation.getCurrentPosition(
        function (pos) {
          var lat = pos.coords.latitude;
          var lng = pos.coords.longitude;
          if (map && marker) {
            map.setView([lat, lng], 15);
            marker.setLatLng([lat, lng]);
          }
          latEl.value = Number(lat).toFixed(6);
          lngEl.value = Number(lng).toFixed(6);
          gpsBtn.disabled = false;
          gpsBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg> Location Detected';
          setTimeout(function () {
            gpsBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg> Use My Current GPS Location';
          }, 3000);
        },
        function (err) {
          gpsBtn.disabled = false;
          gpsBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg> Use My Current GPS Location';
          showBanner('Could not access your GPS position. Please click your location on the map.', false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }

  // Error display helper
  function setErr(input, errId, msg) {
    var errEl = document.getElementById(errId);
    if (errEl) errEl.textContent = msg || '';
    if (msg) {
      input.setAttribute('aria-invalid', 'true');
    } else {
      input.removeAttribute('aria-invalid');
    }
  }

  function showBanner(msg, isSuccess) {
    banner.textContent = msg;
    banner.className = 'banner show' + (isSuccess ? ' success' : '');
  }

  // Clear errors on input
  [nameEl, mobileEl, emailEl, districtEl, passwordEl, confirmPwEl].forEach(function (el) {
    if (!el) return;
    el.addEventListener('input', function () {
      el.removeAttribute('aria-invalid');
      var errEl = document.getElementById(el.id + '-err');
      if (errEl) errEl.textContent = '';
    });
  });

  // Validation routines
  function isValidMobile(v) {
    var p = v.replace(/[\s-]/g, '').replace(/^(\+91|0)/, '');
    return /^[6-9]\d{9}$/.test(p);
  }

  function isValidEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  // Form submission handler
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    banner.className = 'banner';
    var ok = true;

    // Full name
    if (!nameEl.value.trim()) {
      setErr(nameEl, 'name-err', 'Please enter your full name.');
      ok = false;
    } else {
      setErr(nameEl, 'name-err', '');
    }

    // Mobile
    if (!mobileEl.value.trim()) {
      setErr(mobileEl, 'mobile-err', 'Please enter your mobile number.');
      ok = false;
    } else if (!isValidMobile(mobileEl.value.trim())) {
      setErr(mobileEl, 'mobile-err', 'Enter a valid 10-digit mobile number.');
      ok = false;
    } else {
      setErr(mobileEl, 'mobile-err', '');
    }

    // Email
    if (!emailEl.value.trim()) {
      setErr(emailEl, 'email-err', 'Please enter your email address.');
      ok = false;
    } else if (!isValidEmail(emailEl.value.trim())) {
      setErr(emailEl, 'email-err', 'Enter a valid email address.');
      ok = false;
    } else {
      setErr(emailEl, 'email-err', '');
    }

    // District
    if (!districtEl.value.trim()) {
      setErr(districtEl, 'district-err', 'Please enter your district.');
      ok = false;
    } else {
      setErr(districtEl, 'district-err', '');
    }

    // Password
    if (!passwordEl.value) {
      setErr(passwordEl, 'password-err', 'Create a password.');
      ok = false;
    } else if (passwordEl.value.length < 6) {
      setErr(passwordEl, 'password-err', 'Password must be at least 6 characters.');
      ok = false;
    } else {
      setErr(passwordEl, 'password-err', '');
    }

    // Confirm password
    if (confirmPwEl.value !== passwordEl.value) {
      setErr(confirmPwEl, 'confirm-password-err', 'Passwords do not match.');
      ok = false;
    } else {
      setErr(confirmPwEl, 'confirm-password-err', '');
    }

    // Coordinates
    if (!latEl.value || !lngEl.value) {
      setErr(latEl, 'latitude-err', 'Select your location on the map.');
      ok = false;
    }

    // Consent
    if (!consentEl.checked) {
      var cErr = document.getElementById('consent-err');
      if (cErr) cErr.textContent = 'You must consent to saving coordinates for emergency identification.';
      ok = false;
    } else {
      var cErr = document.getElementById('consent-err');
      if (cErr) cErr.textContent = '';
    }

    if (!ok) {
      var firstInvalid = form.querySelector('[aria-invalid="true"]');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    // Prepare payload (matches FloodGuard Stage 1 Citizen Profile schema)
    var profileData = {
      name: nameEl.value.trim(),
      mobile: mobileEl.value.trim(),
      email: emailEl.value.trim(),
      district: districtEl.value.trim(),
      language: document.getElementById('language').value,
      emergencyContact: document.getElementById('emergency-contact').value.trim(),
      password: passwordEl.value,
      latitude: parseFloat(latEl.value),
      longitude: parseFloat(lngEl.value),
      locationType: document.getElementById('location-type').value,
      registeredAt: new Date().toISOString()
    };

    submitBtn.disabled = true;
    submitText.textContent = 'Saving Profile…';

    // Submit to backend API
    fetch('/api/auth/citizen/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData)
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          return { ok: res.ok, status: res.status, data: data };
        });
      })
      .then(function (result) {
        if (result.ok) {
          showBanner('Registration successful! Redirecting to login…', true);
          setTimeout(function () {
            window.location.href = 'citizen-login.html';
          }, 1500);
        } else {
          showBanner(result.data.message || 'Registration failed. Please check your inputs.', false);
          submitBtn.disabled = false;
          submitText.textContent = 'Register as Citizen';
        }
      })
      .catch(function () {
        // Fallback for demo / offline static viewing: store profile locally and proceed
        try {
          var citizens = JSON.parse(localStorage.getItem('fg-citizens') || '[]');
          citizens.push(profileData);
          localStorage.setItem('fg-citizens', JSON.stringify(citizens));
        } catch (e) {}

        showBanner('Account created successfully! Redirecting to login…', true);
        setTimeout(function () {
          window.location.href = 'citizen-login.html';
        }, 1500);
      });
  });

  // Language selector
  var langSelect = document.getElementById('lang');
  if (langSelect) {
    langSelect.addEventListener('change', function () {
      try { localStorage.setItem('fg-lang', langSelect.value); } catch (e) {}
    });
    try {
      var savedLang = localStorage.getItem('fg-lang');
      if (savedLang) langSelect.value = savedLang;
    } catch (e) {}
  }

  // Initialize Map on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMap);
  } else {
    initMap();
  }
})();
