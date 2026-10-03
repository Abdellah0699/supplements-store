const express = require('express');
const controller = require('../controllers/categories.controller');
const { asyncHandler } = require('../middleware/validation.middleware');

const router = express.Router();

router.get('/', asyncHandler(controller.list));
router.get('/:id/products', asyncHandler(controller.productsInCategory));
router.get('/:id', asyncHandler(controller.getOne));

module.exports = router;
