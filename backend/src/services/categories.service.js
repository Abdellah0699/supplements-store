/**
 * categories.service.js
 */

const { query } = require('../config/database');

function mapCategoryRow(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    image: row.image,
  };
}

async function getCategories() {
  const result = await query('SELECT * FROM categories WHERE is_active = true ORDER BY name');
  return result.rows.map(mapCategoryRow);
}

async function getCategoryById(id) {
  const result = await query('SELECT * FROM categories WHERE id = $1 AND is_active = true', [id]);
  return result.rows[0] ? mapCategoryRow(result.rows[0]) : null;
}

/* ------------------------------------------------------------------
 * Phase 4: admin category management. The admin shape includes
 * isActive and productCount (the Phase 3 dashboard shows both).
 * ------------------------------------------------------------------ */

function mapAdminCategoryRow(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    image: row.image,
    isActive: row.is_active,
    productCount: Number(row.product_count || 0),
  };
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

async function adminListCategories({ search } = {}) {
  const params = [];
  let where = '';
  if (search) {
    params.push(`%${search}%`);
    where = `WHERE c.name ILIKE $1 OR c.slug ILIKE $1`;
  }
  const { rows } = await query(
    `SELECT c.*, COUNT(p.id)::int AS product_count
     FROM categories c
     LEFT JOIN products p ON p.category_id = c.id
     ${where}
     GROUP BY c.id
     ORDER BY c.name`,
    params
  );
  return rows.map(mapAdminCategoryRow);
}

async function adminGetCategory(id) {
  const { rows } = await query(
    `SELECT c.*, COUNT(p.id)::int AS product_count
     FROM categories c
     LEFT JOIN products p ON p.category_id = c.id
     WHERE c.id = $1
     GROUP BY c.id`,
    [id]
  );
  return rows[0] ? mapAdminCategoryRow(rows[0]) : null;
}

async function createCategory(data) {
  const AppError = require('../utils/app-error');
  const slug = data.slug && data.slug.trim() ? data.slug.trim() : slugify(data.name);
  // Stable readable id derived from the slug, matching the existing style ('protein').
  let id = slug.slice(0, 64);
  let n = 2;
  while ((await query('SELECT 1 FROM categories WHERE id = $1', [id])).rows.length) {
    id = `${slug.slice(0, 58)}-${n++}`;
  }
  try {
    const { rows } = await query(
      `INSERT INTO categories (id, name, slug, description, image, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, data.name.trim(), slug, data.description?.trim() || null, data.image?.trim() || null, data.isActive !== false]
    );
    return mapAdminCategoryRow({ ...rows[0], product_count: 0 });
  } catch (err) {
    if (err && err.code === '23505') {
      throw AppError.conflict('A category with this slug already exists.');
    }
    throw err;
  }
}

async function updateCategory(id, data) {
  const AppError = require('../utils/app-error');
  const existing = await adminGetCategory(id);
  if (!existing) return null;
  const slug = data.slug && data.slug.trim() ? data.slug.trim() : existing.slug;
  try {
    const { rows } = await query(
      `UPDATE categories SET
         name = $2, slug = $3, description = $4, image = $5,
         is_active = $6, updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [id, data.name.trim(), slug, data.description?.trim() || null, data.image?.trim() || null, data.isActive !== false]
    );
    return mapAdminCategoryRow({ ...rows[0], product_count: existing.productCount });
  } catch (err) {
    if (err && err.code === '23505') {
      throw AppError.conflict('A category with this slug already exists.');
    }
    throw err;
  }
}

async function deleteCategory(id) {
  const AppError = require('../utils/app-error');
  // Never orphan products: refuse while any product uses the category.
  const { rows } = await query('SELECT COUNT(*)::int AS n FROM products WHERE category_id = $1', [id]);
  if (rows[0].n > 0) {
    throw AppError.conflict(
      `This category still contains ${rows[0].n} product${rows[0].n === 1 ? '' : 's'} and cannot be deleted.`
    );
  }
  const result = await query('DELETE FROM categories WHERE id = $1', [id]);
  return result.rowCount > 0;
}

module.exports = {
  getCategories,
  getCategoryById,
  adminListCategories,
  adminGetCategory,
  createCategory,
  updateCategory,
  deleteCategory,
};
