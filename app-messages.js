/* ============================================================
   MINTYNEX — MESSAGES  (app-messages.js)
   Full messaging UI: inbox, conversation, edit message,
   react to message (Instagram-style), delete message.
   All connected to backend API.
   ============================================================ */

(function() {

  /* ── State ── */
  let _currentConvUserId   = null;
  let _currentConvUsername = '';
  let _messages            = [];    // flat array of MessageResponse
  let _convPage            = 0;
  let _convDone            = false;
  let _longPressTimer      = null;

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
      if (convList.length === 0) return;

      // Build sidebar entries
      const header = sidebar.querySelector(':first-child');
      sidebar.innerHTML = '';
      if (header) sidebar.appendChild(header);

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
          <div class="msg-av-circle">${avHtml}</div>
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

    // Update chat header
    const header = document.querySelector('#pg-messages .msg-chat-header-name');
    if (header) header.textContent = username;

    const input = document.getElementById('msgInput');
    if (input) input.placeholder = `Message ${username}…`;

    const list = document.getElementById('msgList');
    if (list) list.innerHTML = '<div style="text-align:center;color:#80848e;font-size:12px;padding:16px">Loading…</div>';

    await loadMoreMessages();

    // Mark as read
    try {
      if (typeof AppApi !== 'undefined')
        await AppApi.messages.markRead(userId);
    } catch(_) {}
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
      else _messages = [...msgs, ..._messages];   // prepend older messages

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

    // Reactions display
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

    // Long-press / right-click to show reaction + options menu
    setupMessageContextMenu(row, msg);
    return row;
  }

  /* ════════════════════════════════════════════════════════
     REACT TO MESSAGE — BUG FIX: was completely missing
  ════════════════════════════════════════════════════════ */
  function setupMessageContextMenu(row, msg) {
    // Right-click
    row.addEventListener('contextmenu', e => {
      e.preventDefault();
      showMessageMenu(msg, e.clientX, e.clientY);
    });

    // Long-press for mobile
    row.addEventListener('touchstart', e => {
      _longPressTimer = setTimeout(() => {
        const t = e.touches[0];
        showMessageMenu(msg, t.clientX, t.clientY);
      }, 600);
    }, { passive: true });
    row.addEventListener('touchend',  () => clearTimeout(_longPressTimer));
    row.addEventListener('touchmove', () => clearTimeout(_longPressTimer));
  }

  function showMessageMenu(msg, x, y) {
    // Remove any existing menu
    removeMessageMenu();

    const menu = document.createElement('div');
    menu.id = 'msgCtxMenu';
    menu.style.cssText = `
      position:fixed; z-index:9999;
      background:#2b2d31; border:1px solid rgba(255,255,255,.1);
      border-radius:14px; padding:8px; box-shadow:0 8px 32px rgba(0,0,0,.5);
      left:${Math.min(x, window.innerWidth - 260)}px;
      top:${Math.min(y, window.innerHeight - 220)}px;
    `;

    // Emoji reaction bar (Instagram-style)
    const emojiBar = document.createElement('div');
    emojiBar.style.cssText = 'display:flex;gap:4px;padding:4px 2px 10px;border-bottom:1px solid rgba(255,255,255,.08);margin-bottom:6px';
    REACTION_EMOJIS.forEach(emoji => {
      const btn = document.createElement('button');
      btn.textContent = emoji;
      btn.title = 'React with ' + emoji;
      btn.style.cssText = 'background:none;border:none;font-size:22px;cursor:pointer;border-radius:50%;padding:4px;transition:transform .1s';
      btn.onmouseenter = () => { btn.style.transform = 'scale(1.3)'; };
      btn.onmouseleave = () => { btn.style.transform = 'scale(1)'; };
      btn.onclick = () => { reactToMessage(msg.id, emoji); removeMessageMenu(); };
      emojiBar.appendChild(btn);
    });
    menu.appendChild(emojiBar);

    // Action buttons
    const actions = [
      { label: '📋 Copy', fn: () => { navigator.clipboard?.writeText(msg.content); showToast('Copied!', 'grn'); } },
    ];
    if (msg.mine) {
      actions.push({ label: '✏️ Edit', fn: () => startEditMessage(msg) });
      actions.push({ label: '🗑️ Delete', fn: () => deleteMessage(msg.id), danger: true });
    }

    actions.forEach(({ label, fn, danger }) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.style.cssText = `display:block;width:100%;padding:8px 12px;background:none;border:none;
        color:${danger ? '#ed4245' : '#dbdee1'};font-size:13px;cursor:pointer;border-radius:8px;
        text-align:left;font-family:inherit`;
      btn.onmouseenter = () => btn.style.background = 'rgba(255,255,255,.06)';
      btn.onmouseleave = () => btn.style.background = 'none';
      btn.onclick = () => { fn(); removeMessageMenu(); };
      menu.appendChild(btn);
    });

    document.body.appendChild(menu);

    // Click outside to close
    setTimeout(() => {
      document.addEventListener('click', removeMessageMenu, { once: true });
    }, 50);
  }

  function removeMessageMenu() {
    const m = document.getElementById('msgCtxMenu');
    if (m) m.remove();
  }

  async function reactToMessage(msgId, emoji) {
    try {
      if (typeof AppApi === 'undefined') return;
      const res = await AppApi.messages.react(msgId, { emoji });
      if (res.ok && res.data) {
        // Update message in local state
        const idx = _messages.findIndex(m => m.id === msgId);
        if (idx !== -1) {
          _messages[idx].reactions = res.data.reactions;
          renderConversation();
        }
      }
    } catch(e) {
      showToast('React failed', 'red');
    }
  }

  /* ════════════════════════════════════════════════════════
     EDIT MESSAGE — BUG FIX: was completely missing
  ════════════════════════════════════════════════════════ */
  let _editingMsgId = null;

  function startEditMessage(msg) {
    _editingMsgId = msg.id;
    const input = document.getElementById('msgInput');
    if (!input) return;
    input.value = msg.content;
    input.focus();
    input.select();

    // Show edit indicator
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
      <span>Editing message</span>
      <button onclick="cancelEditMessage()" style="margin-left:auto;background:none;border:none;color:#ed4245;cursor:pointer;font-size:11px">Cancel</button>
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
    const inp = document.getElementById('msgInput');
    const text = inp ? inp.value.trim() : '';
    if (!text) return;

    const btn = document.getElementById('msgSendBtn');
    if (btn) btn.disabled = true;

    try {
      if (_editingMsgId !== null) {
        // Edit flow
        if (typeof AppApi !== 'undefined') {
          const res = await AppApi.messages.edit(_editingMsgId, { content: text });
          if (res.ok && res.data) {
            const idx = _messages.findIndex(m => m.id === _editingMsgId);
            if (idx !== -1) { _messages[idx] = res.data; renderConversation(); }
            showToast('Message updated', 'grn');
          } else {
            showToast('Edit failed', 'red');
          }
        }
        cancelEditMessage();
        return;
      }

      // Send new message
      if (typeof AppApi !== 'undefined' && _currentConvUserId) {
        const res = await AppApi.messages.send(_currentConvUserId, { content: text });
        if (res.ok && res.data) {
          _messages.push(res.data);
          renderConversation();
        } else {
          showToast('Send failed', 'red');
        }
      } else {
        // Offline/demo
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
      if (typeof AppApi !== 'undefined') {
        await AppApi.messages.delete(msgId);
      }
      _messages = _messages.filter(m => m.id !== msgId);
      renderConversation();
      showToast('Message deleted', 'grn');
    } catch(e) {
      showToast('Delete failed', 'red');
    }
  }

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
    if (diff < 60)   return 'now';
    if (diff < 3600) return Math.floor(diff/60) + 'm';
    if (diff < 86400) return Math.floor(diff/3600) + 'h';
    return Math.floor(diff/86400) + 'd';
  }

  /* ── Init on page navigation to messages ── */
  document.addEventListener('DOMContentLoaded', () => {
    initMsgInput();

    // Re-init when navigating to messages page
    document.addEventListener('pageChange', e => {
      if (e.detail === 'messages') {
        loadInbox();
        initMsgInput();
      }
    });
  });

  // Expose for external callers (e.g. clicking "Message" buttons)
  window.MXMessages = { open: openConversation, loadInbox };

})();
