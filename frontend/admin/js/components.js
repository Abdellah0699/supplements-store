/**
 * components.js — reusable admin UI components (Phase 3).
 * Depends on: utils.js (window.AdminUtils).
 *
 * Provides:
 *   Components.modal({title, bodyHtml, actions}) / closeModal()
 *   Components.confirm({title, message, confirmLabel, danger}) -> Promise<boolean>
 *   Components.toast(type, title, message)
 *   Components.pagination({page, pageSize, total, totalPages, onPage}) -> html string
 *   Components.bindPagination(rootEl, handler)
 *   Components.loadingBlock(label) / emptyBlock({...}) / errorBlock({message, onRetry})
 *   Components.statusBadge(status) / activeBadge(isActive) / featuredBadge()
 */
(function () {
  'use strict';

  const U = () => window.AdminUtils;
  const esc = (v) => window.AdminUtils.escapeHtml(v);

  /* ---------------- modal ---------------- */

  let modalStack = [];

  function ensureModalRoot() {
    let root = document.getElementById('admin-modal-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'admin-modal-root';
      document.body.appendChild(root);
    }
    return root;
  }

  /**
   * Open a modal. actions: [{ label, kind: 'primary'|'danger'|'', onClick(close) }]
   * Returns a close() function.
   */
  function openModal({ title, bodyHtml, actions = [], wide = false, onClose } = {}) {
    const root = ensureModalRoot();
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal${wide ? ' modal-lg' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <div class="modal-head">
          <h2>${esc(title)}</h2>
          <button type="button" class="modal-close" aria-label="Close dialog">&times;</button>
        </div>
        <div class="modal-body"></div>
        <div class="modal-foot"></div>
      </div>`;
    backdrop.querySelector('.modal-body').innerHTML = bodyHtml || '';
    const foot = backdrop.querySelector('.modal-foot');

    const entry = { backdrop, onClose, previouslyFocused: document.activeElement };

    function close(result) {
      const i = modalStack.indexOf(entry);
      if (i !== -1) modalStack.splice(i, 1);
      backdrop.classList.remove('open');
      backdrop.remove();
      document.removeEventListener('keydown', onKeyDown, true);
      if (entry.previouslyFocused && entry.previouslyFocused.focus) {
        entry.previouslyFocused.focus();
      }
      if (typeof onClose === 'function') onClose(result);
    }
    entry.close = close;

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close(false);
      }
      // simple focus trap
      if (e.key === 'Tab') {
        const focusables = backdrop.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const list = Array.from(focusables).filter((el) => !el.disabled);
        if (!list.length) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    backdrop.querySelector('.modal-close').addEventListener('click', () => close(false));
    backdrop.addEventListener('mousedown', (e) => {
      if (e.target === backdrop) close(false);
    });

    actions.forEach((a) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn' + (a.kind === 'primary' ? ' btn-primary' : a.kind === 'danger' ? ' btn-danger' : '');
      btn.textContent = a.label;
      btn.addEventListener('click', () => {
        if (typeof a.onClick === 'function') a.onClick(close);
        else close(true);
      });
      foot.appendChild(btn);
    });
    if (!actions.length) foot.remove();

    root.appendChild(backdrop);
    document.addEventListener('keydown', onKeyDown, true);
    modalStack.push(entry);
    // open on next frame so CSS applies
    requestAnimationFrame(() => backdrop.classList.add('open'));
    const firstInput = backdrop.querySelector('input, select, textarea');
    (firstInput || backdrop.querySelector('.modal-close')).focus();
    return close;
  }

  function closeModal() {
    const top = modalStack[modalStack.length - 1];
    if (top) top.close(false);
  }

  /** Promise-based confirmation dialog. Resolves true when confirmed. */
  function confirmDialog({ title = 'Are you sure?', message = '', confirmLabel = 'Confirm', danger = false } = {}) {
    return new Promise((resolve) => {
      openModal({
        title,
        bodyHtml: `<p style="margin:0;color:var(--admin-muted);font-size:14px;">${esc(message)}</p>`,
        actions: [
          { label: 'Cancel', onClick: (close) => { close(false); } },
          {
            label: confirmLabel,
            kind: danger ? 'danger' : 'primary',
            onClick: (close) => { close(true); },
          },
        ],
        onClose: (result) => resolve(result === true),
      });
    });
  }

  /* ---------------- toast ---------------- */

  function ensureToastRegion() {
    let region = document.querySelector('.toast-region');
    if (!region) {
      region = document.createElement('div');
      region.className = 'toast-region';
      region.setAttribute('role', 'status');
      region.setAttribute('aria-live', 'polite');
      document.body.appendChild(region);
    }
    return region;
  }

  function toast(type, title, message, ms) {
    const region = ensureToastRegion();
    const el = document.createElement('div');
    el.className = 'toast' + (type ? ` toast-${type}` : '');
    el.innerHTML = `
      <div>
        <span class="toast-title">${esc(title)}</span>
        ${message ? `<span class="toast-msg">${esc(message)}</span>` : ''}
      </div>`;
    region.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.25s';
      setTimeout(() => el.remove(), 260);
    }, ms || 3600);
  }

  /* ---------------- pagination ---------------- */

  function paginationHtml({ page, pageSize, total, totalPages }) {
    const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const end = Math.min(total, page * pageSize);
    let buttons = '';
    const btn = (p, label, opts = {}) => {
      const cls = 'btn btn-sm' + (opts.current ? ' page-current' : '');
      const dis = opts.disabled ? ' disabled' : '';
      const aria = opts.current ? ' aria-current="page"' : '';
      return `<button type="button" class="${cls}" data-page="${p}"${dis}${aria}>${label}</button>`;
    };
    buttons += btn(page - 1, '&lsaquo; Prev', { disabled: page <= 1 });

    // compact page numbers: 1 … window … last
    const pages = new Set([1, totalPages, page - 1, page, page + 1]);
    const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
    let last = 0;
    for (const p of sorted) {
      if (p - last > 1) buttons += `<span style="color:var(--admin-faint);padding:0 4px;">…</span>`;
      buttons += btn(p, String(p), { current: p === page });
      last = p;
    }

    buttons += btn(page + 1, 'Next &rsaquo;', { disabled: page >= totalPages });

    return `
      <div class="pagination">
        <span>Showing ${start}–${end} of ${total}</span>
        <div class="pagination-controls">${buttons}</div>
      </div>`;
  }

  /** Wire [data-page] buttons inside rootEl to onPage(page). */
  function bindPagination(rootEl, onPage) {
    rootEl.querySelectorAll('[data-page]').forEach((b) => {
      b.addEventListener('click', () => {
        if (b.disabled) return;
        onPage(parseInt(b.dataset.page, 10));
      });
    });
  }

  /* ---------------- loading / empty / error states ---------------- */

  function loadingBlock(label) {
    return `
      <div class="state-block" role="status" aria-live="polite">
        <div class="spinner" aria-hidden="true"></div>
        <p>${esc(label || 'Loading…')}</p>
      </div>`;
  }

  function skeletonRows(count) {
    let rows = '';
    for (let i = 0; i < (count || 5); i++) {
      rows += `<tr><td colspan="8"><span class="skeleton" style="width:${88 - i * 7}%"></span></td></tr>`;
    }
    return `<div class="table-wrap"><table class="admin-table"><tbody>${rows}</tbody></table></div>`;
  }

  function emptyBlock({ icon = '📦', title = 'Nothing here yet', message = '', actionHtml = '' } = {}) {
    return `
      <div class="state-block">
        <span class="state-icon" aria-hidden="true">${icon}</span>
        <h3>${esc(title)}</h3>
        ${message ? `<p>${esc(message)}</p>` : ''}
        ${actionHtml || ''}
      </div>`;
  }

  function errorBlock({ message = 'Something went wrong.', retryLabel = 'Try again' } = {}) {
    return `
      <div class="state-block" role="alert">
        <span class="state-icon" aria-hidden="true">⚠️</span>
        <h3>Couldn't load this content</h3>
        <p>${esc(message)}</p>
        <button type="button" class="btn" data-retry>${esc(retryLabel)}</button>
      </div>`;
  }

  /* ---------------- badges ---------------- */

  function statusBadge(status) {
    const u = U();
    return `<span class="badge ${u.statusBadgeClass(status)}">${esc(u.statusLabel(status))}</span>`;
  }

  function activeBadge(isActive) {
    return isActive
      ? `<span class="badge badge-active">Active</span>`
      : `<span class="badge badge-inactive">Inactive</span>`;
  }

  function featuredBadge() {
    return `<span class="badge badge-featured">Featured</span>`;
  }

  /* ---------------- form helpers ---------------- */

  /** Mark a field invalid and show its error text. container: the .form-field element. */
  function setFieldError(inputEl, message) {
    const field = inputEl.closest('.form-field');
    inputEl.setAttribute('aria-invalid', 'true');
    let err = field ? field.querySelector('.field-error') : null;
    if (!err && field) {
      err = document.createElement('span');
      err.className = 'field-error';
      err.setAttribute('role', 'alert');
      field.appendChild(err);
    }
    if (err) err.textContent = message || '';
  }

  function clearFieldError(inputEl) {
    inputEl.removeAttribute('aria-invalid');
    const field = inputEl.closest('.form-field');
    const err = field ? field.querySelector('.field-error') : null;
    if (err) err.remove();
  }

  function clearAllFieldErrors(formEl) {
    formEl.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
    // remove per-field errors, but keep the form-level #form-error banner
    formEl.querySelectorAll('.field-error:not(#form-error)').forEach((el) => el.remove());
    const banner = formEl.querySelector('#form-error');
    if (banner) banner.style.display = 'none';
  }

  window.Components = {
    modal: openModal,
    closeModal,
    confirm: confirmDialog,
    toast,
    paginationHtml,
    bindPagination,
    loadingBlock,
    skeletonRows,
    emptyBlock,
    errorBlock,
    statusBadge,
    activeBadge,
    featuredBadge,
    setFieldError,
    clearFieldError,
    clearAllFieldErrors,
  };
})();
