/* ============================================================
   MINTYNEX — UI & ANIMATIONS  (app-ui.js) [ENHANCED]
   + Premium/Free access control
   + Trial popup on login
   + Admin premium monitoring tab
   ============================================================ */

/* ── Premium State ── */
var PREMIUM = {
  active: false,     // is user premium/trial?
  isTrial: false,
  trialDaysLeft: 7,
  plan: 'free',      // 'free' | 'trial' | 'monthly' | 'yearly'
  trialShown: false
};

var APP_STATE = {
  selectedPlan: 'monthly'
};

/* Pages that require premium */
var PREMIUM_PAGES = ['binder', 'trade', 'mart', 'messages'];
var PREMIUM_ACTIONS = ['proposetrade','addcart','buynow','friend'];

/* ─────────────────────────────────────────────
   TOAST NOTIFICATIONS
───────────────────────────────────────────── */
let toastTimer = null;
window.showToast = function(msg, type) {
  type = type || '';
  const el = document.getElementById('toast');
  if (!el) return;
  if (toastTimer) clearTimeout(toastTimer);
  el.textContent = msg;
  el.className = 'toast' + (type ? ' ' + type : '');
  el.classList.add('on');
  toastTimer = setTimeout(() => el.classList.remove('on'), 3000);
};

/* ─────────────────────────────────────────────
   PREMIUM GATE
───────────────────────────────────────────── */
window.openPremiumModal = function(reason) {
  reason = reason || 'Unlock full access';
  const m = document.getElementById('premiumModal');
  if (m) {
    document.getElementById('premReasonText').textContent = reason;
    m.style.display = 'flex';
    setTimeout(() => m.classList.add('on'), 10);
  }
};
window.closePremiumModal = function() {
  const m = document.getElementById('premiumModal');
  if (m) { m.classList.remove('on'); setTimeout(() => m.style.display = 'none', 250); }
};

window.activateTrial = function() {
  PREMIUM.active = true;
  PREMIUM.isTrial = true;
  PREMIUM.plan = 'trial';
  PREMIUM.trialDaysLeft = 7;
  try { sessionStorage.setItem('mx_premium', JSON.stringify(PREMIUM)); } catch(_) {}
  closePremiumModal();
  closeTrialPopup();
  updatePremiumBadge();
  showToast('🎉 7-day trial activated! Enjoy Premium!', 'grn');
};

window.activatePremium = function(plan) {
  PREMIUM.active = true;
  PREMIUM.isTrial = false;
  PREMIUM.plan = plan || 'monthly';
  try { sessionStorage.setItem('mx_premium', JSON.stringify(PREMIUM)); } catch(_) {}
  closePremiumModal();
  updatePremiumBadge();
  showToast('✅ Premium activated! Welcome to MintyNex Premium!', 'grn');
};

function updatePremiumBadge() {
  const badge = document.getElementById('premBadge');
  if (!badge) return;
  if (PREMIUM.plan === 'trial') {
    badge.textContent = 'TRIAL';
    badge.className = 'premium-nav-badge';
  } else if (PREMIUM.plan !== 'free') {
    badge.textContent = 'PREMIUM';
    badge.className = 'premium-nav-badge';
  } else {
    badge.textContent = 'FREE';
    badge.className = 'free-badge';
  }
}

window.badgeClick = function() {
  if (PREMIUM.plan === 'free') {
    openTrialPopupForFreePlan();
    return;
  }
  openSubscriptionModal();
};

window.togglePwVis = function(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  if (btn) btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
};

function checkPremiumGate(pageId) {
  if (PREMIUM.active) return true;
  if (PREMIUM_PAGES.includes(pageId)) {
    openPremiumModal('Access ' + pageId.charAt(0).toUpperCase() + pageId.slice(1));
    return false;
  }
  return true;
}

/* ─────────────────────────────────────────────
   TRIAL POPUP (post-login)
───────────────────────────────────────────── */
window.closeTrialPopup = function() {
  const p = document.getElementById('trialPopup');
  if (p) p.classList.remove('on');
  PREMIUM.trialShown = true;
};

function showTrialPopup() {
  if (PREMIUM.trialShown || PREMIUM.active) return;
  const p = document.getElementById('trialPopup');
  if (p) setTimeout(() => p.classList.add('on'), 900);
}

function openTrialPopupForFreePlan() {
  const p = document.getElementById('trialPopup');
  if (!p) return;
  p.classList.add('on');
}

window.openSubscriptionModal = function() {
  let modal = document.getElementById('subscriptionModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'subscriptionModal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:5000;background:rgba(0,0,0,.75);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:20px';
    modal.innerHTML = `
      <div style="background:#2b2d31;border-radius:20px;width:100%;max-width:380px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,.6);animation:slideUp .25s ease">
        <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:20px 20px 16px;position:relative">
          <button onclick="closeSubscriptionModal()" style="position:absolute;top:12px;right:12px;background:rgba(0,0,0,.2);border:none;color:#fff;border-radius:50%;width:28px;height:28px;cursor:pointer;display:flex;align-items:center;justify-content:center">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:44px;height:44px;background:rgba(0,0,0,.2);border-radius:12px;display:flex;align-items:center;justify-content:center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <div>
              <div style="font-weight:900;font-size:17px;color:#000">MintyNex Subscription</div>
              <div style="font-size:12px;color:rgba(0,0,0,.6)">Manage trial and premium plan</div>
            </div>
          </div>
        </div>
        <div style="padding:18px">
          <div style="font-size:11px;font-weight:800;color:#80848e;text-transform:uppercase;letter-spacing:.6px;margin-bottom:10px">Choose a Plan</div>
          <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
            <div onclick="selectSubPlan(this,'monthly')" class="sub-plan-card selected" style="border:2px solid #5865f2;background:rgba(88,101,242,.1);border-radius:10px;padding:12px 14px;cursor:pointer;transition:all .15s">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <div><div style="font-weight:800;font-size:13px;color:#fff">Monthly</div><div style="font-size:11px;color:#80848e">Cancel anytime</div></div>
                <div style="text-align:right"><div style="font-weight:900;font-size:16px;color:#5865f2">$7.99</div><div style="font-size:10px;color:#80848e">/month</div></div>
              </div>
            </div>
            <div onclick="selectSubPlan(this,'yearly')" class="sub-plan-card" style="border:2px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);border-radius:10px;padding:12px 14px;cursor:pointer;transition:all .15s;position:relative">
              <div style="position:absolute;top:-9px;right:12px;background:#23a55a;color:#fff;font-size:9px;font-weight:800;padding:2px 8px;border-radius:20px">SAVE 17%</div>
              <div style="display:flex;justify-content:space-between;align-items:center">
                <div><div style="font-weight:800;font-size:13px;color:#fff">Yearly</div><div style="font-size:11px;color:#80848e">Best value</div></div>
                <div style="text-align:right"><div style="font-weight:900;font-size:16px;color:#23a55a">$79.99</div><div style="font-size:10px;color:#80848e">/year</div></div>
              </div>
            </div>
          </div>
          <button onclick="confirmSubscription()" style="width:100%;padding:13px;background:linear-gradient(135deg,#5865f2,#7c3aed);border:none;border-radius:10px;color:#fff;font-size:14px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;font-family:inherit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            Confirm Subscription
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) closeSubscriptionModal(); });
  }
  modal.style.display = 'flex';
};

window.closeSubscriptionModal = function() {
  const m = document.getElementById('subscriptionModal');
  if (m) m.style.display = 'none';
};

window.selectSubPlan = function(el, plan) {
  document.querySelectorAll('.sub-plan-card').forEach(c => {
    c.style.border = '2px solid rgba(255,255,255,.08)';
    c.style.background = 'rgba(255,255,255,.03)';
  });
  el.style.border = '2px solid #5865f2';
  el.style.background = 'rgba(88,101,242,.1)';
  APP_STATE.selectedPlan = plan || 'monthly';
};

window.confirmSubscription = function() {
  activatePremium(APP_STATE.selectedPlan || 'monthly');
  closeSubscriptionModal();
  showToast('Premium activated!', 'grn');
};

/* ─────────────────────────────────────────────
   BOTTOM NAVIGATION
───────────────────────────────────────────── */
function initBottomNav() {
  document.querySelectorAll('.gbn[data-pg]').forEach(btn => {
    btn.addEventListener('click', () => showPg(btn.getAttribute('data-pg')));
  });
  // Restore premium from session if available
  try {
    const saved = window._savedPremium || JSON.parse(sessionStorage.getItem('mx_premium') || 'null');
    if (saved && saved.active) {
      Object.assign(PREMIUM, saved);
      updatePremiumBadge();
    }
  } catch(_) {}
}

/* ─────────────────────────────────────────────
   PAGE SWITCHING
───────────────────────────────────────────── */
window.showPg = function(id) {
  if (!id) return;
// TEMP: disable premium blocking
if (typeof checkPremiumGate === "function") {
  try {
    if (!checkPremiumGate(id)) {
      console.warn("Premium blocked:", id);
      // return; ← DISABLED so buttons still work
    }
  } catch (e) {
    console.warn("Premium check error:", e);
  }
}
  document.querySelectorAll('.pg').forEach(p => p.classList.remove('on'));
  const target = document.getElementById('pg-' + id);
  if (target) {
    target.classList.add('on');
    const scr = target.querySelector('.scr');
    if (scr) scr.scrollTop = 0;
  }
  document.querySelectorAll('.gbn').forEach(b => b.classList.toggle('on', b.getAttribute('data-pg') === id));
  document.querySelectorAll('.dta').forEach(b => b.classList.toggle('on', b.getAttribute('data-pg') === id));
  document.querySelectorAll('.sni[data-pg]').forEach(b => b.classList.toggle('on', b.getAttribute('data-pg') === id));

  if (id === 'feed') { if(typeof loadFeed==='function') loadFeed(false); else renderFeed(); }
  if (id === 'binder') renderBinder();
  if (id === 'messages') { if(window.MXMessages) window.MXMessages.loadInbox(); }
  if (id === 'players' || id === 'trade') { if (typeof renderPartners === 'function') renderPartners(TRAINERS); }
  // Dispatch event for new modules
  document.dispatchEvent(new CustomEvent('pageChange', { detail: id }));
};

/* ─────────────────────────────────────────────
   PROFILE / TRADE / ADMIN TABS
───────────────────────────────────────────── */
window.profTab = function(tab) {
  document.querySelectorAll('.ptab').forEach(t => t.classList.toggle('on', t.getAttribute('data-tab') === tab));
  document.querySelectorAll('.ptab-sec').forEach(s => s.classList.toggle('on', s.id === 'pt-' + tab));
};
window.tradeTab = function(tab) {
  document.querySelectorAll('#tradeTabs .atab').forEach(t => t.classList.toggle('on', t.getAttribute('data-tt') === tab));
  document.querySelectorAll('.tt-s').forEach(s => s.classList.toggle('on', s.id === 'tt-' + tab));
};
window.toggleDrop = function() {
  const dr = document.getElementById('avDrop');
  if (dr) dr.classList.toggle('on');
};

/* ─────────────────────────────────────────────
   MODALS
───────────────────────────────────────────── */
window.openCard = function(idx) {
  const cards = [
    { name:'Charizard VMAX', grade:'PSA 10', val:'$310', em:'🔥' },
    { name:'Lugia V Alt Art', grade:'BGS 9.5', val:'$260', em:'💎' },
    { name:'Rayquaza VMAX',  grade:'PSA 9',  val:'$195', em:'🐉' },
  ];
  const card = cards[idx] || cards[0];
  const nm = document.getElementById('mNm'); const gr = document.getElementById('mGr');
  const gr2 = document.getElementById('mGr2'); const em = document.getElementById('mEm');
  if (nm) nm.textContent = card.name;
  if (gr) gr.textContent = card.grade;
  if (gr2) gr2.textContent = card.grade;
  if (em) em.innerHTML = `<div style="font-size:56px;text-align:center;line-height:1">${card.em}</div>`;
  const modal = document.getElementById('cardModal');
  if (modal) modal.classList.add('on');
};

let VERIFY_STEP = 0;
window.openVerify = function() { VERIFY_STEP=0; showVerifyStep(0); const m=document.getElementById('verifyModal'); if(m) m.classList.add('on'); };
window.closeVerify = function() { const m=document.getElementById('verifyModal'); if(m) m.classList.remove('on'); };
window.nextVerifyStep = function() { showVerifyStep(VERIFY_STEP+1); };
window.showVerifyStep = function(step) {
  VERIFY_STEP = step;
  document.querySelectorAll('.verify-step').forEach((s,i) => s.classList.toggle('on', i===step));
  document.querySelectorAll('.vp-step').forEach((s,i) => { s.classList.toggle('done', i<step); s.classList.toggle('active', i===step); });
};

/* ─────────────────────────────────────────────
   LOGIN / LOGOUT
───────────────────────────────────────────── */
window.doLogin = function() {
  const u = document.getElementById('tUser');
  const p = document.getElementById('tPass');
  if (!u || !p) return;
  if (u.value.trim() && p.value.trim()) {
    USER.nm = u.value.trim();
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('shell').classList.add('on');
    if (typeof applyUserToUI === 'function') applyUserToUI();
    showPg('feed');
    updatePremiumBadge();
    showToast('Welcome back, ' + USER.nm + '! ⚡', 'grn');
    showTrialPopup();
  } else {
    showToast('Enter username and password', 'red');
  }
};

window.doRegister = function() {
  const u = document.getElementById('rUser');
  const e = document.getElementById('rEmail');
  const p = document.getElementById('rPass');
  if (!u || !e || !p) return;
  if (u.value.trim() && e.value.trim() && p.value.trim()) {
    USER.nm = u.value.trim();
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('shell').classList.add('on');
    if (typeof applyUserToUI === 'function') applyUserToUI();
    showPg('feed');
    updatePremiumBadge();
    showToast('Welcome to MintyNex! 🎉', 'grn');
    PREMIUM.trialShown = false;
    showTrialPopup();
  } else {
    showToast('Fill in all fields', 'red');
  }
};

window.doLogout = function() {
  try { closePremiumModal(); } catch(e) {}
  try { closeForgotModal(); } catch(e) {}
  try { closeTrialPopup(); } catch(e) {}
  if (!confirm('Log out of MintyNex?')) return;
  IS_IN=false; IS_ADM=false;
  PREMIUM.active=false; PREMIUM.plan='free'; PREMIUM.trialShown=false;
  document.getElementById('shell').classList.remove('on');
  document.getElementById('adm').classList.remove('on');
  document.getElementById('login-screen').classList.remove('hidden');
  const u=document.getElementById('tUser'); if(u) u.value='';
  const p=document.getElementById('tPass'); if(p) p.value='';
};

// calls the real backend, checks for ADMIN role
window.doAdminLogin = async function() {
  const uEl = document.getElementById('aUser');
  const pEl = document.getElementById('aPass');
  if (!uEl || !pEl) return;

  const username = uEl.value.trim();
  const password = pEl.value;
  if (!username || !password) {
    showToast('Enter your admin username and password', 'red');
    return;
  }

  // Show loading state on the button
  const btn = document.querySelector('#login-screen .lbtn.danger');
  const origText = btn ? btn.innerHTML : null;
  if (btn) btn.innerHTML = '<span style="opacity:.7">Signing in…</span>';

  try {
    const baseUrl = (typeof AppApi !== 'undefined' && AppApi.getBaseUrl)
      ? AppApi.getBaseUrl().replace(/\/api$/, '')
      : '';

    const res = await fetch(baseUrl + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      showToast(data.message || 'Invalid credentials', 'red');
      return;
    }

    // Must be ADMIN role
    if (!data.user || data.user.role !== 'ADMIN') {
      showToast('Access denied — not an admin account', 'red');
      return;
    }

    // Store token so AdminApi calls work
    if (typeof AppApi !== 'undefined') {
      AppApi.accessToken = data.accessToken;
    }

    // Show the admin panel
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('adm').classList.add('on');
    showToast('Welcome back, ' + (data.user.displayName || username), 'grn');
    renderPremiumAdminTab();

  } catch (err) {
    showToast('Network error — could not reach server', 'red');
    console.error('[doAdminLogin]', err);
  } finally {
    if (btn && origText) btn.innerHTML = origText;
  }
};
window.admBack = function() {
  document.getElementById('adm').classList.remove('on');
  document.getElementById('shell').classList.add('on');
  PREMIUM.active = true; PREMIUM.plan = 'monthly'; // admin gets full access
  showPg('feed');
};
window.showSec = function(sec) {
  document.querySelectorAll('#admTabs .atab').forEach(t => t.classList.toggle('on', t.getAttribute('data-as')===sec));
  document.querySelectorAll('.adm-sec').forEach(s => s.classList.toggle('on', s.id==='as-'+sec));
  if (sec === 'premium') renderPremiumAdminTab();
};
window.admShowSec = function(sec) { showSec(sec); };

/* ─────────────────────────────────────────────
   ADMIN PREMIUM MONITORING TAB
───────────────────────────────────────────── */
var PREMIUM_USERS = [
  { nm:'TrainerAsh_KE', plan:'Trial', daysLeft:5, joined:'3 days ago', revenue:'—', status:'trial' },
  { nm:'ShinySister_TZ', plan:'Monthly', daysLeft:18, joined:'2 weeks ago', revenue:'$9.99', status:'active' },
  { nm:'PokeKing_NG', plan:'Yearly', daysLeft:312, joined:'3 months ago', revenue:'$89.99', status:'active' },
  { nm:'CardQueenZA', plan:'Monthly', daysLeft:0, joined:'1 month ago', revenue:'$9.99', status:'expired' },
  { nm:'MintFresh_KE', plan:'Trial', daysLeft:2, joined:'5 days ago', revenue:'—', status:'trial' },
  { nm:'EliteEdge_ZA', plan:'Yearly', daysLeft:201, joined:'5 months ago', revenue:'$89.99', status:'active' },
];

function renderPremiumAdminTab() {
  const sec = document.getElementById('as-premium');
  if (!sec) return;
  const totalRev = '$199.96';
  const active = PREMIUM_USERS.filter(u => u.status==='active').length;
  const trial = PREMIUM_USERS.filter(u => u.status==='trial').length;
  const expired = PREMIUM_USERS.filter(u => u.status==='expired').length;

  sec.innerHTML = `
    <div style="font-weight:800;font-size:15px;margin-bottom:10px">💎 Premium Subscriptions</div>
    <div class="g4" style="margin-bottom:12px">
      <div class="stat-b adm-premium-stat"><div class="stat-v" style="color:#f59e0b">${active}</div><div class="stat-l">Active</div></div>
      <div class="stat-b adm-premium-stat"><div class="stat-v" style="color:#fbbf24">${trial}</div><div class="stat-l">Trial</div></div>
      <div class="stat-b adm-premium-stat"><div class="stat-v" style="color:#ed4245">${expired}</div><div class="stat-l">Expired</div></div>
      <div class="stat-b adm-premium-stat"><div class="stat-v" style="color:#3ba55c">${totalRev}</div><div class="stat-l">Revenue</div></div>
    </div>
    <div class="card" style="margin-bottom:10px">
      <div style="font-weight:700;font-size:13px;margin-bottom:10px">📊 Revenue Chart (mock)</div>
      <div style="display:flex;align-items:flex-end;gap:6px;height:70px;padding:0 4px">
        ${['Jan','Feb','Mar','Apr','May','Jun'].map((m,i) => {
          const h = [30,45,38,60,72,88][i];
          return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px">
            <div style="width:100%;background:rgba(88,101,242,0.5);border-radius:3px 3px 0 0;height:${h}%;transition:height .5s"></div>
            <div style="font-size:8px;color:#80848e">${m}</div>
          </div>`;
        }).join('')}
      </div>
    </div>
    <div class="card">
      <div style="font-weight:700;font-size:13px;margin-bottom:10px">👥 Subscribers</div>
      ${PREMIUM_USERS.map(u => `
        <div class="adm-prem-row">
          <div>
            <div class="adm-prem-user">${u.nm}</div>
            <div class="adm-prem-meta">${u.plan} · Joined ${u.joined} · ${u.revenue}</div>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <span class="prem-status-${u.status}">${
              u.status==='active' ? '✓ Active' :
              u.status==='trial' ? `⏳ ${u.daysLeft}d left` : '✕ Expired'
            }</span>
            <button class="btn bgh bxs" onclick="showToast('Managing ${u.nm}...','')">Manage</button>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="card" style="margin-top:10px">
      <div style="font-weight:700;font-size:13px;margin-bottom:10px">⚙️ Premium Settings</div>
      <div class="lrow" style="justify-content:space-between"><span style="font-size:12px">Enable 7-day free trial</span><div class="tog on" data-action="toggle"><div class="tog-d"></div></div></div>
      <div class="lrow" style="justify-content:space-between"><span style="font-size:12px">Monthly plan ($9.99)</span><div class="tog on" data-action="toggle"><div class="tog-d"></div></div></div>
      <div class="lrow" style="justify-content:space-between"><span style="font-size:12px">Yearly plan ($89.99 / save 25%)</span><div class="tog on" data-action="toggle"><div class="tog-d"></div></div></div>
      <div class="lrow" style="justify-content:space-between"><span style="font-size:12px">Show upgrade prompt on app open</span><div class="tog on" data-action="toggle"><div class="tog-d"></div></div></div>
    </div>
  `;
}

/* ─────────────────────────────────────────────
   SCROLL REVEAL
───────────────────────────────────────────── */
function initReveal() {
  const els = document.querySelectorAll('.feat-card,.card,.post,.ni,.tc,.tcg');
  els.forEach(el => el.classList.add('reveal'));
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); obs.unobserve(entry.target); }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });
  els.forEach(el => obs.observe(el));
}

/* ─────────────────────────────────────────────
   COUNTER ANIMATION
───────────────────────────────────────────── */
function initCounters() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target; const raw = el.textContent;
      const num = parseFloat(raw.replace(/[^0-9.]/g,''));
      if (isNaN(num)) return;
      const sfx = raw.replace(/[\d.]/g,''); const isF = raw.includes('.');
      let start = null;
      const step = ts => {
        if (!start) start=ts;
        const p = Math.min((ts-start)/1200,1), v = (1-Math.pow(1-p,3))*num;
        el.textContent = (isF ? v.toFixed(1) : Math.floor(v)) + sfx;
        if (p<1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step); obs.unobserve(el);
    });
  }, { threshold:0.5 });
  document.querySelectorAll('.hstat-val,.stat-v').forEach(el => obs.observe(el));
}

/* ─────────────────────────────────────────────
   PULL TO REFRESH
───────────────────────────────────────────── */
function initPullToRefresh() {
  const scr = document.querySelector('#pg-feed .scr');
  if (!scr) return;
  let startY=0, pulling=false;
  const indicator = document.querySelector('.ptr-indicator');
  scr.addEventListener('touchstart', e => { if (scr.scrollTop===0) startY=e.touches[0].clientY; }, {passive:true});
  scr.addEventListener('touchmove', e => {
    if (!startY) return;
    if (e.touches[0].clientY - startY > 40 && scr.scrollTop===0) { pulling=true; if(indicator) indicator.classList.add('visible'); }
  }, {passive:true});
  scr.addEventListener('touchend', () => {
    if (pulling) {
      pulling=false; startY=0;
      if (indicator) { setTimeout(()=>indicator.classList.remove('visible'),1200); setTimeout(()=>{renderFeed();showToast('Feed refreshed ✓','grn');},800); }
    }
    startY=0;
  });
}

/* ─────────────────────────────────────────────
   PHOTO UPLOAD
───────────────────────────────────────────── */
window.triggerUpload = function(type) {
  const inputId = type === 'avatar' ? 'avatarFileInput' : 'bannerFileInput';
  const fallbackId = type === 'banner' ? 'bannerFileInputTop' : null;
  const input = document.getElementById(inputId) || (fallbackId && document.getElementById(fallbackId));
  if (input) input.click();
};

/* ── Image Crop/Zoom Modal ── */
(function() {
  let _cropType = '', _cropSrc = '', _cropScale = 1, _cropOffX = 0, _cropOffY = 0;
  let _dragStart = null, _lastPos = {x:0,y:0};

  function buildCropModal() {
    if (document.getElementById('imgCropModal')) return;
    const m = document.createElement('div');
    m.id = 'imgCropModal';
    m.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.92);display:none;align-items:center;justify-content:center;padding:16px;flex-direction:column;gap:14px';
    m.innerHTML = `
      <div style="font-weight:800;font-size:15px;color:#fff" id="cropTitle">Adjust Photo</div>
      <div id="cropViewport" style="position:relative;overflow:hidden;border-radius:12px;background:#1e1f22;border:2px solid rgba(255,255,255,.15);cursor:grab;touch-action:none;user-select:none"></div>
      <div style="display:flex;align-items:center;gap:10px;width:100%;max-width:480px">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#b5bac1" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
        <input type="range" id="cropZoom" min="50" max="300" value="100" style="flex:1;accent-color:#5865f2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#b5bac1" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/><line x1="11" y1="8" x2="11" y2="14"/></svg>
      </div>
      <div style="font-size:11px;color:#80848e">Drag to reposition • Pinch or slider to zoom</div>
      <div style="display:flex;gap:10px">
        <button id="cropCancel" style="padding:10px 22px;border-radius:8px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:#dbdee1;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">Cancel</button>
        <button id="cropApply" style="padding:10px 28px;border-radius:8px;background:#5865f2;border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">Apply</button>
      </div>
    `;
    document.body.appendChild(m);

    const vp = m.querySelector('#cropViewport');
    const zoom = m.querySelector('#cropZoom');

    // Zoom slider
    zoom.addEventListener('input', () => {
      _cropScale = zoom.value / 100;
      updateCropTransform();
    });

    // Mouse drag
    vp.addEventListener('mousedown', ev => {
      _dragStart = {x: ev.clientX - _cropOffX, y: ev.clientY - _cropOffY};
      vp.style.cursor = 'grabbing';
    });
    window.addEventListener('mousemove', ev => {
      if (!_dragStart) return;
      _cropOffX = ev.clientX - _dragStart.x;
      _cropOffY = ev.clientY - _dragStart.y;
      updateCropTransform();
    });
    window.addEventListener('mouseup', () => { _dragStart = null; vp.style.cursor = 'grab'; });

    // Touch drag + pinch zoom
    let _lastTouches = null;
    vp.addEventListener('touchstart', ev => {
      ev.preventDefault();
      if (ev.touches.length === 1) {
        _dragStart = {x: ev.touches[0].clientX - _cropOffX, y: ev.touches[0].clientY - _cropOffY};
      }
      _lastTouches = ev.touches;
    }, {passive:false});
    vp.addEventListener('touchmove', ev => {
      ev.preventDefault();
      if (ev.touches.length === 2 && _lastTouches && _lastTouches.length === 2) {
        const prevD = Math.hypot(_lastTouches[0].clientX-_lastTouches[1].clientX, _lastTouches[0].clientY-_lastTouches[1].clientY);
        const currD = Math.hypot(ev.touches[0].clientX-ev.touches[1].clientX, ev.touches[0].clientY-ev.touches[1].clientY);
        _cropScale = Math.max(0.5, Math.min(3, _cropScale * (currD/prevD)));
        zoom.value = Math.round(_cropScale * 100);
        updateCropTransform();
      } else if (ev.touches.length === 1 && _dragStart) {
        _cropOffX = ev.touches[0].clientX - _dragStart.x;
        _cropOffY = ev.touches[0].clientY - _dragStart.y;
        updateCropTransform();
      }
      _lastTouches = ev.touches;
    }, {passive:false});
    vp.addEventListener('touchend', () => { _dragStart = null; _lastTouches = null; });

    m.querySelector('#cropCancel').onclick = closeCropModal;
    m.querySelector('#cropApply').onclick = applyCrop;
  }

  function updateCropTransform() {
    const img = document.querySelector('#cropViewport img');
    if (img) img.style.transform = `translate(${_cropOffX}px,${_cropOffY}px) scale(${_cropScale})`;
  }

  function closeCropModal() {
    const m = document.getElementById('imgCropModal');
    if (m) { m.style.display = 'none'; }
    _cropSrc = ''; _cropScale = 1; _cropOffX = 0; _cropOffY = 0;
    const zoom = document.getElementById('cropZoom');
    if (zoom) zoom.value = 100;
  }

  function openCropModal(src, type) {
    buildCropModal();
    _cropType = type; _cropSrc = src;
    _cropScale = 1; _cropOffX = 0; _cropOffY = 0;
    const m = document.getElementById('imgCropModal');
    const vp = m.querySelector('#cropViewport');
    const title = m.querySelector('#cropTitle');
    const zoom = m.querySelector('#cropZoom');
    zoom.value = 100;

    const isAvatar = type === 'avatar';
    const vpW = Math.min(window.innerWidth - 32, 480);
    const vpH = isAvatar ? vpW : Math.round(vpW / 3);
    vp.style.width = vpW + 'px';
    vp.style.height = vpH + 'px';
    vp.style.borderRadius = isAvatar ? '50%' : '12px';
    title.textContent = isAvatar ? 'Crop Profile Photo' : 'Crop Banner';

    vp.innerHTML = `<img src="${src}" style="position:absolute;top:50%;left:50%;transform-origin:center center;transform:translate(-50%,-50%) scale(1);max-width:none;max-height:none;pointer-events:none" draggable="false"/>`;
    // Reset offsets relative to center
    _cropOffX = 0; _cropOffY = 0;
    const img = vp.querySelector('img');
    img.onload = () => {
      // Auto-fit: scale so image fills viewport
      const scaleW = vpW / img.naturalWidth;
      const scaleH = vpH / img.naturalHeight;
      _cropScale = Math.max(scaleW, scaleH) * 1.05;
      zoom.value = Math.round(_cropScale * 100);
      img.style.transform = `translate(${_cropOffX}px,${_cropOffY}px) scale(${_cropScale})`;
    };

    m.style.display = 'flex';
  }

  function applyCrop() {
    const vp = document.getElementById('cropViewport');
    const img = vp ? vp.querySelector('img') : null;
    if (!img) return;

    const isAvatar = _cropType === 'avatar';
    const vpRect = vp.getBoundingClientRect();
    const canvas = document.createElement('canvas');
    const outW = isAvatar ? 400 : 1200;
    const outH = isAvatar ? 400 : 400;
    canvas.width = outW; canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (isAvatar) { ctx.beginPath(); ctx.arc(outW/2,outH/2,outW/2,0,Math.PI*2); ctx.clip(); }

    // Compute what's visible in the viewport
    const imgRect = img.getBoundingClientRect();
    const scaleCanvas = outW / vpRect.width;
    ctx.drawImage(img,
      (vpRect.left - imgRect.left) * (img.naturalWidth / imgRect.width),
      (vpRect.top  - imgRect.top)  * (img.naturalHeight / imgRect.height),
      vpRect.width  * (img.naturalWidth  / imgRect.width),
      vpRect.height * (img.naturalHeight / imgRect.height),
      0, 0, outW, outH
    );

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    closeCropModal();
    _applyPhoto(dataUrl, _cropType);
  }

  function _applyPhoto(dataUrl, type) {
    if (type === 'avatar') {
      const defaultSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
      const imgHtml = `<img src="${dataUrl}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`;
      ['avBtn','dhAv','profAvEl','binderAv','postAv'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.background = 'transparent';
        el.innerHTML = imgHtml;
      });
      showToast('Profile photo updated! ✓', 'grn');
    }
    if (type === 'banner') {
      const ban = document.getElementById('profBanner') || document.querySelector('.prof-ban');
      if (ban) {
        ban.style.backgroundImage = `url(${dataUrl})`;
        ban.style.backgroundSize = 'cover';
        ban.style.backgroundPosition = 'center';
        ban.style.backgroundRepeat = 'no-repeat';
      }
      showToast('Banner updated! ✓', 'grn');
    }
    // Store in USER object for persistence within session
    if (typeof USER !== 'undefined') {
      if (type === 'avatar') USER.avatarSrc = dataUrl;
      if (type === 'banner') USER.bannerSrc = dataUrl;
    }
  }

  window.handlePhotoUpload = function(input, type) {
    const file = input.files[0]; if (!file) return;
    // Reset input so same file can be re-selected
    input.value = '';
    const reader = new FileReader();
    reader.onload = e => openCropModal(e.target.result, type);
    reader.readAsDataURL(file);
  };
})();

window.populateGlobalCountryData = async function() {
  const dialSelects = [document.getElementById('tDial'), document.getElementById('rDial')].filter(Boolean);
  const countrySelects = [document.getElementById('rCountry'), document.getElementById('fc'), document.getElementById('tfc'), document.getElementById('settCountry'), document.getElementById('verifyCountry')].filter(Boolean);
  const fallback = [
    { n: 'Australia', c: 'AU', d: '+61' }, { n: 'Brazil', c: 'BR', d: '+55' },
    { n: 'Canada', c: 'CA', d: '+1' }, { n: 'France', c: 'FR', d: '+33' },
    { n: 'Germany', c: 'DE', d: '+49' }, { n: 'Ghana', c: 'GH', d: '+233' },
    { n: 'India', c: 'IN', d: '+91' }, { n: 'Japan', c: 'JP', d: '+81' },
    { n: 'Kenya', c: 'KE', d: '+254' }, { n: 'Nigeria', c: 'NG', d: '+234' },
    { n: 'South Global', c: 'ZA', d: '+27' }, { n: 'Tanzania', c: 'TZ', d: '+255' },
    { n: 'Uganda', c: 'UG', d: '+256' }, { n: 'United Kingdom', c: 'GB', d: '+44' },
    { n: 'United States', c: 'US', d: '+1' }
  ];
  let rows = [];
  // Try sessionStorage cache first
  try {
    const cached = sessionStorage.getItem('mintynex_countries');
    if (cached) { rows = JSON.parse(cached); }
  } catch(_) {}

  if (!rows.length) {
    try {
      const res = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2,idd');
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      rows = data
        .map(x => ({ n: x?.name?.common, c: x?.cca2, d: (x?.idd?.root || '') + ((x?.idd?.suffixes && x.idd.suffixes[0]) || '') }))
        .filter(x => x.n && x.c && x.d);
      rows.sort((a, b) => a.n.localeCompare(b.n));
      try { sessionStorage.setItem('mintynex_countries', JSON.stringify(rows)); } catch(_) {}
    } catch (_) {
      rows = fallback;
      console.warn('[MintyNex] Country fetch failed — using fallback list');
    }
  }

  dialSelects.forEach(sel => {
    const current = sel.value;
    sel.innerHTML = '<option value="">Select code</option>' + rows.map(r => `<option value="${r.d}">${r.c} ${r.d}</option>`).join('');
    if (current) sel.value = current;
  });
  countrySelects.forEach(sel => {
    const current = sel.value;
    const first = sel.id === 'fc' || sel.id === 'tfc' ? 'Any Country' : 'Select country';
    sel.innerHTML = `<option value="">${first}</option>` + rows.map(r => `<option value="${r.n}">${r.n}</option>`).join('');
    if (current && rows.some(r => r.n === current)) sel.value = current;
  });

  // Notify app-connect.js custom dropdowns with the loaded data
  if (typeof window._initDialData    === 'function') window._initDialData(rows);
  if (typeof window._initCountryData === 'function') window._initCountryData(rows);
}

function initButtonAnimations() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('.btn,.pab,.gbn');
    if (!btn) return;
    btn.style.transform='scale(0.94)';
    setTimeout(()=>{btn.style.transform='';},120);
  });
}
function initSmoothLinks() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const target=document.querySelector(link.getAttribute('href'));
      if (target){e.preventDefault();target.scrollIntoView({behavior:'smooth'});}
    });
  });
}

/* ─────────────────────────────────────────────
   GLOBAL CLICK DELEGATION
───────────────────────────────────────────── */
document.addEventListener('click', function(e) {
  // Page navigation
  const navEl = e.target.closest('[data-pg]');
  if (navEl && !navEl.closest('.share-sheet-inner')) {
    showPg(navEl.getAttribute('data-pg')); return;
  }
  // Avatar dropdown
  if (e.target.closest('.avbtn')||e.target.id==='avBtn') { toggleDrop(); return; }
  if (!e.target.closest('.drop-wrap')) { const dr=document.getElementById('avDrop'); if(dr) dr.classList.remove('on'); }

  // Action delegation
  const actEl = e.target.closest('[data-action]');
  if (actEl) {
    const act=actEl.getAttribute('data-action');
    const nm=actEl.getAttribute('data-nm')||'';
    const idx=parseInt(actEl.getAttribute('data-idx')||'-1',10);

    // Premium-gated actions
    if (PREMIUM_ACTIONS.includes(act) && !PREMIUM.active) {
      openPremiumModal('Unlock ' + act.replace(/([A-Z])/g,' $1').trim());
      return;
    }

    if (act==='like' && idx>=0) {
      // BUG FIX: route through API-connected toggleLike()
      if (typeof toggleLike === 'function') { toggleLike(idx); }
    }
    if (act==='opencomments' && idx>=0) { if(typeof openComments==='function') openComments(idx); }
    if (act==='submitcomment') { if(typeof submitComment==='function') submitComment(); }
    if (act==='submitpost') { if(typeof submitPost==='function') submitPost(); }
    if (act==='postphoto') { if(typeof triggerPostPhoto==='function') triggerPostPhoto(); }
    if (act==='share' && idx>=0) openShareSheet(idx);
    if (act==='proposetrade') { proposeTrade(); }
    if (act==='friend') showToast('Friend request sent to '+(nm||'trainer')+'!','grn');
    if (act==='addreview') {
      const reviewName = nm || 'trainer';
      const star = prompt(`Rate ${reviewName} (1-5 stars):`);
      const rating = parseInt(star);
      if (rating >= 1 && rating <= 5) showToast(`★${rating} review submitted for ${reviewName}!`, 'grn');
    }
    if (act==='addlocation') {
      const loc = prompt('Add location (city or area):');
      const postInput = document.getElementById('postInput');
      if (loc && postInput) postInput.value = (postInput.value ? postInput.value + ' ' : '') + '[' + loc.trim() + ']';
    }
    if (act==='contact' || act==='addcart') showToast('Added to cart! 🛒','grn');
    if (act==='buynow') openPremiumModal('Shop Access — Buy Cards');
    if (act==='approve') showToast('Approved! ✓','grn');
    if (act==='reject') showToast('Rejected.','red');
    if (act==='accept') {
      showToast('Trade accepted! 🤝','grn');
      if (window.AppApi?.trades?.accept) AppApi.trades.accept(actEl.dataset.tradeId || '0').catch(()=>{});
    }
    if (act==='decline') {
      showToast('Trade declined.','red');
      if (window.AppApi?.trades?.reject) AppApi.trades.reject(actEl.dataset.tradeId || '0').catch(()=>{});
    }
    if (act==='markmet') {
      showToast('Trade marked as completed! ✓','grn');
      if (window.AppApi?.trades?.complete) AppApi.trades.complete(actEl.dataset.tradeId || '0').catch(()=>{});
    }
    if (act==='canceltrade') {
      if (confirm('Cancel this trade?')) {
        showToast('Trade cancelled.','red');
        if (window.AppApi?.trades?.reject) AppApi.trades.reject(actEl.dataset.tradeId || '0').catch(()=>{});
      }
    }
    if (act==='publishshop'||act==='publishmart') showToast('Listing published! ✓','grn');
    if (act==='flagtrade') {
      if (window.AppApi?.trades?.flag) AppApi.trades.flag({ reason: 'manual_flag' });
      showToast('Trade flagged for admin review.','red');
    }
    if (act==='applysanction') showToast('Sanction applied.','red');
    if (act==='keeppost') showToast('Post kept.','grn');
    if (act==='removepost') { actEl.closest('.card')?.remove(); showToast('Post removed.','red'); }
    if (act==='dismissreport') showToast('Report dismissed.','grn');
    if (act==='banuserfrompanel') showToast('User sanctioned.','red');
    if (act==='markallread') {
      document.querySelectorAll('.ni.unread').forEach(n=>n.classList.remove('unread'));
      const nb=document.getElementById('nBdg'); if(nb) nb.style.display='none';
      if (window.AppApi?.notifications?.markAllRead) AppApi.notifications.markAllRead().catch(()=>{});
    }
    if (act==='toggle') actEl.classList.toggle('on');
    if (act==='removip') actEl.closest('.card')?.remove();
    if (act==='removeshop') {
      const row = actEl.closest('.card');
      if (window.AppApi?.shop?.removeListing) AppApi.shop.removeListing(row?.dataset?.listingId || 'mock-id');
      row?.remove();
      showToast('Listing removed.','red');
    }
    if (act==='addcard') { if(typeof openAddCardModal==='function') openAddCardModal(); else showToast('Card picker coming soon!','grn'); }
    if (act==='uploadavatar') triggerUpload('avatar');
    if (act==='uploadbanner') triggerUpload('banner');
    if (act==='openverify') openVerify();
    if (act==='closeverify') closeVerify();
    if (act==='nextstep') nextVerifyStep();
    if (act==='prevstep') showVerifyStep(Math.max(0,VERIFY_STEP-1));
    if (act==='saveprofile') saveProfile();
    if (act==='sendmsg') { if(typeof sendMessage==='function') sendMessage(); }
    if (act==='filtertrainers') doSearch('');
    if (act==='clearfilters') clearSearch('');
    if (act==='resolvedispute') { showToast('Dispute resolved ✓','grn'); actEl.closest('.card').style.opacity='0.5'; }
    if (act==='escalatedispute') showToast('Dispute escalated 🔺','');
    if (act==='viewtrade') showToast('Opening trade details...','');
    if (act==='closealert') { const al=actEl.closest('.alert-banner'); if(al) al.style.display='none'; }
    if (act==='startTrial') activateTrial();
    if (act==='openPremium') openPremiumModal('Upgrade to MintyNex Premium');
    return;
  }

  // Close share sheet
  const sheet=document.getElementById('shareSheet');
  if (sheet && e.target===sheet) closeShareSheet();
  // Close premium modal
  const pm=document.getElementById('premiumModal');
  if (pm && e.target===pm) closePremiumModal();

  // Close modals on backdrop
  document.querySelectorAll('.modal-bg').forEach(m => { if(e.target===m) m.classList.remove('on'); });
  if (e.target.closest('.mc')) {
    e.target.closest('.mc').closest('.modal-bg')?.classList.remove('on');
    e.target.closest('.mc').closest('.modal')?.closest('.modal-bg')?.classList.remove('on');
  }

  // Profile/trade tabs
  const ptabEl=e.target.closest('#profTabs .ptab');
  if (ptabEl){profTab(ptabEl.getAttribute('data-tab'));return;}
  const ttabEl=e.target.closest('#tradeTabs .atab');
  if (ttabEl){tradeTab(ttabEl.getAttribute('data-tt'));return;}
  const atabEl=e.target.closest('#admTabs .atab');
  if (atabEl){showSec(atabEl.getAttribute('data-as'));return;}

  if (e.target.id==='admBackBtn'||e.target.closest('#admBackBtn')) admBack();
  if (e.target.id==='admLogoutBtn'||e.target.closest('#admLogoutBtn')) { if(confirm('Log out?')) doLogout(); }
  if (e.target.id==='tradeFromBinder') { showPg('trade'); document.getElementById('cardModal')?.classList.remove('on'); }
  const binderCard = e.target.closest('.hc[data-card]');
  if (binderCard) {
    const i = parseInt(binderCard.getAttribute('data-card') || '-1', 10);
    if (i >= 0) openCard(i);
  }
  if (e.target.id==='searchBtn') doSearch('');
  if (e.target.id==='clearBtn') clearSearch('');
  if (e.target.id==='tSearchBtn') doSearch('t');
  if (e.target.id==='tClearBtn') clearSearch('t');
  if (e.target.id==='msgSendBtn') sendMessage();
  if (e.target.id==='commentSendBtn') submitComment();
  if (e.target.id==='postBtn') submitPost();
  if (e.target.id==='prevBtn') { if(pg>0){pg--;renderBinder();} }
  if (e.target.id==='nextBtn') { if(pg<TP-1){pg++;renderBinder();} }
});

document.addEventListener('keydown', e => {
  if (e.key!=='Enter') return;
  const id=document.activeElement?.id||'';
  if (id==='tUser'||id==='tPass') doLogin();
  if (id==='aUser'||id==='aPass') doAdminLogin();
  if (id==='msgInput'){e.preventDefault();sendMessage();}
  if (id==='commentInput'){e.preventDefault();submitComment();}
  if (id==='postInput'){e.preventDefault();submitPost();}
});

/* ─────────────────────────────────────────────
   INIT
───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initBottomNav();
  initReveal();
  initCounters();
  initSmoothLinks();
  initButtonAnimations();
  initPullToRefresh();

  // ── Floating navbar: hide on scroll down, show on scroll up ──
  const nav = document.querySelector('.tnav');
  let _lastScrollY = 0;
  document.addEventListener('scroll', function(e) {
    const scr = e.target;
    if (!scr || scr.scrollTop === undefined || !nav) return;
    const y = scr.scrollTop;
    if (y < 10) {
      nav.classList.remove('nav-hidden');
    } else if (y > _lastScrollY + 4) {
      nav.classList.add('nav-hidden');
    } else if (y < _lastScrollY - 4) {
      nav.classList.remove('nav-hidden');
    }
    _lastScrollY = y;
  }, true);

  const ai=document.getElementById('avatarFileInput');
  if(ai) ai.addEventListener('change',function(){handlePhotoUpload(this,'avatar');});
  const bi=document.getElementById('bannerFileInput');
  if(bi) bi.addEventListener('change',function(){handlePhotoUpload(this,'banner');});
  const bi2=document.getElementById('bannerFileInputTop');
  if(bi2) bi2.addEventListener('change',function(){handlePhotoUpload(this,'banner');});
  const verifyUploadInput = document.createElement('input');
  verifyUploadInput.type = 'file';
  verifyUploadInput.accept = 'image/*,application/pdf';
  verifyUploadInput.style.display = 'none';
  verifyUploadInput.id = 'verifyDocInput';
  document.body.appendChild(verifyUploadInput);
  verifyUploadInput.addEventListener('change', function() {
    if (this.files && this.files[0]) showToast('ID file selected: ' + this.files[0].name, 'grn');
  });
  document.querySelectorAll('#vs-2 .btn').forEach(btn => {
    if (btn.textContent.includes('Choose File')) {
      btn.addEventListener('click', () => verifyUploadInput.click());
    }
  });

  // OTP auto-advance
  document.querySelectorAll('.otp-box').forEach((box,i,all) => {
    box.addEventListener('input',()=>{if(box.value&&i<all.length-1) all[i+1].focus();});
    box.addEventListener('keydown',e=>{if(e.key==='Backspace'&&!box.value&&i>0) all[i-1].focus();});
  });
  // Dispute filter
  document.querySelectorAll('.dispute-filter-btn').forEach(btn => {
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.dispute-filter-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      showToast('Filtered: '+btn.textContent.trim(),'');
    });
  });
  // Plan selector in premium modal
  document.querySelectorAll('.plan-opt').forEach(opt => {
    opt.addEventListener('click',()=>{
      document.querySelectorAll('.plan-opt').forEach(o=>o.classList.remove('selected'));
      opt.classList.add('selected');
    });
  });
  populateGlobalCountryData();

  // Keep layout stable when mobile keyboard opens.
  if (window.visualViewport) {
    const setViewportHeight = () => {
      document.documentElement.style.setProperty('--vvh', `${window.visualViewport.height}px`);
    };
    setViewportHeight();
    window.visualViewport.addEventListener('resize', setViewportHeight);
    window.visualViewport.addEventListener('scroll', setViewportHeight);
  }
});