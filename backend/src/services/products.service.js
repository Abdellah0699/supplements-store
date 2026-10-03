/**
 * products.service.js
 * All product reads live here. Row -> API shape mapping happens once
 * (mapProductRow) so every endpoint returns the same camelCase shape
 * the existing frontend already expects from products.json.
 */

const { query } = require('../config/database');

function mapProductRow(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    categoryId: row.category_id,
    price: Number(row.price),
    oldPrice: row.old_price !== null ? Number(row.old_price) : null,
    currency: row.currency,
    image: row.image,
    shortDescription: row.short_description,
    description: row.description,
    benefits: row.benefits || [],
    usage: row.usage,
    flavors: row.flavors || [],
    available: row.available,
    featured: row.featured,
  };
}

async function getProducts({ category, featured, available, page = 1, limit = 20 } = {}) {
  const conditions = [];
  const params = [];

  if (category) {
    params.push(category);
    conditions.push(`category_id = $${params.length}`);
  }
  if (featured !== undefined) {
    params.push(featured);
    conditions.push(`featured = $${params.length}`);
  }
  if (available !== undefined) {
    params.push(available);
    conditions.push(`available = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const totalResult = await query(`SELECT COUNT(*)::int AS count FROM products ${where}`, params);
  const total = totalResult.rows[0].count;

  params.push(limit, offset);
  const rowsResult = await query(
    `SELECT * FROM products ${where} ORDER BY created_at DESC, id LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    items: rowsResult.rows.map(mapProductRow),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

async function getProductById(id) {
  const result = await query('SELECT * FROM products WHERE id = $1', [id]);
  return result.rows[0] ? mapProductRow(result.rows[0]) : null;
}

async function getProductBySlug(slug) {
  const result = await query('SELECT * FROM products WHERE slug = $1', [slug]);
  return result.rows[0] ? mapProductRow(result.rows[0]) : null;
}

async function getFeaturedProducts() {
  const result = await query('SELECT * FROM products WHERE featured = true ORDER BY created_at DESC');
  return result.rows.map(mapProductRow);
}

async function getProductsByCategory(categoryId) {
  const result = await query(
    'SELECT * FROM products WHERE category_id = $1 ORDER BY created_at DESC',
    [categoryId]
  );
  return result.rows.map(mapProductRow);
}

async function getRelatedProducts(product, limit = 4) {
  const result = await query(
    'SELECT * FROM products WHERE category_id = $1 AND id != $2 ORDER BY created_at DESC LIMIT $3',
    [product.categoryId, product.id, limit]
  );
  return result.rows.map(mapProductRow);
}

async function searchProducts(q) {
  const result = await query(
    `SELECT p.*
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.name ILIKE $1
        OR p.short_description ILIKE $1
        OR p.description ILIKE $1
        OR c.name ILIKE $1
     ORDER BY p.created_at DESC`,
    [`%${q}%`]
  );
  return result.rows.map(mapProductRow);
}

/** Used internally by the orders service - fetches multiple products by id in one query. */
async function getProductsByIds(ids) {
  if (!ids.length) return [];
  const result = await query('SELECT * FROM products WHERE id = ANY($1::text[])', [ids]);
  return result.rows.map(mapProductRow);
}

/* ------------------------------------------------------------------
 * Phase 4: admin product management. Writes go through the same
 * mapProductRow so the admin API returns exactly the shape the
 * customer API (and the Phase 3 dashboard) already expects.
 * ------------------------------------------------------------------ */

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
}

async function nextProductId() {
  // Stable readable ids (prod-017, ...) matching the existing seed style.
  const { rows } = await query(`SELECT id FROM products WHERE id LIKE 'prod-%'`);
  let n = 1;
  const used = new Set(rows.map((r) => r.id));
  while (used.has(`prod-${String(n).padStart(3, '0')}`)) n++;
  return `prod-${String(n).padStart(3, '0')}`;
}

async function createProduct(data) {
  const slug = data.slug && data.slug.trim() ? data.slug.trim() : slugify(data.name);
  const id = await nextProductId();
  try {
    const { rows } = await query(
      `INSERT INTO products
         (id, name, slug, category_id, price, old_price, currency, image,
          short_description, description, benefits, usage, flavors,
          available, featured)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13::jsonb,$14,$15)
       RETURNING *`,
      [
        id,
        data.name.trim(),
        slug,
        data.categoryId,
        data.price,
        data.oldPrice ?? null,
        (data.currency || 'DZD').toUpperCase(),
        data.image?.trim() || null,
        data.shortDescription?.trim() || null,
        data.description?.trim() || null,
        JSON.stringify(data.benefits || []),
        data.usage?.trim() || null,
        JSON.stringify(data.flavors || []),
        data.available !== false,
        !!data.featured,
      ]
    );
    return mapProductRow(rows[0]);
  } catch (err) {
    throw mapProductWriteError(err, data);
  }
}

async function updateProduct(id, data) {
  const existing = await getProductById(id);
  if (!existing) return null;
  const slug = data.slug && data.slug.trim() ? data.slug.trim() : existing.slug;
  try {
    const { rows } = await query(
      `UPDATE products SET
         name = $2, slug = $3, category_id = $4, price = $5, old_price = $6,
         currency = $7, image = $8, short_description = $9, description = $10,
         benefits = $11::jsonb, usage = $12, flavors = $13::jsonb,
         available = $14, featured = $15, updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        data.name.trim(),
        slug,
        data.categoryId,
        data.price,
        data.oldPrice ?? null,
        (data.currency || 'DZD').toUpperCase(),
        data.image?.trim() || null,
        data.shortDescription?.trim() || null,
        data.description?.trim() || null,
        JSON.stringify(data.benefits || []),
        data.usage?.trim() || null,
        JSON.stringify(data.flavors || []),
        data.available !== false,
        !!data.featured,
      ]
    );
    return mapProductRow(rows[0]);
  } catch (err) {
    throw mapProductWriteError(err, data);
  }
}

function mapProductWriteError(err, data) {
  const AppError = require('../utils/app-error');
  if (err && err.code === '23505') {
    // Unique violation: slug (or id on a pathological race).
    return AppError.conflict('A product with this slug already exists.');
  }
  if (err && err.code === '23503') {
    // FK violation: category_id references categories(id).
    return AppError.validation('Please check the submitted information.', {
      categoryId: `Unknown category: ${data.categoryId}`,
    });
  }
  throw err;
}

async function deleteProduct(id) {
  // Order items reference products(id) WITHOUT cascade (they are
  // historical snapshots), so refuse deletion while any order item
  // points at the product instead of orphaning history.
  const { rows } = await query('SELECT 1 FROM order_items WHERE product_id = $1 LIMIT 1', [id]);
  if (rows.length) {
    const AppError = require('../utils/app-error');
    throw AppError.conflict('This product is part of existing orders and cannot be deleted.');
  }
  const result = await query('DELETE FROM products WHERE id = $1', [id]);
  return result.rowCount > 0;
}

/** Admin product list: search + category + availability filters, paginated. */
async function adminListProducts({ search, category, available, page = 1, pageSize = 10 } = {}) {
  const where = [];
  const params = [];
  if (search) {
    params.push(`%${search}%`);
    where.push(`(p.name ILIKE $${params.length} OR p.slug ILIKE $${params.length})`);
  }
  if (category) {
    params.push(category);
    where.push(`p.category_id = $${params.length}`);
  }
  if (available === 'true' || available === true) where.push('p.available = true');
  if (available === 'false' || available === false) where.push('p.available = false');
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const countRes = await query(`SELECT COUNT(*)::int AS total FROM products p ${whereSql}`, params);
  const total = countRes.rows[0].total;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;

  const { rows } = await query(
    `SELECT p.* FROM products p ${whereSql} ORDER BY p.created_at DESC, p.id ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, pageSize, offset]
  );
  return { items: rows.map(mapProductRow), page: safePage, pageSize, total, totalPages };
}

module.exports = {
  getProducts,
  getProductById,
  getProductBySlug,
  getFeaturedProducts,
  getProductsByCategory,
  getRelatedProducts,
  searchProducts,
  getProductsByIds,
  createProduct,
  updateProduct,
  deleteProduct,
  adminListProducts,
};
