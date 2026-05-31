/* ============================================================
   MINTYNEX — FEED & SHARE  (app-feed.js)
   Post rendering, like/comment/share actions, photo uploads,
   share sheet, comment modal — fully fixed & API-connected
   ============================================================ */

/* ── State ── */
let POSTS = [];
let _feedPage = 0;
let _feedLoading = false;
let _feedDone = false;

/* ── HTML escape ── */
function escHtml(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* ── Time formatting ── */
function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)  return 'Just now';
  if (diff < 3600) return Math.floor(diff/60) + 'm ago';
  if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
  return Math.floor(diff/86400) + 'd ago';
}

/* ══════════════════════════════════════════════════════════════
   FEED LOADING — API connected
══════════════════════════════════════════════════════════════ */
async function loadFeed(reset = false) {
  if (_feedLoading) return;
  if (_feedDone && !reset) return;

  if (reset) { _feedPage = 0; _feedDone = false; POSTS = []; }
  _feedLoading = true;

  const container = document.getElementById('feedCards');
  if (reset && container) {
    container.innerHTML = '<div style="text-align:center;padding:24px;color:#80848e;font-size:13px">Loading feed…</div>';
  }

  try {
    if (typeof AppApi !== 'undefined') {
      const res = await AppApi.posts.feed(_feedPage, 20);
      if (res.ok && res.data && res.data.content) {
        const serverPosts = res.data.content.map(p => ({
          id: p.id, user: p.username, avatar: p.avatarUrl || '🔥',
          avatarIsUrl: !!p.avatarUrl, rank: 'Trainer', verified: false,
          time: timeAgo(p.createdAt), bg: 'linear-gradient(135deg,#1e1b4b,#4338ca)',
          cardImg: p.imageUrl || '', label: p.cardLabel || '',
          caption: p.caption || '', tags: p.tags ? p.tags.split(',').map(t=>t.trim()) : [],
          likes: p.likesCount, comments: p.commentsCount, shares: p.sharesCount || 0,
          liked: false, shared: false, _fromApi: true
        }));
        if (reset) POSTS = serverPosts;
        else POSTS = [...POSTS, ...serverPosts];
        _feedDone = res.data.last;
        _feedPage++;
      }
    }
  } catch(e) {
    console.warn('Feed load error:', e);
  }

  // If no API posts yet, keep demo posts for offline/dev mode
  if (POSTS.length === 0) {
    POSTS = getDefaultPosts();
  }

  _feedLoading = false;
  renderFeed();
}

function getDefaultPosts() {
  return [
    {
      id: 1001, user: 'TrainerAsh_KE', flag: '', rank: 'Elite', verified: true,
      time: 'Just now', avatar: '🔥', avatarIsUrl: false,
      bg: 'linear-gradient(135deg,#7f1d1d,#c2410c,#f97316)',
      cardImg: 'https://images.pokemontcg.io/swsh45/19_hires.png',
      label: 'Charizard VMAX PSA 10',
      caption: 'Just pulled this BEAST! Anyone trade for Lugia V Alt Art?',
      tags: ['#GlobalPulls', '#MintyNex', '#PSA10'],
      likes: 143, comments: 3, shares: 12, liked: false, shared: false
    },
    {
      id: 1002, user: 'ShinySister_TZ', flag: '', rank: 'Trainer', verified: true,
      time: '2m ago', avatar: '💧', avatarIsUrl: false,
      bg: 'linear-gradient(135deg,#082f49,#0284c7,#38bdf8)',
      cardImg: 'https://images.pokemontcg.io/swsh10/186_hires.png',
      label: 'Irida SAR',
      caption: 'Finally added the Irida SAR to my collection 💙',
      tags: ['#AltArt', '#TrainerCard', '#MintyNex'],
      likes: 87, comments: 5, shares: 6, liked: false, shared: false
    }
  ];
}

/* ── Render Feed ── */
function renderFeed() {
  const container = document.getElementById('feedCards');
  if (!container) return;
  container.innerHTML = '';
  POSTS.forEach((post, idx) => container.appendChild(buildPostEl(post, idx)));

  // Infinite scroll sentinel
  if (!_feedDone) {
    const sentinel = document.createElement('div');
    sentinel.id = 'feedSentinel';
    sentinel.style.height = '20px';
    container.appendChild(sentinel);
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) { obs.disconnect(); loadFeed(false); }
    });
    obs.observe(sentinel);
  }
}

function buildPostEl(post, idx) {
  const div = document.createElement('div');
  div.className = 'post';
  div.dataset.postId = post.id;

  const defaultAvatarSvg = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  const avatarHtml = post.avatarIsUrl && post.avatar
    ? `<img src="${escHtml(post.avatar)}" alt="${escHtml(post.user)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`
    : (post.avatar && post.avatar !== '🔥' ? `<span>${escHtml(post.avatar)}</span>` : defaultAvatarSvg);

  const mediaHtml = post.cardImg
    ? `<div class="post-img" style="background:${post.bg}">
         <img class="card-art" src="${escHtml(post.cardImg)}" alt="${escHtml(post.label)}" loading="lazy" onerror="this.style.display='none'"/>
         ${post.label ? `<div class="post-bdg">${escHtml(post.label)}</div>` : ''}
       </div>`
    : '';

  div.innerHTML = `
    <div class="post-hd">
      <div class="post-av" style="background:${post.bg}">${avatarHtml}<span class="od"></span></div>
      <div style="flex:1;min-width:0">
        <div class="post-nm">
          ${escHtml(post.user)}
          ${post.verified ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="#5865f2"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>' : ''}
          <span class="bdg bdg-g" style="font-size:9px">${escHtml(post.rank || 'Trainer')}</span>
        </div>
        <div class="post-tm">${escHtml(post.time)}</div>
      </div>
      <button class="pab" style="margin-left:auto;color:var(--t4)" data-action="postmenu" data-idx="${idx}" aria-label="More options">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
      </button>
    </div>

    <p class="post-cap" style="padding:10px 14px 4px;margin:0">${escHtml(post.caption)}</p>
    <div class="post-tags" style="padding:0 14px 8px">
      ${(post.tags || []).map(t => `<span class="post-tag">${escHtml(t)}</span>`).join('')}
    </div>

    ${mediaHtml}

    <div class="post-acts">
      <button class="pab ${post.liked ? 'liked' : ''}" data-action="like" data-idx="${idx}" aria-label="Like">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="${post.liked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        <span>${post.likes}</span>
      </button>

      <button class="pab" data-action="opencomments" data-idx="${idx}" aria-label="Comments">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span>${post.comments}</span>
      </button>

      <button class="pab ${post.shared ? 'shared' : ''}" data-action="share" data-idx="${idx}" aria-label="Share">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
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

/* ══════════════════════════════════════════════════════════════
   CREATE POST — BUG FIX: was not connected to API at all
══════════════════════════════════════════════════════════════ */

let _postPhotoFile = null;
let _postPhotoUrl  = null;

// BUG FIX: Wire up photo picker for post creation
window.triggerPostPhoto = function() {
  let inp = document.getElementById('postPhotoInput');
  if (!inp) {
    inp = document.createElement('input');
    inp.type = 'file'; inp.id = 'postPhotoInput';
    inp.accept = 'image/*,video/*';
    inp.style.display = 'none';
    document.body.appendChild(inp);
    inp.addEventListener('change', function() {
      const file = this.files[0]; if (!file) return;
      this.value = '';
      _postPhotoFile = file;
      _postPhotoUrl  = URL.createObjectURL(file);
      showPostPhotoPreview(_postPhotoUrl, file.name);
    });
  }
  inp.click();
};

function showPostPhotoPreview(url, name) {
  const preview = document.getElementById('postPhotoPreview');
  if (!preview) return;
  preview.innerHTML = `
    <div style="position:relative;margin-top:8px;border-radius:10px;overflow:hidden;max-height:220px">
      <img src="${escHtml(url)}" alt="preview" style="width:100%;max-height:220px;object-fit:cover;border-radius:10px"/>
      <button onclick="clearPostPhoto()" style="position:absolute;top:6px;right:6px;background:rgba(0,0,0,.7);border:none;border-radius:50%;width:24px;height:24px;color:#fff;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center">✕</button>
      <div style="position:absolute;bottom:6px;left:8px;font-size:10px;color:rgba(255,255,255,.8);background:rgba(0,0,0,.5);padding:2px 6px;border-radius:4px">${escHtml(name)}</div>
    </div>
  `;
  preview.style.display = 'block';
}

window.clearPostPhoto = function() {
  _postPhotoFile = null;
  _postPhotoUrl  = null;
  const preview = document.getElementById('postPhotoPreview');
  if (preview) { preview.innerHTML = ''; preview.style.display = 'none'; }
};

/* ── Submit Post ── */
window.submitPost = async function() {
  const input     = document.getElementById('postInput');
  const cardInput = document.getElementById('postCardLabel');
  const tagsInput = document.getElementById('postTags');
  const btn       = document.getElementById('postSubmitBtn');

  const text = input ? input.value.trim() : '';
  if (!text && !_postPhotoFile) { showToast('Add a caption or photo!', 'red'); return; }

  if (btn) { btn.disabled = true; btn.textContent = 'Posting…'; }

  try {
    let newPost = null;

    if (typeof AppApi !== 'undefined') {
      let res;
      if (_postPhotoFile) {
        // BUG FIX: photo post was completely unimplemented
        const fd = new FormData();
        fd.append('file', _postPhotoFile);
        if (text) fd.append('caption', text);
        if (cardInput && cardInput.value.trim()) fd.append('cardLabel', cardInput.value.trim());
        if (tagsInput && tagsInput.value.trim())  fd.append('tags', tagsInput.value.trim());
        res = await AppApi.posts.createWithImage(fd);
      } else {
        res = await AppApi.posts.create({
          caption:   text,
          cardLabel: cardInput ? cardInput.value.trim() : '',
          tags:      tagsInput ? tagsInput.value.trim() : '',
        });
      }

      if (res.ok && res.data) {
        const p = res.data;
        newPost = {
          id: p.id, user: p.username, avatar: p.avatarUrl || '🔥',
          avatarIsUrl: !!p.avatarUrl, rank: 'Trainer', verified: false,
          time: 'Just now', bg: 'linear-gradient(135deg,#1e1b4b,#4338ca)',
          cardImg: p.imageUrl || (_postPhotoUrl || ''), label: p.cardLabel || '',
          caption: p.caption || text,
          tags: p.tags ? p.tags.split(',').map(t=>t.trim()) : [],
          likes: 0, comments: 0, shares: 0, liked: false, shared: false, _fromApi: true
        };
      } else {
        showToast(res.data?.message || 'Post failed', 'red');
      }
    } else {
      // Offline/demo mode
      newPost = {
        id: Date.now(), user: 'TrainerAsh_KE', rank: 'Elite', verified: true,
        time: 'Just now', avatar: '🔥', avatarIsUrl: false,
        bg: 'linear-gradient(135deg,#1e1b4b,#4338ca)',
        cardImg: _postPhotoUrl || '', label: cardInput ? cardInput.value.trim() : 'New Pull!',
        caption: text, tags: ['#MintyNex'],
        likes: 0, comments: 0, shares: 0, liked: false, shared: false
      };
    }

    if (newPost) {
      POSTS.unshift(newPost);
      if (input) input.value = '';
      if (cardInput) cardInput.value = '';
      if (tagsInput) tagsInput.value = '';
      clearPostPhoto();

      // Close post composer if open
      const composer = document.getElementById('postComposerModal');
      if (composer) composer.classList.remove('on');

      renderFeed();
      showToast('Post shared! 🚀', 'grn');

      const feedWrap = document.querySelector('#pg-feed .scr');
      if (feedWrap) feedWrap.scrollTo({ top: 0, behavior: 'smooth' });
    }
  } catch(e) {
    console.error('submitPost error:', e);
    showToast('Network error. Try again.', 'red');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Share'; }
  }
};

/* ══════════════════════════════════════════════════════════════
   COMMENT MODAL — BUG FIX: send btn was broken (data-action vs direct click)
══════════════════════════════════════════════════════════════ */

let _commentPostIdx = null;

window.openComments = async function(idx) {
  const post = POSTS[idx];
  if (!post) return;
  _commentPostIdx = idx;

  const modal = document.getElementById('commentModal');
  const body  = document.getElementById('commentBody');
  if (!modal || !body) return;

  body.innerHTML = `
    <div style="font-weight:800;font-size:14px;margin-bottom:12px">
      💬 Comments on ${escHtml(post.user)}'s pull
    </div>
    <div id="commentList" style="margin-bottom:12px;max-height:300px;overflow-y:auto"></div>
    <div style="display:flex;gap:8px;align-items:center">
      <div class="comment-av" style="background:#5865f2;flex-shrink:0">🔥</div>
      <input class="fi" id="commentInput" placeholder="Add a comment…" style="border-radius:20px;font-size:13px" />
      <button class="btn bg bxs" id="commentSendBtn">Send</button>
    </div>
  `;

  modal.classList.add('on');

  // BUG FIX: wire send button directly — was using data-action which required
  // the global delegator to be set up, but modal is dynamically created
  const sendBtn = document.getElementById('commentSendBtn');
  const cInput  = document.getElementById('commentInput');
  sendBtn.onclick = null;
  sendBtn.onclick = submitComment;
  // Replace input to clear any previously-attached Enter listeners
  const freshInput = cInput.cloneNode(true);
  cInput.parentNode.replaceChild(freshInput, cInput);
  freshInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(); }
  });
  freshInput.focus();

  // Load comments from API
  const list = document.getElementById('commentList');
  list.innerHTML = '<div style="color:#80848e;font-size:12px;padding:8px">Loading…</div>';

  try {
    if (typeof AppApi !== 'undefined' && post._fromApi) {
      const res = await AppApi.posts.getComments(post.id);
      if (res.ok && res.data && res.data.content) {
        list.innerHTML = '';
        if (res.data.content.length === 0) {
          list.innerHTML = '<div style="color:#80848e;font-size:12px;padding:8px">No comments yet. Be first!</div>';
        }
        res.data.content.forEach(c => {
          list.appendChild(buildCommentEl(c.username, c.content, timeAgo(c.createdAt), c.avatarUrl));
        });
      } else {
        list.innerHTML = '';
        appendDefaultComments(list);
      }
    } else {
      list.innerHTML = '';
      appendDefaultComments(list);
    }
  } catch(e) {
    list.innerHTML = '';
    appendDefaultComments(list);
  }
  list.scrollTop = list.scrollHeight;
};

function appendDefaultComments(list) {
  [
    ['CardQueenZA', 'Insane pull! 🔥🔥🔥', '5m ago', '⚡'],
    ['MintFresh_KE', 'Would trade my Lugia for that 👀', '2m ago', '💧']
  ].forEach(([u, c, t, av]) => list.appendChild(buildCommentEl(u, c, t, av)));
}

function buildCommentEl(username, content, time, avatar) {
  const box = document.createElement('div');
  box.className = 'comment-box';
  const isUrl = avatar && (avatar.startsWith('http') || avatar.startsWith('blob'));
  const avHtml = isUrl
    ? `<img src="${escHtml(avatar)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`
    : escHtml(avatar || '🔥');
  box.innerHTML = `
    <div class="comment-hd">
      <div class="comment-av">${avHtml}</div>
      <div>
        <span style="font-weight:700;font-size:12px">${escHtml(username)}</span>
        <span style="font-size:10px;color:#80848e;margin-left:6px">${escHtml(time)}</span>
      </div>
    </div>
    <div style="font-size:13px;color:#dbdee1">${escHtml(content)}</div>
  `;
  return box;
}

async function submitComment() {
  const input = document.getElementById('commentInput') || document.querySelector('#commentBody input.fi');
  const text  = input ? input.value.trim() : '';
  if (!text) return;

  const post = POSTS[_commentPostIdx];
  const list = document.getElementById('commentList');
  const btn  = document.getElementById('commentSendBtn');

  if (btn) btn.disabled = true;

  try {
    if (typeof AppApi !== 'undefined' && post && post._fromApi) {
      const res = await AppApi.posts.addComment(post.id, { content: text });
      if (res.ok && res.data) {
        if (list) list.appendChild(buildCommentEl(res.data.username, res.data.content, 'Just now', res.data.avatarUrl));
        post.comments = (post.comments || 0) + 1;
        renderFeed();
        showToast('Comment posted!', 'grn');
      } else {
        showToast(res.data?.message || 'Failed to post', 'red');
      }
    } else {
      // Demo mode
      if (list) list.appendChild(buildCommentEl('TrainerAsh_KE', text, 'Just now', '🔥'));
      if (post) post.comments = (post.comments || 0) + 1;
      renderFeed();
      showToast('Comment posted!', 'grn');
    }
    if (input) input.value = '';
    if (list) list.scrollTop = list.scrollHeight;
  } catch(e) {
    showToast('Network error', 'red');
  } finally {
    if (btn) btn.disabled = false;
  }
}

/* ══════════════════════════════════════════════════════════════
   LIKE HANDLER — API connected
══════════════════════════════════════════════════════════════ */
window.toggleLike = async function(idx) {
  const post = POSTS[idx];
  if (!post) return;

  // Optimistic UI
  post.liked = !post.liked;
  post.likes = post.liked ? post.likes + 1 : Math.max(0, post.likes - 1);
  renderFeed();

  try {
    if (typeof AppApi !== 'undefined' && post._fromApi) {
      const res = await AppApi.posts.like(post.id);
      if (res.ok && res.data) {
        post.likes = res.data.likes;
        post.liked = res.data.liked;
        renderFeed();
      } else {
        // Revert on failure
        post.liked = !post.liked;
        post.likes = post.liked ? post.likes + 1 : Math.max(0, post.likes - 1);
        renderFeed();
      }
    }
  } catch(e) {
    // Already updated optimistically, ignore error
  }
};

/* ══════════════════════════════════════════════════════════════
   SHARE SHEET
══════════════════════════════════════════════════════════════ */
window.openShareSheet = function(idx) {
  const post = POSTS[idx];
  if (!post) return;
  const sheet = document.getElementById('shareSheet');
  if (!sheet) return;

  const shareUrl  = `https://mintynex.app/post/${post.id}`;
  const shareText = `🔥 Check out this pull on MintyNex: ${post.label || post.caption}`;
  const encoded   = encodeURIComponent(shareText + ' ' + shareUrl);

  sheet.innerHTML = `
    <div class="share-sheet-inner">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <div style="font-weight:800;font-size:15px">Share Pull</div>
        <button class="mc" style="position:static" onclick="closeShareSheet()">✕</button>
      </div>
      <div style="font-size:12px;color:#80848e;margin-bottom:14px">${escHtml(post.user)} · ${escHtml(post.label || post.caption?.substring(0,40) || '')}</div>
      <div class="share-options">
        <div class="share-opt" onclick="shareToApp('whatsapp','${encodeURIComponent(shareText + ' ' + shareUrl)}')"><span class="share-opt-icon">💬</span>WhatsApp</div>
        <div class="share-opt" onclick="shareToApp('twitter','${encodeURIComponent(shareText)}','${encodeURIComponent(shareUrl)}')"><span class="share-opt-icon">🐦</span>Twitter/X</div>
        <div class="share-opt" onclick="shareToApp('telegram','${encodeURIComponent(shareText)}','${encodeURIComponent(shareUrl)}')"><span class="share-opt-icon">✈️</span>Telegram</div>
        <div class="share-opt" onclick="copyShareLink('${shareUrl}')"><span class="share-opt-icon">🔗</span>Copy Link</div>
        <div class="share-opt" onclick="nativeShare('${encodeURIComponent(shareText)}','${encodeURIComponent(shareUrl)}')"><span class="share-opt-icon">📤</span>More</div>
        <div class="share-opt" onclick="shareToApp('facebook','${encodeURIComponent(shareUrl)}')"><span class="share-opt-icon">👥</span>Facebook</div>
      </div>
      <div class="share-link-row">
        <input id="shareLinkInput" value="${shareUrl}" readonly onclick="this.select()"/>
        <button class="btn bg bsm" onclick="copyShareLink('${shareUrl}')">Copy</button>
      </div>
    </div>
  `;
  sheet.classList.add('on');

  // Update share count optimistically
  const postEls = document.querySelectorAll('.post');
  if (postEls[idx]) postEls[idx].querySelector('[data-action="share"]')?.classList.add('shared');
};

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
  showToast('Opening ' + platform + '…', 'grn');
};

window.copyShareLink = function(url) {
  const decoded = decodeURIComponent(url);
  if (navigator.clipboard) {
    navigator.clipboard.writeText(decoded).then(() => { showToast('Link copied! 🔗', 'grn'); closeShareSheet(); });
  } else {
    const inp = document.getElementById('shareLinkInput');
    if (inp) { inp.select(); document.execCommand('copy'); showToast('Link copied!', 'grn'); closeShareSheet(); }
  }
};

window.nativeShare = function(text, url) {
  if (navigator.share) {
    navigator.share({ title: 'MintyNex Pull', text: decodeURIComponent(text), url: decodeURIComponent(url) }).catch(()=>{});
  } else {
    copyShareLink(url);
  }
  closeShareSheet();
};

/* ── Post context menu ── */
window.showPostMenu = function(idx) {
  const post = POSTS[idx];
  if (!post) return;
  showToast('Report / Save coming soon', '');
};

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  loadFeed(true);

  // ── Composer: show action buttons only when focused ──
  const postInput   = document.getElementById('postInput');
  const composerActions = document.getElementById('composerActions');
  const composerCard    = postInput ? postInput.closest('.composer-card') : null;

  if (postInput && composerActions) {
    postInput.addEventListener('focus', () => {
      composerActions.style.display = 'flex';
    });
    if (composerCard) {
      composerCard.addEventListener('focusout', () => {
        setTimeout(() => {
          if (!composerCard.contains(document.activeElement) && !postInput.value.trim()) {
            composerActions.style.display = 'none';
          }
        }, 150);
      });
    }
  }

  // ── postAv: sync with USER avatar if available ──
  const postAv = document.getElementById('postAv');
  if (postAv && typeof USER !== 'undefined' && USER.avatarSrc) {
    postAv.innerHTML = `<img src="${USER.avatarSrc}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" alt=""/>`;
  }
});