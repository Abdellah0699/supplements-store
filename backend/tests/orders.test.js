const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/database');

afterAll(async () => {
  await pool.end();
});

const validOrder = () => ({
  items: [{ productId: 'prod-004', quantity: 1 }], // Creatine Monohydrate 500g, 3200 DA
  customer: { firstName: 'Test', phone: '0555123456' },
  delivery: { method: 'pickup_point', wilayaId: '16', communeId: '16001', address: '' },
});

describe('POST /api/orders - valid order', () => {
  it('creates an order and returns server-calculated totals', async () => {
    const res = await request(app).post('/api/orders').send(validOrder());
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reference).toMatch(/^PC-\d{6}$/);
    expect(res.body.data.status).toBe('pending');
    expect(res.body.data.subtotal).toBe(3200);
    expect(res.body.data.deliveryFee).toBe(0); // pickup point
    expect(res.body.data.total).toBe(3200);
  });

  it('calculates delivery fee for home delivery from the database', async () => {
    const payload = validOrder();
    payload.delivery = { method: 'home_delivery', wilayaId: '16', communeId: '16001', address: '12 Rue Test' };
    const res = await request(app).post('/api/orders').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.data.deliveryFee).toBe(400); // Alger is a "near" wilaya in the seeded placeholder pricing
    expect(res.body.data.total).toBe(3600);
  });

  it('multiplies price by quantity correctly', async () => {
    const payload = validOrder();
    payload.items = [{ productId: 'prod-004', quantity: 3 }];
    const res = await request(app).post('/api/orders').send(payload);
    expect(res.body.data.subtotal).toBe(9600);
  });
});

describe('POST /api/orders - the browser cannot be trusted', () => {
  it('ignores a client-sent price/subtotal/total and uses the real database price', async () => {
    const payload = {
      items: [{ productId: 'prod-001', quantity: 1, unitPrice: 1, price: 1 }], // prod-001 is really 8500 DA
      customer: { firstName: 'Attacker', phone: '0555123456' },
      delivery: { method: 'pickup_point', wilayaId: '16', communeId: '16001', address: '' },
      subtotal: 1,
      total: 1,
    };
    const res = await request(app).post('/api/orders').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.data.subtotal).toBe(8500);
    expect(res.body.data.total).toBe(8500);
  });

  it('ignores a client-sent delivery fee and recalculates it', async () => {
    const payload = {
      items: [{ productId: 'prod-004', quantity: 1 }],
      customer: { firstName: 'Attacker', phone: '0555123456' },
      delivery: { method: 'home_delivery', wilayaId: '31', communeId: '31001', address: 'test', fee: 0 },
    };
    const res = await request(app).post('/api/orders').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.data.deliveryFee).toBe(600); // Oran is NOT a "near" wilaya - real fee, not the spoofed 0
  });
});

describe('POST /api/orders - validation rejections', () => {
  it('rejects an invalid phone number', async () => {
    const payload = validOrder();
    payload.customer.phone = '12345';
    const res = await request(app).post('/api/orders').send(payload);
    expect(res.status).toBe(400);
    expect(res.body.error.fields.phone).toBeDefined();
  });

  it('rejects an unknown product', async () => {
    const payload = validOrder();
    payload.items = [{ productId: 'prod-does-not-exist', quantity: 1 }];
    const res = await request(app).post('/api/orders').send(payload);
    expect(res.status).toBe(400);
  });

  it('rejects an unavailable product', async () => {
    // prod-016 is temporarily marked unavailable by this test, then restored.
    const { pool } = require('../src/config/database');
    await pool.query("UPDATE products SET available = false WHERE id = 'prod-016'");
    try {
      const payload = validOrder();
      payload.items = [{ productId: 'prod-016', quantity: 1 }];
      const res = await request(app).post('/api/orders').send(payload);
      expect(res.status).toBe(400);
      expect(res.body.error.fields.items).toMatch(/out of stock/i);
    } finally {
      await pool.query("UPDATE products SET available = true WHERE id = 'prod-016'");
    }
  });

  it('rejects an unknown wilaya', async () => {
    const payload = validOrder();
    payload.delivery.wilayaId = '999';
    const res = await request(app).post('/api/orders').send(payload);
    expect(res.status).toBe(400);
    expect(res.body.error.fields.wilayaId).toBeDefined();
  });

  it('rejects a commune that belongs to a different wilaya', async () => {
    const payload = validOrder();
    payload.delivery.wilayaId = '31'; // Oran
    payload.delivery.communeId = '16001'; // an Alger commune
    const res = await request(app).post('/api/orders').send(payload);
    expect(res.status).toBe(400);
    expect(res.body.error.fields.communeId).toBeDefined();
  });

  it('requires an address for home delivery', async () => {
    const payload = validOrder();
    payload.delivery = { method: 'home_delivery', wilayaId: '16', communeId: '16001', address: '' };
    const res = await request(app).post('/api/orders').send(payload);
    expect(res.status).toBe(400);
    expect(res.body.error.fields.address).toBeDefined();
  });

  it('does not require an address for pickup point', async () => {
    const payload = validOrder(); // already pickup_point with empty address
    const res = await request(app).post('/api/orders').send(payload);
    expect(res.status).toBe(201);
  });

  it('rejects an invalid delivery method', async () => {
    const payload = validOrder();
    payload.delivery.method = 'teleportation';
    const res = await request(app).post('/api/orders').send(payload);
    expect(res.status).toBe(400);
  });

  it('rejects a zero or negative quantity', async () => {
    const payload = validOrder();
    payload.items = [{ productId: 'prod-004', quantity: 0 }];
    const res = await request(app).post('/api/orders').send(payload);
    expect(res.status).toBe(400);
  });

  it('rejects a non-integer quantity', async () => {
    const payload = validOrder();
    payload.items = [{ productId: 'prod-004', quantity: 1.5 }];
    const res = await request(app).post('/api/orders').send(payload);
    expect(res.status).toBe(400);
  });

  it('rejects an empty items array', async () => {
    const payload = validOrder();
    payload.items = [];
    const res = await request(app).post('/api/orders').send(payload);
    expect(res.status).toBe(400);
  });

  it('rejects a missing first name', async () => {
    const payload = validOrder();
    payload.customer.firstName = '';
    const res = await request(app).post('/api/orders').send(payload);
    expect(res.status).toBe(400);
  });
});
