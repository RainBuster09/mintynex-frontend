/* ============================================================
   MINTYNEX — app-init.js
   NEW FILE — load this BEFORE app-connect.js in app.html.

   Purpose:
   1. Reads ?mode=register or ?mode=login from the URL and shows
      the correct form when app.html loads (so landing page
      "Log In" → login form, "Join Free" → register form).
   2. Cleans up the URL after reading the param.
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {
  const params = new URLSearchParams(window.location.search);
  const mode   = params.get('mode'); // 'login' | 'register' | null

  if (mode === 'register') {
    // Show register form immediately
    if (typeof showRegister === 'function') {
      showRegister();
    } else {
      // Fallback: direct DOM manipulation if showRegister isn't ready yet
      const trainerForm  = document.getElementById('trainerForm');
      const registerForm = document.getElementById('registerForm');
      if (trainerForm)  trainerForm.style.display  = 'none';
      if (registerForm) registerForm.style.display = 'block';
    }
  } else if (mode === 'login' || !mode) {
    // Default: login form (already the default, but be explicit)
    if (typeof showLogin === 'function') {
      showLogin();
    }
  }

  // Clean the URL so the param doesn't persist on refresh
  if (mode && window.history.replaceState) {
    const cleanUrl = window.location.pathname + window.location.hash;
    window.history.replaceState({}, document.title, cleanUrl);
  }
});
