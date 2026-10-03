/**
 * orders.js — order list with search, status filter, pagination.
 * Row click opens the order detail page.
 */
(async function () {
  'use strict';

  const U = window.AdminUtils;
  const C = window.Components;

  const content = await window.AdminLayout.init({
    active: 'orders',
    title: 'Orders',
    subtitle: 'Customer orders with delivery and payment details.',
  });

  const state = { search: '', status: '', page: 1, pageSize: 10 };

  content.insertAdjacentHTML('beforeend', `
    <div class="card">
      <div class="card-body" style="padding-bottom:0;">
        <div class="toolbar" role="search">
          <input class="input search-input" id="o-search" type="search"
                 placeholder="Search reference, name, phone…" aria-label="Search orders">
          <select class="select" id="o-status" aria-label="Filter by status">
            <option value="">All statuses</option>
            ${U.ORDER_STATUSES.map((s) => `<option value="${s}">${U.statusLabel(s)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div id="orders-result" aria-live="polite"></div>
    </div>`);

  const resultEl = document.getElementById('orders-result');
  const searchInput = document.getElementById('o-search');
  const statusSelect = document.getElementById('o-status');

  async function load() {
    resultEl.innerHTML = C.skeletonRows(6);
    try {
      const data = await window.AdminAPI.listOrders({
        search: state.search || undefined,
        status: state.status || undefined,
        page: state.page,
        pageSize: state.pageSize,
      });
      render(data);
    } catch (err) {
      resultEl.innerHTML = C.errorBlock({ message: err.message || 'Could not load orders.' });
      const btn = resultEl.querySelector('[data-retry]');
      if (btn) btn.addEventListener('click', load);
    }
  }

  function render(data) {
    if (!data.items.length) {
      const hasFilters = state.search || state.status;
      resultEl.innerHTML = C.emptyBlock({
        icon: '🧾',
        title: 'No orders found',
        message: hasFilters
          ? 'Try adjusting your search or filters.'
          : 'New customer orders will appear here.',
        actionHtml: hasFilters
          ? `<button type="button" class="btn" id="clear-filters">Clear filters</button>`
          : '',
      });
      const clear = document.getElementById('clear-filters');
      if (clear) clear.addEventListener('click', resetFilters);
      return;
    }

    resultEl.innerHTML = `
      <div class="table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Customer</th>
              <th>Phone</th>
              <th>Wilaya</th>
              <th class="num">Items</th>
              <th class="num">Total</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.map((o) => `
            <tr>
              <td><a href="order-detail.html?id=${encodeURIComponent(o.id)}" class="mono">${U.escapeHtml(o.order_reference)}</a></td>
              <td>${U.escapeHtml(o.customer_full_name || o.customer_first_name)}</td>
              <td class="mono" style="white-space:nowrap;">${U.escapeHtml(o.customer_phone)}</td>
              <td>${U.escapeHtml(o.wilaya_name || '—')}</td>
              <td class="num">${o.total_quantity ?? 0}</td>
              <td class="num"><strong>${U.formatDA(o.total)}</strong></td>
              <td>${C.statusBadge(o.status)}</td>
              <td style="white-space:nowrap;">${U.formatDateShort(o.created_at)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      ${C.paginationHtml(data)}`;

    C.bindPagination(resultEl, (page) => {
      state.page = page;
      load();
      resultEl.scrollIntoView({ block: 'nearest' });
    });
  }

  function resetFilters() {
    state.search = '';
    state.status = '';
    state.page = 1;
    searchInput.value = '';
    statusSelect.value = '';
    load();
  }

  searchInput.addEventListener(
    'input',
    U.debounce(() => {
      state.search = searchInput.value.trim();
      state.page = 1;
      load();
    }, 300)
  );
  statusSelect.addEventListener('change', () => {
    state.status = statusSelect.value;
    state.page = 1;
    load();
  });

  load();
})();
