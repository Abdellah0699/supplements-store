/**
 * delivery.service.js
 * The one place that decides a delivery fee. Both GET /api/delivery/fee
 * (display only) and order creation (authoritative) call this same
 * function, so there is only one place pricing logic can live -
 * exactly what section 20/21 of the brief asks for.
 */

const { query } = require('../config/database');
const AppError = require('../utils/app-error');
const { getWilayaById } = require('./locations.service');

async function calculateDeliveryFee({ wilayaId, method }) {
  const wilaya = await getWilayaById(wilayaId);
  if (!wilaya) {
    throw AppError.validation('Please select a valid wilaya.', { wilayaId: 'Unknown wilaya.' });
  }

  // Both methods are read from delivery_fees: the database is the single
  // authority. Pickup rows are seeded at 0 ("pickup is free" as data, not
  // code) and the admin dashboard can change them later. A missing pickup
  // row on an older database still means free, so existing deployments
  // keep working until they re-seed.
  const result = await query(
    `SELECT fee FROM delivery_fees
     WHERE wilaya_id = $1 AND delivery_method = $2 AND is_active = true`,
    [wilayaId, method]
  );

  if (!result.rows[0]) {
    if (method === 'pickup_point') {
      return { wilayaId, deliveryMethod: method, fee: 0, currency: 'DZD' };
    }
    // Seeded for every wilaya at setup time; missing here means the
    // admin deactivated/deleted the row rather than the wilaya being
    // invalid, so this is a configuration gap, not a bad request.
    throw AppError.notFound('Delivery is not currently configured for this wilaya.');
  }

  return {
    wilayaId,
    deliveryMethod: method,
    fee: Number(result.rows[0].fee),
    currency: 'DZD',
  };
}

module.exports = { calculateDeliveryFee };

/* ------------------------------------------------------------------
 * Phase 4: admin delivery-fee management. The dashboard shows one
 * row per wilaya (home + pickup fees side by side), so the service
 * pivots the per-(wilaya, method) rows into that shape.
 * ------------------------------------------------------------------ */

async function adminListDeliveryFees({ search } = {}) {
  const params = [];
  let where = '';
  if (search) {
    params.push(`%${search}%`);
    where = `WHERE w.name ILIKE $1 OR w.id ILIKE $1`;
  }
  const { rows } = await query(
    `SELECT w.id AS wilaya_id, w.name AS wilaya_name,
            MAX(CASE WHEN f.delivery_method = 'home_delivery' THEN f.fee END)::float AS home_delivery,
            MAX(CASE WHEN f.delivery_method = 'pickup_point' THEN f.fee END)::float AS pickup_point,
            BOOL_AND(f.is_active) AS is_active
     FROM wilayas w
     LEFT JOIN delivery_fees f ON f.wilaya_id = w.id
     ${where}
     GROUP BY w.id, w.name
     ORDER BY w.id`,
    params
  );
  return rows.map((r) => ({
    wilayaId: r.wilaya_id,
    wilayaName: r.wilaya_name,
    homeDelivery: r.home_delivery === null ? 0 : r.home_delivery,
    pickupPoint: r.pickup_point === null ? 0 : r.pickup_point,
    isActive: r.is_active !== false,
  }));
}

async function adminUpdateDeliveryFee(wilayaId, method, fee) {
  if (!['home_delivery', 'pickup_point'].includes(method)) {
    throw AppError.validation('Please check the submitted information.', {
      method: 'Invalid delivery method.',
    });
  }
  const { rows } = await query(
    `INSERT INTO delivery_fees (wilaya_id, delivery_method, fee, is_active)
     VALUES ($1, $2, $3, true)
     ON CONFLICT (wilaya_id, delivery_method) DO UPDATE SET
       fee = EXCLUDED.fee, updated_at = now()
     RETURNING wilaya_id`,
    [wilayaId, method, fee]
  ).catch((err) => {
    if (err && err.code === '23503') throw AppError.notFound('Wilaya not found.');
    throw err;
  });
  if (!rows.length) throw AppError.notFound('Wilaya not found.');
  const list = await adminListDeliveryFees({});
  return list.find((f) => f.wilayaId === wilayaId);
}

async function adminSetDeliveryActive(wilayaId, isActive) {
  const result = await query(
    'UPDATE delivery_fees SET is_active = $2, updated_at = now() WHERE wilaya_id = $1',
    [wilayaId, !!isActive]
  );
  if (!result.rowCount) throw AppError.notFound('Wilaya not found.');
  const list = await adminListDeliveryFees({});
  return list.find((f) => f.wilayaId === wilayaId);
}

// calculateDeliveryFee stays exported above; extend the export list:
module.exports.adminListDeliveryFees = adminListDeliveryFees;
module.exports.adminUpdateDeliveryFee = adminUpdateDeliveryFee;
module.exports.adminSetDeliveryActive = adminSetDeliveryActive;
