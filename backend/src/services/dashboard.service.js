/**
 * dashboard.service.js
 * ---------------------------------------------------------
 * Phase 4: real dashboard statistics, all calculated from
 * PostgreSQL. Nothing is hardcoded.
 * ---------------------------------------------------------
 */

const { query } = require('../config/database');

async function getDashboardStats() {
  const [{ rows: orderRows }] = [await query(`
    SELECT
      COUNT(*)::int AS total_orders,
      COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_orders,
      COALESCE(SUM(subtotal) FILTER (WHERE status = 'delivered'), 0)::float AS total_sales
    FROM orders
  `)];

  const { rows: productRows } = await query('SELECT COUNT(*)::int AS total FROM products');

  const { rows: recentRows } = await query(`
    SELECT o.*, w.name AS wilaya_name, c.name AS commune_name
    FROM orders o
    LEFT JOIN wilayas w ON w.id = o.wilaya_id
    LEFT JOIN communes c ON c.id = o.commune_id
    ORDER BY o.created_at DESC, o.id DESC
    LIMIT 5
  `);

  const { rows: statusRows } = await query(`
    SELECT status, COUNT(*)::int AS count FROM orders GROUP BY status
  `);
  const counts = Object.fromEntries(statusRows.map((r) => [r.status, r.count]));
  const ordersByStatus = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map(
    (status) => ({ status, count: counts[status] || 0 })
  );

  return {
    totalOrders: orderRows[0].total_orders,
    pendingOrders: orderRows[0].pending_orders,
    totalProducts: productRows[0].total,
    totalSales: orderRows[0].total_sales,
    recentOrders: recentRows.map((r) => ({
      id: r.id,
      order_reference: r.order_reference,
      status: r.status,
      customer_first_name: r.customer_first_name,
      customer_full_name: r.customer_first_name,
      customer_phone: r.customer_phone,
      wilaya_name: r.wilaya_name,
      total: Number(r.total),
      created_at: r.created_at,
    })),
    ordersByStatus,
    lowStockNote: null, // Phase 2 has no stock column
  };
}

module.exports = { getDashboardStats };
