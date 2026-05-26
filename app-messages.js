/* ============================================================
   MINTYNEX — MESSAGES  (app-messages.js)
   Full messaging UI: inbox, conversation, edit message,
   react to message (Instagram-style), delete message,
   delete full conversation, + New chat, ··· options menu.
   All connected to backend API.
   ============================================================ */

(function() {

  /* ── State ── */
  let _currentConvUserId   = null;
  let _currentConvUsername = '';
  let _messages            = [];
  let _convPage            = 0;
  let _convDone            = false;
  let _longPressTimer      = null;
  let _longPressStartX     = 0;
  let _longPressStartY     = 0;

  const REACTION_EMOJIS = ['❤️','🔥','😂','😮','😢','👍','🎉','💯'];

  /* ════════════════════════════════════════════════════════
     INBOX
  ════════════════════════════════════════════════════════ */
  async function loadInbox() {
    const sidebar = document.querySelector('#pg-messages .sb');
    if (!sidebar) return;

    try {
      if (typeof AppApi === 'undefined') return;
      const res = await AppApi.messages.inbox();
      if (!res.ok || !res.data) return;

      const convList = res.data;

      const header = sidebar.querySelector(':first-child');
      sidebar.innerHTML = '';
      if (header) sidebar.appendChild(header);

      if (convList.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'text-align:center;padding:24px 12px;color:#80848e;font-size:12px';
        empty.innerHTML = '<div style="font-size:24px;margin-bottom:8px">💬</div><div>No conversations yet</div>';
        sidebar.appendChild(empty);
        return;
      }

      convList.forEach(conv => {
        const el = document.createElement('div');
        el.className = 'card csm msg-chat-row';
        el.dataset.userId   = conv.partnerId;
        el.dataset.username = conv.partnerUsername;
        if (_currentConvUserId && _currentConvUserId == conv.partnerId)
          el.style.borderLeft = '2px solid #5865f2';

        const isUrl = conv.partnerAvatarUrl && conv.partnerAvatarUrl.startsWith('http');
        const avHtml = isUrl
          ? `<img src="${h(conv.partnerAvatarUrl)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`
          : '💬';

        el.innerHTML = `
          <div class="msg-av-circle" style="position:relative">${avHtml}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:12px;display:flex;align-items:center;gap:4px;color:#fff">
              ${h(conv.partnerUsername)}
              ${conv.unreadCount > 0 ? `<span class="bdg bdg-r" style="padding:1px 5px">${conv.unreadCount}</span>` : ''}
            </div>
            <div style="font-size:11px;color:#80848e;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
              ${h((conv.lastMessage || '').substring(0, 40))}
            </div>
          </div>
          <div style="font-size:10px;color:#80848e;flex-shrink:0">${timeAgoShort(conv.lastMessageAt)}</div>
        `;
        el.onclick = () => openConversation(conv.partnerId, conv.partnerUsername);
        sidebar.appendChild(el);
      });
    } catch(e) {
      console.warn('Inbox load error:', e);
    }
  }

  /* ════════════════════════════════════════════════════════
     CONVERSATION
  ════════════════════════════════════════════════════════ */
  async function openConversation(userId, username) {
    _currentConvUserId   = userId;
    _currentConvUsername = username;
    _messages            = [];
    _convPage            = 0;
    _convDone            = false;

    // Update chat header name
    const headerName = document.querySelector('#pg-messages .msg-chat-header-name');
    if (headerName) headerName.textContent = username;

    // Update header avatar
    const headerAv = document.querySelector('#pg-messages .msg-chat-header-av');
    if (headerAv) headerAv.textContent = username.charAt(0).toUpperCase();

    // Update placeholder
    const input = document.getElementById('msgInput');
    if (input) input.placeholder = `Message ${username}…`;

    // Wire ··· button now we know the partner
    wireChatOptionsBtn(userId, username);

    const list = document.getElementById('msgList');
    if (list) list.innerHTML = '<div style="text-align:center;color:#80848e;font-size:12px;padding:16px">Loading…</div>';

    await loadMoreMessages();

    try {
      if (typeof AppApi !== 'undefined')
        await AppApi.messages.markRead(userId);
    } catch(_) {}

    // Highlight in sidebar
    document.querySelectorAll('#pg-messages .sb .msg-chat-row').forEach(el => {
      el.style.borderLeft = el.dataset.userId == userId ? '2px solid #5865f2' : '';
    });
  }

  async function loadMoreMessages() {
    if (_convDone || !_currentConvUserId) return;
    try {
      if (typeof AppApi === 'undefined') return;
      const res = await AppApi.messages.conversation(_currentConvUserId, _convPage);
      if (!res.ok || !res.data) return;

      const page = res.data;
      const msgs = page.content || [];

      if (_convPage === 0) _messages = msgs;
      else _messages = [...msgs, ..._messages];

      _convDone = page.last;
      _convPage++;
      renderConversation();
    } catch(e) {
      console.warn('Message load error:', e);
    }
  }

  function renderConversation() {
    const list = document.getElementById('msgList');
    if (!list) return;

    const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 60;
    list.innerHTML = '';

    _messages.forEach(msg => {
      const el = buildMessageEl(msg);
      list.appendChild(el);
    });

    if (atBottom || _convPage <= 1) list.scrollTop = list.scrollHeight;
  }

  function buildMessageEl(msg) {
    const row = document.createElement('div');
    row.className = 'brow' + (msg.mine ? ' me' : '');
    row.dataset.msgId = msg.id;

    const reactionMap = msg.reactions || {};
    const reactionHtml = Object.keys(reactionMap).length
      ? `<div class="msg-reactions">${
          Object.entries(reactionMap).map(([emoji, users]) =>
            `<span class="msg-reaction-pill" title="${h(users.join(', '))}">
               ${emoji} <span style="font-size:10px">${users.length}</span>
             </span>`
          ).join('')
        }</div>`
      : '';

    const editedLabel = msg.edited
      ? '<span style="font-size:9px;color:#80848e;margin-left:4px">(edited)</span>'
      : '';

    row.innerHTML = `
      <div class="bav">${msg.senderAvatarUrl
        ? `<img src="${h(msg.senderAvatarUrl)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`
        : '🔥'}</div>
      <div style="display:flex;flex-direction:column;gap:2px;max-width:70%">
        <div class="bbl ${msg.mine ? 'me' : 'them'}">${h(msg.content)}${editedLabel}</div>
        ${reactionHtml}
        <div style="font-size:9px;color:#80848e;${msg.mine ? 'text-align:right' : ''}">
          ${timeAgoShort(msg.createdAt)}
          ${msg.mine && msg.read ? ' · ✓✓' : ''}
        </div>
      </div>
    `;

    setupMessageContextMenu(row, msg);
    return row;
  }

  /* ════════════════════════════════════════════════════════
     LONG-PRESS / CONTEXT MENU — mobile improved
     Uses a movement threshold so natural scrolling doesn't
     accidentally trigger the menu.
  ════════════════════════════════════════════════════════ */
  function setupMessageContextMenu(row, msg) {
    // Right-click (desktop)
    row.addEventListener('contextmenu', e => {
      e.preventDefault();
      showMessageMenu(msg, e.clientX, e.clientY);
    });

    // Long-press (mobile) — 500ms with 8px movement tolerance
    row.addEventListener('touchstart', e => {
      const t = e.touches[0];
      _longPressStartX = t.clientX;
      _longPressStartY = t.clientY;
      _longPressTimer = setTimeout(() => {
        showMessageMenu(msg, t.clientX, t.clientY);
        // Light haptic feedback if available
        if (navigator.vibrate) navigator.vibrate(30);
      }, 500);
    }, { passive: true });

    row.addEventListener('touchmove', e => {
      // Cancel only if moved more than 8px (allows tiny finger tremors)
      const t = e.touches[0];
      const dx = Math.abs(t.clientX - _longPressStartX);
      const dy = Math.abs(t.clientY - _longPressStartY);
      if (dx > 8 || dy > 8) clearTimeout(_longPressTimer);
    }, { passive: true });

    row.addEventListener('touchend',   () => clearTimeout(_longPressTimer));
    row.addEventListener('touchcancel',() => clearTimeout(_longPressTimer));
  }

  function showMessageMenu(msg, x, y) {
    removeMessageMenu();

    const menu = document.createElement('div');
    menu.id = 'msgCtxMenu';

    // Position so menu stays on screen
    const menuW = 240;
    const menuH = 220;
    const left = Math.min(x, window.innerWidth - menuW - 8);
    const top  = Math.min(y + 8, window.innerHeight - menuH - 8);

    menu.style.cssText = `
      position:fixed; z-index:9999;
      background:#2b2d31; border:1px solid rgba(255,255,255,.12);
      border-radius:14px; padding:8px; box-shadow:0 8px 40px rgba(0,0,0,.6);
      left:${left}px; top:${top}px;
      animation:fadeUp .12s ease;
    `;

    // ── Emoji reaction bar (Instagram-style) ──
    const emojiBar = document.createElement('div');
    emojiBar.style.cssText = 'display:flex;gap:2px;padding:4px 2px 10px;border-bottom:1px solid rgba(255,255,255,.08);margin-bottom:6px';
    REACTION_EMOJIS.forEach(emoji => {
      const btn = document.createElement('button');
      btn.textContent = emoji;
      btn.title = 'React ' + emoji;
      btn.style.cssText = 'background:none;border:none;font-size:20px;cursor:pointer;border-radius:50%;padding:3px;transition:transform .1s;line-height:1';
      btn.addEventListener('touchstart', () => { btn.style.transform='scale(1.4)'; }, {passive:true});
      btn.addEventListener('touchend',   () => { btn.style.transform='scale(1)'; },   {passive:true});
      btn.onmouseenter = () => { btn.style.transform='scale(1.3)'; };
      btn.onmouseleave = () => { btn.style.transform='scale(1)'; };
      btn.onclick = e => { e.stopPropagation(); reactToMessage(msg.id, emoji); removeMessageMenu(); };
      emojiBar.appendChild(btn);
    });
    menu.appendChild(emojiBar);

    // ── Action buttons ──
    const actions = [
      { label: '📋  Copy', fn: () => { navigator.clipboard?.writeText(msg.content).catch(()=>{}); showToast('Copied!','grn'); } },
    ];
    if (msg.mine) {
      actions.push({ label: '✏️  Edit',   fn: () => startEditMessage(msg) });
      actions.push({ label: '🗑️  Delete', fn: () => deleteMessage(msg.id), danger: true });
    }

    actions.forEach(({ label, fn, danger }) => {
      const btn = document.createElement('button');
      btn.className = 'msg-ctx-btn';
      btn.textContent = label;
      if (danger) btn.style.color = '#ed4245';
      btn.onclick = e => { e.stopPropagation(); fn(); removeMessageMenu(); };
      menu.appendChild(btn);
    });

    document.body.appendChild(menu);

    setTimeout(() => {
      document.addEventListener('click',     removeMessageMenu, { once: true });
      document.addEventListener('touchstart',removeMessageMenu, { once: true, passive: true });
    }, 60);
  }

  function removeMessageMenu() {
    const m = document.getElementById('msgCtxMenu');
    if (m) m.remove();
  }

  async function reactToMessage(msgId, emoji) {
    try {
      if (typeof AppApi === 'undefined') {
        showToast(emoji + ' reacted!', 'grn'); return;
      }
      const res = await AppApi.messages.react(msgId, { emoji });
      if (res.ok && res.data) {
        const idx = _messages.findIndex(m => m.id === msgId);
        if (idx !== -1) { _messages[idx].reactions = res.data.reactions; renderConversation(); }
      }
    } catch(e) {
      showToast('React failed', 'red');
    }
  }

  /* ════════════════════════════════════════════════════════
     EDIT MESSAGE
  ════════════════════════════════════════════════════════ */
  let _editingMsgId = null;

  function startEditMessage(msg) {
    _editingMsgId = msg.id;
    const input = document.getElementById('msgInput');
    if (!input) return;
    input.value = msg.content;
    input.focus();
    // Select all on desktop, scroll to end on mobile
    try { input.setSelectionRange(msg.content.length, msg.content.length); } catch(_) {}

    let bar = document.getElementById('msgEditBar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'msgEditBar';
      bar.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 12px;background:rgba(88,101,242,.15);border-top:1px solid rgba(88,101,242,.3);font-size:12px;color:#7289da;flex-shrink:0';
      const msgArea = document.querySelector('.msg-area');
      if (msgArea) msgArea.parentNode.insertBefore(bar, msgArea);
    }
    bar.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      <span style="flex:1">Editing message</span>
      <button onclick="cancelEditMessage()" style="background:none;border:none;color:#ed4245;cursor:pointer;font-size:11px;font-family:inherit">✕ Cancel</button>
    `;
  }

  window.cancelEditMessage = function() {
    _editingMsgId = null;
    const input = document.getElementById('msgInput');
    if (input) { input.value = ''; input.placeholder = `Message ${_currentConvUsername}…`; }
    const bar = document.getElementById('msgEditBar');
    if (bar) bar.remove();
  };

  /* ════════════════════════════════════════════════════════
     SEND / EDIT DISPATCH
  ════════════════════════════════════════════════════════ */
  window.sendMessage = async function() {
    const inp  = document.getElementById('msgInput');
    const text = inp ? inp.value.trim() : '';
    if (!text) return;

    const btn = document.getElementById('msgSendBtn');
    if (btn) btn.disabled = true;

    try {
      if (_editingMsgId !== null) {
        if (typeof AppApi !== 'undefined') {
          const res = await AppApi.messages.edit(_editingMsgId, { content: text });
          if (res.ok && res.data) {
            const idx = _messages.findIndex(m => m.id === _editingMsgId);
            if (idx !== -1) { _messages[idx] = res.data; renderConversation(); }
            showToast('Message updated', 'grn');
          } else {
            showToast(res.data?.message || 'Edit failed', 'red');
          }
        }
        cancelEditMessage();
        return;
      }

      if (typeof AppApi !== 'undefined' && _currentConvUserId) {
        const res = await AppApi.messages.send(_currentConvUserId, { content: text });
        if (res.ok && res.data) {
          _messages.push(res.data);
          renderConversation();
        } else {
          showToast(res.data?.message || 'Send failed', 'red');
        }
      } else {
        // Demo / offline fallback
        const list = document.getElementById('msgList');
        if (list) {
          const row = document.createElement('div');
          row.className = 'brow me';
          row.innerHTML = `<div class="bav">🔥</div><div class="bbl me">${text.replace(/</g,'&lt;')}</div>`;
          list.appendChild(row);
          list.scrollTop = list.scrollHeight;
        }
      }
      if (inp) inp.value = '';
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  /* ── Delete message ── */
  async function deleteMessage(msgId) {
    if (!confirm('Delete this message?')) return;
    try {
      if (typeof AppApi !== 'undefined') await AppApi.messages.delete(msgId);
      _messages = _messages.filter(m => m.id !== msgId);
      renderConversation();
      showToast('Message deleted', 'grn');
    } catch(e) {
      showToast('Delete failed', 'red');
    }
  }

  /* ════════════════════════════════════════════════════════
     DELETE FULL CONVERSATION  ← NEW
  ════════════════════════════════════════════════════════ */
  async function deleteConversation(userId, username) {
    if (!confirm(`Delete your entire conversation with ${username}? This cannot be undone.`)) return;
    try {
      if (typeof AppApi !== 'undefined') {
        const res = await AppApi.messages.deleteConversation(userId);
        if (!res.ok && res.status !== 204) {
          showToast('Delete failed', 'red'); return;
        }
      }
      // Clear UI
      _messages = [];
      _currentConvUserId = null;
      _currentConvUsername = '';
      renderConversation();
      showToast('Conversation deleted', 'grn');
      // Reload inbox
      await loadInbox();
    } catch(e) {
      showToast('Delete failed', 'red');
    }
  }

  /* ════════════════════════════════════════════════════════
     ··· CHAT OPTIONS BUTTON  ← NEW
  ════════════════════════════════════════════════════════ */
  function wireChatOptionsBtn(userId, username) {
    // Find the ··· button in the chat header
    const header = document.querySelector('#pg-messages > div > div:last-child > div:first-child');
    if (!header) return;

    let optBtn = header.querySelector('.chat-options-btn');
    if (!optBtn) {
      // Find the existing ··· button
      const allBtns = header.querySelectorAll('button');
      allBtns.forEach(b => {
        if (b.textContent.trim() === '···') optBtn = b;
      });
    }
    if (!optBtn) return;

    optBtn.classList.add('chat-options-btn');
    optBtn.onclick = (e) => {
      e.stopPropagation();
      showChatOptionsMenu(userId, username, optBtn);
    };
  }

  function showChatOptionsMenu(userId, username, anchor) {
    // Remove existing
    const existing = document.getElementById('chatOptionsMenu');
    if (existing) { existing.remove(); return; }

    const menu = document.createElement('div');
    menu.id = 'chatOptionsMenu';
    const rect = anchor.getBoundingClientRect();
    menu.style.cssText = `
      position:fixed; z-index:9998;
      background:#2b2d31; border:1px solid rgba(255,255,255,.12);
      border-radius:12px; padding:6px; min-width:190px;
      box-shadow:0 8px 32px rgba(0,0,0,.5);
      right:${window.innerWidth - rect.right}px;
      top:${rect.bottom + 6}px;
      animation:fadeUp .12s ease;
    `;

    const items = [
      { label: '👤  View Profile',         fn: () => { if(typeof showPg==='function') showPg('profile'); } },
      { label: '🗑️  Delete Conversation',  fn: () => deleteConversation(userId, username), danger: true },
    ];

    items.forEach(({ label, fn, danger }) => {
      const btn = document.createElement('button');
      btn.className = 'msg-ctx-btn';
      btn.textContent = label;
      if (danger) btn.style.color = '#ed4245';
      btn.onclick = () => { menu.remove(); fn(); };
      menu.appendChild(btn);
    });

    document.body.appendChild(menu);
    setTimeout(() => {
      document.addEventListener('click', () => menu.remove(), { once: true });
      document.addEventListener('touchstart', () => menu.remove(), { once: true, passive: true });
    }, 60);
  }

  /* ════════════════════════════════════════════════════════
     + NEW CHAT BUTTON  ← FIX (was dead)
  ════════════════════════════════════════════════════════ */
  function wireNewChatBtn() {
    const sidebar = document.querySelector('#pg-messages .sb');
    if (!sidebar) return;
    const header = sidebar.querySelector('div:first-child');
    if (!header) return;
    const newBtn = header.querySelector('button');
    if (!newBtn) return;

    newBtn.onclick = () => showNewChatModal();
  }

  function showNewChatModal() {
    let modal = document.getElementById('newChatModal');
    if (modal) { modal.style.display = 'flex'; return; }

    modal = document.createElement('div');
    modal.id = 'newChatModal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.75);display:flex;align-items:flex-end;justify-content:center';
    modal.innerHTML = `
      <div style="background:#2b2d31;border-radius:16px 16px 0 0;width:100%;max-width:520px;padding:20px;max-height:70vh;display:flex;flex-direction:column">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
          <div style="font-weight:800;font-size:15px;color:#fff">New Message</div>
          <button onclick="document.getElementById('newChatModal').style.display='none'"
            style="background:none;border:none;color:#80848e;font-size:20px;cursor:pointer">✕</button>
        </div>
        <div style="display:flex;align-items:center;gap:8px;background:#1e1f22;border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:8px 12px;margin-bottom:10px">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#80848e" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input id="newChatSearch" style="background:none;border:none;color:#fff;font-size:13px;flex:1;outline:none;font-family:inherit" placeholder="Search trainers…"/>
        </div>
        <div id="newChatResults" style="flex:1;overflow-y:auto"></div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });

    const searchIn = modal.querySelector('#newChatSearch');
    const results  = modal.querySelector('#newChatResults');

    async function doSearch(q) {
      if (!q.trim()) { results.innerHTML = ''; return; }
      try {
        if (typeof AppApi === 'undefined') return;
        const res = await AppApi.users.search(q);
        if (!res.ok || !res.data) return;
        const users = Array.isArray(res.data) ? res.data : (res.data.content || []);
        if (!users.length) {
          results.innerHTML = '<div style="text-align:center;padding:16px;color:#80848e;font-size:12px">No trainers found</div>';
          return;
        }
        results.innerHTML = users.map(u => `
          <div onclick="startNewChat(${u.id},'${h(u.username)}')"
            style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:8px;cursor:pointer;transition:background .15s"
            onmouseenter="this.style.background='rgba(255,255,255,.05)'" onmouseleave="this.style.background=''">
            <div style="width:36px;height:36px;border-radius:50%;background:#5865f2;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0">
              ${u.avatarUrl ? `<img src="${h(u.avatarUrl)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>` : u.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style="font-weight:700;font-size:13px;color:#fff">${h(u.username)}</div>
              <div style="font-size:10px;color:#80848e">${h(u.country || '')}</div>
            </div>
          </div>
        `).join('');
      } catch(e) {
        console.warn('Search error:', e);
      }
    }

    let _searchTimer;
    searchIn.addEventListener('input', () => {
      clearTimeout(_searchTimer);
      _searchTimer = setTimeout(() => doSearch(searchIn.value), 300);
    });
    searchIn.focus();
  }

  window.startNewChat = function(userId, username) {
    const modal = document.getElementById('newChatModal');
    if (modal) modal.style.display = 'none';
    openConversation(userId, username);
  };

  /* ════════════════════════════════════════════════════════
     WIRE UP SEND BUTTON & ENTER KEY
  ════════════════════════════════════════════════════════ */
  function initMsgInput() {
    const btn = document.getElementById('msgSendBtn');
    const inp = document.getElementById('msgInput');
    if (btn) btn.onclick = window.sendMessage;
    if (inp) {
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); window.sendMessage(); }
      });
    }
  }

  /* ── Utility ── */
  function h(str) {
    return String(str || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function timeAgoShort(dateStr) {
    if (!dateStr) return '';
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60)    return 'now';
    if (diff < 3600)  return Math.floor(diff/60) + 'm';
    if (diff < 86400) return Math.floor(diff/3600) + 'h';
    return Math.floor(diff/86400) + 'd';
  }

  /* ── Init ── */
  document.addEventListener('DOMContentLoaded', () => {
    initMsgInput();
    wireNewChatBtn();

    document.addEventListener('pageChange', e => {
      if (e.detail === 'messages') {
        loadInbox();
        initMsgInput();
        wireNewChatBtn();
      }
    });
  });

  window.MXMessages = { open: openConversation, loadInbox };

})();