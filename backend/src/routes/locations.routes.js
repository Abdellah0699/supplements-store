const express = require('express');
const controller = require('../controllers/locations.controller');
const { asyncHandler } = require('../middleware/validation.middleware');

const router = express.Router();

router.get('/wilayas', asyncHandler(controller.listWilayas));
router.get('/wilayas/:wilayaId/communes', asyncHandler(controller.listCommunes));

module.exports = router;
