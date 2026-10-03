const express = require('express');
const controller = require('../controllers/delivery.controller');
const { asyncHandler, validateQuery } = require('../middleware/validation.middleware');
const { deliveryFeeQuerySchema } = require('../utils/validation');

const router = express.Router();

router.get('/fee', validateQuery(deliveryFeeQuerySchema), asyncHandler(controller.getFee));

module.exports = router;
