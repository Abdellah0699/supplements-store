/**
 * admin-dashboard.controller.js — Phase 4: protected dashboard statistics.
 */

const dashboardService = require('../services/dashboard.service');

async function stats(req, res) {
  const stats = await dashboardService.getDashboardStats();
  res.json({ success: true, data: stats });
}

module.exports = { stats };
