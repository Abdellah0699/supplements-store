/**
 * delivery-fees.seed.js
 * ---------------------------------------------------------
 * IMPORTANT: these are PLACEHOLDER numbers, not real client pricing.
 * They mirror the old flat-rate mock that used to live in the
 * frontend (js/api.js), just moved into the database so there is a
 * real row to look up instead of hardcoded logic. The client must
 * provide real per-wilaya pricing, which can then be updated here or
 * (later) through the admin dashboard - nothing else needs to change
 * when that happens, since the API always reads from this table.
 *
 * Pickup point rows are seeded explicitly with fee 0 (the business rule
 * "pickup is free", stored as data so the admin dashboard can change it
 * later). delivery.service.js reads BOTH methods from this table - the
 * fee is never hardcoded per method anymore.
 * ---------------------------------------------------------
 */

const NEAR_WILAYAS = new Set(['16', '09', '35', '42']); // Alger, Blida, Boumerdes, Tipaza
const NEAR_FEE = 400;
const STANDARD_FEE = 600;
const PICKUP_FEE = 0; // pickup points are free until the business says otherwise

async function seedDeliveryFees(client) {
  const { rows: wilayas } = await client.query('SELECT id FROM wilayas');

  for (const { id } of wilayas) {
    const fee = NEAR_WILAYAS.has(id) ? NEAR_FEE : STANDARD_FEE;
    await client.query(
      `INSERT INTO delivery_fees (wilaya_id, delivery_method, fee, is_active)
       VALUES ($1, 'home_delivery', $2, true)
       ON CONFLICT (wilaya_id, delivery_method) DO UPDATE SET
         fee = EXCLUDED.fee,
         updated_at = now()`,
      [id, fee]
    );
    await client.query(
      `INSERT INTO delivery_fees (wilaya_id, delivery_method, fee, is_active)
       VALUES ($1, 'pickup_point', $2, true)
       ON CONFLICT (wilaya_id, delivery_method) DO NOTHING`,
      [id, PICKUP_FEE]
    );
  }

  console.log(`[seed] delivery_fees: ${wilayas.length} home_delivery rows upserted (PLACEHOLDER pricing)`);
  console.log(`[seed] delivery_fees: ${wilayas.length} pickup_point rows ensured (fee 0)`);
}

module.exports = seedDeliveryFees;
