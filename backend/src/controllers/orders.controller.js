const ordersService = require('../services/orders.service');

async function create(req, res) {
  const order = await ordersService.createOrder(req.body);
  res.status(201).json({ success: true, data: order });
}

module.exports = { create };
