/**
 * app.js
 * Builds the Express app (no listening here - see server.js). Kept
 * separate from server.js so tests can import the app directly
 * without binding a real port.
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const env = require('./config/env');
const { checkConnection } = require('./config/database');
const { apiLimiter } = require('./middleware/rate-limit.middleware');
const errorMiddleware = require('./middleware/error.middleware');

const productsRoutes = require('./routes/products.routes');
const categoriesRoutes = require('./routes/categories.routes');
const locationsRoutes = require('./routes/locations.routes');
const deliveryRoutes = require('./routes/delivery.routes');
const ordersRoutes = require('./routes/orders.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

// Trust the deployment reverse proxy (Render, etc.) so req.protocol /
// req.secure reflect the real client-facing https URL. Without this,
// upload URLs and secure cookies would be built as http:// behind a
// TLS-terminating proxy.
app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    // Phase 4: the admin dashboard authenticates with an HttpOnly
    // cookie, so cross-origin requests must carry credentials.
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '100kb' })); // orders are tiny; this is generous, not a bottleneck
app.use(apiLimiter);

app.get('/api/health', async (req, res) => {
  const dbOk = await checkConnection();
  res.status(dbOk ? 200 : 503).json({ success: true, status: dbOk ? 'ok' : 'degraded', database: dbOk });
});

app.use('/api/products', productsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/admin', adminRoutes);

// Uploaded product images (see POST /api/admin/uploads/image).
const uploadDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
app.use(
  '/uploads',
  express.static(uploadDir, {
    maxAge: '30d',
    immutable: true,
    setHeaders: (res) => {
      // Product photos are embedded by the customer frontend, which is
      // served from a different origin. Helmet's default
      // Cross-Origin-Resource-Policy: same-origin would make browsers
      // refuse to render them (net::ERR_BLOCKED_BY_RESPONSE).
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  })
);

app.use('/api', (req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Unknown API endpoint.' } });
});

app.use(errorMiddleware);

module.exports = app;
