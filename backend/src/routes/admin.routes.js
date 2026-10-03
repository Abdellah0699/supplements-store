/**
 * admin.routes.js
 * ---------------------------------------------------------
 * Phase 4: the protected admin API, mounted at /api/admin.
 * EVERYTHING here (except the login endpoint itself) passes
 * through requireAdmin - hiding the /admin URL is not security,
 * the middleware is.
 * ---------------------------------------------------------
 */

const router = require('express').Router();

const { asyncHandler, validateBody, validateQuery } = require('../middleware/validation.middleware');
const { requireAdmin } = require('../middleware/auth.middleware');
const { loginLimiter } = require('../middleware/rate-limit.middleware');
const {
  adminLoginSchema,
  adminListQuerySchema,
  productUpsertSchema,
  categoryUpsertSchema,
  orderStatusSchema,
  deliveryFeeMethodSchema,
  deliveryActiveSchema,
} = require('../utils/validation');

const adminAuth = require('../controllers/admin-auth.controller');
const adminDashboard = require('../controllers/admin-dashboard.controller');
const adminProducts = require('../controllers/admin-products.controller');
const adminCategories = require('../controllers/admin-categories.controller');
const adminOrders = require('../controllers/admin-orders.controller');
const adminDelivery = require('../controllers/admin-delivery.controller');
const adminUploads = require('../controllers/admin-uploads.controller');

/* ---- auth (login is public but rate-limited; logout/session need a token) ---- */
router.post('/auth/login', loginLimiter, validateBody(adminLoginSchema), asyncHandler(adminAuth.login));
router.post('/auth/logout', asyncHandler(adminAuth.logout));
router.get('/auth/session', requireAdmin, asyncHandler(adminAuth.session));

/* ---- everything below requires a valid admin session ---- */
router.use(requireAdmin);

router.get('/dashboard/stats', asyncHandler(adminDashboard.stats));

router.get('/products', validateQuery(adminListQuerySchema), asyncHandler(adminProducts.list));
router.get('/products/:id', asyncHandler(adminProducts.getOne));
router.post('/products', validateBody(productUpsertSchema), asyncHandler(adminProducts.create));
router.put('/products/:id', validateBody(productUpsertSchema), asyncHandler(adminProducts.update));
router.delete('/products/:id', asyncHandler(adminProducts.remove));

router.get('/categories', validateQuery(adminListQuerySchema), asyncHandler(adminCategories.list));
router.get('/categories/:id', asyncHandler(adminCategories.getOne));
router.post('/categories', validateBody(categoryUpsertSchema), asyncHandler(adminCategories.create));
router.put('/categories/:id', validateBody(categoryUpsertSchema), asyncHandler(adminCategories.update));
router.delete('/categories/:id', asyncHandler(adminCategories.remove));

router.get('/orders', validateQuery(adminListQuerySchema), asyncHandler(adminOrders.list));
router.get('/orders/:id', asyncHandler(adminOrders.getOne));
router.patch('/orders/:id/status', validateBody(orderStatusSchema), asyncHandler(adminOrders.updateStatus));

router.get('/delivery-fees', validateQuery(adminListQuerySchema), asyncHandler(adminDelivery.list));
router.put(
  '/delivery-fees/:wilayaId',
  validateBody(deliveryFeeMethodSchema),
  asyncHandler(adminDelivery.updateFee)
);
router.put(
  '/delivery-fees/:wilayaId/active',
  validateBody(deliveryActiveSchema),
  asyncHandler(adminDelivery.setActive)
);

/* ---- image uploads (multipart; no JSON body validation here) ---- */
router.post(
  '/uploads/image',
  adminUploads.uploadSingle,
  asyncHandler(adminUploads.uploadImage)
);

module.exports = router;
