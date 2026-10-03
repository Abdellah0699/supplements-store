/**
 * products.seed.js
 * Reads frontend/data/products.json and upserts it into the products
 * table, preserving the existing stable IDs (prod-001, ...) and every
 * field the frontend already relies on (benefits/flavors as JSONB).
 */

const fs = require('fs');
const path = require('path');

const PRODUCTS_JSON = path.join(__dirname, '../../../frontend/data/products.json');

async function seedProducts(client) {
  const raw = JSON.parse(fs.readFileSync(PRODUCTS_JSON, 'utf8'));
  const products = raw.products;

  for (const p of products) {
    await client.query(
      `INSERT INTO products (
         id, name, slug, category_id, price, old_price, currency, image,
         short_description, description, benefits, usage, flavors,
         available, featured
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         slug = EXCLUDED.slug,
         category_id = EXCLUDED.category_id,
         price = EXCLUDED.price,
         old_price = EXCLUDED.old_price,
         currency = EXCLUDED.currency,
         image = EXCLUDED.image,
         short_description = EXCLUDED.short_description,
         description = EXCLUDED.description,
         benefits = EXCLUDED.benefits,
         usage = EXCLUDED.usage,
         flavors = EXCLUDED.flavors,
         available = EXCLUDED.available,
         featured = EXCLUDED.featured,
         updated_at = now()`,
      [
        p.id,
        p.name,
        p.slug,
        p.categoryId,
        p.price,
        p.oldPrice ?? null,
        p.currency || 'DZD',
        p.image || null,
        p.shortDescription || null,
        p.description || null,
        JSON.stringify(p.benefits || []),
        p.usage || null,
        JSON.stringify(p.flavors || []),
        p.available !== false,
        Boolean(p.featured),
      ]
    );
  }

  console.log(`[seed] products: ${products.length} upserted`);
}

module.exports = seedProducts;
