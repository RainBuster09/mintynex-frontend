/* ============================================================
   MINTYNEX — FEED & SHARE  (app-feed.js)
   Post rendering, like/comment/share actions,
   share sheet (native share + copy link + social options)
   ============================================================ */

/* ── Post Data ── */
const POSTS = [
  {
    id: 0,
    user: 'TrainerAsh_KE', flag: '', rank: 'Elite', verified: true,
    time: 'Just now', avatar: '🔥',
    bg: 'linear-gradient(135deg,#7f1d1d,#c2410c,#f97316)',
    cardBg: 'rgba(249,115,22,0.15)',
    cardImg: 'https://images.pokemontcg.io/swsh45/19_hires.png',
    label: 'Charizard VMAX PSA 10',
    caption: 'Just pulled this BEAST! Anyone trade for Lugia V Alt Art?',
    tags: ['#GlobalPulls', '#MintyNex', '#PSA10'],
    likes: 143, comments: 3, shares: 12, liked: false, shared: false
  },
  {
    id: 1,
    user: 'ShinySister_TZ', flag: '', rank: 'Trainer', verified: true,
    time: 'Just now', avatar: '💧',
    bg: 'linear-gradient(135deg,#082f49,#0284c7,#38bdf8)',
    cardBg: 'rgba(56,189,248,0.15)',
    cardImg: 'https://images.pokemontcg.io/swsh10/186_hires.png',
    label: 'Irida SAR',
    caption: 'Finally added the Irida SAR to my collection. Been hunting this for months 💙',
    tags: ['#AltArt', '#TrainerCard', '#MintyNex'],
    likes: 87, comments: 5, shares: 6, liked: false, shared: false
  },
  {
    id: 2,
    user: 'PokeKing_NG', flag: '', rank: 'Master', verified: true,
    time: '2m ago', avatar: '👑',
    bg: 'linear-gradient(135deg,#1e1b4b,#4338ca,#818cf8)',
    cardBg: 'rgba(88,101,242,0.15)',
    cardImg: 'https://images.pokemontcg.io/swsh7/218_hires.png',
    label: 'Rayquaza VMAX BGS 9.5',
    caption: 'BGS 9.5 on this Rayquaza VMAX. Might be the cleanest slab in this region fr 🐉',
    tags: ['#BGS', '#Rayquaza', '#TopPulls'],
    likes: 204, comments: 11, shares: 28, liked: false, shared: false
  }
];

/* ── Render Feed ── */
function renderFeed() {
  const container = document.getElementById('feedCards');
  if (!container) return;
  container.innerHTML = '';

  POSTS.forEach((post, idx) => {
    const el = buildPostEl(post, idx);
    container.appendChild(el);
  });
}

function buildPostEl(post, idx) {
  const div = document.createElement('div');
  div.className = 'post';
  div.innerHTML = `
    <!-- Header -->
    <div class="post-hd">
      <div class="post-av" style="background:${post.bg}">
        <span>${post.avatar}</span>
        <span class="od"></span>
      </div>
      <div style="flex:1;min-width:0">
        <div class="post-nm">
          ${escHtml(post.user)}
          <span style="font-size:11px">${post.flag}</span>
          ${post.verified ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="#5865f2"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>' : ''}
          <span class="bdg bdg-g" style="font-size:9px">${post.rank}</span>
        </div>
        <div class="post-tm">${post.time}</div>
      </div>
      <button class="pab" style="margin-left:auto;color:var(--t4)" onclick="showPostMenu(${idx})" aria-label="More options">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
      </button>
    </div>

    <!-- Card image -->
    <div class="post-img" style="background:${post.bg}">
      <img class="card-art" src="${post.cardImg}" alt="${escHtml(post.label)}" loading="lazy"
        onerror="this.style.display='none'" />
      <div class="post-bdg">${escHtml(post.label)}</div>
    </div>

    <!-- Caption -->
    <p class="post-cap">${escHtml(post.caption)}</p>
    <div class="post-tags">${post.tags.map(t => `<span class="post-tag">${t}</span>`).join('')}</div>

    <!-- Actions -->
    <div class="post-acts">
      <button class="pab ${post.liked ? 'liked' : ''}" data-action="like" data-idx="${idx}" aria-label="Like">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="${post.liked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        <span>${post.likes}</span>
      </button>

      <button class="pab ${post.commented ? 'commented' : ''}" data-action="opencomments" data-idx="${idx}" aria-label="Comments">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span>${post.comments}</span>
      </button>

      <!-- ✅ SHARE BUTTON (as requested) -->
      <button class="pab ${post.shared ? 'shared' : ''}" data-action="share" data-idx="${idx}" aria-label="Share">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
        <span>${post.shares}</span>
      </button>

      <button class="thint" data-pg="trade" aria-label="Trade this card">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
          <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
        </svg>
        Trade
      </button>
    </div>
  `;
  return div;
}

/* ── Submit new post ── */
function submitPost() {
  const input = document.getElementById('postInput');
  const text = input ? input.value.trim() : '';
  if (!text) { showToast('Type something first!', 'red'); return; }

  POSTS.unshift({
    id: Date.now(),
    user: 'TrainerAsh_KE', flag: '', rank: 'Elite', verified: true,
    time: 'Just now', avatar: '🔥',
    bg: 'linear-gradient(135deg,#1e1b4b,#4338ca)',
    cardImg: '', label: 'New Pull!',
    caption: text,
    tags: ['#MintyNex'],
    likes: 0, comments: 0, shares: 0, liked: false, shared: false
  });

  if (input) input.value = '';
  renderFeed();
  showToast('Post shared!', 'grn');
  // Scroll to top of feed
  const feedWrap = document.querySelector('#pg-feed .scr');
  if (feedWrap) feedWrap.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── Comment modal ── */
function openComments(idx) {
  const post = POSTS[idx];
  if (!post) return;
  const modal = document.getElementById('commentModal');
  const body  = document.getElementById('commentBody');
  if (!modal || !body) return;

  body.innerHTML = `
    <div style="font-weight:800;font-size:14px;margin-bottom:12px">
      💬 Comments on ${escHtml(post.user)}'s pull
    </div>
    <div id="commentList" style="margin-bottom:12px">
      <div class="comment-box">
        <div class="comment-hd">
          <div class="comment-av">⚡</div>
          <div>
            <span style="font-weight:700;font-size:12px">CardQueenZA</span>
            <span style="font-size:10px;color:#80848e;margin-left:6px">5m ago</span>
          </div>
        </div>
        <div style="font-size:13px;color:#dbdee1">Insane pull! 🔥🔥🔥</div>
      </div>
      <div class="comment-box">
        <div class="comment-hd">
          <div class="comment-av">💧</div>
          <div>
            <span style="font-weight:700;font-size:12px">MintFresh_KE</span>
            <span style="font-size:10px;color:#80848e;margin-left:6px">2m ago</span>
          </div>
        </div>
        <div style="font-size:13px;color:#dbdee1">Would trade my Lugia for that 👀</div>
      </div>
    </div>
    <div style="display:flex;gap:8px">
      <div class="comment-av" style="background:#5865f2;flex-shrink:0">🔥</div>
      <input class="fi" id="commentInput" placeholder="Add a comment..." style="border-radius:20px;font-size:13px"/>
      <button class="btn bg bxs" id="commentSendBtn" data-action="submitcomment" data-idx="${idx}">Send</button>
    </div>
  `;
  modal.classList.add('on');
}

function submitComment() {
  const input = document.getElementById('commentInput');
  const text = input ? input.value.trim() : '';
  if (!text) return;
  const list = document.getElementById('commentList');
  if (list) {
    const box = document.createElement('div');
    box.className = 'comment-box';
    box.innerHTML = `
      <div class="comment-hd">
        <div class="comment-av" style="background:#5865f2">🔥</div>
        <div>
          <span style="font-weight:700;font-size:12px">TrainerAsh_KE</span>
          <span style="font-size:10px;color:#80848e;margin-left:6px">Just now</span>
        </div>
      </div>
      <div style="font-size:13px;color:#dbdee1">${escHtml(text)}</div>
    `;
    list.appendChild(box);
    list.scrollTop = list.scrollHeight;
  }
  if (input) input.value = '';
  showToast('Comment posted!', 'grn');
}

/* ── Share Sheet ── */
function openShareSheet(idx) {
  const post = POSTS[idx];
  if (!post) return;

  const sheet = document.getElementById('shareSheet');
  if (!sheet) return;

  // Build share URL
  const shareUrl = `https://mintynex.app/post/${post.id}`;
  const shareText = `🔥 Check out this pull on MintyNex: ${post.label}`;

  sheet.innerHTML = `
    <div class="share-sheet-inner">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <div style="font-weight:800;font-size:15px">Share Pull</div>
        <button class="mc" style="position:static" onclick="closeShareSheet()">✕</button>
      </div>
      <div style="font-size:12px;color:#80848e;margin-bottom:14px">
        ${escHtml(post.user)} · ${escHtml(post.label)}
      </div>

      <!-- Drag handle -->
      <div style="width:36px;height:4px;background:rgba(255,255,255,.15);border-radius:2px;margin:-18px auto 16px"></div>

      <div class="share-options">
        <div class="share-opt" onclick="shareToApp('whatsapp','${encodeURIComponent(shareText + ' ' + shareUrl)}')">
          <span class="share-opt-icon">💬</span>WhatsApp
        </div>
        <div class="share-opt" onclick="shareToApp('twitter','${encodeURIComponent(shareText)}','${encodeURIComponent(shareUrl)}')">
          <span class="share-opt-icon">🐦</span>Twitter/X
        </div>
        <div class="share-opt" onclick="shareToApp('telegram','${encodeURIComponent(shareText + ' ' + shareUrl)}')">
          <span class="share-opt-icon">✈️</span>Telegram
        </div>
        <div class="share-opt" onclick="copyShareLink('${shareUrl}')">
          <span class="share-opt-icon">🔗</span>Copy Link
        </div>
        <div class="share-opt" onclick="nativeShare('${encodeURIComponent(shareText)}','${encodeURIComponent(shareUrl)}')">
          <span class="share-opt-icon">📤</span>More
        </div>
        <div class="share-opt" onclick="shareToApp('facebook','${encodeURIComponent(shareUrl)}')">
          <span class="share-opt-icon">👥</span>Facebook
        </div>
        <div class="share-opt" onclick="copyShareLink('${shareUrl}')">
          <span class="share-opt-icon">📋</span>Embed
        </div>
        <div class="share-opt" data-action="friend" data-nm="${post.user}">
          <span class="share-opt-icon">🤝</span>Send to Trainer
        </div>
      </div>

      <div class="share-link-row">
        <input id="shareLinkInput" value="${shareUrl}" readonly onclick="this.select()" />
        <button class="btn bg bsm" onclick="copyShareLink('${shareUrl}')">Copy</button>
      </div>
    </div>
  `;

  sheet.classList.add('on');

  // Animate share button
  const postEls = document.querySelectorAll('.post');
  if (postEls[idx]) {
    const shareBtn = postEls[idx].querySelector('[data-action="share"]');
    if (shareBtn) shareBtn.classList.add('shared');
  }
}

window.closeShareSheet = function() {
  const sheet = document.getElementById('shareSheet');
  if (sheet) sheet.classList.remove('on');
};

window.shareToApp = function(platform, text, url = '') {
  const urls = {
    whatsapp: `https://wa.me/?text=${text}`,
    twitter:  `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
    telegram: `https://t.me/share/url?url=${url}&text=${text}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
  };
  if (urls[platform]) window.open(urls[platform], '_blank');
  closeShareSheet();
  showToast('Opening ' + platform + '...', 'grn');
};

window.copyShareLink = function(url) {
  const input = document.getElementById('shareLinkInput');
  const decoded = decodeURIComponent(url);
  if (navigator.clipboard) {
    navigator.clipboard.writeText(decoded).then(() => {
      showToast('Link copied! 🔗', 'grn');
      closeShareSheet();
    });
  } else if (input) {
    input.select();
    document.execCommand('copy');
    showToast('Link copied!', 'grn');
    closeShareSheet();
  }
};

window.nativeShare = function(text, url) {
  const decoded = { title: 'MintyNex Pull', text: decodeURIComponent(text), url: decodeURIComponent(url) };
  if (navigator.share) {
    navigator.share(decoded).catch(() => {});
  } else {
    copyShareLink(url);
  }
  closeShareSheet();
};

/* ── Post context menu ── */
window.showPostMenu = function(idx) {
  showToast('Report / Save coming soon', '');
};

/* ── HTML escape ── */
function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', renderFeed);