const express = require('express');
const controller = require('../controllers/products.controller');
const { asyncHandler, validateQuery } = require('../middleware/validation.middleware');
const { productsQuerySchema, searchQuerySchema } = require('../utils/validation');

const router = express.Router();

// Specific paths before the generic /:id so they aren't swallowed by it.
router.get('/search', validateQuery(searchQuerySchema), asyncHandler(controller.search));
router.get('/slug/:slug', asyncHandler(controller.getOneBySlug));
router.get('/:id/related', asyncHandler(controller.related));
router.get('/:id', asyncHandler(controller.getOne));
router.get('/', validateQuery(productsQuerySchema), asyncHandler(controller.list));

module.exports = router;
