const deliveryService = require('../services/delivery.service');

async function getFee(req, res) {
  const { wilayaId, method } = req.query;
  const result = await deliveryService.calculateDeliveryFee({ wilayaId, method });
  res.json({ success: true, data: result });
}

module.exports = { getFee };
