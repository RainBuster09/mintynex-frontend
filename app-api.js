/* ============================================================
   MINTYNEX — API LAYER  (app-api.js)
   Full production API layer for Spring Boot backend.

   HOW TO POINT AT YOUR BACKEND:
     Change BASE_URL below to your Railway URL when deployed.
     During local dev it uses localhost:8080 automatically.
   ============================================================ */

(function () {

  /* ── Base URL ───────────────────────────────────────────────
     Priority order:
       1. Value saved in localStorage (set by admin dev tool)
       2. Auto-detect: if page is on localhost → use local backend
       3. Fallback: your Railway production URL (update this!)
  ─────────────────────────────────────────────────────────── */
  const PROD_URL  = 'https://mintynex-backend.up.railway.app/api'; // Railway production URL
  const LOCAL_URL = 'http://localhost:8080/api';

  function detectBaseUrl() {
    const saved = localStorage.getItem('mx_api_base');
    if (saved) return saved;
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return LOCAL_URL;
    return PROD_URL;
  }

  const CFG = { baseUrl: detectBaseUrl() };

  /* ── Token storage ───────────────────────────────────────────
     Access token: kept in memory only (not localStorage) for security.
     Refresh token: kept in localStorage (backend should use httpOnly
     cookie in production — for now localStorage is fine for dev).
  ─────────────────────────────────────────────────────────── */
  let _accessToken  = null;
  let _refreshing   = null; // prevents parallel refresh calls

  function getRefreshToken()        { return localStorage.getItem('mx_refresh'); }
  function saveTokens(at, rt)       { _accessToken = at; if (rt) localStorage.setItem('mx_refresh', rt); }
  function clearTokens()            { _accessToken = null; localStorage.removeItem('mx_refresh'); localStorage.removeItem('mx_user'); }
  function getStoredUser()          { try { return JSON.parse(localStorage.getItem('mx_user') || 'null'); } catch(_) { return null; } }
  function saveUser(user)           { localStorage.setItem('mx_user', JSON.stringify(user)); }

  /* ── Refresh access token silently ──────────────────────── */
  async function refreshAccessToken() {
    if (_refreshing) return _refreshing;
    _refreshing = (async () => {
      const rt = getRefreshToken();
      if (!rt) throw new Error('No refresh token');
      const res = await fetch(CFG.baseUrl + '/auth/refresh', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ refreshToken: rt })
      });
      if (!res.ok) { clearTokens(); throw new Error('Session expired'); }
      const data = await res.json();
      _accessToken = data.accessToken;
      return data.accessToken;
    })();
    _refreshing.finally(() => { _refreshing = null; });
    return _refreshing;
  }

  /* ── Core request function ───────────────────────────────── */
  async function request(path, opts = {}) {
    const url     = CFG.baseUrl + path;
    const method  = opts.method || 'GET';
    const isForm  = opts.formData instanceof FormData;

    // Build headers
    const headers = {};
    if (!isForm) headers['Content-Type'] = 'application/json';
    if (_accessToken) headers['Authorization'] = 'Bearer ' + _accessToken;

    const fetchOpts = {
      method,
      headers,
      body: isForm ? opts.formData : (opts.body ? JSON.stringify(opts.body) : undefined)
    };

    let res = await fetch(url, fetchOpts);

    // 401 → try silent refresh once
    if (res.status === 401 && !opts._retried) {
      try {
        await refreshAccessToken();
        headers['Authorization'] = 'Bearer ' + _accessToken;
        res = await fetch(url, { ...fetchOpts, headers, _retried: true });
      } catch (_) {
        clearTokens();
        // Kick user back to login
        if (typeof doLogout === 'function') doLogout(true);
        return { ok: false, status: 401, data: { message: 'Session expired. Please log in again.' } };
      }
    }

    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  }

  /* ── Public API surface ─────────────────────────────────── */
  window.AppApi = {

    /* Dev helper: override base URL */
    setBaseUrl(url) { CFG.baseUrl = url; localStorage.setItem('mx_api_base', url); },
    getBaseUrl()    { return CFG.baseUrl; },

    /* Token helpers used by app-connect.js */
    saveTokens,
    clearTokens,
    getStoredUser,
    saveUser,
    get accessToken() { return _accessToken; },

    /* ── Auth ── */
    auth: {
      login:         (body) => request('/auth/login',          { method: 'POST', body }),
      register:      (body) => request('/auth/register',       { method: 'POST', body }),
      sendOtp:       (body) => request('/auth/send-otp',       { method: 'POST', body }),
      verifyOtp:     (body) => request('/auth/verify-otp',     { method: 'POST', body }),
      refresh:       (body) => request('/auth/refresh',        { method: 'POST', body }),
      resetPassword: (body) => request('/auth/reset-password', { method: 'POST', body }),
      logout:        ()     => request('/auth/logout',         { method: 'POST' }),
      adminLogin:    (body) => request('/admin/login',         { method: 'POST', body }),
    },

    /* ── Users ── */
    users: {
      me:         ()     => request('/users/me'),
      update:     (body) => request('/users/me',    { method: 'PUT', body }),
      getById:    (id)   => request('/users/' + id),
      search:     (q)    => request('/users/search?q=' + encodeURIComponent(q || '')),
      uploadAvatar: (fd) => request('/users/avatar', { method: 'POST', formData: fd }),
      uploadBanner: (fd) => request('/users/banner', { method: 'POST', formData: fd }),
    },

    /* ── Posts ── */
    posts: {
      feed:       (page = 0, size = 20) => request('/posts?page=' + page + '&size=' + size),
      create:     (body) => request('/posts',            { method: 'POST', body }),
      delete:     (id)   => request('/posts/' + id,      { method: 'DELETE' }),
      like:       (id)   => request('/posts/' + id + '/like', { method: 'POST' }),
      getComments:(id)   => request('/posts/' + id + '/comments'),
      addComment: (id, body) => request('/posts/' + id + '/comments', { method: 'POST', body }),
    },

    /* ── Binder ── */
    binder: {
      get:    (page = 0, size = 18) => request('/binder?page=' + page + '&size=' + size),
      add:    (body) => request('/binder',       { method: 'POST', body }),
      remove: (id)   => request('/binder/' + id, { method: 'DELETE' }),
    },

    /* ── Trades ── */
    trades: {
      list:     ()     => request('/trades'),
      propose:  (body) => request('/trades',              { method: 'POST', body }),
      accept:   (id)   => request('/trades/' + id + '/accept',   { method: 'PUT' }),
      reject:   (id)   => request('/trades/' + id + '/reject',   { method: 'PUT' }),
      complete: (id)   => request('/trades/' + id + '/complete', { method: 'PUT' }),
      flag:     (id, body) => request('/trades/' + id + '/flag', { method: 'POST', body }),
    },

    /* ── Listings ── */
    listings: {
      browse:  (params) => request('/listings?' + new URLSearchParams(params || {}).toString()),
      create:  (body)   => request('/listings',       { method: 'POST', body }),
      update:  (id, body) => request('/listings/' + id, { method: 'PUT', body }),
      delete:  (id)     => request('/listings/' + id, { method: 'DELETE' }),
    },

    /* ── Messages ── */
    messages: {
      conversation: (userId, page = 0) => request('/messages/' + userId + '?page=' + page),
      send:         (userId, body)     => request('/messages/' + userId, { method: 'POST', body }),
      markRead:     (userId)           => request('/messages/' + userId + '/read', { method: 'PUT' }),
    },

    /* ── Notifications ── */
    notifications: {
      list:        (page = 0) => request('/notifications?page=' + page),
      unreadCount: ()         => request('/notifications/unread-count'),
      markAllRead: ()         => request('/notifications/read-all', { method: 'PUT' }),
    },

    /* ── Admin ── */
    admin: {
      stats:              ()     => request('/admin/stats'),
      users:              (params) => request('/admin/users?' + new URLSearchParams(params || {}).toString()),
      banUser:            (id)   => request('/admin/users/' + id + '/ban', { method: 'PUT' }),
      posts:              (params) => request('/admin/posts?' + new URLSearchParams(params || {}).toString()),
      deletePost:         (id)   => request('/admin/posts/' + id, { method: 'DELETE' }),
      trades:             ()     => request('/admin/trades'),
      listings:           ()     => request('/admin/listings'),
      createListing:      (body) => request('/admin/listings',       { method: 'POST', body }),
      deleteListing:      (id)   => request('/admin/listings/' + id, { method: 'DELETE' }),
      verifications:      ()     => request('/admin/verifications'),
      approveVerify:      (id)   => request('/admin/verifications/' + id + '/approve', { method: 'PUT' }),
      rejectVerify:       (id)   => request('/admin/verifications/' + id + '/reject',  { method: 'PUT' }),
      reports:            ()     => request('/admin/reports'),
      resolveReport:      (id)   => request('/admin/reports/' + id + '/resolve', { method: 'PUT' }),
    },
  };

})();