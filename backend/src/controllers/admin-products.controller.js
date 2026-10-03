/**
 * admin-products.controller.js — Phase 4: protected product management.
 */

const AppError = require('../utils/app-error');
const productsService = require('../services/products.service');

async function list(req, res) {
  const result = await productsService.adminListProducts(req.query);
  res.json({
    success: true,
    data: result.items,
    meta: { page: result.page, pageSize: result.pageSize, total: result.total, totalPages: result.totalPages },
  });
}

async function getOne(req, res) {
  const product = await productsService.getProductById(req.params.id);
  if (!product) throw AppError.notFound('Product not found.');
  res.json({ success: true, data: product });
}

async function create(req, res) {
  const product = await productsService.createProduct(req.body);
  res.status(201).json({ success: true, data: product });
}

async function update(req, res) {
  const product = await productsService.updateProduct(req.params.id, req.body);
  if (!product) throw AppError.notFound('Product not found.');
  res.json({ success: true, data: product });
}

async function remove(req, res) {
  const deleted = await productsService.deleteProduct(req.params.id);
  if (!deleted) throw AppError.notFound('Product not found.');
  res.json({ success: true, data: { deleted: true } });
}

module.exports = { list, getOne, create, update, remove };
