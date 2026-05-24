/* ============================================================
   MINTYNEX — ADMIN CONNECTOR  (admin-connect.js)
   Wires every admin section to the real Spring Boot backend.
   Endpoints: /api/admin/** (secured with ROLE_ADMIN)
   Include this AFTER app-connect.js in app.html.
   ============================================================ */

/* ─────────────────────────────────────────────────────────────
   ADMIN API NAMESPACE
   All calls use AppApi.accessToken (set by doAdminLogin).
   Every method returns { ok, data, status }.
───────────────────────────────────────────────────────────── */
const AdminApi = (() => {
  async function req(method, path, body) {
    try {
      const opts = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(AppApi.accessToken ? { Authorization: 'Bearer ' + AppApi.accessToken } : {}),
        },
      };
      if (body !== undefined) opts.body = JSON.stringify(body);
      const res = await fetch('/api/admin' + path, opts);
      let data;
      try { data = await res.json(); } catch (_) { data = {}; }
      return { ok: res.ok, status: res.status, data };
    } catch (err) {
      return { ok: false, status: 0, data: { message: err.message } };
    }
  }

  return {
    /* ── Overview ── */
    stats:        ()              => req('GET',  '/stats'),
    activity:     ()              => req('GET',  '/activity'),

    /* ── Users ── */
    users:        (p, q, filter) => req('GET',  `/users?page=${p||0}&size=20&search=${encodeURIComponent(q||'')}${filter&&filter!=='all'?'&filter='+filter:''}`),
    userById:     (id)           => req('GET',  `/users/${id}`),
    banUser:      (id, reason)   => req('POST', `/users/${id}/ban`,   { reason }),
    unbanUser:    (id)           => req('POST', `/users/${id}/unban`),
    warnUser:     (id, msg)      => req('POST', `/users/${id}/warn`,  { message: msg }),
    changeRole:   (id, role)     => req('PUT',  `/users/${id}/role`,  { role }),
    verifyUser:   (id)           => req('POST', `/users/${id}/verify`),
    rejectVerify: (id, reason)   => req('POST', `/users/${id}/reject-verify`, { reason }),

    /* ── Trades ── */
    trades:       (p, status)    => req('GET',  `/trades?page=${p||0}&size=20${status&&status!=='all'?'&status='+status:''}`),
    tradeById:    (id)           => req('GET',  `/trades/${id}`),
    flagTrade:    (id)           => req('POST', `/trades/${id}/flag`),
    cancelTrade:  (id, reason)   => req('POST', `/trades/${id}/cancel`, { reason }),

    /* ── Disputes ── */
    disputes:     (p, status)    => req('GET',  `/disputes?page=${p||0}&size=20${status&&status!=='all'?'&status='+status:''}`),
    disputeById:  (id)           => req('GET',  `/disputes/${id}`),
    resolveDisp:  (id, winner, note) => req('POST', `/disputes/${id}/resolve`, { winner, adminNote: note }),
    cancelDisp:   (id, note)    => req('POST', `/disputes/${id}/cancel`,  { adminNote: note }),
    escalateDisp: (id)           => req('POST', `/disputes/${id}/escalate`),
    refundDisp:   (id)           => req('POST', `/disputes/${id}/refund`),
    noteDisp:     (id, note)     => req('PUT',  `/disputes/${id}/note`,   { note }),

    /* ── Reports ── */
    reports:      (p)            => req('GET',  `/reports?page=${p||0}&size=20`),
    keepReport:   (id)           => req('POST', `/reports/${id}/keep`),
    removeContent:(id)           => req('POST', `/reports/${id}/remove`),
    dismissReport:(id)           => req('POST', `/reports/${id}/dismiss`),

    /* ── Verify Queue ── */
    verifyQueue:  ()             => req('GET',  '/verify-queue'),

    /* ── Shop ── */
    shopListings: (p)            => req('GET',  `/shop?page=${p||0}&size=20`),
    createListing:(body)         => req('POST', '/shop', body),
    editListing:  (id, body)     => req('PUT',  `/shop/${id}`, body),
    removeListing:(id)           => req('DELETE',`/shop/${id}`),

    /* ── Premium ── */
    premiumStats: ()             => req('GET',  '/premium/stats'),
    premiumSubs:  (p)            => req('GET',  `/premium/subscriptions?page=${p||0}&size=20`),
    savePricing:  (body)         => req('PUT',  '/premium/pricing', body),
    revokeSub:    (id)           => req('DELETE',`/premium/subscriptions/${id}`),

    /* ── Settings ── */
    getSettings:  ()             => req('GET',  '/settings'),
    saveSettings: (body)         => req('PUT',  '/settings', body),
    clearCache:   ()             => req('POST', '/cache/clear'),
    exportData:   ()             => req('POST', '/data/export'),
    backupDb:     ()             => req('POST', '/database/backup'),
    changeAdminPass: (body)      => req('PUT',  '/account/password', body),
  };
})();

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */
function adminErr(res, fallback) {
  const msg = res?.data?.message || res?.data?.error || fallback || 'Something went wrong';
  if (typeof showToast === 'function') showToast(msg, 'red');
  console.error('[AdminErr]', msg, res);
}

function mkSkel(n, h) {
  return Array.from({ length: n }, () =>
    `<div class="card csm" style="margin-bottom:8px;opacity:.5">
       <div style="height:${h || 14}px;background:#383a40;border-radius:4px;width:60%;margin-bottom:6px"></div>
       <div style="height:10px;background:#2b2d31;border-radius:4px;width:40%"></div>
     </div>`
  ).join('');
}

function fmtDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch (_) { return iso; }
}

function timeAgoAdmin(iso) {
  if (!iso) return 'Just now';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

function statusBadge(status) {
  const map = {
    completed: ['bdg-grn','Completed'], active: ['bdg-b','Active'],
    pending: ['bdg-v','Pending'], disputed: ['bdg-r','Disputed'],
    open: ['bdg-r','Open'], review: ['','In Review'], resolved: ['bdg-grn','Resolved'],
    escalated: ['bdg-b','Escalated'], cancelled: ['','Cancelled'],
    banned: ['bdg-r','Banned'], verified: ['bdg-grn','Verified'],
    unverified: ['bdg-v','Unverified'], active_sub: ['bdg-grn','Active'],
    trial: ['bdg-v','Trial'], expired: ['bdg-r','Expired'],
  };
  const [cls, label] = map[status?.toLowerCase()] || ['','Unknown'];
  return `<span class="bdg ${cls}" style="font-size:9px">${label}</span>`;
}

function priorityColor(p) {
  return p === 'HIGH' ? '#ed4245' : p === 'MEDIUM' ? '#f59e0b' : '#80848e';
}

/* ─────────────────────────────────────────────────────────────
   SECTION: OVERVIEW
───────────────────────────────────────────────────────────── */
async function loadOverview() {
  const statsRes = await AdminApi.stats();
  if (statsRes.ok) {
    const d = statsRes.data;
    const boxes = document.querySelectorAll('#as-overview .stat-v');
    if (boxes[0]) boxes[0].textContent = (d.totalUsers    || 0).toLocaleString();
    if (boxes[1]) boxes[1].textContent = (d.totalListings || 0).toLocaleString();
    if (boxes[2]) boxes[2].textContent = (d.totalTrades   || 0).toLocaleString();
    if (boxes[3]) boxes[3].textContent = '$' + ((d.volumeUsd || 0) / 1000).toFixed(1) + 'K';

    const rateEl = document.getElementById('adm-success-rate');
    if (rateEl) rateEl.textContent = (d.successRate || 0) + '%';
    const onlineEl = document.getElementById('adm-online-now');
    if (onlineEl) onlineEl.textContent = (d.onlineNow || 0).toLocaleString();
  }

  const actRes = await AdminApi.activity();
  const actList = document.getElementById('adm-activity-list');
  if (actList && actRes.ok) {
    const events = actRes.data?.content || actRes.data || [];
    if (events.length) {
      const colorMap = { trade:'#23a55a', signup:'#5865f2', verify:'#f59e0b', dispute:'#ed4245' };
      actList.innerHTML = events.slice(0, 6).map(e => {
        const dot = colorMap[e.type] || '#80848e';
        return `<div class="lrow" style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.04)">
          <div style="width:7px;height:7px;border-radius:50%;background:${dot};flex-shrink:0"></div>
          <span style="font-size:12px;flex:1;margin-left:8px">${e.description || e.message}</span>
          <span class="bdg" style="font-size:9px;background:rgba(255,255,255,.06);color:#80848e">${timeAgoAdmin(e.createdAt)}</span>
        </div>`;
      }).join('');
    }
  }
}

/* ─────────────────────────────────────────────────────────────
   SECTION: USERS
───────────────────────────────────────────────────────────── */
let _userPage = 0;
let _userFilter = 'all';
let _userSearch = '';
let _userSearchTimer = null;

async function loadUsers(reset) {
  if (reset) { _userPage = 0; }
  const list = document.getElementById('adm-users-list');
  if (!list) return;
  if (_userPage === 0) list.innerHTML = mkSkel(4);

  const res = await AdminApi.users(_userPage, _userSearch, _userFilter);
  if (!res.ok) { adminErr(res, 'Failed to load users'); return; }

  const users = res.data?.content || res.data || [];
  const total = res.data?.totalElements || users.length;

  // Update total count label
  const totalEl = document.getElementById('adm-users-total');
  if (totalEl) totalEl.textContent = total.toLocaleString() + ' total';

  if (_userPage === 0) list.innerHTML = '';
  if (!users.length && _userPage === 0) {
    list.innerHTML = '<div style="text-align:center;padding:30px;color:#80848e">No users found.</div>';
    return;
  }

  users.forEach(u => {
    const card = document.createElement('div');
    card.className = 'card csm';
    card.style.marginBottom = '7px';
    const initials = (u.username || u.displayName || '?').slice(0, 2).toUpperCase();
    const statusLower = u.status?.toLowerCase() || (u.banned ? 'banned' : u.verified ? 'verified' : 'unverified');
    card.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#5865f2,#7c3aed);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:13px;font-weight:800;color:#fff">
          ${u.avatarUrl ? `<img src="${u.avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>` : initials}
        </div>
        <div style="flex:1;min-width:90px">
          <div style="font-weight:700;font-size:12px;color:#fff">${u.username || u.displayName}</div>
          <div style="font-size:10px;color:#80848e">${u.country || 'Global'} · ${u.role || 'User'} · ${u.cardCount || 0} cards · ${u.tradeCount || 0} trades</div>
        </div>
        ${statusBadge(statusLower)}
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          <button class="btn bgh bxs" style="font-size:10px;padding:4px 8px" onclick="admViewUser(${u.id})">View</button>
          ${u.banned
            ? `<button class="btn bgrn bxs" style="font-size:10px;padding:4px 8px" onclick="admUnbanUser(${u.id},'${u.username}')">Unban</button>`
            : `<button class="btn brd bxs" style="font-size:10px;padding:4px 8px" onclick="admBanUser(${u.id},'${u.username}')">Ban</button>`
          }
          <button class="btn bgh bxs" style="font-size:10px;padding:4px 8px" onclick="admWarnUser(${u.id},'${u.username}')">Warn</button>
          <button class="btn bgh bxs" style="font-size:10px;padding:4px 8px" onclick="admChangeRole(${u.id},'${u.username}','${u.role||'USER'}')">Role</button>
        </div>
      </div>`;
    list.appendChild(card);
  });

  // Show/hide load more
  const loadMoreBtn = document.getElementById('adm-users-loadmore');
  if (loadMoreBtn) {
    const hasMore = res.data?.totalPages ? (_userPage + 1 < res.data.totalPages) : users.length === 20;
    loadMoreBtn.style.display = hasMore ? 'flex' : 'none';
  }
}

window.admViewUser = async function (id) {
  showToast('Loading profile…', '');
  const res = await AdminApi.userById(id);
  if (!res.ok) { adminErr(res, 'Could not load user'); return; }
  const u = res.data;
  const info = [
    `Username: ${u.username}`, `Email: ${u.email || '—'}`, `Phone: ${u.phone || '—'}`,
    `Country: ${u.country || '—'}`, `Role: ${u.role || 'USER'}`, `Trades: ${u.tradeCount || 0}`,
    `Cards: ${u.cardCount || 0}`, `Joined: ${fmtDate(u.createdAt)}`,
    `Status: ${u.banned ? '🚫 Banned' : u.verified ? '✅ Verified' : 'Unverified'}`,
  ].join('\n');
  alert('User Profile\n\n' + info);
};

window.admBanUser = async function (id, username) {
  const reason = prompt(`Ban reason for ${username}:`);
  if (reason === null) return;
  const res = await AdminApi.banUser(id, reason || 'Violation of platform rules');
  if (!res.ok) { adminErr(res, 'Could not ban user'); return; }
  showToast(`${username} has been banned.`, 'red');
  loadUsers(true);
};

window.admUnbanUser = async function (id, username) {
  if (!confirm(`Unban ${username}?`)) return;
  const res = await AdminApi.unbanUser(id);
  if (!res.ok) { adminErr(res, 'Could not unban user'); return; }
  showToast(`${username} has been unbanned.`, 'grn');
  loadUsers(true);
};

window.admWarnUser = async function (id, username) {
  const msg = prompt(`Warning message to send to ${username}:`);
  if (!msg) return;
  const res = await AdminApi.warnUser(id, msg);
  if (!res.ok) { adminErr(res, 'Could not send warning'); return; }
  showToast(`Warning sent to ${username}.`, 'gold');
};

window.admChangeRole = async function (id, username, currentRole) {
  const roles = ['USER', 'MODERATOR', 'ADMIN'];
  const roleStr = roles.filter(r => r !== currentRole).join(' / ');
  const newRole = prompt(`Change role for ${username} (current: ${currentRole})\nEnter: ${roleStr}`);
  if (!newRole || !roles.includes(newRole.toUpperCase())) {
    if (newRole !== null) showToast('Invalid role. Enter: ' + roleStr, 'red');
    return;
  }
  const res = await AdminApi.changeRole(id, newRole.toUpperCase());
  if (!res.ok) { adminErr(res, 'Could not change role'); return; }
  showToast(`${username} is now ${newRole.toUpperCase()}.`, 'grn');
  loadUsers(true);
};

/* ─────────────────────────────────────────────────────────────
   SECTION: TRADES
───────────────────────────────────────────────────────────── */
let _tradePage = 0;
let _tradeStatusFilter = 'all';

async function loadTrades(reset) {
  if (reset) _tradePage = 0;
  const list = document.getElementById('adm-trades-list');
  if (!list) return;
  if (_tradePage === 0) list.innerHTML = mkSkel(3);

  const res = await AdminApi.trades(_tradePage, _tradeStatusFilter);
  if (!res.ok) { adminErr(res, 'Failed to load trades'); return; }

  const trades = res.data?.content || res.data || [];
  const d = res.data;

  // Update stats
  const statsMap = { completed: 0, active: 1, pending: 2, disputed: 3 };
  const statBoxes = document.querySelectorAll('#as-trades .stat-v');
  if (d.completedCount !== undefined && statBoxes[0]) statBoxes[0].textContent = (d.completedCount || 0).toLocaleString();
  if (d.activeCount     !== undefined && statBoxes[1]) statBoxes[1].textContent = (d.activeCount    || 0).toLocaleString();
  if (d.pendingCount    !== undefined && statBoxes[2]) statBoxes[2].textContent = (d.pendingCount   || 0).toLocaleString();
  if (d.disputedCount   !== undefined && statBoxes[3]) statBoxes[3].textContent = (d.disputedCount  || 0).toLocaleString();

  if (_tradePage === 0) list.innerHTML = '';
  if (!trades.length && _tradePage === 0) {
    list.innerHTML = '<div style="text-align:center;padding:30px;color:#80848e">No trades found.</div>';
    return;
  }

  const borderColors = { completed: '#23a55a', active: '#5865f2', pending: '#f59e0b', disputed: '#ed4245', cancelled: '#80848e' };
  trades.forEach(t => {
    const status = (t.status || 'active').toLowerCase();
    const border = borderColors[status] || '#80848e';
    const card = document.createElement('div');
    card.className = 'card csm';
    card.style.cssText = `margin-bottom:7px;border-left:3px solid ${border}`;
    card.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:11px;font-weight:800;color:#f59e0b">#TXN-${String(t.id).padStart(4,'0')}</span>
        ${statusBadge(status)}
      </div>
      <div style="font-size:12px;color:#dbdee1;margin-bottom:6px">
        ${t.proposerUsername || 'User'} ↔ ${t.receiverUsername || 'User'} · ${t.proposerCard || ''} ${t.receiverCard ? 'for ' + t.receiverCard : ''}
        ${t.cashValue ? ' + $' + t.cashValue : ''}
      </div>
      <div style="font-size:10px;color:#80848e;margin-bottom:6px">${fmtDate(t.createdAt)}</div>
      <div style="display:flex;gap:5px;flex-wrap:wrap">
        <button class="btn bgh bxs" style="font-size:10px;padding:4px 8px" onclick="admViewTrade(${t.id})">Details</button>
        ${status === 'active' || status === 'pending'
          ? `<button class="btn brd bxs" style="font-size:10px;padding:4px 8px" onclick="admCancelTrade(${t.id})">Cancel</button>`
          : ''}
        ${status !== 'disputed'
          ? `<button class="btn brd bxs" style="font-size:10px;padding:4px 8px" onclick="admFlagTrade(${t.id})">Flag</button>`
          : `<button class="btn brd bxs" style="font-size:10px;padding:4px 8px" onclick="admShowSec('disputes')">View Dispute</button>`}
      </div>`;
    list.appendChild(card);
  });

  const lb = document.getElementById('adm-trades-loadmore');
  if (lb) lb.style.display = (res.data?.totalPages && (_tradePage + 1 < res.data.totalPages)) ? 'flex' : 'none';
}

window.admViewTrade = async function (id) {
  const res = await AdminApi.tradeById(id);
  if (!res.ok) { adminErr(res, 'Could not load trade'); return; }
  const t = res.data;
  alert(`Trade #${id}\n\nProposer: ${t.proposerUsername}\nReceiver: ${t.receiverUsername}\nStatus: ${t.status}\nCards: ${t.proposerCard} ↔ ${t.receiverCard}\nCash: $${t.cashValue || 0}\nCreated: ${fmtDate(t.createdAt)}\nMeetup: ${t.meetupLocation || '—'}`);
};

window.admFlagTrade = async function (id) {
  const res = await AdminApi.flagTrade(id);
  if (!res.ok) { adminErr(res, 'Could not flag trade'); return; }
  showToast('Trade #' + id + ' flagged for review.', 'gold');
  loadTrades(true);
};

window.admCancelTrade = async function (id) {
  const reason = prompt('Reason for cancelling trade #' + id + ':');
  if (reason === null) return;
  const res = await AdminApi.cancelTrade(id, reason || 'Cancelled by admin');
  if (!res.ok) { adminErr(res, 'Could not cancel trade'); return; }
  showToast('Trade #' + id + ' cancelled.', 'red');
  loadTrades(true);
};

/* ─────────────────────────────────────────────────────────────
   SECTION: DISPUTES
───────────────────────────────────────────────────────────── */
let _disputePage = 0;
let _disputeFilter = 'all';

async function loadDisputes(reset) {
  if (reset) _disputePage = 0;
  const list = document.getElementById('adm-disputes-list');
  if (!list) return;
  if (_disputePage === 0) list.innerHTML = mkSkel(2, 80);

  const res = await AdminApi.disputes(_disputePage, _disputeFilter);
  if (!res.ok) { adminErr(res, 'Failed to load disputes'); return; }

  const disputes = res.data?.content || res.data || [];
  const d = res.data;

  // Update stats
  const sv = document.querySelectorAll('#as-disputes .stat-b .stat-v');
  if (sv[0] && d.openCount     !== undefined) sv[0].textContent = d.openCount;
  if (sv[1] && d.reviewCount   !== undefined) sv[1].textContent = d.reviewCount;
  if (sv[2] && d.resolvedCount !== undefined) sv[2].textContent = d.resolvedCount;
  if (sv[3] && d.escalatedCount!== undefined) sv[3].textContent = d.escalatedCount;

  if (_disputePage === 0) list.innerHTML = '';
  if (!disputes.length && _disputePage === 0) {
    list.innerHTML = '<div style="text-align:center;padding:30px;color:#80848e">No disputes found 🎉</div>';
    return;
  }

  disputes.forEach(dp => renderDisputeCard(dp, list));

  const lb = document.getElementById('adm-disputes-loadmore');
  if (lb) lb.style.display = (res.data?.totalPages && (_disputePage + 1 < res.data.totalPages)) ? 'flex' : 'none';
}

function renderDisputeCard(dp, container) {
  const status = (dp.status || 'open').toLowerCase();
  const borderMap = { open: '#ed4245', review: '#f59e0b', resolved: '#23a55a', escalated: '#7289da', cancelled: '#80848e' };
  const border = borderMap[status] || '#80848e';
  const isResolved = status === 'resolved' || status === 'cancelled';
  const priority = dp.priority || 'LOW';
  const evidence = (dp.evidence || []);
  const timeline = (dp.timeline || []);

  const card = document.createElement('div');
  card.className = 'dsp-card card';
  card.dataset.status = status;
  card.style.cssText = `margin-bottom:10px;border-left:3px solid ${border};${isResolved ? 'opacity:.75' : ''}`;

  card.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px">
      <div>
        <div style="font-size:12px;font-weight:800;color:#f59e0b">#DSP-${String(dp.id).padStart(4,'0')}</div>
        <div style="font-size:10px;color:#80848e;margin-top:2px">
          ${timeAgoAdmin(dp.createdAt)} · Trade #TXN-${String(dp.tradeId || 0).padStart(4,'0')} ·
          <span style="color:${priorityColor(priority)}">${priority} Priority</span>
        </div>
      </div>
      ${statusBadge(status)}
    </div>

    <!-- Parties -->
    <div style="display:grid;grid-template-columns:1fr 28px 1fr;gap:8px;align-items:center;margin-bottom:10px">
      <div style="background:#2b2d31;border-radius:8px;padding:10px;text-align:center">
        <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#1e1b4b,#4338ca);display:flex;align-items:center;justify-content:center;margin:0 auto 4px;font-size:13px;font-weight:800;color:#fff">
          ${(dp.claimantUsername || 'A')[0].toUpperCase()}
        </div>
        <div style="font-size:11px;font-weight:700;color:#fff">${dp.claimantUsername || 'Claimant'}</div>
        <div style="font-size:9px;color:#5865f2;margin-top:2px">Claimant</div>
        ${dp.claimantStatement
          ? `<div style="font-size:9px;color:#b5bac1;margin-top:4px;line-height:1.4;text-align:left">"${dp.claimantStatement.slice(0,80)}…"</div>`
          : ''}
      </div>
      <div style="text-align:center;font-size:16px;color:#80848e">⚖️</div>
      <div style="background:#2b2d31;border-radius:8px;padding:10px;text-align:center">
        <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#7f1d1d,#c2410c);display:flex;align-items:center;justify-content:center;margin:0 auto 4px;font-size:13px;font-weight:800;color:#fff">
          ${(dp.respondentUsername || 'B')[0].toUpperCase()}
        </div>
        <div style="font-size:11px;font-weight:700;color:#fff">${dp.respondentUsername || 'Respondent'}</div>
        <div style="font-size:9px;color:#ed4245;margin-top:2px">Respondent</div>
        ${dp.respondentStatement
          ? `<div style="font-size:9px;color:#b5bac1;margin-top:4px;line-height:1.4;text-align:left">"${dp.respondentStatement.slice(0,80)}…"</div>`
          : ''}
      </div>
    </div>

    <!-- Issue -->
    <div style="background:#2b2d31;border-radius:8px;padding:10px;margin-bottom:10px">
      <div style="font-size:10px;color:#f59e0b;font-weight:700;margin-bottom:4px">⚠ Issue Reported</div>
      <div style="font-size:12px;color:#dbdee1;line-height:1.5">${dp.description || dp.reason || 'No description provided.'}</div>
    </div>

    ${evidence.length ? `
    <div style="background:#2b2d31;border-radius:8px;padding:10px;margin-bottom:10px">
      <div style="font-size:10px;color:#80848e;font-weight:700;margin-bottom:6px">EVIDENCE (${evidence.length})</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${evidence.map(ev =>
          `<a href="${ev.url || '#'}" target="_blank" style="background:#383a40;border-radius:4px;padding:3px 8px;font-size:10px;color:#dbdee1;text-decoration:none">
            ${ev.type === 'image' ? '📷' : ev.type === 'pdf' ? '📄' : '🔗'} ${ev.filename || ev.url?.split('/').pop() || 'File'}
          </a>`).join('')}
      </div>
    </div>` : ''}

    ${timeline.length ? `
    <div style="background:#2b2d31;border-radius:8px;padding:10px;margin-bottom:10px">
      <div style="font-size:10px;color:#80848e;font-weight:700;margin-bottom:6px">TIMELINE</div>
      <div style="display:flex;flex-direction:column;gap:4px">
        ${timeline.map(ev => `
          <div style="display:flex;gap:8px;align-items:flex-start">
            <div style="width:6px;height:6px;border-radius:50%;background:#5865f2;flex-shrink:0;margin-top:3px"></div>
            <span style="font-size:10px;color:#80848e;white-space:nowrap">${timeAgoAdmin(ev.createdAt)}</span>
            <span style="font-size:11px;color:#dbdee1">${ev.description || ev.event}</span>
          </div>`).join('')}
      </div>
    </div>` : ''}

    ${dp.adminNote ? `
    <div style="background:rgba(88,101,242,.08);border:1px solid rgba(88,101,242,.2);border-radius:8px;padding:10px;margin-bottom:10px">
      <div style="font-size:10px;color:#7289da;font-weight:700;margin-bottom:3px">PREVIOUS ADMIN NOTE</div>
      <div style="font-size:12px;color:#b5bac1">${dp.adminNote}</div>
    </div>` : ''}

    ${!isResolved ? `
    <!-- Admin Notes -->
    <div style="margin-bottom:10px">
      <div style="font-size:10px;color:#80848e;font-weight:700;margin-bottom:4px">ADMIN NOTES</div>
      <textarea id="dsp-note-${dp.id}" class="fi" placeholder="Add internal notes about this dispute…"
        style="height:60px;font-size:12px;resize:none;width:100%;box-sizing:border-box">${dp.adminNote || ''}</textarea>
    </div>
    <!-- Actions -->
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <button class="btn bgrn bxs" style="font-size:11px" onclick="admResolveDispute(${dp.id},'CLAIMANT')">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:3px"><polyline points="20 6 9 17 4 12"/></svg>Buyer Wins
      </button>
      <button class="btn" style="font-size:11px;background:rgba(88,101,242,.2);border:1px solid #5865f2;color:#5865f2" onclick="admResolveDispute(${dp.id},'RESPONDENT')">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:3px"><polyline points="20 6 9 17 4 12"/></svg>Seller Wins
      </button>
      <button class="btn brd bxs" style="font-size:11px" onclick="admEscalateDispute(${dp.id})">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:3px"><polyline points="12 19 12 5"/><polyline points="5 12 12 5 19 12"/></svg>Escalate
      </button>
      <button class="btn brd bxs" style="font-size:11px" onclick="admCancelDispute(${dp.id})">Cancel</button>
      <button class="btn bgh bxs" style="font-size:11px" onclick="admRefundDispute(${dp.id})">💰 Refund</button>
      <button class="btn bgh bxs" style="font-size:11px" onclick="admSaveNote(${dp.id})">💾 Save Note</button>
    </div>` :
    `<div style="font-size:12px;color:#${status === 'resolved' ? '23a55a' : '80848e'};font-weight:700">
      ${status === 'resolved' ? '✓ Resolved' : '✗ Cancelled'} ${dp.resolution ? '— ' + dp.resolution : ''} ${fmtDate(dp.resolvedAt)}
    </div>`}
  `;
  container.appendChild(card);
}

window.admResolveDispute = async function (id, winner) {
  const noteEl = document.getElementById('dsp-note-' + id);
  const note = noteEl ? noteEl.value.trim() : '';
  const label = winner === 'CLAIMANT' ? 'buyer' : 'seller';
  if (!confirm(`Resolve dispute #${id} in favour of ${label}?`)) return;
  const res = await AdminApi.resolveDisp(id, winner, note);
  if (!res.ok) { adminErr(res, 'Could not resolve dispute'); return; }
  showToast(`Dispute #${id} resolved — ${label} wins! ✓`, 'grn');
  loadDisputes(true);
};

window.admEscalateDispute = async function (id) {
  if (!confirm(`Escalate dispute #${id} to senior admin?`)) return;
  const res = await AdminApi.escalateDisp(id);
  if (!res.ok) { adminErr(res, 'Could not escalate'); return; }
  showToast(`Dispute #${id} escalated.`, 'gold');
  loadDisputes(true);
};

window.admCancelDispute = async function (id) {
  const note = prompt('Reason for cancelling this dispute:');
  if (note === null) return;
  const res = await AdminApi.cancelDisp(id, note);
  if (!res.ok) { adminErr(res, 'Could not cancel dispute'); return; }
  showToast(`Dispute #${id} cancelled.`, '');
  loadDisputes(true);
};

window.admRefundDispute = async function (id) {
  if (!confirm(`Issue a refund for dispute #${id}?`)) return;
  const res = await AdminApi.refundDisp(id);
  if (!res.ok) { adminErr(res, 'Could not issue refund'); return; }
  showToast(`Refund issued for dispute #${id}.`, 'grn');
};

window.admSaveNote = async function (id) {
  const noteEl = document.getElementById('dsp-note-' + id);
  const note = noteEl ? noteEl.value.trim() : '';
  if (!note) { showToast('Note is empty.', 'red'); return; }
  const res = await AdminApi.noteDisp(id, note);
  if (!res.ok) { adminErr(res, 'Could not save note'); return; }
  showToast('Note saved.', 'grn');
};

/* ─────────────────────────────────────────────────────────────
   SECTION: REPORTS
───────────────────────────────────────────────────────────── */
async function loadReports() {
  const list = document.getElementById('adm-reports-list');
  if (!list) return;
  list.innerHTML = mkSkel(3, 14);

  const res = await AdminApi.reports(0);
  if (!res.ok) { adminErr(res, 'Failed to load reports'); return; }

  const reports = res.data?.content || res.data || [];
  const pending = reports.filter(r => r.status !== 'dismissed' && r.status !== 'resolved').length;

  const badge = document.querySelector('#as-reports .bdg-r');
  if (badge) badge.textContent = pending + ' pending';

  list.innerHTML = '';
  if (!reports.length) {
    list.innerHTML = '<div style="text-align:center;padding:30px;color:#80848e">No reports — all clear! ✅</div>';
    return;
  }

  reports.forEach(r => {
    const typeColor = r.contentType === 'listing' ? 'bdg-r' : r.contentType === 'user' ? 'bdg-b' : '';
    const card = document.createElement('div');
    card.className = 'card csm';
    card.style.marginBottom = '8px';
    card.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <div style="font-size:12px;font-weight:700;color:#fff">${r.title || r.contentType + ' report'}</div>
        <span class="bdg ${typeColor}" style="font-size:9px;text-transform:capitalize">${r.contentType || 'Post'}</span>
      </div>
      <div style="font-size:11px;color:#80848e;margin-bottom:4px">
        Reported by ${r.reporterUsername || 'User'} · ${r.reportCount > 1 ? r.reportCount + ' reports · ' : ''}${r.reason || ''}
      </div>
      <div style="font-size:10px;color:#80848e;margin-bottom:8px">${timeAgoAdmin(r.createdAt)}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn bgrn bxs" style="font-size:10px" onclick="admKeepContent(${r.id})">Keep</button>
        <button class="btn brd bxs" style="font-size:10px" onclick="admRemoveContent(${r.id})">Remove</button>
        <button class="btn bgh bxs" style="font-size:10px" onclick="admDismissReport(${r.id})">Dismiss</button>
      </div>`;
    list.appendChild(card);
  });
}

window.admKeepContent = async function (id) {
  const res = await AdminApi.keepReport(id);
  if (!res.ok) { adminErr(res, 'Action failed'); return; }
  showToast('Content kept — report closed.', 'grn');
  loadReports();
};

window.admRemoveContent = async function (id) {
  if (!confirm('Remove this content permanently?')) return;
  const res = await AdminApi.removeContent(id);
  if (!res.ok) { adminErr(res, 'Could not remove content'); return; }
  showToast('Content removed.', 'red');
  loadReports();
};

window.admDismissReport = async function (id) {
  const res = await AdminApi.dismissReport(id);
  if (!res.ok) { adminErr(res, 'Could not dismiss'); return; }
  showToast('Report dismissed.', '');
  loadReports();
};

/* ─────────────────────────────────────────────────────────────
   SECTION: VERIFY QUEUE
───────────────────────────────────────────────────────────── */
async function loadVerifyQueue() {
  const list = document.getElementById('adm-verify-list');
  if (!list) return;
  list.innerHTML = mkSkel(2, 14);

  const res = await AdminApi.verifyQueue();
  if (!res.ok) { adminErr(res, 'Failed to load verify queue'); return; }

  const queue = res.data?.content || res.data || [];
  const pendingCount = queue.length;

  const badge = document.querySelector('#as-verify .bdg');
  if (badge) badge.textContent = pendingCount + ' pending';

  list.innerHTML = '';
  if (!queue.length) {
    list.innerHTML = '<div style="text-align:center;padding:30px;color:#80848e">Verify queue is empty ✅</div>';
    return;
  }

  queue.forEach(u => {
    const card = document.createElement('div');
    card.className = 'card csm';
    card.style.marginBottom = '8px';
    card.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#1e1b4b,#4338ca);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:15px;font-weight:800;color:#fff">
          ${(u.username || '?')[0].toUpperCase()}
        </div>
        <div style="flex:1;min-width:80px">
          <div style="font-weight:700;font-size:13px;color:#fff">${u.username}</div>
          <div style="font-size:10px;color:#80848e">${u.tradeCount || 0} trades · ★${u.rating || '—'} · ${u.country || 'Global'}</div>
          <div style="font-size:10px;color:#80848e">ID submitted · ${timeAgoAdmin(u.verifyRequestedAt)}</div>
        </div>
        <div style="display:flex;gap:5px;flex-wrap:wrap">
          <button class="btn bgrn bxs" style="font-size:11px" onclick="admApproveVerify(${u.id},'${u.username}')">Approve</button>
          <button class="btn brd bxs" style="font-size:11px" onclick="admRejectVerify(${u.id},'${u.username}')">Reject</button>
          ${u.idDocumentUrl
            ? `<a class="btn bgh bxs" style="font-size:11px;text-decoration:none;display:inline-flex;align-items:center" href="${u.idDocumentUrl}" target="_blank">View ID</a>`
            : `<button class="btn bgh bxs" style="font-size:11px" disabled>No ID</button>`}
        </div>
      </div>`;
    list.appendChild(card);
  });
}

window.admApproveVerify = async function (id, username) {
  if (!confirm(`Approve verification for ${username}?`)) return;
  const res = await AdminApi.verifyUser(id);
  if (!res.ok) { adminErr(res, 'Could not approve'); return; }
  showToast(`${username} is now Verified ✓`, 'grn');
  loadVerifyQueue();
};

window.admRejectVerify = async function (id, username) {
  const reason = prompt(`Rejection reason for ${username}:`);
  if (reason === null) return;
  const res = await AdminApi.rejectVerify(id, reason || 'Does not meet verification standards');
  if (!res.ok) { adminErr(res, 'Could not reject'); return; }
  showToast(`Verification rejected for ${username}.`, 'red');
  loadVerifyQueue();
};

/* ─────────────────────────────────────────────────────────────
   SECTION: SHOP
───────────────────────────────────────────────────────────── */
let _shopPage = 0;

async function loadShop(reset) {
  if (reset) _shopPage = 0;
  const list = document.getElementById('adm-shop-list');
  if (!list) return;
  if (_shopPage === 0) list.innerHTML = mkSkel(3);

  const res = await AdminApi.shopListings(_shopPage);
  if (!res.ok) { adminErr(res, 'Failed to load listings'); return; }

  const listings = res.data?.content || res.data || [];
  if (_shopPage === 0) list.innerHTML = '';
  if (!listings.length && _shopPage === 0) {
    list.innerHTML = '<div style="text-align:center;padding:30px;color:#80848e">No listings yet.</div>';
    return;
  }

  listings.forEach(item => {
    const card = document.createElement('div');
    card.className = 'card csm';
    card.style.cssText = 'margin-bottom:7px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px';
    card.innerHTML = `
      <div>
        <div style="font-size:12px;font-weight:700;color:#fff">${item.cardName} ${item.grade ? '· ' + item.grade : ''}</div>
        <div style="font-size:10px;color:#80848e">$${item.price || 0} · ${item.sellerUsername || 'Admin'} · ${fmtDate(item.createdAt)}</div>
      </div>
      <div style="display:flex;gap:5px">
        <button class="btn bgh bxs" style="font-size:10px" onclick="admEditListing(${item.id})">Edit</button>
        <button class="btn brd bxs" style="font-size:10px" onclick="admRemoveListing(${item.id})">Remove</button>
      </div>`;
    list.appendChild(card);
  });

  const lb = document.getElementById('adm-shop-loadmore');
  if (lb) lb.style.display = (res.data?.totalPages && (_shopPage + 1 < res.data.totalPages)) ? 'flex' : 'none';
}

window.admPublishListing = async function () {
  const cardName = document.getElementById('adm-shop-name')?.value?.trim();
  const price    = parseFloat(document.getElementById('adm-shop-price')?.value) || 0;
  const grade    = document.getElementById('adm-shop-grade')?.value || 'Raw NM';
  const seller   = document.getElementById('adm-shop-seller')?.value?.trim();
  if (!cardName) { showToast('Enter a card name', 'red'); return; }
  const btn     = document.getElementById('adm-shop-publish-btn');
  const restore = typeof btnLoading === 'function' ? btnLoading(btn, 'Publishing…') : () => {};
  const res = await AdminApi.createListing({ cardName, price, grade, sellerUsername: seller });
  restore();
  if (!res.ok) { adminErr(res, 'Could not publish listing'); return; }
  showToast('Listing published! ✓', 'grn');
  ['adm-shop-name','adm-shop-price','adm-shop-seller'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  loadShop(true);
};

window.admEditListing = async function (id) {
  const newPrice = prompt('New price (USD):');
  if (newPrice === null) return;
  const price = parseFloat(newPrice);
  if (isNaN(price)) { showToast('Invalid price', 'red'); return; }
  const res = await AdminApi.editListing(id, { price });
  if (!res.ok) { adminErr(res, 'Could not update listing'); return; }
  showToast('Listing updated!', 'grn');
  loadShop(true);
};

window.admRemoveListing = async function (id) {
  if (!confirm('Remove this listing?')) return;
  const res = await AdminApi.removeListing(id);
  if (!res.ok) { adminErr(res, 'Could not remove listing'); return; }
  showToast('Listing removed.', 'red');
  loadShop(true);
};

/* ─────────────────────────────────────────────────────────────
   SECTION: PREMIUM
───────────────────────────────────────────────────────────── */
let _premPage = 0;

async function loadPremium(reset) {
  if (reset) _premPage = 0;

  const statsRes = await AdminApi.premiumStats();
  if (statsRes.ok) {
    const d = statsRes.data;
    const el0 = document.getElementById('adm-prem-active-count');
    const el1 = document.getElementById('adm-prem-rev');
    if (el0) el0.textContent = (d.activeSubscriptions || 0).toLocaleString();
    if (el1) el1.textContent = '$' + ((d.monthlyRevenue || 0) / 1000).toFixed(1) + 'K';

    // Fill pricing inputs
    const mpEl = document.getElementById('adm-prem-monthly');
    const apEl = document.getElementById('adm-prem-annual');
    const tdEl = document.getElementById('adm-prem-trial');
    if (mpEl && d.monthlyPrice !== undefined) mpEl.value = d.monthlyPrice;
    if (apEl && d.annualPrice  !== undefined) apEl.value = d.annualPrice;
    if (tdEl && d.trialDays    !== undefined) tdEl.value = d.trialDays;
  }

  const list = document.getElementById('adm-prem-subs-list');
  if (!list) return;
  if (_premPage === 0) list.innerHTML = mkSkel(3);

  const res = await AdminApi.premiumSubs(_premPage);
  if (!res.ok) { adminErr(res, 'Failed to load subscriptions'); return; }

  const subs = res.data?.content || res.data || [];
  if (_premPage === 0) list.innerHTML = '';
  if (!subs.length && _premPage === 0) {
    list.innerHTML = '<div style="text-align:center;padding:30px;color:#80848e">No active subscriptions.</div>';
    return;
  }

  subs.forEach(s => {
    const card = document.createElement('div');
    card.className = 'card csm';
    card.style.cssText = 'margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px';
    const planLabel = s.plan === 'annual' ? 'Premium Annual' : 'Premium';
    const renewsLabel = s.status === 'trial' ? `Trial ends ${fmtDate(s.expiresAt)}` : `Renews ${fmtDate(s.renewsAt || s.expiresAt)}`;
    card.innerHTML = `
      <div>
        <div style="font-size:12px;font-weight:700;color:#fff">${s.username}</div>
        <div style="font-size:10px;color:#80848e">${planLabel} · ${renewsLabel}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        ${statusBadge(s.status === 'active' ? 'active_sub' : s.status === 'trial' ? 'trial' : 'expired')}
        <button class="btn brd bxs" style="font-size:10px;padding:3px 8px" onclick="admRevokeSub(${s.id},'${s.username}')">Revoke</button>
      </div>`;
    list.appendChild(card);
  });

  const lb = document.getElementById('adm-prem-loadmore');
  if (lb) lb.style.display = (res.data?.totalPages && (_premPage + 1 < res.data.totalPages)) ? 'flex' : 'none';
}

window.admRevokeSub = async function (id, username) {
  if (!confirm(`Revoke premium subscription for ${username}?`)) return;
  const res = await AdminApi.revokeSub(id);
  if (!res.ok) { adminErr(res, 'Could not revoke subscription'); return; }
  showToast(`Premium revoked for ${username}.`, 'red');
  loadPremium(true);
};

window.admSavePricing = async function () {
  const monthly = parseFloat(document.getElementById('adm-prem-monthly')?.value);
  const annual  = parseFloat(document.getElementById('adm-prem-annual')?.value);
  const trial   = parseInt(document.getElementById('adm-prem-trial')?.value);
  if (isNaN(monthly) || isNaN(annual) || isNaN(trial)) {
    showToast('Invalid pricing values', 'red'); return;
  }
  const btn     = document.getElementById('adm-prem-save-btn');
  const restore = typeof btnLoading === 'function' ? btnLoading(btn, 'Saving…') : () => {};
  const res = await AdminApi.savePricing({ monthlyPrice: monthly, annualPrice: annual, trialDays: trial });
  restore();
  if (!res.ok) { adminErr(res, 'Could not save pricing'); return; }
  showToast('Pricing updated! ✓', 'grn');
};

/* ─────────────────────────────────────────────────────────────
   SECTION: SETTINGS
───────────────────────────────────────────────────────────── */
async function loadSettings() {
  const res = await AdminApi.getSettings();
  if (!res.ok) return; // keep UI defaults
  const d = res.data;

  // Toggles
  const togMap = {
    'setting-maintenance': d.maintenanceMode,
    'setting-registrations': d.newRegistrationsEnabled,
    'setting-trade': d.tradeSystemEnabled,
    'setting-push': d.pushNotificationsEnabled,
    'setting-auto-archive': d.autoArchiveDisputes,
    'setting-id-verify': d.requireIdHighValue,
  };
  Object.entries(togMap).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) { if (val) el.classList.add('on'); else el.classList.remove('on'); }
  });

  // Security inputs
  const maxTradeEl = document.getElementById('adm-max-trade');
  const cooldownEl = document.getElementById('adm-cooldown');
  const maxReportsEl = document.getElementById('adm-max-reports');
  if (maxTradeEl && d.maxTradeValue   !== undefined) maxTradeEl.value = d.maxTradeValue;
  if (cooldownEl && d.tradeCooldownHours !== undefined) cooldownEl.value = d.tradeCooldownHours;
  if (maxReportsEl && d.maxReportsBeforeReview !== undefined) maxReportsEl.value = d.maxReportsBeforeReview;

  // Banner
  const bannerEl  = document.getElementById('adm-banner-msg');
  const bannerType = document.getElementById('adm-banner-type');
  if (bannerEl  && d.bannerMessage) bannerEl.value = d.bannerMessage;
  if (bannerType && d.bannerType)   bannerType.value = d.bannerType.toLowerCase();
}

window.admSaveSettings = async function () {
  const body = {
    maintenanceMode:          document.getElementById('setting-maintenance')?.classList.contains('on'),
    newRegistrationsEnabled:  document.getElementById('setting-registrations')?.classList.contains('on'),
    tradeSystemEnabled:       document.getElementById('setting-trade')?.classList.contains('on'),
    pushNotificationsEnabled: document.getElementById('setting-push')?.classList.contains('on'),
    autoArchiveDisputes:      document.getElementById('setting-auto-archive')?.classList.contains('on'),
    requireIdHighValue:       document.getElementById('setting-id-verify')?.classList.contains('on'),
    maxTradeValue:            parseFloat(document.getElementById('adm-max-trade')?.value) || 3850,
    tradeCooldownHours:       parseInt(document.getElementById('adm-cooldown')?.value) || 2,
    maxReportsBeforeReview:   parseInt(document.getElementById('adm-max-reports')?.value) || 3,
  };
  const btn     = document.getElementById('adm-security-save-btn');
  const restore = typeof btnLoading === 'function' ? btnLoading(btn, 'Saving…') : () => {};
  const res = await AdminApi.saveSettings(body);
  restore();
  if (!res.ok) { adminErr(res, 'Could not save settings'); return; }
  showToast('Settings saved! ✓', 'grn');
};

window.admUpdateBanner = async function () {
  const message = document.getElementById('adm-banner-msg')?.value?.trim();
  const type    = document.getElementById('adm-banner-type')?.value?.toUpperCase() || 'INFO';
  if (!message) { showToast('Enter a banner message', 'red'); return; }
  const res = await AdminApi.saveSettings({ bannerMessage: message, bannerType: type });
  if (!res.ok) { adminErr(res, 'Could not update banner'); return; }
  showToast('Banner updated! ✓', 'grn');
};

window.admClearCache = async function () {
  const btn = document.getElementById('adm-clear-cache-btn');
  const restore = typeof btnLoading === 'function' ? btnLoading(btn, 'Clearing…') : () => {};
  const res = await AdminApi.clearCache();
  restore();
  if (!res.ok) { adminErr(res, 'Cache clear failed'); return; }
  showToast('Cache cleared! ✓', 'grn');
};

window.admExportData = async function () {
  const btn = document.getElementById('adm-export-btn');
  const restore = typeof btnLoading === 'function' ? btnLoading(btn, 'Exporting…') : () => {};
  const res = await AdminApi.exportData();
  restore();
  if (!res.ok) { adminErr(res, 'Export failed'); return; }
  showToast('Export started — you will receive an email when ready.', 'grn');
};

window.admBackupDb = async function () {
  const btn = document.getElementById('adm-backup-btn');
  const restore = typeof btnLoading === 'function' ? btnLoading(btn, 'Backing up…') : () => {};
  const res = await AdminApi.backupDb();
  restore();
  if (!res.ok) { adminErr(res, 'Backup failed'); return; }
  showToast('Database backup started! ✓', 'grn');
};

window.admChangeAdminPass = async function () {
  const np = document.getElementById('admNewPass')?.value;
  if (!np || np.length < 8) { showToast('Password must be at least 8 characters', 'red'); return; }
  const btn = document.querySelector('[onclick="admChangeAdminPass()"]');
  const restore = typeof btnLoading === 'function' ? btnLoading(btn, 'Saving…') : () => {};
  const res = await AdminApi.changeAdminPass({ newPassword: np });
  restore();
  if (!res.ok) { adminErr(res, 'Could not change password'); return; }
  showToast('Password updated! ✓', 'grn');
  document.getElementById('admNewPass').value = '';
};

/* ─────────────────────────────────────────────────────────────
   DISPUTE FILTER (replaces old filterDisputes)
───────────────────────────────────────────────────────────── */
window.filterDisputes = function (filter) {
  _disputeFilter = filter;
  document.querySelectorAll('.dsp-filter').forEach(btn => {
    btn.classList.toggle('on', btn.dataset.filter === filter);
    if (filter === 'all') btn.classList.add('on');
  });
  // Also update active button correctly
  document.querySelectorAll('.dsp-filter').forEach(btn => {
    btn.classList.toggle('on', btn.dataset.filter === filter || (filter === 'all' && btn.dataset.filter === 'all'));
  });
  loadDisputes(true);
};

/* ─────────────────────────────────────────────────────────────
   SECTION ROUTING
   Called by app.html admShowSec() when tabs are clicked.
───────────────────────────────────────────────────────────── */
const _sectionLoaders = {
  overview:  loadOverview,
  users:     () => loadUsers(true),
  trades:    () => loadTrades(true),
  disputes:  () => loadDisputes(true),
  reports:   loadReports,
  verify:    loadVerifyQueue,
  shop:      () => loadShop(true),
  premium:   () => loadPremium(true),
  settings:  loadSettings,
};

/* Hook into existing admShowSec */
(function () {
  const origShowSec = window.admShowSec;
  window.admShowSec = function (sec) {
    if (typeof origShowSec === 'function') origShowSec(sec);
    const loader = _sectionLoaders[sec];
    if (loader) loader();
  };
})();

/* ─────────────────────────────────────────────────────────────
   USER SEARCH DEBOUNCE
───────────────────────────────────────────────────────────── */
window.admUserSearchInput = function (value) {
  clearTimeout(_userSearchTimer);
  _userSearch = value;
  _userSearchTimer = setTimeout(() => loadUsers(true), 400);
};

/* ─────────────────────────────────────────────────────────────
   LOAD MORE HANDLERS
───────────────────────────────────────────────────────────── */
window.admLoadMoreUsers     = function () { _userPage++;    loadUsers();    };
window.admLoadMoreTrades    = function () { _tradePage++;   loadTrades();   };
window.admLoadMoreDisputes  = function () { _disputePage++; loadDisputes(); };
window.admLoadMoreShop      = function () { _shopPage++;    loadShop();     };
window.admLoadMorePremium   = function () { _premPage++;    loadPremium();  };

/* ─────────────────────────────────────────────────────────────
   ADMIN INIT — called after doAdminLogin succeeds
───────────────────────────────────────────────────────────── */
window.initAdminPanel = function () {
  // Wire search input
  const searchInput = document.getElementById('adm-user-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      admUserSearchInput(this.value.trim());
    });
  }

  // Wire user filter buttons
  document.querySelectorAll('#as-users .adm-user-filter-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('#as-users .adm-user-filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      _userFilter = this.dataset.filter || 'all';
      loadUsers(true);
    });
  });

  // Wire trade status filter
  document.querySelectorAll('#as-trades .adm-trade-filter-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('#as-trades .adm-trade-filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      _tradeStatusFilter = this.dataset.filter || 'all';
      loadTrades(true);
    });
  });

  // Load the active section (overview is default)
  loadOverview();

  // Auto-refresh overview every 30s
  window._adminRefreshInterval = setInterval(() => {
    const activeTab = document.querySelector('#admTabs .atab.on');
    const sec = activeTab?.dataset.as || 'overview';
    const loader = _sectionLoaders[sec];
    if (loader && document.getElementById('adm')?.classList.contains('on')) loader();
  }, 30000);
};

/* Patch doAdminLogin to call initAdminPanel */
(function () {
  const origLogin = window.doAdminLogin;
  window.doAdminLogin = async function () {
    await origLogin.apply(this, arguments);
    // Wait a tick so AppApi.accessToken is set
    setTimeout(() => {
      if (document.getElementById('adm')?.classList.contains('on')) {
        window.initAdminPanel();
      }
    }, 200);
  };
})();