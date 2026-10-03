const AppError = require('../utils/app-error');
const categoriesService = require('../services/categories.service');
const productsService = require('../services/products.service');

async function list(req, res) {
  const categories = await categoriesService.getCategories();
  res.json({ success: true, data: categories });
}

async function getOne(req, res) {
  const category = await categoriesService.getCategoryById(req.params.id);
  if (!category) throw AppError.notFound('Category not found.');
  res.json({ success: true, data: category });
}

async function productsInCategory(req, res) {
  const category = await categoriesService.getCategoryById(req.params.id);
  if (!category) throw AppError.notFound('Category not found.');
  const products = await productsService.getProductsByCategory(req.params.id);
  res.json({ success: true, data: products });
}

module.exports = { list, getOne, productsInCategory };
