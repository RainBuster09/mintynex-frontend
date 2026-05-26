/* ============================================================
   MINTYNEX — API LAYER  (app-api.js)
   Full production API layer for Spring Boot backend.
   ============================================================ */

(function () {

const PROD_URL = 'https://mintynex-backend-production.up.railway.app/api';
const LOCAL_URL = 'http://localhost:8080/api';

  function detectBaseUrl() {
    const saved = localStorage.getItem('mx_api_base');
    if (saved) return saved;
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return LOCAL_URL;
    return PROD_URL;
  }

  const CFG = { baseUrl: detectBaseUrl() };

  let _accessToken = null;
  let _refreshing  = null;

  function getRefreshToken()  { return localStorage.getItem('mx_refresh'); }
  function saveTokens(at, rt) { _accessToken = at; if (rt) localStorage.setItem('mx_refresh', rt); }
  function clearTokens()      { _accessToken = null; localStorage.removeItem('mx_refresh'); localStorage.removeItem('mx_user'); }
  function getStoredUser()    { try { return JSON.parse(localStorage.getItem('mx_user') || 'null'); } catch(_) { return null; } }
  function saveUser(user)     { localStorage.setItem('mx_user', JSON.stringify(user)); }

  async function refreshAccessToken() {
    if (_refreshing) return _refreshing;
    _refreshing = (async () => {
      const rt = getRefreshToken();
      if (!rt) throw new Error('No refresh token');
      const res = await fetch(CFG.baseUrl + '/auth/refresh', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt })
      });
      if (!res.ok) { clearTokens(); throw new Error('Session expired'); }
      const data = await res.json();
      _accessToken = data.accessToken;
      return data.accessToken;
    })();
    _refreshing.finally(() => { _refreshing = null; });
    return _refreshing;
  }

  async function request(path, opts = {}) {
    const url    = CFG.baseUrl + path;
    const method = opts.method || 'GET';
    const isForm = opts.formData instanceof FormData;

    const headers = {};
    if (!isForm) headers['Content-Type'] = 'application/json';
    if (_accessToken) headers['Authorization'] = 'Bearer ' + _accessToken;

    const fetchOpts = {
      method,
      headers,
      body: isForm ? opts.formData : (opts.body ? JSON.stringify(opts.body) : undefined)
    };

    let res = await fetch(url, fetchOpts);

    if (res.status === 401 && !opts._retried) {
      try {
        await refreshAccessToken();
        headers['Authorization'] = 'Bearer ' + _accessToken;
        res = await fetch(url, { ...fetchOpts, headers });
      } catch (_) {
        clearTokens();
        if (typeof doLogout === 'function') doLogout(true);
        return { ok: false, status: 401, data: { message: 'Session expired. Please log in again.' } };
      }
    }

    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  }

  window.AppApi = {

    setBaseUrl(url) { CFG.baseUrl = url; localStorage.setItem('mx_api_base', url); },
    getBaseUrl()    { return CFG.baseUrl; },

    saveTokens, clearTokens, getStoredUser, saveUser,
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
      adminLogin:    (body) => request('/auth/admin-login',    { method: 'POST', body }),
    },

    /* ── Users ── */
    users: {
      me:           ()       => request('/users/me'),
      update:       (body)   => request('/users/me',     { method: 'PUT', body }),
      getById:      (id)     => request('/users/' + id),
      search:       (q)      => request('/users/search?q=' + encodeURIComponent(q || '')),
      uploadAvatar: (fd)     => request('/users/me/avatar', { method: 'POST', formData: fd }),
      uploadBanner: (fd)     => request('/users/me/banner', { method: 'POST', formData: fd }),
    },

    /* ── Posts ── */
    posts: {
      feed:          (page = 0, size = 20) => request('/posts?page=' + page + '&size=' + size),
      byUser:        (userId, page = 0)    => request('/posts/user/' + userId + '?page=' + page),
      create:        (body)                => request('/posts', { method: 'POST', body }),
      // BUG FIX: photo upload for posts — was missing
      createWithImage: (fd)                => request('/posts/with-image', { method: 'POST', formData: fd }),
      delete:        (id)                  => request('/posts/' + id,      { method: 'DELETE' }),
      like:          (id)                  => request('/posts/' + id + '/like',     { method: 'POST' }),
      getComments:   (id, page = 0)        => request('/posts/' + id + '/comments?page=' + page),
      addComment:    (id, body)            => request('/posts/' + id + '/comments', { method: 'POST', body }),
    },

    /* ── Binder ── */
    binder: {
      get:         (page = 0, size = 18) => request('/binder?page=' + page + '&size=' + size),
      stats:       ()                    => request('/binder/stats'),
      add:         (body)                => request('/binder',           { method: 'POST', body }),
      update:      (id, body)            => request('/binder/' + id,     { method: 'PUT', body }),
      remove:      (id)                  => request('/binder/' + id,     { method: 'DELETE' }),
      uploadImage: (fd)                  => request('/binder/upload-image', { method: 'POST', formData: fd }),
    },

    /* ── Messages ── */
    messages: {
      inbox:        ()                    => request('/messages/inbox'),
      conversation: (userId, page = 0)   => request('/messages/' + userId + '?page=' + page),
      send:         (userId, body)        => request('/messages/' + userId, { method: 'POST', body }),
      // BUG FIX: edit and react were completely missing
      edit:         (msgId, body)         => request('/messages/' + msgId + '/edit', { method: 'PUT', body }),
      react:        (msgId, body)         => request('/messages/' + msgId + '/react', { method: 'POST', body }),
      delete:       (msgId)               => request('/messages/' + msgId, { method: 'DELETE' }),
      deleteConversation: (userId)        => request('/messages/conversation/' + userId, { method: 'DELETE' }),
      markRead:     (userId)              => request('/messages/' + userId + '/read', { method: 'PUT' }),
    },

    /* ── Trades ── */
    trades: {
      list:     ()         => request('/trades'),
      propose:  (body)     => request('/trades',                        { method: 'POST', body }),
      accept:   (id)       => request('/trades/' + id + '/accept',      { method: 'PUT' }),
      reject:   (id)       => request('/trades/' + id + '/reject',      { method: 'PUT' }),
      complete: (id)       => request('/trades/' + id + '/complete',    { method: 'PUT' }),
      flag:     (id, body) => request('/trades/' + id + '/flag',        { method: 'POST', body }),
    },

    /* ── Listings ── */
    listings: {
      browse:  (params)     => request('/listings?' + new URLSearchParams(params || {}).toString()),
      create:  (body)       => request('/listings',       { method: 'POST', body }),
      update:  (id, body)   => request('/listings/' + id, { method: 'PUT', body }),
      delete:  (id)         => request('/listings/' + id, { method: 'DELETE' }),
    },

    /* ── Notifications ── */
    notifications: {
      list:        (page = 0) => request('/notifications?page=' + page),
      unreadCount: ()         => request('/notifications/unread-count'),
      markAllRead: ()         => request('/notifications/read-all', { method: 'PUT' }),
    },

    /* ── Admin ── */
    admin: {
      stats:         ()          => request('/admin/stats'),
      users:         (params)    => request('/admin/users?' + new URLSearchParams(params || {}).toString()),
      banUser:       (id)        => request('/admin/users/' + id + '/ban', { method: 'PUT' }),
      posts:         (params)    => request('/admin/posts?' + new URLSearchParams(params || {}).toString()),
      deletePost:    (id)        => request('/admin/posts/' + id, { method: 'DELETE' }),
      trades:        ()          => request('/admin/trades'),
      listings:      ()          => request('/admin/listings'),
      createListing: (body)      => request('/admin/listings',       { method: 'POST', body }),
      deleteListing: (id)        => request('/admin/listings/' + id, { method: 'DELETE' }),
    },
  };

})();