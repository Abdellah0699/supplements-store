/**
 * dashboard.js — admin overview page.
 * Stats and recent orders come from AdminAPI.getDashboardStats().
 */
(async function () {
  'use strict';

  const U = window.AdminUtils;
  const C = window.Components;

  const content = await window.AdminLayout.init({
    active: 'dashboard',
    title: 'Dashboard',
    subtitle: 'Live numbers from your store database.',
  });

  async function load() {
    content.innerHTML = `
      <div class="stat-grid" aria-busy="true">
        ${'<div class="card stat-card"><span class="skeleton" style="width:60%"></span><div style="height:10px"></div><span class="skeleton" style="width:40%"></span></div>'.repeat(4)}
      </div>
      <div class="card"><div class="card-body">${C.loadingBlock('Loading dashboard…')}</div></div>`;

    try {
      const stats = await window.AdminAPI.getDashboardStats();
      render(stats);
    } catch (err) {
      content.innerHTML = C.errorBlock({
        message: err.message || 'Could not load dashboard statistics.',
      });
      bindRetry();
    }
  }

  function bindRetry() {
    const btn = content.querySelector('[data-retry]');
    if (btn) btn.addEventListener('click', load);
  }

  function render(stats) {
    const maxStatus = Math.max(1, ...stats.ordersByStatus.map((s) => s.count));

    content.innerHTML = `
      <div class="stat-grid">
        <div class="card stat-card">
          <div class="stat-label">Total orders</div>
          <div class="stat-value">${stats.totalOrders}</div>
          <div class="stat-sub">All time</div>
        </div>
        <div class="card stat-card">
          <div class="stat-label">Pending orders</div>
          <div class="stat-value">${stats.pendingOrders}</div>
          <div class="stat-sub">Need attention</div>
        </div>
        <div class="card stat-card">
          <div class="stat-label">Products</div>
          <div class="stat-value">${stats.totalProducts}</div>
          <div class="stat-sub">In catalog</div>
        </div>
        <div class="card stat-card">
          <div class="stat-label">Total sales</div>
          <div class="stat-value">${U.formatDA(stats.totalSales)}</div>
          <div class="stat-sub">Delivered orders</div>
        </div>
      </div>

      <div class="two-col">
        <div class="card">
          <div class="card-head">
            <h2>Recent orders</h2>
            <a href="orders.html" class="btn btn-sm">View all</a>
          </div>
          ${stats.recentOrders.length ? `
          <div class="table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Customer</th>
                  <th class="hide-mobile">Wilaya</th>
                  <th class="num">Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${stats.recentOrders.map((o) => `
                <tr>
                  <td><a href="order-detail.html?id=${encodeURIComponent(o.id)}" class="mono">${U.escapeHtml(o.order_reference)}</a></td>
                  <td>${U.escapeHtml(o.customer_full_name || o.customer_first_name)}</td>
                  <td class="hide-mobile">${U.escapeHtml(o.wilaya_name || '—')}</td>
                  <td class="num">${U.formatDA(o.total)}</td>
                  <td>${C.statusBadge(o.status)}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>` : C.emptyBlock({ title: 'No orders yet', message: 'New customer orders will appear here.' })}
        </div>

        <div class="card">
          <div class="card-head"><h2>Orders by status</h2></div>
          <div class="card-body">
            <ul class="bar-list">
              ${stats.ordersByStatus.map((s) => `
              <li>
                <div class="bar-label">
                  <span>${C.statusBadge(s.status)}</span>
                  <span>${s.count}</span>
                </div>
                <div class="bar-track" role="img" aria-label="${U.escapeHtml(s.status)}: ${s.count} orders">
                  <div class="bar-fill" style="width:${Math.round((s.count / maxStatus) * 100)}%"></div>
                </div>
              </li>`).join('')}
            </ul>
          </div>
        </div>
      </div>`;
  }

  load();
})();
