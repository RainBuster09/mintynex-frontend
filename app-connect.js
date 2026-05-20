/* ============================================================
   MINTYNEX — BACKEND CONNECTOR  (app-connect.js)
   
   This file replaces every fake/hardcoded function in
   app-ui.js with real API calls to the Spring Boot backend.

   LOAD ORDER in app.html (bottom of <body>):
     <script src="app-feed.js"></script>
     <script src="app-api.js"></script>
     <script src="app-ui.js"></script>
     <script src="app-connect.js"></script>   ← add this last

   app-connect.js overrides functions defined in app-ui.js,
   so it must come after it.
   ============================================================ */

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */

/** Show a loading spinner on a button and disable it.
 *  Returns a function to restore the button. */
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

/** Hides login screen, shows main app shell. */
function enterApp(user) {
  AppApi.saveUser(user);
  // Populate USER object used by existing app-ui.js code
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

/** Handle API error — show toast with backend message or fallback. */
function apiErr(res, fallback) {
  const msg = res?.data?.message || res?.data?.error || fallback || 'Something went wrong';
  showToast(msg, 'red');
}

/* ─────────────────────────────────────────────────────────────
   AUTH — LOGIN (username + password)
───────────────────────────────────────────────────────────── */
window.doLogin = async function () {
  const uEl = document.getElementById('tUser');
  const pEl = document.getElementById('tPass');
  const username = uEl?.value?.trim();
  const password = pEl?.value;

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
   AUTH — REGISTER
───────────────────────────────────────────────────────────── */
window.doRegister = async function () {
  const username = document.getElementById('rUser')?.value?.trim();
  const email    = document.getElementById('rEmail')?.value?.trim();
  const phone    = (document.getElementById('rDial')?.value || '') +
                   (document.getElementById('rPhone')?.value?.trim() || '');
  const country  = document.getElementById('rCountry')?.value || '';
  const password = document.getElementById('rPass')?.value;

  if (!username) { showToast('Enter a username', 'red'); return; }
  if (!email)    { showToast('Enter your email', 'red'); return; }
  if (!phone || phone.length < 7) { showToast('Select dial code and enter phone number', 'red'); return; }
  if (!password || password.length < 8) { showToast('Password must be at least 8 characters', 'red'); return; }

  const btn     = document.querySelector('#registerForm .lbtn.acc');
  const restore = btnLoading(btn, 'Creating account…');

  const res = await AppApi.auth.register({ username, email, phone, password, country });
  restore();

  if (!res.ok) { apiErr(res, 'Registration failed'); return; }

  // DEV: backend returns the OTP code in the message for easy testing (no SMS needed)
  const devMsg  = res.data?.message || '';
  const devCode = devMsg.match(/\[DEV CODE: (\d+)\]/)?.[1];
  const toastMsg = devCode
    ? `Account created! Dev OTP: ${devCode} 📲`
    : 'Account created! Check your phone for OTP 📲';
  showToast(toastMsg, 'grn');

  // Show OTP row so user can verify phone right away
  const otpRow = document.getElementById('otpRowRegister');
  if (otpRow) {
    otpRow.style.display = 'block';
    // Auto-fill the OTP boxes if we have the dev code
    if (devCode) {
      const boxes = otpRow.querySelectorAll('.otp-box');
      devCode.split('').forEach((digit, i) => { if (boxes[i]) boxes[i].value = digit; });
    }
    otpRow.querySelector('.otp-box')?.focus();
  }
};

/* ─────────────────────────────────────────────────────────────
   AUTH — SEND OTP
───────────────────────────────────────────────────────────── */
window.doSendOTP = async function (mode) {
  const isLogin    = mode === 'login';
  const dialEl     = document.getElementById(isLogin ? 'tDial'  : 'rDial');
  const phoneEl    = document.getElementById(isLogin ? 'tPhone' : 'rPhone');
  const phone      = (dialEl?.value || '') + (phoneEl?.value?.trim() || '');

  // Map mode string to backend Purpose enum
  const purposeMap = { login: 'LOGIN', register: 'REGISTER', reset: 'RESET' };
  const purpose    = purposeMap[mode] || 'LOGIN';

  if (!dialEl?.value)      { showToast('Select your country dial code', 'red'); dialEl?.focus(); return; }
  if (!phoneEl?.value?.trim()) { showToast('Enter your phone number', 'red'); phoneEl?.focus(); return; }

  const btnSel  = isLogin
    ? '#trainerForm .lbtn-otp'
    : '#registerForm .lbtn-otp';
  const btn     = document.querySelector(btnSel);
  const restore = btnLoading(btn, 'Sending…');

  const res = await AppApi.auth.sendOtp({ phone, purpose });
  restore();

  if (!res.ok) { apiErr(res, 'Failed to send OTP'); return; }

  // DEV: backend returns the OTP code in the message
  const devMsg  = res.data?.message || '';
  const devCode = devMsg.match(/\[DEV CODE: (\d+)\]/)?.[1];
  showToast(devCode ? `OTP sent — Dev code: ${devCode} 📲` : 'OTP sent to ' + phone + ' 📲', 'grn');

  const rowId  = isLogin ? 'otpRowLogin' : 'otpRowRegister';
  const otpRow = document.getElementById(rowId);
  if (otpRow) {
    otpRow.style.display = 'block';
    // Auto-fill boxes with dev code
    if (devCode) {
      const boxes = otpRow.querySelectorAll('.otp-box');
      devCode.split('').forEach((digit, i) => { if (boxes[i]) boxes[i].value = digit; });
    }
    otpRow.querySelector('.otp-box')?.focus();
  }

  // Store phone for verify step
  window._otpPhone   = phone;
  window._otpPurpose = purpose;
};

/* ─────────────────────────────────────────────────────────────
   AUTH — VERIFY OTP  (login or register)
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
  if (!phone)          { showToast('Phone number missing — please re-send OTP', 'red'); return; }

  const btn     = otpRow?.querySelector('.lbtn.acc');
  const restore = btnLoading(btn, 'Verifying…');

  const res = await AppApi.auth.verifyOtp({ phone, code, purpose });
  restore();

  if (!res.ok) {
    boxes.forEach(b => { b.style.borderColor = '#ed4245'; setTimeout(() => { b.style.borderColor = ''; }, 1500); });
    apiErr(res, 'Incorrect OTP — please try again');
    return;
  }

  AppApi.saveTokens(res.data.accessToken, res.data.refreshToken);
  if (otpRow) otpRow.style.display = 'none';
  showToast('Verified! Welcome to MintyNex 🎉', 'grn');
  enterApp(res.data.user);
};

/* ─────────────────────────────────────────────────────────────
   AUTH — ADMIN LOGIN
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

  // Load real stats immediately
  loadAdminStats();
};

/* ─────────────────────────────────────────────────────────────
   AUTH — LOGOUT
───────────────────────────────────────────────────────────── */
window.doLogout = async function (forced) {
  if (!forced && !confirm('Log out of MintyNex?')) return;

  // Tell backend to invalidate refresh token (best-effort)
  AppApi.auth.logout().catch(() => {});
  AppApi.clearTokens();

  // Reset local state
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
   FORGOT PASSWORD — fpSendOTP (step 1)
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

  const hint = document.getElementById('fpEmailHint');
  // DEV: backend includes the OTP code in the message — display it for easy testing
  const devMsg = res.data?.message || '';
  if (hint) hint.textContent = 'Code sent to ' + phone + (devMsg.includes('DEV CODE') ? ' — ' + devMsg.match(/\[DEV CODE: (\d+)\]/)?.[1] : '');
  if (typeof fpGoStep === 'function') fpGoStep(2);
  showToast('OTP sent! ' + (devMsg.includes('DEV CODE') ? '(Dev: ' + devMsg.match(/\[DEV CODE: (\d+)\]/)?.[1] + ')' : 'Check your phone 📲'), 'grn');
  if (typeof fpStartTimer === 'function') fpStartTimer(60);

  // Wire OTP boxes
  const boxes = document.querySelectorAll('.fp-otp');
  boxes.forEach(function (box, i, all) {
    box.value = '';
    box.oninput   = function () { if (box.value && i < all.length - 1) all[i + 1].focus(); };
    box.onkeydown = function (e) { if (e.key === 'Backspace' && !box.value && i > 0) all[i - 1].focus(); };
  });
  setTimeout(function () { var f = document.querySelector('.fp-otp'); if (f) f.focus(); }, 150);
};

/* ─────────────────────────────────────────────────────────────
   FORGOT PASSWORD — fpVerifyOTP (step 2)
───────────────────────────────────────────────────────────── */
window.fpVerifyOTP = async function () {
  const boxes   = document.querySelectorAll('.fp-otp');
  const code    = Array.from(boxes).map(b => b.value).join('');
  const errEl   = document.getElementById('fpOtpErr');
  const phone   = window._fpPhone || '';

  if (code.length < 6) { showToast('Enter all 6 digits', 'red'); return; }
  if (!phone) { showToast('Phone missing — please go back and re-enter your phone', 'red'); return; }

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

  const btn     = document.querySelector('#fpStep2 .lbtn');
  const restore = btnLoading(btn, 'Checking…');

  // Verify OTP — backend accepts email+code+purpose for RESET flow
  const res = await AppApi.auth.verifyOtp({ email, code, purpose: 'RESET' });
  restore();

  if (!res.ok) {
    if (errEl) errEl.style.display = 'block';
    boxes.forEach(b => { b.style.borderColor = '#ed4245'; setTimeout(() => { b.style.borderColor = ''; }, 1500); });
    return;
  }

  if (errEl) errEl.style.display = 'none';
  // Store the reset token returned by backend (if any)
  window._fpResetToken = res.data?.resetToken || code;
  if (typeof fpGoStep === 'function') fpGoStep(3);
  showToast('Code verified ✅', 'grn');
  setTimeout(() => { document.getElementById('fpNewPass')?.focus(); }, 150);
};

/* ─────────────────────────────────────────────────────────────
   FORGOT PASSWORD — fpSetNewPassword (step 3)
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
   FEED — load real posts from backend
───────────────────────────────────────────────────────────── */
let _feedPage   = 0;
let _feedLoading = false;

window.renderFeed = async function () {
  const container = document.getElementById('feedCards');
  if (!container) return;

  // First paint: show skeleton
  if (_feedPage === 0) {
    container.innerHTML = [1,2,3].map(() => `
      <div class="post" style="opacity:.5">
        <div class="post-hd">
          <div class="post-av" style="background:#383a40"></div>
          <div style="flex:1;margin-left:10px">
            <div style="height:12px;background:#383a40;border-radius:4px;width:40%;margin-bottom:6px"></div>
            <div style="height:10px;background:#2b2d31;border-radius:4px;width:25%"></div>
          </div>
        </div>
        <div style="height:200px;background:#383a40;border-radius:8px;margin:10px 0"></div>
        <div style="height:12px;background:#2b2d31;border-radius:4px;width:80%;margin-bottom:6px"></div>
        <div style="height:12px;background:#2b2d31;border-radius:4px;width:60%"></div>
      </div>`).join('');
  }

  const res = await AppApi.posts.feed(_feedPage, 20);

  if (!res.ok) {
    // Fallback to local POSTS array if API not connected yet
    if (typeof POSTS !== 'undefined' && POSTS.length) {
      container.innerHTML = '';
      POSTS.forEach((post, idx) => {
        if (typeof buildPostEl === 'function') container.appendChild(buildPostEl(post, idx));
      });
    }
    return;
  }

  const posts = res.data?.content || res.data || [];
  if (_feedPage === 0) container.innerHTML = '';

  if (posts.length === 0 && _feedPage === 0) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:#80848e">No posts yet. Be the first to share a pull! 🔥</div>';
    return;
  }

  posts.forEach(post => {
    // Map backend PostResponse to the shape buildPostEl expects
    const mapped = {
      id:       post.id,
      user:     post.username,
      flag:     '',
      rank:     'Trainer',
      verified: false,
      time:     timeAgo(post.createdAt),
      avatar:   post.avatarUrl ? `<img src="${post.avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>` : '🔥',
      bg:       'linear-gradient(135deg,#1e1b4b,#4338ca)',
      cardBg:   'rgba(88,101,242,0.15)',
      cardImg:  post.imageUrl  || '',
      label:    post.cardLabel || '',
      caption:  post.caption   || '',
      tags:     (post.tags || '').split(',').map(t => t.trim()).filter(Boolean),
      likes:    post.likesCount    || 0,
      comments: post.commentsCount || 0,
      shares:   post.sharesCount   || 0,
      liked:    false,
      shared:   false,
    };
    // Push into POSTS array so like/comment actions still work
    if (typeof POSTS !== 'undefined') {
      const existing = POSTS.findIndex(p => p.id === mapped.id);
      if (existing === -1) POSTS.push(mapped);
    }
    if (typeof buildPostEl === 'function') container.appendChild(buildPostEl(mapped, POSTS ? POSTS.length - 1 : 0));
  });
};

/* ─────────────────────────────────────────────────────────────
   FEED — submit new post
───────────────────────────────────────────────────────────── */
window.submitPost = async function () {
  const input = document.getElementById('postInput');
  const text  = input?.value?.trim();
  if (!text) { showToast('Type something first!', 'red'); return; }

  const btn     = document.getElementById('postBtn');
  const restore = btnLoading(btn, 'Posting…');

  const res = await AppApi.posts.create({ caption: text });
  restore();

  if (!res.ok) { apiErr(res, 'Post failed'); return; }

  if (input) input.value = '';
  showToast('Post shared! 🔥', 'grn');
  _feedPage = 0;
  if (typeof POSTS !== 'undefined') POSTS.length = 0;
  renderFeed();
  document.querySelector('#pg-feed .scr')?.scrollTo({ top: 0, behavior: 'smooth' });
};

/* ─────────────────────────────────────────────────────────────
   BINDER — load real binder from backend
───────────────────────────────────────────────────────────── */
window.renderBinder = async function () {
  const grid = document.getElementById('binderGrid');
  if (!grid) return;

  grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:30px;color:#80848e">Loading binder…</div>';

  const res = await AppApi.binder.get(0, 18);

  if (!res.ok) {
    // Fallback to local CARDS array
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

  // Add card button
  grid.innerHTML += '<div class="hc hc-e" data-action="addcard"><div style="font-size:22px;color:rgba(88,101,242,.4)">+</div><div style="font-size:9px;color:#80848e">Add Card</div></div>';

  // Update stats
  const totalEl = document.querySelector('#pg-binder .stat-v');
  if (totalEl) totalEl.textContent = res.data?.totalElements || cards.length;
};

/* ─────────────────────────────────────────────────────────────
   PLAYERS — load real trainers from backend
───────────────────────────────────────────────────────────── */
window.renderPartners = async function (localList) {
  // If we got a local list (e.g. filtered) just use the existing renderer
  if (localList && localList.length) {
    _renderLocalPartners(localList);
    return;
  }

  // Otherwise fetch from backend
  const res = await AppApi.users.search('');

  if (!res.ok) {
    // Fallback to local TRAINERS
    if (typeof TRAINERS !== 'undefined') _renderLocalPartners(TRAINERS);
    return;
  }

  const users = res.data?.content || res.data || [];
  if (!users.length) {
    if (typeof TRAINERS !== 'undefined') _renderLocalPartners(TRAINERS);
    return;
  }

  // Map backend UserInfo to local trainer shape
  const mapped = users.map(u => ({
    em:     u.username ? u.username[0].toUpperCase() : '?',
    nm:     u.username,
    loc:    [u.city, u.country].filter(Boolean).join(', ') || 'Global',
    cards:  u.cards  || 0,
    trades: u.trades || 0,
    rep:    u.rep    || '5.0',
    v:      u.verified,
    on:     false,
    bg:     'linear-gradient(135deg,rgba(88,101,242,.3),rgba(0,210,255,.2))',
  }));
  _renderLocalPartners(mapped);
};

function _renderLocalPartners(list) {
  ['partnersList', 'tradePL'].forEach(cid => {
    const c = document.getElementById(cid);
    if (!c) return;
    if (!list || !list.length) {
      c.innerHTML = '<div style="text-align:center;padding:28px;color:#80848e">No trainers found.</div>';
      return;
    }
    c.innerHTML = list.map(t => {
      const od     = t.on ? '<div style="position:absolute;bottom:1px;right:1px;width:9px;height:9px;border-radius:50%;background:#23a55a;border:2px solid #2b2d31"></div>' : '';
      const vb     = t.v  ? '<span class="bdg bdg-v">✓</span>' : '';
      const isMe   = typeof USER !== 'undefined' && USER && USER.nm === t.nm;
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
   MESSAGES — send real message
───────────────────────────────────────────────────────────── */
window.sendMessage = async function () {
  const inp    = document.getElementById('msgInput');
  const text   = inp?.value?.trim();
  if (!text) return;

  // Get current conversation partner ID from the active chat header
  const receiverId = window._activeChatUserId;

  if (!receiverId) {
    // No real chat open — just do the local UI demo
    const list = document.getElementById('msgList');
    if (list) {
      const row = document.createElement('div');
      row.className = 'brow me';
      row.innerHTML = `<div class="bav">🔥</div><div class="bbl me">${text.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`;
      list.appendChild(row);
      list.scrollTop = list.scrollHeight;
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
    list.appendChild(row);
    list.scrollTop = list.scrollHeight;
  }
  if (inp) inp.value = '';
};

/* ─────────────────────────────────────────────────────────────
   NOTIFICATIONS — load real notifications
───────────────────────────────────────────────────────────── */
async function loadNotifications() {
  const res = await AppApi.notifications.list();
  if (!res.ok) return;

  const items = res.data?.content || res.data || [];
  const count = await AppApi.notifications.unreadCount();
  const unread = count.ok ? (count.data?.count || 0) : 0;

  const badge = document.getElementById('nBdg');
  if (badge) { badge.textContent = unread; badge.style.display = unread > 0 ? 'flex' : 'none'; }

  const container = document.querySelector('#pg-notifs .scr');
  if (!container || !items.length) return;

  const existingHeader = container.querySelector('.sh');
  if (existingHeader) existingHeader.nextElementSibling?.remove?.();

  // Prepend real notifications before the static ones
  const frag = document.createDocumentFragment();
  items.forEach(n => {
    const div = document.createElement('div');
    div.className = 'ni' + (n.read ? '' : ' unread');
    div.innerHTML = `
      <div class="ni-ic" style="background:rgba(88,101,242,.14);color:#7289da">${iconForType(n.type)}</div>
      <div style="flex:1">
        <div style="font-weight:700;font-size:12px;margin-bottom:2px;color:#fff">${n.type}</div>
        <div style="font-size:11px;color:#dbdee1;line-height:1.5">${n.message}</div>
        <div style="font-size:10px;color:#80848e;margin-top:3px">${timeAgo(n.createdAt)}</div>
      </div>
      ${n.read ? '' : '<div class="ni-dot"></div>'}`;
    frag.appendChild(div);
  });
}

function iconForType(type) {
  const map = { LIKE: '❤️', COMMENT: '💬', TRADE: '⇄', MESSAGE: '✉️', SYSTEM: '🔔' };
  return map[type] || '🔔';
}

/* ─────────────────────────────────────────────────────────────
   ADMIN — load real stats
───────────────────────────────────────────────────────────── */
async function loadAdminStats() {
  const res = await AppApi.admin.stats();
  if (!res.ok) return;

  const d = res.data;

  // Overview stat boxes
  const statBoxes = document.querySelectorAll('#as-overview .stat-v');
  if (statBoxes[0]) statBoxes[0].textContent = (d.totalUsers  || 0).toLocaleString();
  if (statBoxes[1]) statBoxes[1].textContent = (d.totalListings || 0).toLocaleString();
  if (statBoxes[2]) statBoxes[2].textContent = (d.totalTrades || 0).toLocaleString();
  if (statBoxes[3]) statBoxes[3].textContent = '$' + ((d.volumeUsd || 0) / 1000).toFixed(1) + 'K';

  // Online now
  document.querySelectorAll('[data-live="online"]').forEach(el => {
    el.textContent = (d.onlineNow || 0).toLocaleString();
  });

  // Trade success rate
  const rateEl = document.querySelector('#as-overview .g2 .card:first-child div:first-child');
  if (rateEl) rateEl.textContent = (d.tradeSuccessRate || 0) + '%';

  // Live activity log
  const activityLog = document.querySelector('#as-overview .card:nth-child(2)');
  if (activityLog && d.recentActivity?.length) {
    const logItems = d.recentActivity.slice(0, 5).map(ev => `
      <div class="lrow" style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.04)">
        <div style="width:7px;height:7px;border-radius:50%;background:${ev.type === 'trade' ? '#23a55a' : ev.type === 'signup' ? '#5865f2' : '#f59e0b'};flex-shrink:0"></div>
        <span style="font-size:12px;flex:1;margin-left:8px">${ev.msg}</span>
        <span class="bdg bdg-g">${ev.time}</span>
      </div>`).join('');
    const header = activityLog.querySelector('div:first-child');
    if (header) header.insertAdjacentHTML('afterend', logItems);
  }

  // Auto-refresh every 15 seconds while admin panel is open
  if (!window._adminStatsInterval) {
    window._adminStatsInterval = setInterval(() => {
      if (document.getElementById('adm')?.classList.contains('on')) {
        loadAdminStats();
      } else {
        clearInterval(window._adminStatsInterval);
        window._adminStatsInterval = null;
      }
    }, 15000);
  }
}

/* ─────────────────────────────────────────────────────────────
   PROFILE — save real profile changes
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
  const pb = document.getElementById('profBioEl');
  if (pb && bio) pb.textContent = bio;

  showToast('Profile saved! ✓', 'grn');
};

/* ─────────────────────────────────────────────────────────────
   PHOTO UPLOAD — real multipart upload to backend
───────────────────────────────────────────────────────────── */
window.handlePhotoUpload = function (input, type) {
  const file = input.files[0];
  if (!file) return;
  input.value = ''; // reset so same file can be re-chosen

  if (!file.type.startsWith('image/')) { showToast('Please select an image file', 'red'); return; }
  if (file.size > 10 * 1024 * 1024)   { showToast('Image too large — max 10MB', 'red'); return; }

  const reader = new FileReader();
  reader.onload = async function (e) {
    const dataUrl = e.target.result;

    // 1. Show locally immediately (fast feedback)
    if (type === 'avatar') {
      document.querySelectorAll('.avbtn,.dh-av,#profAvEl,#binderAv,#postAv').forEach(el => {
        if (!el) return;
        el.style.background = 'transparent';
        el.innerHTML = `<img src="${dataUrl}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`;
      });
      if (typeof USER !== 'undefined') USER.avatarSrc = dataUrl;
    } else {
      const ban = document.querySelector('.prof-ban');
      if (ban) {
        ban.style.backgroundImage    = `url(${dataUrl})`;
        ban.style.backgroundSize     = 'cover';
        ban.style.backgroundPosition = 'center';
        ban.style.backgroundRepeat   = 'no-repeat';
      }
      if (typeof USER !== 'undefined') USER.bannerSrc = dataUrl;
    }

    showToast('Uploading…', '');

    // 2. Upload to backend (Cloudinary via Spring Boot)
    const fd = new FormData();
    fd.append('file', file);
    const res = type === 'avatar'
      ? await AppApi.users.uploadAvatar(fd)
      : await AppApi.users.uploadBanner(fd);

    if (!res.ok) {
      showToast('Upload failed — photo saved locally only', 'red');
      return;
    }

    // 3. Update with CDN URL returned by backend
    const cdnUrl = res.data?.avatarUrl || res.data?.bannerUrl;
    if (cdnUrl && type === 'avatar') {
      document.querySelectorAll('.avbtn,.dh-av,#profAvEl,#binderAv,#postAv').forEach(el => {
        const img = el.querySelector('img');
        if (img) img.src = cdnUrl;
      });
      if (typeof USER !== 'undefined') USER.avatarSrc = cdnUrl;
    } else if (cdnUrl && type === 'banner') {
      const ban = document.querySelector('.prof-ban');
      if (ban) ban.style.backgroundImage = `url(${cdnUrl})`;
      if (typeof USER !== 'undefined') USER.bannerSrc = cdnUrl;
    }

    showToast(type === 'avatar' ? 'Profile photo updated! ✓' : 'Banner updated! ✓', 'grn');
  };
  reader.readAsDataURL(file);
};

/* ─────────────────────────────────────────────────────────────
   TRADE — propose real trade
───────────────────────────────────────────────────────────── */
window.proposeTrade = async function () {
  const meetup  = document.getElementById('tradeMeetup')?.value?.trim();
  const note    = document.getElementById('tradeNote')?.value?.trim();
  if (!meetup) { showToast('Add a meetup location first!', 'red'); document.getElementById('tradeMeetup')?.focus(); return; }

  const btn     = document.querySelector('[data-action="proposetrade"]');
  const restore = btnLoading(btn, 'Sending…');

  const res = await AppApi.trades.propose({
    meetupLocation: meetup,
    message:        note || '',
    proposerCard:   'Selected card',   // TODO: wire card picker
    receiverCard:   'Requested card',  // TODO: wire card picker
    receiverId:     window._tradePartnerId || null,
  });
  restore();

  if (!res.ok) { apiErr(res, 'Could not send trade proposal'); return; }

  showToast('Trade proposal sent! 🤝', 'grn');
  if (typeof tradeTab === 'function') tradeTab('active');
};

/* ─────────────────────────────────────────────────────────────
   AUTO-LOGIN — restore session on page load
   If a valid refresh token is in localStorage, silently get
   a new access token and log the user straight in.
───────────────────────────────────────────────────────────── */
async function tryAutoLogin() {
  const rt   = localStorage.getItem('mx_refresh');
  const user = AppApi.getStoredUser();
  if (!rt || !user) return;

  const res = await AppApi.auth.refresh({ refreshToken: rt });
  if (!res.ok) { AppApi.clearTokens(); return; }

  AppApi.saveTokens(res.data.accessToken, rt);

  // Fetch fresh user data
  const meRes = await AppApi.users.me();
  const freshUser = meRes.ok ? meRes.data : user;

  enterApp(freshUser);
}

/* ─────────────────────────────────────────────────────────────
   UTILITY — relative time helper
───────────────────────────────────────────────────────────── */
function timeAgo(isoString) {
  if (!isoString) return 'Just now';
  const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
  if (diff < 60)   return 'Just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

/* ─────────────────────────────────────────────────────────────
   LIVE COUNTER — public-facing simulated counter
   (auto-changes every few seconds so it looks alive)
   Admin panel shows REAL numbers from the DB.
───────────────────────────────────────────────────────────── */
function initLiveCounters() {
  let onlineNow   = Math.floor(300 + Math.random() * 200);
  let totalUsers  = 8420 + Math.floor(Math.random() * 50);
  let totalTrades = 3412 + Math.floor(Math.random() * 20);

  function tick() {
    document.querySelectorAll('[data-live="online"]').forEach(el => el.textContent = onlineNow.toLocaleString());
    document.querySelectorAll('[data-live="users"]').forEach(el  => el.textContent = totalUsers.toLocaleString());
    document.querySelectorAll('[data-live="trades"]').forEach(el => el.textContent = totalTrades.toLocaleString());
  }

  // Fluctuate online counter every 4–8 seconds
  setInterval(() => {
    onlineNow = Math.max(180, Math.min(900, onlineNow + Math.floor(Math.random() * 15) - 7));
    tick();
  }, 4000 + Math.random() * 4000);

  // Slowly grow totals every 30 seconds
  setInterval(() => {
    if (Math.random() > 0.6) totalUsers++;
    if (Math.random() > 0.5) totalTrades++;
    tick();
  }, 30000);

  tick();
}

/* ─────────────────────────────────────────────────────────────
   SPIN KEYFRAME (used in loading buttons)
───────────────────────────────────────────────────────────── */
(function () {
  if (document.getElementById('mx-spin-style')) return;
  const style = document.createElement('style');
  style.id = 'mx-spin-style';
  style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(style);
})();

/* ─────────────────────────────────────────────────────────────
   INIT — run on DOMContentLoaded
───────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
  initLiveCounters();
  tryAutoLogin();

  // Polling: refresh notification count every 60s when logged in
  setInterval(async () => {
    if (!AppApi.accessToken) return;
    const res = await AppApi.notifications.unreadCount();
    if (!res.ok) return;
    const count = res.data?.count || 0;
    const badge = document.getElementById('nBdg');
    if (badge) { badge.textContent = count; badge.style.display = count > 0 ? 'flex' : 'none'; }
  }, 60000);
});