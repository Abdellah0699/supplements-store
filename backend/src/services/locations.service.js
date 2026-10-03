/**
 * locations.service.js
 * GET /api/locations/wilayas is deliberately lightweight (no nested
 * communes - that would mean ~1,700 rows on every single page load).
 * Communes are fetched per-wilaya, on demand, once the customer picks
 * one - see GET /api/locations/wilayas/:wilayaId/communes.
 */

const { query } = require('../config/database');

function mapWilayaRow(row) {
  return { id: row.id, name: row.name, nameAr: row.name_ar };
}

function mapCommuneRow(row) {
  return { id: row.id, name: row.name, nameAr: row.name_ar };
}

async function getWilayas() {
  const result = await query('SELECT * FROM wilayas ORDER BY id');
  return result.rows.map(mapWilayaRow);
}

async function getWilayaById(id) {
  const result = await query('SELECT * FROM wilayas WHERE id = $1', [id]);
  return result.rows[0] ? mapWilayaRow(result.rows[0]) : null;
}

async function getCommunesByWilaya(wilayaId) {
  const result = await query('SELECT * FROM communes WHERE wilaya_id = $1 ORDER BY name', [wilayaId]);
  return result.rows.map(mapCommuneRow);
}

/** Used by the orders service: confirms a commune exists AND belongs to the given wilaya, in one query. */
async function communeBelongsToWilaya(communeId, wilayaId) {
  const result = await query('SELECT 1 FROM communes WHERE id = $1 AND wilaya_id = $2', [communeId, wilayaId]);
  return result.rowCount > 0;
}

module.exports = { getWilayas, getWilayaById, getCommunesByWilaya, communeBelongsToWilaya };
