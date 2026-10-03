/**
 * admin-orders.service.js
 * ---------------------------------------------------------
 * Phase 4: admin order reads + status changes.
 * Order items keep their snapshots (product_name, unit_price) -
 * reads join wilaya/commune names for display but NEVER
 * recalculate historical totals from current product prices.
 * ---------------------------------------------------------
 */

const { query } = require('../config/database');
const AppError = require('../utils/app-error');

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

function mapOrderRow(row) {
  return {
    id: row.id,
    order_reference: row.order_reference,
    status: row.status,
    customer_first_name: row.customer_first_name,
    customer_full_name: row.customer_first_name,
    customer_phone: row.customer_phone,
    wilaya_id: row.wilaya_id,
    wilaya_name: row.wilaya_name,
    commune_id: row.commune_id,
    commune_name: row.commune_name,
    address: row.address,
    delivery_method: row.delivery_method,
    delivery_fee: Number(row.delivery_fee),
    subtotal: Number(row.subtotal),
    total: Number(row.total),
    total_quantity: Number(row.total_quantity ?? 0),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapOrderItemRow(row) {
  return {
    id: row.id,
    product_id: row.product_id,
    product_name: row.product_name,
    quantity: row.quantity,
    unit_price: Number(row.unit_price),
    subtotal: Number(row.subtotal),
  };
}

const ORDER_LIST_SELECT = `
  SELECT o.*, w.name AS wilaya_name, c.name AS commune_name,
         (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi WHERE oi.order_id = o.id) AS total_quantity
  FROM orders o
  LEFT JOIN wilayas w ON w.id = o.wilaya_id
  LEFT JOIN communes c ON c.id = o.commune_id
`;

async function adminListOrders({ search, status, page = 1, pageSize = 10 } = {}) {
  const where = [];
  const params = [];
  if (search) {
    params.push(`%${search}%`);
    const p = `$${params.length}`;
    where.push(`(o.order_reference ILIKE ${p} OR o.customer_first_name ILIKE ${p} OR o.customer_phone ILIKE ${p})`);
  }
  if (status) {
    params.push(status);
    where.push(`o.status = $${params.length}`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const countRes = await query(`SELECT COUNT(*)::int AS total FROM orders o ${whereSql}`, params);
  const total = countRes.rows[0].total;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;

  const { rows } = await query(
    `${ORDER_LIST_SELECT} ${whereSql}
     ORDER BY o.created_at DESC, o.id DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, pageSize, offset]
  );
  return { items: rows.map(mapOrderRow), page: safePage, pageSize, total, totalPages };
}

async function adminGetOrder(idOrReference) {
  const { rows } = await query(
    `${ORDER_LIST_SELECT} WHERE o.id::text = $1 OR o.order_reference = $1`,
    [String(idOrReference)]
  );
  const row = rows[0];
  if (!row) return null;
  const itemsRes = await query(
    'SELECT * FROM order_items WHERE order_id = $1 ORDER BY id',
    [row.id]
  );
  return { ...mapOrderRow(row), items: itemsRes.rows.map(mapOrderItemRow) };
}

async function adminUpdateOrderStatus(idOrReference, status) {
  if (!ORDER_STATUSES.includes(status)) {
    throw AppError.validation('Please check the submitted information.', {
      status: 'Invalid order status.',
    });
  }
  const { rows } = await query(
    `UPDATE orders SET status = $2, updated_at = now()
     WHERE id::text = $1 OR order_reference = $1
     RETURNING id`,
    [String(idOrReference), status]
  );
  if (!rows.length) return null;
  return adminGetOrder(rows[0].id);
}

module.exports = { ORDER_STATUSES, adminListOrders, adminGetOrder, adminUpdateOrderStatus };
