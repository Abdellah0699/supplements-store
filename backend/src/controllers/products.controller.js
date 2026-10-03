const AppError = require('../utils/app-error');
const productsService = require('../services/products.service');

async function list(req, res) {
  const result = await productsService.getProducts(req.query);
  res.json({ success: true, data: result.items, meta: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages } });
}

async function getOne(req, res) {
  const product = await productsService.getProductById(req.params.id);
  if (!product) throw AppError.notFound('Product not found.');
  res.json({ success: true, data: product });
}

async function getOneBySlug(req, res) {
  const product = await productsService.getProductBySlug(req.params.slug);
  if (!product) throw AppError.notFound('Product not found.');
  res.json({ success: true, data: product });
}

async function search(req, res) {
  const results = await productsService.searchProducts(req.query.q);
  res.json({ success: true, data: results });
}

async function related(req, res) {
  const product = await productsService.getProductById(req.params.id);
  if (!product) throw AppError.notFound('Product not found.');
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : 4;
  const results = await productsService.getRelatedProducts(product, limit);
  res.json({ success: true, data: results });
}

module.exports = { list, getOne, getOneBySlug, search, related };
