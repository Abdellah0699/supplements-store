/**
 * admin.test.js — Phase 4 tests.
 * Covers: admin login (success / wrong password / unknown user /
 * inactive), unauthenticated admin endpoints (401), product CRUD,
 * category CRUD + delete guard, order status updates, delivery fee
 * updates, dashboard stats, logout, and price/delivery integrity
 * through the admin APIs.
 *
 * Like the Phase 2 suites, these run against the real development
 * database (migrated + seeded). The admin user is created in
 * beforeAll and removed in afterAll.
 */

const request = require('supertest');
const app = require('../src/app');
const { pool, query } = require('../src/config/database');
const { hashPassword } = require('../src/services/admin-auth.service');

const ADMIN_USERNAME = 'test-admin';
const ADMIN_PASSWORD = 'test-admin-pass-123';

let agent; // authenticated supertest agent (persists the session cookie)

beforeAll(async () => {
  await query('DELETE FROM admin_users WHERE username = $1', [ADMIN_USERNAME]);
  await query(
    "INSERT INTO admin_users (username, password_hash, role, is_active) VALUES ($1, $2, 'admin', true)",
    [ADMIN_USERNAME, await hashPassword(ADMIN_PASSWORD)]
  );
  agent = request.agent(app);
  const login = await agent.post('/api/admin/auth/login').send({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD });
  expect(login.status).toBe(200);
});

afterAll(async () => {
  await query('DELETE FROM admin_users WHERE username = $1', [ADMIN_USERNAME]);
  // Clean up any test products/categories this suite created.
  await query("DELETE FROM products WHERE id LIKE 'prod-test-%'");
  await query("DELETE FROM categories WHERE id LIKE 'test-cat-%'");
  await pool.end();
});

describe('POST /api/admin/auth/login', () => {
  it('logs in with correct credentials and sets an HttpOnly session cookie', async () => {
    const res = await request(app)
      .post('/api/admin/auth/login')
      .send({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.admin.username).toBe(ADMIN_USERNAME);
    expect(res.body.data.admin).not.toHaveProperty('password_hash');
    const cookies = res.headers['set-cookie'] || [];
    const sessionCookie = cookies.find((c) => c.startsWith('admin_session='));
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie).toMatch(/httponly/i);
  });

  it('rejects a wrong password with 401 and a generic message', async () => {
    const res = await request(app)
      .post('/api/admin/auth/login')
      .send({ username: ADMIN_USERNAME, password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
    expect(res.body.error.message).toBe('Invalid username or password.');
  });

  it('rejects an unknown username with the SAME message (no user enumeration)', async () => {
    const res = await request(app)
      .post('/api/admin/auth/login')
      .send({ username: 'no-such-admin', password: 'whatever-123' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid username or password.');
  });

  it('rejects an inactive admin account', async () => {
    await query('UPDATE admin_users SET is_active = false WHERE username = $1', [ADMIN_USERNAME]);
    const res = await request(app)
      .post('/api/admin/auth/login')
      .send({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD });
    expect(res.status).toBe(401);
    await query('UPDATE admin_users SET is_active = true WHERE username = $1', [ADMIN_USERNAME]);
  });

  it('validates the login payload', async () => {
    const res = await request(app).post('/api/admin/auth/login').send({ username: '', password: '' });
    expect(res.status).toBe(400);
  });
});

describe('unauthenticated admin access', () => {
  it('rejects GET /api/admin/products without a session (401)', async () => {
    const res = await request(app).get('/api/admin/products');
    expect(res.status).toBe(401);
  });

  it('rejects POST /api/admin/products without a session (401)', async () => {
    const res = await request(app).post('/api/admin/products').send({ name: 'X' });
    expect(res.status).toBe(401);
  });

  it('rejects GET /api/admin/dashboard/stats without a session (401)', async () => {
    const res = await request(app).get('/api/admin/dashboard/stats');
    expect(res.status).toBe(401);
  });

  it('rejects PATCH /api/admin/orders/1/status without a session (401)', async () => {
    const res = await request(app).patch('/api/admin/orders/1/status').send({ status: 'confirmed' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/admin/auth/session', () => {
  it('returns the current admin when authenticated', async () => {
    const res = await agent.get('/api/admin/auth/session');
    expect(res.status).toBe(200);
    expect(res.body.data.admin.username).toBe(ADMIN_USERNAME);
    expect(res.body.data.admin).not.toHaveProperty('password_hash');
  });
});

describe('admin product CRUD', () => {
  const payload = () => ({
    name: 'Test Product Phase 4',
    categoryId: 'protein',
    price: 2500,
    currency: 'DZD',
    available: true,
    featured: false,
  });

  it('creates, reads, updates and deletes a product', async () => {
    const created = await agent.post('/api/admin/products').send(payload());
    expect(created.status).toBe(201);
    expect(created.body.data.name).toBe('Test Product Phase 4');
    expect(created.body.data.price).toBe(2500);
    const id = created.body.data.id;

    const fetched = await agent.get(`/api/admin/products/${id}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body.data.id).toBe(id);

    const updated = await agent.put(`/api/admin/products/${id}`).send({ ...payload(), price: 2700 });
    expect(updated.status).toBe(200);
    expect(updated.body.data.price).toBe(2700);

    // The customer API sees the new price immediately (single source of truth).
    const pub = await request(app).get(`/api/products/${id}`);
    expect(pub.status).toBe(200);
    expect(pub.body.data.price).toBe(2700);

    const deleted = await agent.delete(`/api/admin/products/${id}`);
    expect(deleted.status).toBe(200);
    const gone = await agent.get(`/api/admin/products/${id}`);
    expect(gone.status).toBe(404);
  });

  it('rejects a product with an unknown category', async () => {
    const res = await agent.post('/api/admin/products').send({ ...payload(), categoryId: 'nope' });
    expect(res.status).toBe(400);
  });

  it('rejects a duplicate slug with 409', async () => {
    const first = await agent.post('/api/admin/products').send({ ...payload(), slug: 'test-dup-slug' });
    expect(first.status).toBe(201);
    const second = await agent.post('/api/admin/products').send({ ...payload(), slug: 'test-dup-slug', name: 'Other' });
    expect(second.status).toBe(409);
    await agent.delete(`/api/admin/products/${first.body.data.id}`);
  });

  it('lists products with search and pagination', async () => {
    const res = await agent.get('/api/admin/products').query({ search: 'whey', page: 1, pageSize: 5 });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta.total).toBeGreaterThan(0);
    expect(res.body.meta.page).toBe(1);
  });
});

describe('admin category CRUD', () => {
  it('creates, updates and deletes a category', async () => {
    const created = await agent.post('/api/admin/categories').send({ name: 'Test Category' });
    expect(created.status).toBe(201);
    expect(created.body.data.slug).toBe('test-category');
    const id = created.body.data.id;

    const updated = await agent.put(`/api/admin/categories/${id}`).send({ name: 'Test Category', isActive: false });
    expect(updated.status).toBe(200);
    expect(updated.body.data.isActive).toBe(false);

    const deleted = await agent.delete(`/api/admin/categories/${id}`);
    expect(deleted.status).toBe(200);
  });

  it('refuses to delete a category that still has products (409)', async () => {
    const res = await agent.delete('/api/admin/categories/protein');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('lists categories with product counts', async () => {
    const res = await agent.get('/api/admin/categories');
    expect(res.status).toBe(200);
    const protein = res.body.data.find((c) => c.id === 'protein');
    expect(protein).toBeDefined();
    expect(protein.productCount).toBeGreaterThan(0);
  });
});

describe('admin orders', () => {
  let orderId; // actually the public order reference (e.g. PC-123456)
  let orderNumericId;

  beforeAll(async () => {
    // Create a real order through the PUBLIC endpoint (like a customer would).
    const res = await request(app).post('/api/orders').send({
      items: [{ productId: 'prod-004', quantity: 1 }],
      customer: { firstName: 'Admin Test', phone: '0555123456' },
      delivery: { method: 'home_delivery', wilayaId: '16', communeId: '16001', address: '1 Test St' },
    });
    expect(res.status).toBe(201);
    orderId = res.body.data.reference;
    const row = await query('SELECT id FROM orders WHERE order_reference = $1', [orderId]);
    orderNumericId = row.rows[0].id;
  });

  it('lists orders from the database', async () => {
    const res = await agent.get('/api/admin/orders').query({ page: 1, pageSize: 5 });
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBeGreaterThan(0);
    const found = res.body.data.find((o) => o.order_reference === orderId);
    expect(found).toBeDefined();
    expect(found.status).toBe('pending');
  });

  it('returns full order detail with snapshotted items', async () => {
    const res = await agent.get(`/api/admin/orders/${orderId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBe(1);
    expect(res.body.data.items[0].unit_price).toBe(3200);
    expect(res.body.data.wilaya_name).toBeTruthy();
  });

  it('updates the order status pending -> confirmed', async () => {
    const res = await agent.patch(`/api/admin/orders/${orderId}/status`).send({ status: 'confirmed' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('confirmed');
    const check = await query('SELECT status FROM orders WHERE id = $1', [orderNumericId]);
    expect(check.rows[0].status).toBe('confirmed');
  });

  it('rejects an invalid status value', async () => {
    const res = await agent.patch(`/api/admin/orders/${orderId}/status`).send({ status: 'teleported' });
    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown order', async () => {
    const res = await agent.get('/api/admin/orders/999999');
    expect(res.status).toBe(404);
  });
});

describe('admin delivery fees', () => {
  it('lists per-wilaya fees with home and pickup columns', async () => {
    const res = await agent.get('/api/admin/delivery-fees').query({ search: 'Alger' });
    expect(res.status).toBe(200);
    const alger = res.body.data.find((f) => f.wilayaId === '16');
    expect(alger).toBeDefined();
    expect(alger.homeDelivery).toBe(400);
    expect(alger.pickupPoint).toBe(0);
  });

  it('updates a fee and the checkout uses the new value', async () => {
    const updated = await agent.put('/api/admin/delivery-fees/16').send({ method: 'home_delivery', fee: 500 });
    expect(updated.status).toBe(200);
    expect(updated.body.data.homeDelivery).toBe(500);

    // A new customer order now pays the admin-configured fee (DB authoritative).
    const order = await request(app).post('/api/orders').send({
      items: [{ productId: 'prod-004', quantity: 1 }],
      customer: { firstName: 'Fee Test', phone: '0555123456' },
      delivery: { method: 'home_delivery', wilayaId: '16', communeId: '16001', address: '1 Test St' },
    });
    expect(order.status).toBe(201);
    expect(order.body.data.deliveryFee).toBe(500);
    expect(order.body.data.total).toBe(3700);

    // Restore the placeholder so other tests keep their expectations.
    await agent.put('/api/admin/delivery-fees/16').send({ method: 'home_delivery', fee: 400 });
  });

  it('rejects a negative fee', async () => {
    const res = await agent.put('/api/admin/delivery-fees/16').send({ method: 'home_delivery', fee: -5 });
    expect(res.status).toBe(400);
  });

  it('toggles wilaya availability', async () => {
    const off = await agent.put('/api/admin/delivery-fees/16/active').send({ isActive: false });
    expect(off.status).toBe(200);
    expect(off.body.data.isActive).toBe(false);
    const on = await agent.put('/api/admin/delivery-fees/16/active').send({ isActive: true });
    expect(on.body.data.isActive).toBe(true);
  });
});

describe('GET /api/admin/dashboard/stats', () => {
  it('returns real numbers from the database', async () => {
    const res = await agent.get('/api/admin/dashboard/stats');
    expect(res.status).toBe(200);
    const s = res.body.data;
    expect(s.totalOrders).toBeGreaterThan(0);
    expect(s.totalProducts).toBe(16);
    expect(Array.isArray(s.recentOrders)).toBe(true);
    expect(Array.isArray(s.ordersByStatus)).toBe(true);
    expect(s.ordersByStatus.find((x) => x.status === 'pending')).toBeDefined();
  });
});

describe('POST /api/admin/auth/logout', () => {
  it('logs out and the old cookie stops working', async () => {
    const loggedOut = await agent.post('/api/admin/auth/logout');
    expect(loggedOut.status).toBe(200);
    const after = await agent.get('/api/admin/auth/session');
    expect(after.status).toBe(401);
  });
});

describe('POST /api/admin/uploads/image', () => {
  // Re-login: the logout test above invalidated the shared agent cookie.
  beforeAll(async () => {
    await agent
      .post('/api/admin/auth/login')
      .send({ username: 'test-admin', password: 'test-admin-pass-123' });
  });

  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  it('rejects unauthenticated uploads', async () => {
    const res = await request(app)
      .post('/api/admin/uploads/image')
      .attach('image', png, 'x.png');
    expect(res.status).toBe(401);
  });

  it('accepts an image and returns a servable URL', async () => {
    const res = await agent
      .post('/api/admin/uploads/image')
      .attach('image', png, 'photo.png');
    expect(res.status).toBe(201);
    expect(res.body.data.url).toMatch(/^https?:\/\/.+\/uploads\/.+\.png$/);
    // The file must actually be served back.
    const served = await request(app).get(new URL(res.body.data.url).pathname);
    expect(served.status).toBe(200);
    expect(served.headers['content-type']).toMatch(/image\/png/);
    // Don't litter the uploads folder with test files.
    const fs = require('fs');
    const path = require('path');
    const filename = new URL(res.body.data.url).pathname.split('/').pop();
    fs.unlinkSync(path.join(__dirname, '..', 'uploads', filename));
  });

  it('rejects non-image files', async () => {
    const res = await agent
      .post('/api/admin/uploads/image')
      .attach('image', Buffer.from('not an image'), 'evil.txt');
    expect(res.status).toBe(400);
  });

  it('rejects a missing file', async () => {
    const res = await agent.post('/api/admin/uploads/image').send({});
    expect(res.status).toBe(400);
  });
});
