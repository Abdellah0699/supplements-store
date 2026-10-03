/**
 * locations.seed.js
 * Reads frontend/data/algeria-locations.json (69 wilayas, ~1,700
 * communes, already including Arabic names) and upserts them into
 * the wilayas/communes tables. Run once - after this, the database
 * is the source of truth, not the JSON file.
 */

const fs = require('fs');
const path = require('path');

const LOCATIONS_JSON = path.join(__dirname, '../../../frontend/data/algeria-locations.json');

async function seedLocations(client) {
  const raw = JSON.parse(fs.readFileSync(LOCATIONS_JSON, 'utf8'));
  const wilayas = raw.wilayas;

  let communeCount = 0;

  for (const w of wilayas) {
    await client.query(
      `INSERT INTO wilayas (id, name, name_ar)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, name_ar = EXCLUDED.name_ar`,
      [w.id, w.name, w.nameAr || null]
    );

    for (const c of w.communes) {
      await client.query(
        `INSERT INTO communes (id, wilaya_id, name, name_ar)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET
           wilaya_id = EXCLUDED.wilaya_id,
           name = EXCLUDED.name,
           name_ar = EXCLUDED.name_ar`,
        [c.id, w.id, c.name, c.nameAr || null]
      );
      communeCount += 1;
    }
  }

  console.log(`[seed] locations: ${wilayas.length} wilayas, ${communeCount} communes upserted`);
}

module.exports = seedLocations;
