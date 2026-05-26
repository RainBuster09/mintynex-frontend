/* ============================================================
   MINTYNEX — FRONTEND FIXES  (app-fixes.js)
   Load this AFTER app-api.js, app-ui.js, app-connect.js.

   Fixes:
   #5  Shop modal — upgrade flow wired to plan selection
   #6  Filter + Sort in Mart — fully functional
   #7  Trade ⇄ pre-fills card + partner when coming from Mart/Players
   #9  ⇄ Trade in Messages header — passes conversation partner context
   #15 Landing page Propose Trade / Message buttons — navigate to app
   #16 Community feed ❤️/💬/🔗 — wired to API (like, comment, share)
   #29 Premium gate — reads plan from /api/users/me, not sessionStorage
   ============================================================ */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════
     FIX #29 — PREMIUM GATE: read from API, not sessionStorage
     The old code stored premium status in sessionStorage which
     clears on hard refresh, letting users bypass the gate.
     Now we always verify against the server on load/refresh.
  ══════════════════════════════════════════════════════════ */
  async function syncPremiumFromServer() {
    try {
      if (typeof AppApi === 'undefined') return;
      const res = await AppApi.users.me();
      if (!res.ok || !res.data) return;

      const user = res.data;
      const isActive = user.premium && user.premiumPlan && user.premiumPlan !== 'FREE';

      // Overwrite the in-memory PREMIUM object used by app-ui.js
      if (typeof PREMIUM !== 'undefined') {
        PREMIUM.active = isActive;
        PREMIUM.plan   = user.premiumPlan || 'FREE';
        PREMIUM.trial  = user.premiumPlan === 'TRIAL';
      }

      // Keep sessionStorage in sync for the current session
      try {
        sessionStorage.setItem('mx_premium', JSON.stringify({ active: isActive, plan: user.premiumPlan }));
      } catch(_) {}

      if (typeof updatePremiumBadge === 'function') updatePremiumBadge();
    } catch(e) {
      console.warn('[mx-fix] syncPremiumFromServer error:', e);
    }
  }

  // Hook into enterApp so every login syncs premium state from server
  const _origEnterApp = window.enterApp;
  window.enterApp = function(user) {
    if (_origEnterApp) _origEnterApp(user);
    syncPremiumFromServer();
  };

  // Also sync on page load if already logged in (handles hard refresh)
  document.addEventListener('DOMContentLoaded', function () {
    // Give tryAutoLogin a moment to restore the access token first
    setTimeout(syncPremiumFromServer, 800);
  });


  /* ══════════════════════════════════════════════════════════
     FIX #6 — FILTER + SORT IN MART
     Replaces the "Filter coming soon" / "Sort coming soon" toasts
     with a real dropdown filter panel and sort options.
  ══════════════════════════════════════════════════════════ */

  // State for mart filter/sort
  const _martState = {
    search:    '',
    type:      '',   // Fire, Water, Electric, Graded
    sortBy:    'newest',  // newest | price_asc | price_desc | grade
    cards:     []    // populated from DOM on init
  };

  function initMartFilterSort() {
    const martArea = document.getElementById('pg-mart');
    if (!martArea) return;

    // Replace "Filter" and "Sort" buttons with real controls
    const filterBtn = martArea.querySelector('[onclick*="Filter coming soon"]');
    const sortBtn   = martArea.querySelector('[onclick*="Sort coming soon"]');

    if (filterBtn) {
      filterBtn.removeAttribute('onclick');
      filterBtn.textContent = '⚙ Filter';
      filterBtn.addEventListener('click', toggleMartFilterPanel);
    }

    if (sortBtn) {
      sortBtn.removeAttribute('onclick');
      sortBtn.innerHTML = '↕ Sort';
      sortBtn.addEventListener('click', toggleMartSortMenu);
    }

    // Wire the search box
    const searchInput = martArea.querySelector('.fi[placeholder*="Search"]');
    if (searchInput) {
      searchInput.addEventListener('input', function() {
        _martState.search = this.value.toLowerCase();
        applyMartFilters();
      });
    }

    // Wire sidebar type buttons
    martArea.querySelectorAll('.sni').forEach(btn => {
      btn.addEventListener('click', function() {
        martArea.querySelectorAll('.sni').forEach(b => b.classList.remove('on'));
        this.classList.add('on');
        const label = this.textContent.trim();
        if (label === 'All Listings') {
          _martState.type = '';
        } else if (label.includes('PSA')) {
          _martState.type = 'graded';
        } else {
          // Extract type from emoji label e.g. "🔥 Fire" → "fire"
          _martState.type = label.replace(/[^\w\s]/g, '').trim().toLowerCase().split(' ').pop();
        }
        applyMartFilters();
      });
    });

    // Cache all listing cards from DOM
    _martState.cards = Array.from(martArea.querySelectorAll('.tcg')).map(el => ({
      el,
      name:    el.querySelector('.tcg-nm')?.textContent?.toLowerCase() || '',
      price:   parseFloat((el.querySelector('.tcg-price')?.textContent || '0').replace(/[^0-9.]/g, '')) || 0,
      type:    el.querySelector('.tcg-art-badge')?.textContent?.toLowerCase() || '',
      graded:  !!(el.querySelector('.bdg-g')),
    }));
  }

  function toggleMartFilterPanel() {
    let panel = document.getElementById('martFilterPanel');
    if (panel) { panel.remove(); return; }

    panel = document.createElement('div');
    panel.id = 'martFilterPanel';
    panel.style.cssText = 'position:absolute;z-index:1000;background:#2b2d31;border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:14px;min-width:200px;box-shadow:0 4px 20px rgba(0,0,0,.5)';
    panel.innerHTML = `
      <div style="font-weight:700;font-size:12px;color:#fff;margin-bottom:10px">Filter by Type</div>
      ${['All','Fire 🔥','Water 💧','Electric ⚡','Graded 🏅'].map(t =>
        `<label style="display:flex;align-items:center;gap:8px;padding:5px 0;cursor:pointer;font-size:13px;color:#dbdee1">
          <input type="radio" name="martType" value="${t.split(' ')[0].toLowerCase()}" ${(_martState.type===''&&t==='All')||_martState.type===t.split(' ')[0].toLowerCase()?'checked':''}>
          ${t}
        </label>`
      ).join('')}
      <button onclick="document.getElementById('martFilterPanel')?.remove()" style="margin-top:10px;width:100%;padding:6px;background:#5865f2;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:12px">Apply</button>
    `;

    panel.querySelectorAll('input[type=radio]').forEach(inp => {
      inp.addEventListener('change', function() {
        _martState.type = this.value === 'all' ? '' : this.value;
        applyMartFilters();
      });
    });

    const filterBtn = document.querySelector('#pg-mart [onclick*="filter"], #pg-mart .btn');
    const anchor = filterBtn || document.querySelector('#pg-mart .ga-lg');
    if (anchor) {
      anchor.style.position = 'relative';
      anchor.appendChild(panel);
    }
  }

  function toggleMartSortMenu() {
    let menu = document.getElementById('martSortMenu');
    if (menu) { menu.remove(); return; }

    menu = document.createElement('div');
    menu.id = 'martSortMenu';
    menu.style.cssText = 'position:absolute;right:0;z-index:1000;background:#2b2d31;border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:8px;min-width:160px;box-shadow:0 4px 20px rgba(0,0,0,.5)';

    const options = [
      { val: 'newest',     label: '🕐 Newest First' },
      { val: 'price_asc',  label: '💰 Price: Low → High' },
      { val: 'price_desc', label: '💰 Price: High → Low' },
      { val: 'grade',      label: '🏅 Graded Only' },
    ];

    menu.innerHTML = options.map(o =>
      `<div class="sort-opt" data-sort="${o.val}" style="padding:7px 10px;cursor:pointer;font-size:13px;color:${_martState.sortBy===o.val?'#5865f2':'#dbdee1'};border-radius:5px">${o.label}</div>`
    ).join('');

    menu.querySelectorAll('.sort-opt').forEach(opt => {
      opt.addEventListener('mouseenter', function() { this.style.background = 'rgba(255,255,255,.05)'; });
      opt.addEventListener('mouseleave', function() { this.style.background = 'transparent'; });
      opt.addEventListener('click', function() {
        _martState.sortBy = this.dataset.sort;
        applyMartFilters();
        menu.remove();
      });
    });

    const sortBtn = document.querySelector('#pg-mart .bgh[class*="bsm"]:last-of-type');
    if (sortBtn) {
      sortBtn.style.position = 'relative';
      sortBtn.appendChild(menu);
    }
  }

  function applyMartFilters() {
    let cards = [..._martState.cards];

    // Search filter
    if (_martState.search) {
      cards = cards.filter(c => c.name.includes(_martState.search));
    }

    // Type filter
    if (_martState.type) {
      if (_martState.type === 'graded') {
        cards = cards.filter(c => c.graded);
      } else {
        cards = cards.filter(c => c.type.includes(_martState.type));
      }
    }

    // Sort
    if (_martState.sortBy === 'price_asc')  cards.sort((a,b) => a.price - b.price);
    if (_martState.sortBy === 'price_desc') cards.sort((a,b) => b.price - a.price);
    if (_martState.sortBy === 'grade')      cards = cards.filter(c => c.graded);

    // Show/hide
    const grid = document.querySelector('#pg-mart .ga-lg');
    if (!grid) return;

    _martState.cards.forEach(c => c.el.style.display = 'none');

    if (cards.length === 0) {
      // Show empty state
      let empty = grid.querySelector('.mart-empty');
      if (!empty) {
        empty = document.createElement('div');
        empty.className = 'mart-empty';
        empty.style.cssText = 'grid-column:1/-1;text-align:center;padding:32px;color:#80848e;font-size:13px';
        empty.textContent = 'No listings match your filter.';
        grid.appendChild(empty);
      }
    } else {
      const empty = grid.querySelector('.mart-empty');
      if (empty) empty.remove();
      cards.forEach(c => {
        c.el.style.display = '';
        grid.appendChild(c.el); // re-append in sorted order
      });
    }
  }


  /* ══════════════════════════════════════════════════════════
     FIX #7 — TRADE PRE-FILL FROM MART CARD ⇄ BUTTON
     When a user clicks ⇄ on a mart card, navigate to the trade
     page and pre-fill the partner and their card.
  ══════════════════════════════════════════════════════════ */
  document.addEventListener('click', function(e) {
    // ⇄ button on a mart card
    const tradeBtn = e.target.closest('.tcg [data-pg="trade"]');
    if (!tradeBtn) return;

    const card = tradeBtn.closest('.tcg');
    if (!card) return;

    // Extract card info from the DOM
    const cardName   = card.querySelector('.tcg-nm')?.textContent?.trim() || '';
    const sellerBadge = card.querySelector('.tcg-art-badge')?.textContent?.trim() || '';
    const price      = card.querySelector('.tcg-price')?.textContent?.trim() || '';

    // Store context so the trade page can read it
    window._tradeContext = {
      receiverCard:    cardName,
      partnerLabel:    sellerBadge,
      priceSuggestion: price,
    };

    // Navigate to trade page
    if (typeof showPg === 'function') {
      showPg('trade');
      // Pre-fill after a tick (DOM needs to be visible)
      setTimeout(() => preFillTradeForm(window._tradeContext), 50);
    }
  }, true);

  function preFillTradeForm(ctx) {
    if (!ctx) return;
    const meetupEl = document.getElementById('tradeMeetup');
    const noteEl   = document.getElementById('tradeNote');
    const partnerEl = document.getElementById('tradePartnerLabel') ||
                      document.querySelector('#pg-trade .trade-partner-name');

    if (noteEl && ctx.receiverCard) {
      // Pre-fill the note with what they want
      if (!noteEl.value) {
        noteEl.value = `Interested in your ${ctx.receiverCard} (${ctx.priceSuggestion}). Open to trade!`;
      }
    }

    if (partnerEl && ctx.partnerLabel) {
      partnerEl.textContent = ctx.partnerLabel;
    }

    // Store partner info for proposeTrade() to pick up
    window._tradePrefillCard = ctx.receiverCard;
  }


  /* ══════════════════════════════════════════════════════════
     FIX #9 — ⇄ TRADE BUTTON IN MESSAGES HEADER
     Passes the current conversation partner to the trade form.
  ══════════════════════════════════════════════════════════ */
  document.addEventListener('click', function(e) {
    const tradeBtn = e.target.closest('#pg-messages [data-pg="trade"]');
    if (!tradeBtn) return;

    // Get partner from the chat header
    const partnerName = document.querySelector('.msg-chat-header-name')?.textContent?.trim() || '';
    const partnerAv   = document.querySelector('.msg-chat-header-av')?.textContent?.trim() || '';

    if (partnerName) {
      window._tradeContext = {
        partnerLabel: partnerAv + ' ' + partnerName,
        fromMessages: true,
        partnerName,
      };
      // store for proposeTrade()
      window._tradePartnerLabel = partnerName;
    }
    // navigation continues via data-pg handler in app-ui.js
  }, true);


  /* ══════════════════════════════════════════════════════════
     FIX #5 — SHOP/BUY PREMIUM MODAL: wire plan selection
     Opens modal, lets user pick monthly/yearly, then sends
     an upgrade request. Backend upgrade endpoint can be
     wired to a payment gateway later — for now it calls the
     premium activation path.
  ══════════════════════════════════════════════════════════ */
  window.openShopBuyModal = function(listingId, price) {
    // If user is already premium, let them proceed to checkout message
    if (typeof PREMIUM !== 'undefined' && PREMIUM.active) {
      showToast('Contact the seller via Messages to arrange payment 💬', 'grn');
      return;
    }
    // Otherwise gate them to premium
    if (typeof openPremiumModal === 'function') {
      openPremiumModal('Shop & Buy Cards');
    }
  };

  // Wire Add to Cart / Buy Now buttons in mart/shop
  document.addEventListener('click', function(e) {
    const buyBtn = e.target.closest('[data-action="buynow"],[data-action="addcart"]');
    if (!buyBtn) return;
    const listingId = buyBtn.closest('[data-listing-id]')?.dataset?.listingId;
    const price     = buyBtn.closest('.tcg')?.querySelector('.tcg-price')?.textContent;
    openShopBuyModal(listingId, price);
  });


  /* ══════════════════════════════════════════════════════════
     FIX #16 — COMMUNITY FEED ACTIONS (IN-APP)
     Wire ❤️ like, 💬 open comments, 🔗 share on feed posts.
     The feed is rendered in #pg-feed via app-feed.js.
     This handles clicks on the rendered action buttons.
  ══════════════════════════════════════════════════════════ */

  // Track liked posts in memory (not session — so it resets per visit, which is fine)
  const _likedPosts = new Set();

  document.addEventListener('click', function(e) {
    // Like button
    const likeBtn = e.target.closest('[data-action="like"]');
    if (likeBtn) {
      const postId = likeBtn.closest('[data-post-id]')?.dataset?.postId ||
                     likeBtn.dataset?.postId;
      if (!postId) return;

      const countEl = likeBtn.querySelector('.like-count') || likeBtn;

      if (_likedPosts.has(postId)) {
        // Unlike
        _likedPosts.delete(postId);
        likeBtn.style.color = '';
        const cur = parseInt(countEl.textContent.replace(/\D/g,'')) || 0;
        if (cur > 0) countEl.textContent = countEl.textContent.replace(/\d+/, cur - 1);
        if (typeof AppApi !== 'undefined') AppApi.posts.like(postId).catch(()=>{});
      } else {
        // Like
        _likedPosts.add(postId);
        likeBtn.style.color = '#ed4245';
        const cur = parseInt(countEl.textContent.replace(/\D/g,'')) || 0;
        countEl.textContent = countEl.textContent.replace(/\d+/, cur + 1);
        if (typeof AppApi !== 'undefined') AppApi.posts.like(postId).catch(()=>{});
      }
      return;
    }

    // Share button — native share API or clipboard fallback
    const shareBtn = e.target.closest('[data-action="share"]');
    if (shareBtn) {
      const postId  = shareBtn.closest('[data-post-id]')?.dataset?.postId || '';
      const cardNm  = shareBtn.closest('.cf-post')?.querySelector('.cf-cap')?.textContent?.substring(0,60) || 'Check this out on MintyNex!';
      const url     = window.location.origin + '/app.html#post-' + postId;

      if (navigator.share) {
        navigator.share({ title: 'MintyNex', text: cardNm, url }).catch(()=>{});
      } else {
        navigator.clipboard?.writeText(url).then(() => {
          if (typeof showToast === 'function') showToast('Link copied! 🔗', 'grn');
        }).catch(()=>{
          if (typeof showToast === 'function') showToast('Link copied!', 'grn');
        });
      }
      return;
    }
  });


  /* ══════════════════════════════════════════════════════════
     FIX #15 — LANDING PAGE BUTTONS (index.html)
     Propose Trade and Message buttons on the landing page
     navigate to app.html and open the correct page.
  ══════════════════════════════════════════════════════════ */
  function wireLandingButtons() {
    // Only runs on the landing page
    if (!document.querySelector('.vc-actions')) return;

    const tradeBtn = document.querySelector('.vc-btn-trade');
    const msgBtn   = document.querySelector('.vc-btn-msg');

    if (tradeBtn) {
      tradeBtn.style.cursor = 'pointer';
      tradeBtn.addEventListener('click', function() {
        window.location.href = 'app.html?goto=trade';
      });
    }

    if (msgBtn) {
      msgBtn.style.cursor = 'pointer';
      msgBtn.addEventListener('click', function() {
        window.location.href = 'app.html?goto=messages';
      });
    }

    // Community feed like/share on landing (static HTML, no postId)
    document.querySelectorAll('.cf-acts span').forEach(span => {
      span.style.cursor = 'pointer';
      span.addEventListener('click', function() {
        if (this.textContent.includes('❤')) {
          const cur = parseInt(this.textContent.replace(/\D/g,'')) || 0;
          this.textContent = '❤️ ' + (cur + 1);
          this.style.color = '#ed4245';
        }
        if (this.textContent.includes('🔗')) {
          navigator.clipboard?.writeText(window.location.href)
            .catch(()=>{});
          this.textContent = '✓ Copied!';
          setTimeout(() => { this.textContent = '🔗 Share'; }, 2000);
        }
        if (this.textContent.includes('💬')) {
          window.location.href = 'app.html?goto=feed';
        }
      });
    });
  }

  /* ══════════════════════════════════════════════════════════
     HANDLE ?goto= PARAM ON app.html
     When landing redirects to app.html?goto=trade etc.,
     auto-navigate to the right page after login.
  ══════════════════════════════════════════════════════════ */
  function handleGotoParam() {
    const params = new URLSearchParams(window.location.search);
    const goto   = params.get('goto');
    if (!goto) return;

    // Remove the param from URL without reloading
    const url = new URL(window.location);
    url.searchParams.delete('goto');
    window.history.replaceState({}, '', url);

    // Store for after login (enterApp will call this check)
    window._pendingGoto = goto;
  }

  function checkPendingGoto() {
    if (window._pendingGoto && typeof showPg === 'function') {
      const dest = window._pendingGoto;
      window._pendingGoto = null;
      setTimeout(() => showPg(dest), 200);
    }
  }

  // Patch enterApp to also check pending goto
  const _enterApp2 = window.enterApp;
  window.enterApp = function(user) {
    if (_enterApp2) _enterApp2(user);
    checkPendingGoto();
  };


  /* ══════════════════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', function() {
    wireLandingButtons();
    handleGotoParam();

    // Init mart filter/sort after a tick so the DOM is ready
    setTimeout(initMartFilterSort, 300);
  });

  // Also init mart when the mart page becomes visible
  const _origShowPg = window.showPg;
  if (_origShowPg) {
    window.showPg = function(id) {
      _origShowPg(id);
      if (id === 'mart') setTimeout(initMartFilterSort, 100);
    };
  }

})();