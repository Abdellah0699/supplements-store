const AppError = require('../utils/app-error');
const locationsService = require('../services/locations.service');

async function listWilayas(req, res) {
  const wilayas = await locationsService.getWilayas();
  res.json({ success: true, data: filterBySearch(wilayas, req.query.search) });
}

async function listCommunes(req, res) {
  const wilaya = await locationsService.getWilayaById(req.params.wilayaId);
  if (!wilaya) throw AppError.notFound('Wilaya not found.');
  const communes = await locationsService.getCommunesByWilaya(req.params.wilayaId);
  res.json({ success: true, data: filterBySearch(communes, req.query.search) });
}

/** Optional ?search= filter (used by the admin dashboard; harmless for the customer site). */
function filterBySearch(items, search) {
  const q = (search || '').trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (w) => w.name.toLowerCase().includes(q) || String(w.id).includes(q)
  );
}

module.exports = { listWilayas, listCommunes };
