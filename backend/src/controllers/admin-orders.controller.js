/**
 * admin-orders.controller.js — Phase 4: protected order reads + status changes.
 */

const AppError = require('../utils/app-error');
const adminOrders = require('../services/admin-orders.service');

async function list(req, res) {
  const result = await adminOrders.adminListOrders(req.query);
  res.json({
    success: true,
    data: result.items,
    meta: { page: result.page, pageSize: result.pageSize, total: result.total, totalPages: result.totalPages },
  });
}

async function getOne(req, res) {
  const order = await adminOrders.adminGetOrder(req.params.id);
  if (!order) throw AppError.notFound('Order not found.');
  res.json({ success: true, data: order });
}

async function updateStatus(req, res) {
  const order = await adminOrders.adminUpdateOrderStatus(req.params.id, req.body.status);
  if (!order) throw AppError.notFound('Order not found.');
  res.json({ success: true, data: order });
}

module.exports = { list, getOne, updateStatus };
