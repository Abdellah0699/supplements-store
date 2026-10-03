/**
 * categories.seed.js
 * Reads frontend/data/categories.json (the existing Phase 1 sample
 * data) and upserts it into the categories table, keeping the same
 * IDs the frontend already uses (protein, creatine, ...).
 */

const fs = require('fs');
const path = require('path');

const CATEGORIES_JSON = path.join(__dirname, '../../../frontend/data/categories.json');

async function seedCategories(client) {
  const raw = JSON.parse(fs.readFileSync(CATEGORIES_JSON, 'utf8'));
  const categories = raw.categories;

  for (const c of categories) {
    await client.query(
      `INSERT INTO categories (id, name, slug, description, image, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         slug = EXCLUDED.slug,
         description = EXCLUDED.description,
         image = EXCLUDED.image,
         updated_at = now()`,
      [c.id, c.name, c.slug, c.description || null, c.image || null]
    );
  }

  console.log(`[seed] categories: ${categories.length} upserted`);
}

module.exports = seedCategories;
