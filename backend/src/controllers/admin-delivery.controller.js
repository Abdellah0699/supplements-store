/**
 * admin-delivery.controller.js — Phase 4: protected delivery-fee management.
 */

const deliveryService = require('../services/delivery.service');

async function list(req, res) {
  const items = await deliveryService.adminListDeliveryFees(req.query);
  res.json({ success: true, data: items });
}

async function updateFee(req, res) {
  const fee = await deliveryService.adminUpdateDeliveryFee(req.params.wilayaId, req.body.method, req.body.fee);
  res.json({ success: true, data: fee });
}

async function setActive(req, res) {
  const fee = await deliveryService.adminSetDeliveryActive(req.params.wilayaId, req.body.isActive);
  res.json({ success: true, data: fee });
}

module.exports = { list, updateFee, setActive };
