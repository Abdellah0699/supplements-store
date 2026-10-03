/**
 * locations.js — wilaya / commune browser.
 * Data mirrors the Phase 2 locations schema (wilayas + communes).
 */
(async function () {
  'use strict';

  const U = window.AdminUtils;
  const C = window.Components;

  const content = await window.AdminLayout.init({
    active: 'locations',
    title: 'Locations',
    subtitle: 'Browse wilayas and their communes — same data the checkout uses.',
  });

  const state = {
    wilayas: [],
    wilayaSearch: '',
    communeSearch: '',
    selectedWilayaId: null,
    communes: [],
  };

  content.insertAdjacentHTML('beforeend', `
    <div class="two-col" style="grid-template-columns:1fr 1.4fr;">
      <div class="card">
        <div class="card-head"><h2>Wilayas</h2><span id="wilaya-count" style="font-size:12.5px;color:var(--admin-faint);"></span></div>
        <div class="card-body" style="padding-bottom:0;">
          <div class="toolbar" role="search" style="margin-bottom:12px;">
            <input class="input search-input" id="w-search" type="search"
                   placeholder="Search wilaya…" aria-label="Search wilayas" style="max-width:none;flex:1;">
          </div>
        </div>
        <div id="wilaya-list" aria-live="polite" style="max-height:560px;overflow-y:auto;"></div>
      </div>
      <div class="card">
        <div class="card-head"><h2 id="commune-title">Communes</h2><span id="commune-count" style="font-size:12.5px;color:var(--admin-faint);"></span></div>
        <div class="card-body" style="padding-bottom:0;">
          <div class="toolbar" role="search" style="margin-bottom:12px;">
            <input class="input search-input" id="c-search" type="search"
                   placeholder="Search communes…" aria-label="Search communes" style="max-width:none;flex:1;" disabled>
          </div>
        </div>
        <div id="commune-list" aria-live="polite" style="max-height:560px;overflow-y:auto;"></div>
      </div>
    </div>`);

  const wilayaListEl = document.getElementById('wilaya-list');
  const communeListEl = document.getElementById('commune-list');
  const wilayaSearchInput = document.getElementById('w-search');
  const communeSearchInput = document.getElementById('c-search');

  async function loadWilayas() {
    wilayaListEl.innerHTML = C.loadingBlock('Loading wilayas…');
    try {
      state.wilayas = await window.AdminAPI.listWilayas({
        search: state.wilayaSearch || undefined,
      });
      renderWilayas();
    } catch (err) {
      wilayaListEl.innerHTML = C.errorBlock({ message: err.message || 'Could not load wilayas.' });
      const btn = wilayaListEl.querySelector('[data-retry]');
      if (btn) btn.addEventListener('click', loadWilayas);
    }
  }

  function renderWilayas() {
    document.getElementById('wilaya-count').textContent =
      `${state.wilayas.length} wilaya${state.wilayas.length === 1 ? '' : 's'}`;

    if (!state.wilayas.length) {
      wilayaListEl.innerHTML = C.emptyBlock({
        icon: '📍', title: 'No wilayas found', message: 'Try a different search.',
      });
      return;
    }

    wilayaListEl.innerHTML = `
      <table class="admin-table">
        <tbody>
          ${state.wilayas.map((w) => `
          <tr>
            <td style="width:100%;">
              <button type="button" class="btn-link" data-wilaya="${U.escapeHtml(w.id)}"
                      style="text-align:left;width:100%;display:flex;justify-content:space-between;align-items:center;gap:8px;${w.id === state.selectedWilayaId ? 'color:var(--admin-gold);' : ''}">
                <span><strong>${U.escapeHtml(w.id)}</strong> — ${U.escapeHtml(w.name)}</span>
                <span class="p-sub">${w.communeCount} communes</span>
              </button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>`;

    wilayaListEl.querySelectorAll('[data-wilaya]').forEach((b) =>
      b.addEventListener('click', () => selectWilaya(b.dataset.wilaya))
    );
  }

  async function selectWilaya(wilayaId) {
    state.selectedWilayaId = wilayaId;
    state.communeSearch = '';
    communeSearchInput.value = '';
    communeSearchInput.disabled = false;
    renderWilayas();
    await loadCommunes();
  }

  async function loadCommunes() {
    const wilaya = state.wilayas.find((w) => w.id === state.selectedWilayaId);
    document.getElementById('commune-title').textContent =
      wilaya ? `Communes — ${wilaya.name}` : 'Communes';
    communeListEl.innerHTML = C.loadingBlock('Loading communes…');
    try {
      state.communes = await window.AdminAPI.getCommunes(state.selectedWilayaId, {
        search: state.communeSearch || undefined,
      });
      renderCommunes();
    } catch (err) {
      communeListEl.innerHTML = C.errorBlock({ message: err.message || 'Could not load communes.' });
      const btn = communeListEl.querySelector('[data-retry]');
      if (btn) btn.addEventListener('click', loadCommunes);
    }
  }

  function renderCommunes() {
    document.getElementById('commune-count').textContent =
      `${state.communes.length} commune${state.communes.length === 1 ? '' : 's'}`;

    if (!state.communes.length) {
      communeListEl.innerHTML = C.emptyBlock({
        icon: '🏘️', title: 'No communes found', message: 'Try a different search.',
      });
      return;
    }

    communeListEl.innerHTML = `
      <table class="admin-table">
        <tbody>
          ${state.communes.map((c) => `
          <tr>
            <td>
              <strong>${U.escapeHtml(c.name)}</strong>
              ${c.nameAr ? `<div class="p-sub">${U.escapeHtml(c.nameAr)}</div>` : ''}
            </td>
            <td class="mono p-sub" style="text-align:right;">${U.escapeHtml(c.id)}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  }

  wilayaSearchInput.addEventListener(
    'input',
    U.debounce(() => {
      state.wilayaSearch = wilayaSearchInput.value.trim();
      loadWilayas();
    }, 300)
  );

  communeSearchInput.addEventListener(
    'input',
    U.debounce(() => {
      state.communeSearch = communeSearchInput.value.trim();
      if (state.selectedWilayaId) loadCommunes();
    }, 300)
  );

  // initial state: prompt to pick a wilaya
  communeListEl.innerHTML = C.emptyBlock({
    icon: '📍',
    title: 'Select a wilaya',
    message: 'Choose a wilaya on the left to browse its communes.',
  });

  loadWilayas();
})();
