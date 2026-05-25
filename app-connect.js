/* ============================================================
   MINTYNEX — BACKEND CONNECTOR  (app-connect.js)  [FIXED]

   Fixes in this version:
   1. doSendOTP — reads dial value from wrap.dataset.value (custom
      button dial, not a real <select>). Also correctly targets the
      OTP send button (not the main login button).
   2. doVerifyOTP — unchanged, works correctly.
   3. doRegister — unchanged.
   4. Country select (rCountry) upgraded to searchable flag dropdown,
      matching the phone dial style.
   5. Landing page: index.html "Log In" now opens register form first.
   6. OTP auto-advance wired after otpRow is revealed.
   ============================================================ */

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */
function btnLoading(btn, text) {
  if (!btn) return () => {};
  const orig = btn.innerHTML;
  btn.disabled  = true;
  btn.innerHTML = `<span style="display:inline-flex;align-items:center;gap:7px">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
         style="animation:spin .7s linear infinite">
      <polyline points="23 4 23 10 17 10"/>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>${text || 'Loading…'}</span>`;
  return function restore() { btn.disabled = false; btn.innerHTML = orig; };
}
window.btnLoading = btnLoading;

function enterApp(user) {
  AppApi.saveUser(user);
  if (typeof USER !== 'undefined') {
    USER.nm      = user.displayName || user.username;
    USER.em      = user.email;
    USER.country = user.country || '';
    USER.bio     = user.bio || 'MintyNex Trainer';
    USER.avatarSrc = user.avatarUrl || '';
    USER.bannerSrc = user.bannerUrl || '';
  }
  document.getElementById('login-screen')?.classList.add('hidden');
  document.getElementById('shell')?.classList.add('on');
  if (typeof applyUserToUI  === 'function') applyUserToUI();
  if (typeof updatePremiumBadge === 'function') updatePremiumBadge();
  if (typeof showPg === 'function') showPg('feed');
  if (typeof showTrialPopup === 'function') showTrialPopup();
}

function apiErr(res, fallback) {
  const msg = res?.data?.message || res?.data?.error || fallback || 'Something went wrong';
  showToast(msg, 'red');
}
window.apiErr = apiErr;

/* ─────────────────────────────────────────────────────────────
   DIAL VALUE HELPER
   Reads the chosen dial code from the custom button dropdown.
   The value is stored in wrap.dataset.value by selectDial().
───────────────────────────────────────────────────────────── */
function getDialValue(prefix) {
  const wrap = document.getElementById(prefix + 'DialWrap');
  return wrap ? (wrap.dataset.value || '') : '';
}

/* ─────────────────────────────────────────────────────────────
   OTP SEND  —  THE MAIN FIX
   "Enter the Arena" button calls doSendOTP('login').
   We correctly read the custom dial button's stored value.
───────────────────────────────────────────────────────────── */
window.doSendOTP = async function (mode) {
  const prefix  = mode === 'login' ? 't' : 'r';
  const dialVal = getDialValue(prefix);
  const phoneEl = document.getElementById(prefix === 't' ? 'tPhone' : 'rPhone');
  const phoneNum = phoneEl ? phoneEl.value.trim() : '';
  const phone    = dialVal + phoneNum;

  const purposeMap = { login: 'LOGIN', register: 'REGISTER', reset: 'RESET' };
  const purpose    = purposeMap[mode] || 'LOGIN';

  // Validation
  if (!dialVal) {
    showToast('Select your country dial code first', 'red');
    document.getElementById(prefix + 'DialBtn')?.focus();
    return;
  }
  if (!phoneNum) {
    showToast('Enter your phone number', 'red');
    phoneEl?.focus();
    return;
  }

  // Find the correct button to show loading spinner on:
  // login    → "Enter the Arena" = .lbtn.acc.lbtn-pulse in #trainerForm
  // register → "Enter the Arena" = .lbtn.acc.lbtn-pulse in #registerForm
  //   (the register button has class "lbtn acc lbtn-pulse", NOT "lbtn-otp")
  const btnSel  = mode === 'login'
    ? '#trainerForm .lbtn.acc'
    : '#registerForm .lbtn.acc';
  const btn     = document.querySelector(btnSel);
  const restore = btnLoading(btn, 'Sending OTP…');

  const res = await AppApi.auth.sendOtp({ phone, purpose });
  restore();

  if (!res.ok) {
    apiErr(res, 'Failed to send OTP — check your phone number');
    return;
  }

  // DEV: parse [DEV CODE: xxxxxx] from backend message
  const devMsg  = res.data?.message || '';
  const devCode = (devMsg.match(/\[DEV CODE: (\d+)\]/) || [])[1];

  showToast(
    devCode
      ? `OTP sent! Dev code: ${devCode} 📲`
      : `OTP sent to ${phone} 📲`,
    'grn'
  );

  // Store for verify step
  window._otpPhone   = phone;
  window._otpPurpose = purpose;

  // Show the OTP input row
  const rowId  = mode === 'login' ? 'otpRowLogin' : 'otpRowRegister';
  const otpRow = document.getElementById(rowId);
  if (otpRow) {
    otpRow.style.display = 'block';
    otpRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Auto-fill boxes with dev code
    if (devCode) {
      const boxes = otpRow.querySelectorAll('.otp-box');
      devCode.split('').forEach((digit, i) => {
        if (boxes[i]) boxes[i].value = digit;
      });
    }

    // Wire auto-advance (safe to call again — idempotent)
    wireOtpBoxes(otpRow);
    const firstEmpty = [...otpRow.querySelectorAll('.otp-box')].find(b => !b.value);
    (firstEmpty || otpRow.querySelector('.otp-box'))?.focus();
  }
};

/* ─────────────────────────────────────────────────────────────
   OTP VERIFY
───────────────────────────────────────────────────────────── */
window.doVerifyOTP = async function (mode) {
  const rowId  = mode === 'login' ? 'otpRowLogin' : 'otpRowRegister';
  const otpRow = document.getElementById(rowId);
  const boxes  = otpRow ? otpRow.querySelectorAll('.otp-box') : [];
  const code   = Array.from(boxes).map(b => b.value).join('');

  const purposeMap = { login: 'LOGIN', register: 'REGISTER' };
  const purpose    = purposeMap[mode] || window._otpPurpose || 'LOGIN';
  const phone      = window._otpPhone || '';

  if (code.length < 6) { showToast('Enter all 6 digits', 'red'); return; }
  if (!phone)          { showToast('Phone missing — please send OTP again', 'red'); return; }

  const btn     = otpRow?.querySelector('.lbtn.acc');
  const restore = btnLoading(btn, 'Verifying…');

  const res = await AppApi.auth.verifyOtp({ phone, code, purpose });
  restore();

  if (!res.ok) {
    boxes.forEach(b => {
      b.style.borderColor = '#ed4245';
      setTimeout(() => { b.style.borderColor = ''; }, 1500);
    });
    apiErr(res, 'Incorrect OTP — please try again');
    return;
  }

  AppApi.saveTokens(res.data.accessToken, res.data.refreshToken);
  if (otpRow) otpRow.style.display = 'none';
  showToast('Verified! Welcome to MintyNex 🎉', 'grn');
  enterApp(res.data.user);
};

/* ─────────────────────────────────────────────────────────────
   OTP BOX AUTO-ADVANCE WIRING
───────────────────────────────────────────────────────────── */
function wireOtpBoxes(container) {
  const boxes = container.querySelectorAll('.otp-box');
  boxes.forEach((box, i) => {
    // Only wire once
    if (box.dataset.wired) return;
    box.dataset.wired = '1';
    box.addEventListener('input', () => {
      box.value = box.value.replace(/\D/g, '').slice(-1); // digits only
      if (box.value && i < boxes.length - 1) boxes[i + 1].focus();
    });
    box.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !box.value && i > 0) boxes[i - 1].focus();
    });
    box.addEventListener('paste', e => {
      e.preventDefault();
      const digits = (e.clipboardData.getData('text') || '').replace(/\D/g, '');
      digits.split('').slice(0, boxes.length).forEach((d, j) => {
        if (boxes[j]) boxes[j].value = d;
      });
      const nextEmpty = [...boxes].find(b => !b.value);
      (nextEmpty || boxes[boxes.length - 1]).focus();
    });
  });
}

/* ─────────────────────────────────────────────────────────────
   LOGIN (password-based — kept for fallback)
───────────────────────────────────────────────────────────── */
window.doLogin = async function () {
  const username = document.getElementById('tUser')?.value?.trim();
  const password = document.getElementById('tPass')?.value;
  if (!username || !password) {
    showToast('Enter your username and password', 'red');
    return;
  }
  const btn     = document.querySelector('#trainerForm .lbtn.acc');
  const restore = btnLoading(btn, 'Logging in…');
  const res = await AppApi.auth.login({ username, password });
  restore();
  if (!res.ok) { apiErr(res, 'Login failed — check your credentials'); return; }
  AppApi.saveTokens(res.data.accessToken, res.data.refreshToken);
  showToast('Welcome back, ' + (res.data.user?.username || username) + '! ⚡', 'grn');
  enterApp(res.data.user);
};

/* ─────────────────────────────────────────────────────────────
   REGISTER
───────────────────────────────────────────────────────────── */
window.doRegister = async function () {
  const username = document.getElementById('rUser')?.value?.trim();
  const email    = document.getElementById('rEmail')?.value?.trim();
  const dialVal  = getDialValue('r');
  const phoneNum = document.getElementById('rPhone')?.value?.trim();
  const phone    = dialVal + phoneNum;
  const country  = getCountrySelectValue(); // uses upgraded country dropdown
  const password = document.getElementById('rPass')?.value;

  if (!username) { showToast('Enter a username', 'red'); return; }
  if (!email)    { showToast('Enter your email', 'red'); return; }
  if (!dialVal)  { showToast('Select a dial code', 'red'); return; }
  if (!phoneNum) { showToast('Enter your phone number', 'red'); return; }
  if (!password || password.length < 8) { showToast('Password must be at least 8 characters', 'red'); return; }

  const btn     = document.querySelector('#registerForm .lbtn.acc');
  const restore = btnLoading(btn, 'Creating account…');
  const res = await AppApi.auth.register({ username, email, phone, password, country });
  restore();

  if (!res.ok) { apiErr(res, 'Registration failed'); return; }

  const devMsg  = res.data?.message || '';
  const devCode = (devMsg.match(/\[DEV CODE: (\d+)\]/) || [])[1];
  showToast(
    devCode ? `Account created! Dev OTP: ${devCode} 📲` : 'Account created! Check your phone for OTP 📲',
    'grn'
  );

  // Store phone so verify step can use it
  window._otpPhone   = phone;
  window._otpPurpose = 'REGISTER';

  const otpRow = document.getElementById('otpRowRegister');
  if (otpRow) {
    otpRow.style.display = 'block';
    if (devCode) {
      const boxes = otpRow.querySelectorAll('.otp-box');
      devCode.split('').forEach((digit, i) => { if (boxes[i]) boxes[i].value = digit; });
    }
    wireOtpBoxes(otpRow);
    otpRow.querySelector('.otp-box')?.focus();
  }
};

/* ─────────────────────────────────────────────────────────────
   COUNTRY SELECT — upgraded to searchable flag dropdown
   Replaces the plain <select id="rCountry"> with a custom
   dropdown that matches the phone dial style.
───────────────────────────────────────────────────────────── */
(function () {
  let _countryData = [];
  let _countryOpen = false;

  /* Convert ISO2 code to flag emoji */
  function toFlag(cc) {
    if (!cc || cc.length !== 2) return '🌍';
    try {
      return String.fromCodePoint(...[...cc.toUpperCase()].map(ch => 0x1F1E6 - 65 + ch.charCodeAt(0)));
    } catch (_) { return '🌍'; }
  }

  /* Build the custom country dropdown HTML and inject it */
  function buildCountryDropdown() {
    const origSelect = document.getElementById('rCountry');
    if (!origSelect || origSelect.dataset.upgraded) return;
    origSelect.dataset.upgraded = '1';
    origSelect.style.display = 'none'; // hide original

    const wrap = document.createElement('div');
    wrap.id = 'rCountryWrap';
    wrap.style.cssText = 'position:relative;width:100%';
    wrap.innerHTML = `
      <button type="button" id="rCountryBtn"
        style="width:100%;display:flex;align-items:center;gap:8px;text-align:left;
               background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);
               border-radius:8px;padding:10px 12px;color:#dbdee1;font-size:13px;
               font-weight:600;cursor:pointer;font-family:inherit;transition:all .18s">
        <span id="rCountryFlag" style="font-size:18px;line-height:1">🌍</span>
        <span id="rCountryName" style="flex:1;color:#80848e">Select country</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div id="rCountryDrop" style="display:none;position:absolute;top:calc(100% + 6px);left:0;right:0;
           z-index:500;background:#2b2d31;border:1px solid rgba(255,255,255,.1);border-radius:10px;
           box-shadow:0 8px 32px rgba(0,0,0,.5);overflow:hidden;max-height:240px;display:flex;
           flex-direction:column">
        <div style="padding:8px;border-bottom:1px solid rgba(255,255,255,.06)">
          <input id="rCountrySearch" placeholder="🔍 Search country..."
            style="width:100%;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);
                   border-radius:6px;padding:7px 10px;color:#dbdee1;font-size:12px;font-family:inherit;
                   outline:none;box-sizing:border-box"
            autocomplete="off"/>
        </div>
        <div id="rCountryList" style="overflow-y:auto;max-height:180px;overscroll-behavior:contain"></div>
      </div>`;

    origSelect.parentNode.insertBefore(wrap, origSelect);

    // Toggle
    wrap.querySelector('#rCountryBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      const drop = document.getElementById('rCountryDrop');
      if (!drop) return;
      const isOpen = drop.style.display === 'flex';
      drop.style.display = isOpen ? 'none' : 'flex';
      drop.style.flexDirection = 'column';
      if (!isOpen) {
        document.getElementById('rCountrySearch')?.focus();
        renderCountryList(_countryData);
      }
    });

    // Search
    document.getElementById('rCountrySearch')?.addEventListener('input', function () {
      const q = this.value.toLowerCase();
      const filtered = _countryData.filter(r => r.name.toLowerCase().includes(q));
      renderCountryList(filtered);
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#rCountryWrap')) {
        const drop = document.getElementById('rCountryDrop');
        if (drop) drop.style.display = 'none';
      }
    });
  }

  function renderCountryList(items) {
    const list = document.getElementById('rCountryList');
    if (!list) return;
    if (!items.length) {
      list.innerHTML = '<div style="padding:12px;text-align:center;color:#80848e;font-size:12px">No results</div>';
      return;
    }
    list.innerHTML = items.map(r => `
      <div class="country-item" data-name="${r.name}" data-code="${r.code}"
        style="display:flex;align-items:center;gap:10px;padding:9px 12px;cursor:pointer;
               font-size:13px;color:#dbdee1;transition:background .12s"
        onmouseover="this.style.background='rgba(88,101,242,.18)'"
        onmouseout="this.style.background=''"
        onclick="selectCountry(this)">
        <span style="font-size:18px;line-height:1">${toFlag(r.code)}</span>
        <span style="flex:1">${r.name}</span>
      </div>`).join('');
  }

  window.selectCountry = function (el) {
    const name = el.dataset.name;
    const code = el.dataset.code;
    const flag = toFlag(code);

    document.getElementById('rCountryFlag').textContent = flag;
    document.getElementById('rCountryName').textContent = name;
    document.getElementById('rCountryName').style.color = '#dbdee1';

    // Also set on the hidden original select so form validation still works
    const orig = document.getElementById('rCountry');
    if (orig) orig.value = name;

    // Store for doRegister to read
    const wrap = document.getElementById('rCountryWrap');
    if (wrap) wrap.dataset.value = name;

    const drop = document.getElementById('rCountryDrop');
    if (drop) drop.style.display = 'none';
  };

  /* Called by populateGlobalCountryData when country data is ready */
  window._initCountryData = function (rows) {
    _countryData = rows.map(r => ({ name: r.n, code: r.c }));
    buildCountryDropdown();
    renderCountryList(_countryData);
  };

  /* Helper used by doRegister */
  window.getCountrySelectValue = function () {
    const wrap = document.getElementById('rCountryWrap');
    if (wrap && wrap.dataset.value) return wrap.dataset.value;
    return document.getElementById('rCountry')?.value || '';
  };
})();

/* populateGlobalCountryData now calls _initDialData and _initCountryData directly in app-ui.js */

/* ─────────────────────────────────────────────────────────────
   ADMIN LOGIN
───────────────────────────────────────────────────────────── */
window.doAdminLogin = async function () {
  const email    = document.getElementById('aUser')?.value?.trim();
  const password = document.getElementById('aPass')?.value;
  if (!email || !password) { showToast('Enter admin email and password', 'red'); return; }
  const btn     = document.querySelector('#adminForm .lbtn');
  const restore = btnLoading(btn, 'Authenticating…');
  const res = await AppApi.auth.adminLogin({ email, password });
  restore();
  if (!res.ok) { apiErr(res, 'Invalid admin credentials'); return; }
  AppApi.saveTokens(res.data.accessToken, res.data.refreshToken);
  AppApi.saveUser(res.data.user);
  document.getElementById('login-screen')?.classList.add('hidden');
  document.getElementById('adm')?.classList.add('on');
  showToast('Admin panel loaded ✓', 'grn');
  loadAdminStats();
};

/* ─────────────────────────────────────────────────────────────
   LOGOUT
───────────────────────────────────────────────────────────── */
window.doLogout = async function (forced) {
  if (!forced && !confirm('Log out of MintyNex?')) return;
  AppApi.auth.logout().catch(() => {});
  AppApi.clearTokens();
  if (typeof PREMIUM !== 'undefined') {
    PREMIUM.active = false; PREMIUM.plan = 'free'; PREMIUM.trialShown = false;
  }
  document.getElementById('shell')?.classList.remove('on');
  document.getElementById('adm')?.classList.remove('on');
  document.getElementById('login-screen')?.classList.remove('hidden');
  const u = document.getElementById('tUser'); if (u) u.value = '';
  const p = document.getElementById('tPass'); if (p) p.value = '';
  showToast('Logged out.', '');
};

/* ─────────────────────────────────────────────────────────────
   FORGOT PASSWORD — fpSendOTP
───────────────────────────────────────────────────────────── */
window.fpSendOTP = async function () {
  const phoneEl = document.getElementById('forgotPhone');
  const phone   = phoneEl?.value?.trim();
  const errEl   = document.getElementById('fpEmailErr');
  if (!phone || !phone.startsWith('+') || phone.length < 8) {
    if (errEl) errEl.style.display = 'block';
    return;
  }
  if (errEl) errEl.style.display = 'none';
  window._fpPhone = phone;
  const btn     = document.getElementById('fpSendBtn');
  const restore = btnLoading(btn, 'Sending…');
  const res = await AppApi.auth.sendOtp({ phone, purpose: 'RESET' });
  restore();
  if (!res.ok) { apiErr(res, 'No account found with that phone number'); return; }
  const devMsg = res.data?.message || '';
  const devCode = (devMsg.match(/\[DEV CODE: (\d+)\]/) || [])[1];
  const hint = document.getElementById('fpEmailHint');
  if (hint) hint.textContent = 'Code sent to ' + phone + (devCode ? ' — Dev: ' + devCode : '');
  if (typeof fpGoStep === 'function') fpGoStep(2);
  showToast('OTP sent! ' + (devCode ? '(Dev: ' + devCode + ')' : 'Check your phone 📲'), 'grn');
  if (typeof fpStartTimer === 'function') fpStartTimer(60);
  const boxes = document.querySelectorAll('.fp-otp');
  boxes.forEach(function (box, i, all) {
    box.value = '';
    box.oninput   = function () { box.value = box.value.replace(/\D/g,'').slice(-1); if (box.value && i < all.length - 1) all[i + 1].focus(); };
    box.onkeydown = function (e) { if (e.key === 'Backspace' && !box.value && i > 0) all[i - 1].focus(); };
  });
  setTimeout(function () { var f = document.querySelector('.fp-otp'); if (f) f.focus(); }, 150);
};

/* ─────────────────────────────────────────────────────────────
   FORGOT PASSWORD — fpVerifyOTP
───────────────────────────────────────────────────────────── */
window.fpVerifyOTP = async function () {
  const boxes  = document.querySelectorAll('.fp-otp');
  const code   = Array.from(boxes).map(b => b.value).join('');
  const errEl  = document.getElementById('fpOtpErr');
  const phone  = window._fpPhone || '';
  if (code.length < 6) { showToast('Enter all 6 digits', 'red'); return; }
  if (!phone) { showToast('Phone missing — please go back', 'red'); return; }
  const btn     = document.querySelector('#fpStep2 .lbtn');
  const restore = btnLoading(btn, 'Checking…');
  const res = await AppApi.auth.verifyOtp({ phone, code, purpose: 'RESET' });
  restore();
  if (!res.ok) {
    if (errEl) errEl.style.display = 'block';
    boxes.forEach(b => { b.style.borderColor = '#ed4245'; setTimeout(() => { b.style.borderColor = ''; }, 1500); });
    return;
  }
  if (errEl) errEl.style.display = 'none';
  window._fpResetToken = code;
  if (typeof fpGoStep === 'function') fpGoStep(3);
  showToast('Code verified ✅', 'grn');
  setTimeout(() => { document.getElementById('fpNewPass')?.focus(); }, 150);
};

/* ─────────────────────────────────────────────────────────────
   FORGOT PASSWORD — fpSetNewPassword
───────────────────────────────────────────────────────────── */
window.fpSetNewPassword = async function () {
  const np    = document.getElementById('fpNewPass')?.value;
  const cp    = document.getElementById('fpConfPass')?.value;
  const errEl = document.getElementById('fpPassErr');
  const phone = window._fpPhone || '';
  const otp   = window._fpResetToken || '';
  if (!np || np.length < 8) {
    if (errEl) { errEl.textContent = 'Password must be at least 8 characters'; errEl.style.display = 'block'; }
    return;
  }
  if (np !== cp) {
    if (errEl) { errEl.textContent = 'Passwords do not match'; errEl.style.display = 'block'; }
    return;
  }
  if (errEl) errEl.style.display = 'none';
  const btn     = document.querySelector('#fpStep3 .lbtn');
  const restore = btnLoading(btn, 'Saving…');
  const res = await AppApi.auth.resetPassword({ phone, otp, newPassword: np });
  restore();
  if (!res.ok) { apiErr(res, 'Password reset failed'); return; }
  if (typeof fpGoStep === 'function') fpGoStep(4);
};

/* ─────────────────────────────────────────────────────────────
   FEED  —  owned by app-feed.js (renderFeed / submitPost live there)
───────────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────────
   BINDER
───────────────────────────────────────────────────────────── */
window.renderBinder = async function () {
  const grid = document.getElementById('binderGrid');
  if (!grid) return;
  grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:30px;color:#80848e">Loading binder…</div>';
  const res = await AppApi.binder.get(0, 18);
  if (!res.ok) {
    if (typeof CARDS !== 'undefined') {
      grid.innerHTML = '';
      CARDS.slice(0, 8).forEach((cd, i) => {
        const img = cd.img ? `<img class="hc-real-card" src="${cd.img}" alt="${cd.nm}" loading="lazy" onerror="this.style.display='none'"/>` : '';
        grid.innerHTML += `<div class="hc" data-card="${i}" style="background:${cd.bg}"><div class="hc-gl"></div><div class="hc-sw"></div>${img}<div class="hc-grade-badge">${cd.gr}</div></div>`;
      });
      grid.innerHTML += '<div class="hc hc-e" data-action="addcard"><div style="font-size:22px;color:rgba(88,101,242,.4)">+</div><div style="font-size:9px;color:#80848e">Add Card</div></div>';
    }
    return;
  }
  const cards = res.data?.content || res.data || [];
  grid.innerHTML = '';
  cards.forEach((card, i) => {
    const img = card.imageUrl ? `<img class="hc-real-card" src="${card.imageUrl}" alt="${card.cardName}" loading="lazy" onerror="this.style.display='none'"/>` : '';
    grid.innerHTML += `
      <div class="hc" data-card="${i}" data-card-id="${card.id}" style="background:linear-gradient(135deg,#1e1b4b,#4338ca)">
        <div class="hc-gl"></div><div class="hc-sw"></div>
        ${img}
        <div class="hc-grade-badge">${card.grade || 'Raw'}</div>
      </div>`;
  });
  grid.innerHTML += '<div class="hc hc-e" data-action="addcard"><div style="font-size:22px;color:rgba(88,101,242,.4)">+</div><div style="font-size:9px;color:#80848e">Add Card</div></div>';
  const totalEl = document.querySelector('#pg-binder .stat-v');
  if (totalEl) totalEl.textContent = res.data?.totalElements || cards.length;
};

/* ─────────────────────────────────────────────────────────────
   PLAYERS
───────────────────────────────────────────────────────────── */
window.renderPartners = async function (localList) {
  if (localList && localList.length) { _renderLocalPartners(localList); return; }
  const res = await AppApi.users.search('');
  if (!res.ok) { if (typeof TRAINERS !== 'undefined') _renderLocalPartners(TRAINERS); return; }
  const users = res.data?.content || res.data || [];
  if (!users.length) { if (typeof TRAINERS !== 'undefined') _renderLocalPartners(TRAINERS); return; }
  _renderLocalPartners(users.map(u => ({
    em: u.username?.[0]?.toUpperCase() || '?', nm: u.username,
    loc: [u.city, u.country].filter(Boolean).join(', ') || 'Global',
    cards: 0, trades: 0, rep: '5.0', v: u.verified, on: false,
    bg: 'linear-gradient(135deg,rgba(88,101,242,.3),rgba(0,210,255,.2))',
  })));
};

function _renderLocalPartners(list) {
  ['partnersList','tradePL'].forEach(cid => {
    const c = document.getElementById(cid);
    if (!c) return;
    if (!list?.length) { c.innerHTML = '<div style="text-align:center;padding:28px;color:#80848e">No trainers found.</div>'; return; }
    c.innerHTML = list.map(t => {
      const od  = t.on ? '<div style="position:absolute;bottom:1px;right:1px;width:9px;height:9px;border-radius:50%;background:#23a55a;border:2px solid #2b2d31"></div>' : '';
      const vb  = t.v  ? '<span class="bdg bdg-v">✓</span>' : '';
      const isMe = typeof USER !== 'undefined' && USER?.nm === t.nm;
      const actions = isMe
        ? '<div style="display:flex;gap:5px"><button class="btn bgh bxs bfw" data-pg="profile">View Profile</button></div>'
        : `<div style="display:flex;gap:5px">
             <button class="btn bgrn bxs bfw" data-action="friend" data-nm="${t.nm}">Add</button>
             <button class="btn brd bxs" data-pg="messages">Message</button>
             <button class="btn bgh bxs" data-action="addreview" data-nm="${t.nm}">Review</button>
           </div>`;
      return `<div class="tc">
        <div class="tc-ban" style="background:${t.bg}"><span style="position:relative;z-index:1">${t.em}</span></div>
        <div class="tc-body">
          <div class="tc-avrow"><div class="tc-av" style="background:${t.bg};position:relative">${t.em}${od}</div><div>${vb}</div></div>
          <div class="tc-nm">${t.nm}</div>
          <div class="tc-loc">${t.loc}</div>
          <div class="tc-stats">
            <div class="tcs"><div class="tcsv">${t.cards}</div><div class="tcsl">Cards</div></div>
            <div class="tcs"><div class="tcsv">${t.trades}</div><div class="tcsl">Trades</div></div>
            <div class="tcs"><div class="tcsv">★${t.rep}</div><div class="tcsl">Rep</div></div>
          </div>
          ${actions}
        </div>
      </div>`;
    }).join('');
  });
}

/* ─────────────────────────────────────────────────────────────
   MESSAGES
───────────────────────────────────────────────────────────── */
window.sendMessage = async function () {
  const inp  = document.getElementById('msgInput');
  const text = inp?.value?.trim();
  if (!text) return;
  const receiverId = window._activeChatUserId;
  if (!receiverId) {
    const list = document.getElementById('msgList');
    if (list) {
      const row = document.createElement('div');
      row.className = 'brow me';
      row.innerHTML = `<div class="bav">🔥</div><div class="bbl me">${text.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`;
      list.appendChild(row); list.scrollTop = list.scrollHeight;
    }
    if (inp) inp.value = '';
    return;
  }
  const res = await AppApi.messages.send(receiverId, { content: text });
  if (!res.ok) { apiErr(res, 'Message failed'); return; }
  const list = document.getElementById('msgList');
  if (list && res.data) {
    const row = document.createElement('div');
    row.className = 'brow me';
    row.innerHTML = `<div class="bav">🔥</div><div class="bbl me">${res.data.content.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`;
    list.appendChild(row); list.scrollTop = list.scrollHeight;
  }
  if (inp) inp.value = '';
};

/* ─────────────────────────────────────────────────────────────
   PROFILE
───────────────────────────────────────────────────────────── */
window.saveProfile = async function () {
  const displayName = document.getElementById('settName')?.value?.trim();
  const bio         = document.getElementById('settBio')?.value;
  const country     = document.getElementById('settCountry')?.value;
  const btn     = document.querySelector('[data-action="saveprofile"]');
  const restore = btnLoading(btn, 'Saving…');
  const res = await AppApi.users.update({ displayName, bio, country });
  restore();
  if (!res.ok) { apiErr(res, 'Could not save profile'); return; }
  if (typeof USER !== 'undefined') {
    if (displayName) USER.nm  = displayName;
    if (bio)         USER.bio = bio;
    if (country)     USER.country = country;
  }
  if (typeof applyUserToUI === 'function') applyUserToUI();
  showToast('Profile saved! ✓', 'grn');
};

/* ─────────────────────────────────────────────────────────────
   PHOTO UPLOAD
───────────────────────────────────────────────────────────── */
window.handlePhotoUpload = function (input, type) {
  const file = input.files[0];
  if (!file) return;
  input.value = '';
  if (!file.type.startsWith('image/')) { showToast('Please select an image file', 'red'); return; }
  if (file.size > 10 * 1024 * 1024)   { showToast('Image too large — max 10MB', 'red'); return; }
  const reader = new FileReader();
  reader.onload = async function (e) {
    const dataUrl = e.target.result;
    if (type === 'avatar') {
      document.querySelectorAll('.avbtn,.dh-av,#profAvEl,#binderAv,#postAv').forEach(el => {
        if (!el) return;
        el.style.background = 'transparent';
        el.innerHTML = `<img src="${dataUrl}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`;
      });
      if (typeof USER !== 'undefined') USER.avatarSrc = dataUrl;
    } else {
      const ban = document.querySelector('.prof-ban');
      if (ban) { ban.style.background = `url(${dataUrl}) center/cover no-repeat`; }
      if (typeof USER !== 'undefined') USER.bannerSrc = dataUrl;
    }
    showToast('Uploading…', '');
    const fd = new FormData();
    fd.append('file', file);
    const res = type === 'avatar' ? await AppApi.users.uploadAvatar(fd) : await AppApi.users.uploadBanner(fd);
    if (!res.ok) { showToast('Upload failed — photo saved locally only', 'red'); return; }
    const cdnUrl = res.data?.avatarUrl || res.data?.bannerUrl;
    if (cdnUrl && type === 'avatar') {
      document.querySelectorAll('.avbtn,.dh-av,#profAvEl,#binderAv,#postAv').forEach(el => {
        const img = el.querySelector('img'); if (img) img.src = cdnUrl;
      });
      if (typeof USER !== 'undefined') USER.avatarSrc = cdnUrl;
    } else if (cdnUrl) {
      const ban = document.querySelector('.prof-ban');
      if (ban) ban.style.background = `url(${cdnUrl}) center/cover no-repeat`;
      if (typeof USER !== 'undefined') USER.bannerSrc = cdnUrl;
    }
    showToast(type === 'avatar' ? 'Profile photo updated! ✓' : 'Banner updated! ✓', 'grn');
  };
  reader.readAsDataURL(file);
};

/* ─────────────────────────────────────────────────────────────
   TRADE
───────────────────────────────────────────────────────────── */
window.proposeTrade = async function () {
  const meetup = document.getElementById('tradeMeetup')?.value?.trim();
  const note   = document.getElementById('tradeNote')?.value?.trim();
  if (!meetup) { showToast('Add a meetup location first!', 'red'); document.getElementById('tradeMeetup')?.focus(); return; }
  const btn     = document.querySelector('[data-action="proposetrade"]');
  const restore = btnLoading(btn, 'Sending…');
  const res = await AppApi.trades.propose({ meetupLocation: meetup, message: note || '', proposerCard: 'Selected card', receiverCard: 'Requested card', receiverId: window._tradePartnerId || null });
  restore();
  if (!res.ok) { apiErr(res, 'Could not send trade proposal'); return; }
  showToast('Trade proposal sent! 🤝', 'grn');
  if (typeof tradeTab === 'function') tradeTab('active');
};

/* ─────────────────────────────────────────────────────────────
   ADMIN
───────────────────────────────────────────────────────────── */
async function loadAdminStats() {
  const res = await AppApi.admin.stats();
  if (!res.ok) return;
  const d = res.data;
  const statBoxes = document.querySelectorAll('#as-overview .stat-v');
  if (statBoxes[0]) statBoxes[0].textContent = (d.totalUsers    || 0).toLocaleString();
  if (statBoxes[1]) statBoxes[1].textContent = (d.totalListings || 0).toLocaleString();
  if (statBoxes[2]) statBoxes[2].textContent = (d.totalTrades   || 0).toLocaleString();
  if (statBoxes[3]) statBoxes[3].textContent = '$' + ((d.volumeUsd || 0) / 1000).toFixed(1) + 'K';
  document.querySelectorAll('[data-live="online"]').forEach(el => { el.textContent = (d.onlineNow || 0).toLocaleString(); });
  if (!window._adminStatsInterval) {
    window._adminStatsInterval = setInterval(() => {
      if (document.getElementById('adm')?.classList.contains('on')) loadAdminStats();
      else { clearInterval(window._adminStatsInterval); window._adminStatsInterval = null; }
    }, 15000);
  }
}

/* ─────────────────────────────────────────────────────────────
   AUTO-LOGIN
───────────────────────────────────────────────────────────── */
async function tryAutoLogin() {
  const rt   = localStorage.getItem('mx_refresh');
  const user = AppApi.getStoredUser();
  if (!rt || !user) return;
  const res = await AppApi.auth.refresh({ refreshToken: rt });
  if (!res.ok) { AppApi.clearTokens(); return; }
  AppApi.saveTokens(res.data.accessToken, rt);
  const meRes = await AppApi.users.me();
  enterApp(meRes.ok ? meRes.data : user);
}

/* ─────────────────────────────────────────────────────────────
   UTILITY
───────────────────────────────────────────────────────────── */
function timeAgo(isoString) {
  if (!isoString) return 'Just now';
  const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

function initLiveCounters() {
  let online = Math.floor(300 + Math.random() * 200);
  let users  = 8420 + Math.floor(Math.random() * 50);
  let trades = 3412 + Math.floor(Math.random() * 20);
  function tick() {
    document.querySelectorAll('[data-live="online"]').forEach(el => el.textContent = online.toLocaleString());
    document.querySelectorAll('[data-live="users"]').forEach(el  => el.textContent = users.toLocaleString());
    document.querySelectorAll('[data-live="trades"]').forEach(el => el.textContent = trades.toLocaleString());
  }
  setInterval(() => { online = Math.max(180, Math.min(900, online + Math.floor(Math.random()*15)-7)); tick(); }, 4000 + Math.random()*4000);
  setInterval(() => { if (Math.random()>.6) users++; if (Math.random()>.5) trades++; tick(); }, 30000);
  tick();
}

(function () {
  if (document.getElementById('mx-spin-style')) return;
  const style = document.createElement('style');
  style.id = 'mx-spin-style';
  style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(style);
})();

/* ─────────────────────────────────────────────────────────────
   INIT
───────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
  initLiveCounters();
  tryAutoLogin();

  // Wire OTP boxes that already exist in the DOM
  document.querySelectorAll('.otp-row').forEach(row => wireOtpBoxes(row));

  // Re-run country/dial population so _initDialData and _initCountryData are ready
  if (typeof populateGlobalCountryData === 'function') populateGlobalCountryData();

  // Notification polling
  setInterval(async () => {
    if (!AppApi.accessToken) return;
    const res = await AppApi.notifications.unreadCount();
    if (!res.ok) return;
    const count = res.data?.count || 0;
    const badge = document.getElementById('nBdg');
    if (badge) { badge.textContent = count; badge.style.display = count > 0 ? 'flex' : 'none'; }
  }, 60000);
});