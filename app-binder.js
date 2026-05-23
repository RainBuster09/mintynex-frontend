/* ============================================================
   MINTYNEX — BINDER SYSTEM  (app-binder.js)
   Full binder management: load cards from API, pagination,
   add card modal with image upload, edit/delete cards.
   BUG FIX: Was completely disconnected from API.
   ============================================================ */

(function() {

  /* ── State ── */
  let _binderCards   = [];
  let _binderPage    = 0;
  let _binderTotal   = 0;
  const PAGE_SIZE    = 9;        // 3×3 grid
  let _totalPages    = 1;

  /* ════════════════════════════════════════════════════════
     LOAD BINDER FROM API
  ════════════════════════════════════════════════════════ */
  async function loadBinder(reset = false) {
    if (reset) { _binderPage = 0; _binderCards = []; }

    const grid = document.getElementById('binderGrid');
    if (grid && reset) grid.innerHTML = '<div style="color:#80848e;font-size:12px;padding:16px;text-align:center">Loading…</div>';

    try {
      if (typeof AppApi !== 'undefined') {
        const res = await AppApi.binder.get(_binderPage, PAGE_SIZE);
        if (res.ok && res.data) {
          _binderCards = res.data.content || [];
          _binderTotal = res.data.totalElements || 0;
          _totalPages  = res.data.totalPages || 1;
          renderBinder();
          await loadBinderStats();
          return;
        }
      }
    } catch(e) {
      console.warn('Binder load error:', e);
    }

    // Demo data for offline/dev
    _binderCards = getDemoCards();
    _binderTotal = _binderCards.length;
    _totalPages  = 1;
    renderBinder();
  }

  async function loadBinderStats() {
    try {
      if (typeof AppApi === 'undefined') return;
      const res = await AppApi.binder.stats();
      if (res.ok && res.data) {
        const s = res.data;
        // Update stat boxes
        updateStatEl('binderStatTotal', s.total);
        updateStatEl('binderStatPsa',   s.psa);
        updateStatEl('binderStatBgs',   s.bgs);
        // Update header card count
        const hdrCards = document.querySelector('#pg-binder [id="binderCardCount"]');
        if (hdrCards) hdrCards.textContent = s.total;
      }
    } catch(_) {}
  }

  function updateStatEl(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  /* ════════════════════════════════════════════════════════
     RENDER GRID
  ════════════════════════════════════════════════════════ */
  function renderBinder() {
    const grid = document.getElementById('binderGrid');
    const pgLbl = document.getElementById('pgLbl');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (pgLbl) pgLbl.textContent = `Page ${_binderPage + 1} of ${_totalPages || 1}`;
    if (prevBtn) prevBtn.disabled = _binderPage <= 0;
    if (nextBtn) nextBtn.disabled = _binderPage >= _totalPages - 1;

    if (!grid) return;
    grid.innerHTML = '';

    if (_binderCards.length === 0) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:32px 16px;color:#80848e">
          <div style="font-size:28px;margin-bottom:8px">📦</div>
          <div style="font-size:13px;font-weight:600;margin-bottom:4px">No cards yet</div>
          <div style="font-size:11px">Tap <strong>Add Card</strong> to start your binder</div>
        </div>
      `;
      return;
    }

    _binderCards.forEach((card, i) => {
      const el = buildBinderCardEl(card, i);
      grid.appendChild(el);
    });
  }

  function buildBinderCardEl(card, idx) {
    const slot = document.createElement('div');
    slot.className = 'binder-slot';
    slot.style.cssText = `
      position:relative; border-radius:10px; overflow:hidden;
      background:#1e1f22; border:1px solid rgba(255,255,255,.08);
      aspect-ratio:2/3; cursor:pointer; transition:transform .15s;
      display:flex; flex-direction:column; align-items:center; justify-content:center;
    `;

    const img = card.imageUrl
      ? `<img src="${h(card.imageUrl)}" alt="${h(card.cardName)}" loading="lazy"
             style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0"
             onerror="this.style.display='none'"/>`
      : `<div style="font-size:28px;margin-bottom:6px">🃏</div>`;

    const grade = card.grade
      ? `<span class="bdg bdg-g" style="font-size:8px">${h(card.gradeCompany || '')} ${h(card.grade)}</span>`
      : '';

    slot.innerHTML = `
      ${img}
      <div style="position:absolute;inset:0;background:linear-gradient(transparent 50%,rgba(0,0,0,.85));pointer-events:none"></div>
      <div style="position:absolute;bottom:0;left:0;right:0;padding:6px 7px">
        <div style="font-size:9px;font-weight:700;color:#fff;line-height:1.2;margin-bottom:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
          ${h(card.cardName)}
        </div>
        <div style="display:flex;gap:3px;align-items:center;flex-wrap:wrap">
          ${grade}
          ${card.cardSet ? `<span style="font-size:8px;color:#80848e">${h(card.cardSet)}</span>` : ''}
        </div>
      </div>
      <div style="position:absolute;top:4px;right:4px;display:flex;flex-direction:column;gap:2px" class="card-actions">
        <button title="Edit" data-action="editcard" data-idx="${idx}"
          style="background:rgba(0,0,0,.6);border:none;border-radius:4px;width:22px;height:22px;color:#fff;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center">✏️</button>
        <button title="Remove" data-action="removecard" data-idx="${idx}"
          style="background:rgba(237,66,69,.7);border:none;border-radius:4px;width:22px;height:22px;color:#fff;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center">🗑️</button>
      </div>
    `;

    slot.addEventListener('mouseenter', () => slot.style.transform = 'scale(1.03)');
    slot.addEventListener('mouseleave', () => slot.style.transform = 'scale(1)');

    // Delegate action buttons
    slot.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const i = parseInt(btn.dataset.idx);
      if (btn.dataset.action === 'editcard')   openEditCardModal(_binderCards[i]);
      if (btn.dataset.action === 'removecard') confirmRemoveCard(_binderCards[i]);
    });

    return slot;
  }

  /* ════════════════════════════════════════════════════════
     PAGINATION — BUG FIX: buttons were rendered but not wired
  ════════════════════════════════════════════════════════ */
  function initPagination() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (prevBtn) {
      prevBtn.onclick = async () => {
        if (_binderPage > 0) { _binderPage--; await loadBinder(); }
      };
    }
    if (nextBtn) {
      nextBtn.onclick = async () => {
        if (_binderPage < _totalPages - 1) { _binderPage++; await loadBinder(); }
      };
    }
  }

  /* ════════════════════════════════════════════════════════
     ADD CARD MODAL — BUG FIX: openAddCardModal was called but didn't exist
  ════════════════════════════════════════════════════════ */
  let _pendingCardImageFile = null;
  let _pendingCardImageUrl  = null;
  let _editingCardId        = null;

  window.openAddCardModal = function() {
    _editingCardId       = null;
    _pendingCardImageFile = null;
    _pendingCardImageUrl  = null;
    buildAndShowCardModal('Add Card to Binder', {});
  };

  function openEditCardModal(card) {
    _editingCardId       = card.id;
    _pendingCardImageFile = null;
    _pendingCardImageUrl  = card.imageUrl || null;
    buildAndShowCardModal('Edit Card', card);
  }

  function buildAndShowCardModal(title, card) {
    let modal = document.getElementById('addCardModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'addCardModal';
      modal.style.cssText = `position:fixed;inset:0;z-index:8000;background:rgba(0,0,0,.7);
        display:flex;align-items:flex-end;justify-content:center;padding:0`;
      document.body.appendChild(modal);
      modal.addEventListener('click', e => { if (e.target === modal) closeCardModal(); });
    }

    modal.innerHTML = `
      <div style="background:#2b2d31;border-radius:16px 16px 0 0;width:100%;max-width:520px;padding:20px;
                  max-height:90vh;overflow-y:auto;animation:slideUp .25s ease">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <div style="font-weight:800;font-size:16px;color:#fff">${h(title)}</div>
          <button onclick="closeCardModal()" style="background:none;border:none;color:#80848e;font-size:20px;cursor:pointer">✕</button>
        </div>

        <!-- Image area -->
        <div id="cardImgArea" onclick="pickCardImage()"
          style="width:100%;aspect-ratio:2/3;max-height:200px;background:#1e1f22;border:2px dashed rgba(255,255,255,.1);
                 border-radius:12px;display:flex;align-items:center;justify-content:center;cursor:pointer;
                 margin-bottom:14px;overflow:hidden;position:relative">
          ${_pendingCardImageUrl
            ? `<img src="${h(_pendingCardImageUrl)}" style="width:100%;height:100%;object-fit:cover"/>`
            : `<div style="text-align:center;color:#80848e">
                 <div style="font-size:28px;margin-bottom:6px">📷</div>
                 <div style="font-size:12px">Tap to add card image</div>
               </div>`}
        </div>
        <input type="file" id="cardImageInput" accept="image/*" style="display:none"/>

        <div class="fg"><label class="fl">Card Name *</label>
          <input class="fi" id="cardNameIn" placeholder="e.g. Charizard VMAX" value="${h(card.cardName||'')}"/></div>
        <div class="fg"><label class="fl">Set</label>
          <input class="fi" id="cardSetIn" placeholder="e.g. Darkness Ablaze" value="${h(card.cardSet||'')}"/></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div class="fg"><label class="fl">Grade</label>
            <input class="fi" id="cardGradeIn" placeholder="e.g. 10" value="${h(card.grade||'')}"/></div>
          <div class="fg"><label class="fl">Grader</label>
            <select class="fi" id="cardGraderIn">
              <option value="">None</option>
              ${['PSA','BGS','CGC','SGC','ACE'].map(g =>
                `<option value="${g}" ${card.gradeCompany===g?'selected':''}>${g}</option>`
              ).join('')}
            </select></div>
        </div>
        <div class="fg"><label class="fl">Card Type</label>
          <input class="fi" id="cardTypeIn" placeholder="e.g. VMAX, V, Full Art" value="${h(card.cardType||'')}"/></div>
        <div class="fg"><label class="fl">Notes</label>
          <textarea class="fi" id="cardNotesIn" rows="2" placeholder="Condition, purchase price, etc…">${h(card.notes||'')}</textarea></div>

        <div style="display:flex;gap:8px;margin-top:4px">
          <button class="btn bgh bfw" onclick="closeCardModal()">Cancel</button>
          <button class="btn bg bfw" id="saveCardBtn" onclick="saveCard()">
            ${_editingCardId ? 'Save Changes' : 'Add to Binder'}
          </button>
        </div>
      </div>
    `;

    modal.style.display = 'flex';

    // Wire up image input
    const imgIn = modal.querySelector('#cardImageInput');
    imgIn.addEventListener('change', function() {
      const file = this.files[0]; if (!file) return;
      this.value = '';
      _pendingCardImageFile = file;
      _pendingCardImageUrl  = URL.createObjectURL(file);
      const area = document.getElementById('cardImgArea');
      if (area) area.innerHTML = `<img src="${_pendingCardImageUrl}" style="width:100%;height:100%;object-fit:cover"/>`;
    });
  }

  window.pickCardImage = function() {
    const inp = document.getElementById('cardImageInput');
    if (inp) inp.click();
  };

  window.closeCardModal = function() {
    const modal = document.getElementById('addCardModal');
    if (modal) modal.style.display = 'none';
    _pendingCardImageFile = null;
    _pendingCardImageUrl  = null;
    _editingCardId        = null;
  };

  /* ── Save Card ── */
  window.saveCard = async function() {
    const name    = document.getElementById('cardNameIn')?.value.trim();
    const set     = document.getElementById('cardSetIn')?.value.trim();
    const grade   = document.getElementById('cardGradeIn')?.value.trim();
    const grader  = document.getElementById('cardGraderIn')?.value;
    const type    = document.getElementById('cardTypeIn')?.value.trim();
    const notes   = document.getElementById('cardNotesIn')?.value.trim();
    const btn     = document.getElementById('saveCardBtn');

    if (!name) { showToast('Card name is required', 'red'); return; }
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

    try {
      let imageUrl = _pendingCardImageUrl && !_pendingCardImageUrl.startsWith('blob:')
        ? _pendingCardImageUrl : null;

      // Upload image if a new file was chosen
      if (_pendingCardImageFile && typeof AppApi !== 'undefined') {
        const fd = new FormData();
        fd.append('file', _pendingCardImageFile);
        const imgRes = await AppApi.binder.uploadImage(fd);
        if (imgRes.ok && imgRes.data?.url) imageUrl = imgRes.data.url;
      }

      const body = { cardName: name, cardSet: set, grade, gradeCompany: grader, cardType: type, notes, imageUrl };

      let res;
      if (_editingCardId) {
        res = await AppApi.binder.update(_editingCardId, body);
      } else {
        res = await AppApi.binder.add(body);
      }

      if (res && res.ok && res.data) {
        closeCardModal();
        await loadBinder(true);
        showToast(_editingCardId ? 'Card updated! ✓' : 'Card added to binder! ✓', 'grn');
      } else {
        // Offline fallback — add locally for demo
        const demo = { id: Date.now(), cardName: name, cardSet: set, grade, gradeCompany: grader,
                       cardType: type, notes, imageUrl: _pendingCardImageUrl || null };
        if (_editingCardId) {
          const i = _binderCards.findIndex(c => c.id === _editingCardId);
          if (i !== -1) _binderCards[i] = demo;
        } else {
          _binderCards.unshift(demo);
        }
        renderBinder();
        closeCardModal();
        showToast(_editingCardId ? 'Card updated!' : 'Card added!', 'grn');
      }
    } catch(e) {
      console.error('saveCard error:', e);
      showToast('Save failed', 'red');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = _editingCardId ? 'Save Changes' : 'Add to Binder'; }
    }
  };

  /* ── Remove Card ── */
  async function confirmRemoveCard(card) {
    if (!confirm(`Remove "${card.cardName}" from your binder?`)) return;
    try {
      if (typeof AppApi !== 'undefined') {
        const res = await AppApi.binder.remove(card.id);
        if (!res.ok) { showToast('Remove failed', 'red'); return; }
      } else {
        _binderCards = _binderCards.filter(c => c.id !== card.id);
      }
      await loadBinder(true);
      showToast('Card removed', 'grn');
    } catch(e) {
      showToast('Remove failed', 'red');
    }
  }

  /* ── Demo cards for offline mode ── */
  function getDemoCards() {
    return [
      { id: 1, cardName: 'Charizard VMAX', cardSet: 'Darkness Ablaze', grade: '10', gradeCompany: 'PSA',
        imageUrl: 'https://images.pokemontcg.io/swsh45/19_hires.png', cardType: 'VMAX' },
      { id: 2, cardName: 'Lugia V Alt Art', cardSet: 'Silver Tempest', grade: '9.5', gradeCompany: 'BGS',
        imageUrl: 'https://images.pokemontcg.io/swsh10/186_hires.png', cardType: 'V' },
      { id: 3, cardName: 'Umbreon VMAX Alt Art', cardSet: 'Evolving Skies', grade: '9', gradeCompany: 'PSA',
        imageUrl: 'https://images.pokemontcg.io/swsh6/215_hires.png', cardType: 'VMAX' },
    ];
  }

  function h(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── Init ── */
  document.addEventListener('DOMContentLoaded', () => {
    initPagination();

    // Load binder when navigating to binder page
    document.addEventListener('pageChange', e => {
      if (e.detail === 'binder') loadBinder(true);
    });
  });

  window.MXBinder = { load: loadBinder };

})();
