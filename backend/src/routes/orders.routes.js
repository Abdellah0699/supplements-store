const express = require('express');
const controller = require('../controllers/orders.controller');
const { asyncHandler, validateBody } = require('../middleware/validation.middleware');
const { createOrderSchema } = require('../utils/validation');
const { orderLimiter } = require('../middleware/rate-limit.middleware');

const router = express.Router();

router.post('/', orderLimiter, validateBody(createOrderSchema), asyncHandler(controller.create));

module.exports = router;
