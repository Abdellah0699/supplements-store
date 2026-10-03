/**
 * order-detail.js — full order view: customer, delivery, items, financials,
 * status control and a status timeline.
 * URL: order-detail.html?id=<order id>
 */
(async function () {
  'use strict';

  const U = window.AdminUtils;
  const C = window.Components;

  const orderId = U.getQueryParam('id');

  const content = await window.AdminLayout.init({
    active: 'orders',
    title: 'Order details',
    actionsHtml: `<a class="btn" href="orders.html">&larr; Back to orders</a>`,
    showPageHead: true,
  });

  /* Derived timeline: the real Phase 2 schema has no status-history table,
     so the timeline is inferred from the current status (Phase 4 can add
     a real history endpoint). */
  const STATUS_FLOW = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

  function timelineHtml(order) {
    if (order.status === 'cancelled') {
      return `
        <ul class="timeline">
          <li class="done"><span class="t-label">Order placed</span><span class="t-time">${U.formatDate(order.created_at)}</span></li>
          <li class="current"><span class="t-label">Cancelled</span><span class="t-time">${U.formatDate(order.updated_at)}</span></li>
        </ul>
        <p style="font-size:12.5px;color:var(--admin-faint);margin:8px 0 0;">
          Timeline inferred from the current status — no history table exists in Phase 2.
        </p>`;
    }
    const reached = STATUS_FLOW.indexOf(order.status);
    const items = STATUS_FLOW.map((s, i) => {
      const cls = i < reached ? 'done' : i === reached ? 'current' : '';
      const time = i === 0 ? order.created_at : i === reached ? order.updated_at : null;
      return `<li class="${cls}"><span class="t-label">${U.statusLabel(s)}</span>${
        time ? `<span class="t-time">${U.formatDate(time)}</span>` : ''
      }</li>`;
    }).join('');
    return `
      <ul class="timeline">${items}</ul>
      <p style="font-size:12.5px;color:var(--admin-faint);margin:8px 0 0;">
        Timeline inferred from the current status — no history table exists in Phase 2.
      </p>`;
  }

  async function load() {
    if (!orderId) {
      content.insertAdjacentHTML('beforeend', C.errorBlock({ message: 'No order specified.' }));
      return;
    }
    content.insertAdjacentHTML('beforeend', C.loadingBlock('Loading order…'));
    const bodyEl = document.getElementById('page-body');

    try {
      const order = await window.AdminAPI.getOrder(orderId);
      render(bodyEl, order);
    } catch (err) {
      bodyEl.innerHTML = C.errorBlock({ message: err.message || 'Could not load this order.' });
      const btn = bodyEl.querySelector('[data-retry]');
      if (btn) btn.addEventListener('click', () => { bodyEl.innerHTML = ''; load(); });
    }
  }

  function render(bodyEl, order) {
    document.title = `${order.order_reference} — Store Admin`;
    const headTitle = document.querySelector('.page-head h1');
    if (headTitle) headTitle.innerHTML = `Order <span class="mono">${U.escapeHtml(order.order_reference)}</span>`;

    const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);

    bodyEl.innerHTML = `
      <div class="two-col">
        <div>
          <div class="card">
            <div class="card-head">
              <h2>Order items (${itemCount})</h2>
              ${C.statusBadge(order.status)}
            </div>
            <div class="table-wrap">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th class="num">Qty</th>
                    <th class="num">Unit price</th>
                    <th class="num">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${order.items.map((i) => `
                  <tr>
                    <td>${U.escapeHtml(i.product_name)}<div class="p-sub mono">${U.escapeHtml(i.product_id)}</div></td>
                    <td class="num">${i.quantity}</td>
                    <td class="num">${U.formatDA(i.unit_price)}</td>
                    <td class="num"><strong>${U.formatDA(i.subtotal)}</strong></td>
                  </tr>`).join('')}
                </tbody>
              </table>
            </div>
            <div class="card-body" style="padding-top:12px;">
              <dl class="detail-grid" style="grid-template-columns:1fr;max-width:340px;margin-left:auto;">
                <div class="detail-row"><dt>Subtotal</dt><dd>${U.formatDA(order.subtotal)}</dd></div>
                <div class="detail-row"><dt>Delivery (${U.escapeHtml(U.deliveryMethodLabel(order.delivery_method))})</dt><dd>${U.formatDA(order.delivery_fee)}</dd></div>
                <div class="detail-row"><dt><strong>Total</strong></dt><dd><strong>${U.formatDA(order.total)}</strong></dd></div>
              </dl>
            </div>
          </div>

          <div class="card" style="margin-top:16px;">
            <div class="card-head"><h2>Customer &amp; delivery</h2></div>
            <div class="card-body">
              <dl class="detail-grid">
                <div class="detail-row"><dt>Customer</dt><dd>${U.escapeHtml(order.customer_full_name || order.customer_first_name)}</dd></div>
                <div class="detail-row"><dt>Phone</dt><dd class="mono">${U.escapeHtml(order.customer_phone)}</dd></div>
                <div class="detail-row"><dt>Wilaya</dt><dd>${U.escapeHtml(order.wilaya_name || order.wilaya_id || '—')}</dd></div>
                <div class="detail-row"><dt>Commune</dt><dd>${U.escapeHtml(order.commune_name || order.commune_id || '—')}</dd></div>
                <div class="detail-row"><dt>Address</dt><dd>${U.escapeHtml(order.address || '—')}</dd></div>
                <div class="detail-row"><dt>Delivery method</dt><dd>${U.escapeHtml(U.deliveryMethodLabel(order.delivery_method))}</dd></div>
                <div class="detail-row"><dt>Placed</dt><dd>${U.formatDate(order.created_at)}</dd></div>
                <div class="detail-row"><dt>Last update</dt><dd>${U.formatDate(order.updated_at)}</dd></div>
              </dl>
            </div>
          </div>
        </div>

        <div>
          <div class="card">
            <div class="card-head"><h2>Order status</h2></div>
            <div class="card-body">
              <div class="form-field">
                <label for="od-status">Change status</label>
                <select class="select" id="od-status">
                  ${U.ORDER_STATUSES.map((s) => `
                    <option value="${s}"${s === order.status ? ' selected' : ''}>${U.statusLabel(s)}</option>`).join('')}
                </select>
              </div>
              <p class="field-error" id="od-error" role="alert" style="display:none;"></p>
              <div class="form-actions" style="border-top:none;margin-top:12px;padding-top:0;">
                <button type="button" class="btn btn-primary" id="od-save" style="width:100%;">Update status</button>
              </div>
            </div>
          </div>

          <div class="card" style="margin-top:16px;">
            <div class="card-head"><h2>Timeline</h2></div>
            <div class="card-body">${timelineHtml(order)}</div>
          </div>
        </div>
      </div>`;

    document.getElementById('od-save').addEventListener('click', async () => {
      const select = document.getElementById('od-status');
      const errorEl = document.getElementById('od-error');
      const newStatus = select.value;
      errorEl.style.display = 'none';

      if (newStatus === order.status) {
        C.toast('warning', 'No change', 'The order already has this status.');
        return;
      }

      const btn = document.getElementById('od-save');
      btn.disabled = true;
      btn.textContent = 'Updating…';
      try {
        const updated = await window.AdminAPI.updateOrderStatus(order.id, newStatus);
        C.toast('success', 'Status updated', `${order.order_reference} → ${U.statusLabel(newStatus)}`);
        render(bodyEl, updated);
      } catch (err) {
        errorEl.textContent = err.message || 'Could not update the status.';
        errorEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Update status';
      }
    });
  }

  load();
})();
