/**
 * admin-categories.controller.js — Phase 4: protected category management.
 */

const AppError = require('../utils/app-error');
const categoriesService = require('../services/categories.service');

async function list(req, res) {
  const items = await categoriesService.adminListCategories(req.query);
  res.json({ success: true, data: items });
}

async function getOne(req, res) {
  const category = await categoriesService.adminGetCategory(req.params.id);
  if (!category) throw AppError.notFound('Category not found.');
  res.json({ success: true, data: category });
}

async function create(req, res) {
  const category = await categoriesService.createCategory(req.body);
  res.status(201).json({ success: true, data: category });
}

async function update(req, res) {
  const category = await categoriesService.updateCategory(req.params.id, req.body);
  if (!category) throw AppError.notFound('Category not found.');
  res.json({ success: true, data: category });
}

async function remove(req, res) {
  const deleted = await categoriesService.deleteCategory(req.params.id);
  if (!deleted) throw AppError.notFound('Category not found.');
  res.json({ success: true, data: { deleted: true } });
}

module.exports = { list, getOne, create, update, remove };
