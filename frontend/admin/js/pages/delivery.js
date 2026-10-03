/**
 * delivery.js — delivery fee management per wilaya and method.
 * Fees are PLACEHOLDER values in Phase 3 (mirrors the backend seed note).
 */
(async function () {
  'use strict';

  const U = window.AdminUtils;
  const C = window.Components;

  const content = await window.AdminLayout.init({
    active: 'delivery',
    title: 'Delivery fees',
    subtitle: 'Set per-wilaya fees for home delivery and pickup point. Current values are placeholders.',
  });

  content.insertAdjacentHTML('beforeend', `
    <div class="card">
      <div class="card-body" style="padding-bottom:0;">
        <div class="toolbar" role="search">
          <input class="input search-input" id="d-search" type="search"
                 placeholder="Search wilaya…" aria-label="Search wilayas">
          <div class="toolbar-spacer"></div>
          <span style="font-size:12.5px;color:var(--admin-faint);">All fees in DA</span>
        </div>
      </div>
      <div id="delivery-result" aria-live="polite"></div>
    </div>`);

  const resultEl = document.getElementById('delivery-result');
  const searchInput = document.getElementById('d-search');
  let fees = [];

  async function load() {
    resultEl.innerHTML = C.skeletonRows(8);
    try {
      fees = await window.AdminAPI.listDeliveryFees({
        search: searchInput.value.trim() || undefined,
      });
      render();
    } catch (err) {
      resultEl.innerHTML = C.errorBlock({ message: err.message || 'Could not load delivery fees.' });
      const btn = resultEl.querySelector('[data-retry]');
      if (btn) btn.addEventListener('click', load);
    }
  }

  function render() {
    if (!fees.length) {
      resultEl.innerHTML = C.emptyBlock({
        icon: '🚚',
        title: 'No wilayas found',
        message: 'Try a different search.',
      });
      return;
    }

    resultEl.innerHTML = `
      <div class="table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Wilaya</th>
              <th class="num">Home delivery</th>
              <th class="num">Pickup point</th>
              <th>Status</th>
              <th style="text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${fees.map((f) => `
            <tr>
              <td><strong>${U.escapeHtml(f.wilayaName)}</strong> <span class="p-sub mono">${U.escapeHtml(f.wilayaId)}</span></td>
              <td class="num">${U.formatDA(f.homeDelivery)}</td>
              <td class="num">${U.formatDA(f.pickupPoint)}</td>
              <td>${C.activeBadge(f.isActive)}</td>
              <td>
                <div class="table-actions">
                  <button type="button" class="btn btn-sm" data-edit="${U.escapeHtml(f.wilayaId)}">Edit fees</button>
                  <button type="button" class="btn btn-sm" data-toggle="${U.escapeHtml(f.wilayaId)}" data-active="${f.isActive ? '1' : '0'}">
                    ${f.isActive ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

    resultEl.querySelectorAll('[data-edit]').forEach((b) =>
      b.addEventListener('click', () => {
        const fee = fees.find((f) => f.wilayaId === b.dataset.edit);
        if (fee) openFeeModal(fee);
      })
    );
    resultEl.querySelectorAll('[data-toggle]').forEach((b) =>
      b.addEventListener('click', () => onToggle(b.dataset.toggle, b.dataset.active === '1'))
    );
  }

  function openFeeModal(fee) {
    const close = C.modal({
      title: `Delivery fees — ${fee.wilayaName}`,
      bodyHtml: `
        <form id="fee-form" novalidate>
          <div class="form-grid" style="grid-template-columns:1fr;">
            <div class="form-field">
              <label for="ff-home">Home delivery fee (DA) *</label>
              <input class="input" id="ff-home" type="number" min="0" step="1" required
                     value="${fee.homeDelivery}">
            </div>
            <div class="form-field">
              <label for="ff-pickup">Pickup point fee (DA) *</label>
              <input class="input" id="ff-pickup" type="number" min="0" step="1" required
                     value="${fee.pickupPoint}">
              <span class="hint">Usually 0 — pickup is free.</span>
            </div>
          </div>
          <p class="field-error" id="ff-error" role="alert" style="display:none;"></p>
        </form>`,
      actions: [
        { label: 'Cancel', onClick: (c) => c(false) },
        { label: 'Save fees', kind: 'primary', onClick: (c) => submitFeeForm(c, fee) },
      ],
    });

    document.getElementById('fee-form').addEventListener('submit', (e) => {
      e.preventDefault();
      submitFeeForm(close, fee);
    });
  }

  async function submitFeeForm(close, fee) {
    const homeInput = document.getElementById('ff-home');
    const pickupInput = document.getElementById('ff-pickup');
    const errorEl = document.getElementById('ff-error');
    errorEl.style.display = 'none';
    C.clearFieldError(homeInput);
    C.clearFieldError(pickupInput);

    const home = Number(homeInput.value);
    const pickup = Number(pickupInput.value);
    let ok = true;
    if (!Number.isFinite(home) || home < 0) {
      C.setFieldError(homeInput, 'Enter a valid fee (0 or more).');
      ok = false;
    }
    if (!Number.isFinite(pickup) || pickup < 0) {
      C.setFieldError(pickupInput, 'Enter a valid fee (0 or more).');
      ok = false;
    }
    if (!ok) return;

    try {
      await window.AdminAPI.updateDeliveryFee(fee.wilayaId, 'home_delivery', home);
      await window.AdminAPI.updateDeliveryFee(fee.wilayaId, 'pickup_point', pickup);
      C.toast('success', 'Fees updated', fee.wilayaName);
      close(true);
      await load();
    } catch (err) {
      errorEl.textContent = err.message || 'Could not save the fees.';
      errorEl.style.display = 'block';
    }
  }

  async function onToggle(wilayaId, currentlyActive) {
    const fee = fees.find((f) => f.wilayaId === wilayaId);
    const action = currentlyActive ? 'disable' : 'enable';
    const ok = await C.confirm({
      title: `${currentlyActive ? 'Disable' : 'Enable'} delivery?`,
      message: `This will ${action} all delivery to ${fee ? fee.wilayaName : wilayaId}.`,
      confirmLabel: currentlyActive ? 'Disable' : 'Enable',
      danger: currentlyActive,
    });
    if (!ok) return;
    try {
      await window.AdminAPI.setDeliveryActive(wilayaId, !currentlyActive);
      C.toast('success', `Delivery ${currentlyActive ? 'disabled' : 'enabled'}`, fee ? fee.wilayaName : '');
      await load();
    } catch (err) {
      C.toast('error', 'Update failed', err.message);
    }
  }

  searchInput.addEventListener(
    'input',
    U.debounce(() => load(), 300)
  );

  load();
})();
