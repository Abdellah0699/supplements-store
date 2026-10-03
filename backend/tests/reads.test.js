const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/database');

afterAll(async () => {
  await pool.end();
});

describe('GET /api/health', () => {
  it('reports ok with database connectivity', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.database).toBe(true);
  });
});

describe('GET /api/products', () => {
  it('returns a list of products', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('filters by category', async () => {
    const res = await request(app).get('/api/products?category=protein');
    expect(res.status).toBe(200);
    expect(res.body.data.every((p) => p.categoryId === 'protein')).toBe(true);
  });

  it('rejects a limit outside the allowed range', async () => {
    const res = await request(app).get('/api/products?limit=999');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/products/:id', () => {
  it('returns a single product', async () => {
    const res = await request(app).get('/api/products/prod-001');
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('prod-001');
  });

  it('404s for an unknown id', async () => {
    const res = await request(app).get('/api/products/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('GET /api/products/search', () => {
  it('finds products by name', async () => {
    const res = await request(app).get('/api/products/search?q=creatine');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('requires a query', async () => {
    const res = await request(app).get('/api/products/search');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/categories', () => {
  it('returns categories', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});

describe('GET /api/locations/wilayas', () => {
  it('returns all 69 wilayas without nested communes', async () => {
    const res = await request(app).get('/api/locations/wilayas');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(69);
    expect(res.body.data[0].communes).toBeUndefined();
  });
});

describe('GET /api/locations/wilayas/:id/communes', () => {
  it('returns only communes for that wilaya', async () => {
    const res = await request(app).get('/api/locations/wilayas/16/communes');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('404s for an unknown wilaya', async () => {
    const res = await request(app).get('/api/locations/wilayas/999/communes');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/delivery/fee', () => {
  it('returns a fee for home delivery', async () => {
    const res = await request(app).get('/api/delivery/fee?wilayaId=16&method=home_delivery');
    expect(res.status).toBe(200);
    expect(typeof res.body.data.fee).toBe('number');
  });

  it('pickup is always free', async () => {
    const res = await request(app).get('/api/delivery/fee?wilayaId=31&method=pickup_point');
    expect(res.status).toBe(200);
    expect(res.body.data.fee).toBe(0);
  });
});
