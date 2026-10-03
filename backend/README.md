# Supplements Store — Backend (Phase 2)

A REST API in front of PostgreSQL for the Algerian dietary supplements
store. This replaces the local JSON files the Phase 1 frontend used to
read directly — the database is now the source of truth for products,
categories, locations, delivery pricing, and orders.

Stack: **Node.js + Express + PostgreSQL**, no other framework.

## 1. Install dependencies

```bash
cd backend
npm install
```

## 2. Configure `.env`

```bash
cp .env.example .env
```

Then edit `.env`:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://username:password@localhost:5432/supplements_store
FRONTEND_URL=http://localhost:5500

# Phase 4 — admin authentication (see "Phase 4: admin backend" below)
AUTH_SECRET=<generate-with-crypto-randomBytes>
AUTH_TOKEN_TTL_SECONDS=43200
AUTH_COOKIE_SAMESITE=lax

# First admin account — only used by `npm run seed` (min 8 chars, bcrypt-hashed)
ADMIN_USERNAME=
ADMIN_PASSWORD=
```

- `DATABASE_URL` — your local PostgreSQL connection string.
- `FRONTEND_URL` — exactly where the frontend is served from. The API
  only accepts cross-origin requests from this one origin (see
  `src/app.js`) — update it for whatever URL you actually deploy the
  frontend to. The admin dashboard runs on the same origin in
  development (`http://localhost:5500/admin/`), and admin API requests
  use cookies, so CORS is configured with `credentials: true`.
- `AUTH_SECRET` — signs admin session tokens. **Required in
  production** (the server refuses to start without it); in
  development a warning is printed and a fallback is used. Generate
  one with:
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
- `AUTH_TOKEN_TTL_SECONDS` — how long an admin stays logged in
  (43200 = 12 hours).
- `AUTH_COOKIE_SAMESITE` — `lax` when the admin frontend and API are
  on the same site (default, including localhost dev); `none` when
  they're on different sites (requires HTTPS).
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` — credentials for the first
  admin account, created by the seed script (see step 5). The password
  is hashed with bcrypt (cost 12) before it ever reaches the
  database and is never logged.

`.env` is already in `.gitignore` — never commit it.

## 3. Create the PostgreSQL database

```bash
createdb supplements_store
```

(Or create it however you normally manage Postgres — pgAdmin, a
hosting provider's dashboard, etc. Just make sure the name matches
`DATABASE_URL`.)

## 4. Run migrations

```bash
npm run migrate
```

This applies every `.sql` file in `db/migrations/` in order, and
tracks what's already been applied in a `schema_migrations` table —
running it again is always safe and only applies what's new.

## 5. Seed the database

```bash
npm run seed
```

This reads the **existing Phase 1 frontend's** `frontend/data/*.json`
files and loads them in:

- `categories.json` → `categories` table
- `products.json` → `products` table
- `algeria-locations.json` → `wilayas` + `communes` tables (69
  wilayas, ~1,700 communes, already including Arabic names)
- placeholder per-wilaya delivery pricing → `delivery_fees` table
  (see the note below — **replace these with real numbers**)

Running it again is safe (it upserts by ID rather than duplicating
rows). The seed also creates the **first admin account** from
`ADMIN_USERNAME`/`ADMIN_PASSWORD` in `.env` — if either is missing,
the admin account step is skipped with a warning (products,
categories, locations and delivery fees are still seeded). The
password is bcrypt-hashed before storage and is never printed.

### ⚠️ About delivery pricing

`db/seed/delivery-fees.seed.js` seeds the *same flat mock rates* the
old frontend used to hardcode (a handful of wilayas at 400 DA, the
rest at 600 DA) — just moved into the database so there's a real row
to query instead of logic buried in JavaScript. **These are
placeholders, not real prices.** Update the `delivery_fees` table with
the client's actual per-wilaya pricing before going live — either
directly in the database for now, or through the admin dashboard once
Phase 3 exists. Nothing else needs to change when you do: every part
of the API that calculates a delivery fee reads from this one table
(see `src/services/delivery.service.js`).

## 6. Start the backend

```bash
npm run dev      # auto-reloads on file changes (nodemon)
# or
npm start        # plain node
```

You should see:

```
[server] Database connection OK.
[server] Listening on http://localhost:5000 (development)
[server] API base: http://localhost:5000/api
```

Check it's alive:

```bash
curl http://localhost:5000/api/health
```

## 7. Connect the frontend

Open `frontend/js/config.js` — it's the **only** place the backend's
URL is configured:

```js
window.APP_CONFIG = {
  API_BASE_URL: 'http://localhost:5000/api',
};
```

Change that one line if your backend runs somewhere other than
`localhost:5000` (e.g. once deployed). Nothing else in the frontend
hardcodes a backend URL.

Serve the frontend with any static server, e.g.:

```bash
cd frontend
python3 -m http.server 5500
```

...and make sure `FRONTEND_URL` in the backend's `.env` matches
wherever you actually serve it from, or the browser's CORS check will
block every request.

## 8. Run the tests

```bash
npm test
```

59 tests: the original 31 (every read endpoint + order creation,
including the two tamper tests proving a spoofed price or fee in the
request body has no effect) plus 28 new Phase 4 admin tests covering:
admin login (success, wrong password, unknown username — all with the
same generic error), inactive admin rejection, unauthenticated
requests to every admin route, session check, product CRUD (including
duplicate-slug and unknown-category rejection), category CRUD
(including delete-guarded when products reference it), product-delete
guard when order history references it, order list/detail/status
update (including invalid-status rejection), delivery-fee list/update/
active-toggle, a customer checkout after a delivery fee change, and
logout invalidating access.

Tests run against `DATABASE_URL` from `.env` (via `NODE_ENV=test`,
which also relaxes rate limiting so the test suite's many requests
don't trip it). They create and leave behind a handful of test orders
— harmless, but if you want a clean database, point `DATABASE_URL` at
a separate test database before running them.

---

## What changed in the existing frontend

Per the brief, the redesign was **not** touched. Exactly four
JavaScript files changed, plus one new tiny one:

| File | What changed |
|---|---|
| `js/config.js` | **New.** The one place the API base URL lives. |
| `js/api.js` | Rewritten to call this backend instead of reading local JSON. Every function kept its exact name and return shape, so no other frontend file needed to change. |
| `js/checkout.js` | The order payload sent to the server no longer includes any price, fee, or total — just `items` (product id + quantity), `customer`, and `delivery` (method + wilaya/commune IDs + address). The server calculates and returns the authoritative numbers. The live order-summary preview the customer sees while filling the form is unchanged (still calls `GET /api/delivery/fee` for a live estimate) — only what gets *submitted* changed. |
| `js/location.js` | `GET /api/locations/wilayas` no longer returns communes nested inside each wilaya (that would mean ~1,700 rows on every page load). Communes are now fetched on demand via `GET /api/locations/wilayas/:id/communes` each time the customer picks a wilaya. |

`data/products.json`, `data/categories.json`, and
`data/algeria-locations.json` are no longer read live by the site —
they're only used by the seed scripts now, as the one-time source for
populating the database. They're left in place for that reason; don't
delete them.

---

## Project structure

```
backend/
├── src/
│   ├── server.js            entry point - checks DB, then listens
│   ├── app.js                Express app: middleware, routes, error handling
│   ├── config/
│   │   ├── env.js             loads/validates environment variables
│   │   └── database.js         pg Pool + query()/withTransaction() helpers
│   ├── routes/                one file per resource, thin
│   ├── controllers/            parse request -> call service -> format response
│   ├── services/                all business logic and SQL lives here
│   ├── middleware/
│   │   ├── error.middleware.js        formats every error consistently
│   │   ├── validation.middleware.js    asyncHandler + Zod validation wrappers
│   │   └── rate-limit.middleware.js     general + order-specific limiters
│   └── utils/
│       ├── phone.js             Algerian phone normalize/validate
│       ├── validation.js         Zod schemas
│       ├── app-error.js           the one error shape used everywhere
│       └── order-reference.js      generates "PC-123456" references
├── db/
│   ├── migrate.js              tiny dependency-free migration runner
│   ├── migrations/              001...006, applied in filename order
│   └── seed/                    reads frontend/data/*.json into Postgres
└── tests/                      Jest + Supertest
```

---

## Database schema

```
categories ──┬── products
             │
wilayas ──┬── communes
          │
          ├── delivery_fees ── delivery_methods
          │
          └── orders ── order_items ── products
                └── delivery_methods
```

- **Stable IDs preserved**: categories keep IDs like `protein`,
  products keep IDs like `prod-001` — exactly what the existing
  frontend already uses in URLs (`category.html?id=protein`) and in
  `products.json`/`categories.json`. No frontend links needed to
  change.
- **`order_items.product_name` / `unit_price` are snapshots.** If the
  admin changes a product's price next month, last month's orders
  still show what the customer actually paid — order totals are never
  recomputed from current product data.
- **The wilaya↔commune relationship is enforced twice**: communes have
  a foreign key to their wilaya (so a commune can't reference a
  nonexistent wilaya), and order creation additionally checks that the
  *specific* commune sent belongs to the *specific* wilaya sent (a
  single FK can't express "this pair matches" — see
  `orders.service.js`).
- **`benefits` and `flavors`** on products stay as JSONB arrays rather
  than separate tables — they're small, product-owned lists with no
  independent identity, so a join table would add complexity without
  benefit at this scale.

---

## API reference

Base URL: `http://localhost:5000/api` (configurable — see step 2).

Every response is one of:

```json
{ "success": true, "data": { /* or [] */ }, "meta": { /* optional, e.g. pagination */ } }
```
```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "fields": { "phone": "..." } } }
```

### Health

```
GET /api/health
→ { "success": true, "status": "ok", "database": true }
```

### Products

```
GET /api/products
GET /api/products?category=protein
GET /api/products?featured=true
GET /api/products?available=true
GET /api/products?page=1&limit=20        (limit: 1-100, default 20)
```
```
GET /api/products/:id                     e.g. /api/products/prod-001
GET /api/products/slug/:slug
GET /api/products/:id/related?limit=4
GET /api/products/search?q=creatine
```

Product shape (unchanged from Phase 1's `products.json`):

```json
{
  "id": "prod-001",
  "name": "Whey Protein Isolate",
  "slug": "whey-protein-isolate",
  "categoryId": "protein",
  "price": 8500,
  "oldPrice": 9500,
  "currency": "DZD",
  "image": "assets/images/products/whey-isolate.jpg",
  "shortDescription": "...",
  "description": "...",
  "benefits": ["27g of protein per serving", "..."],
  "usage": "...",
  "flavors": ["Chocolate", "Vanilla", "Strawberry"],
  "available": true,
  "featured": true
}
```

### Categories

```
GET /api/categories
GET /api/categories/:id
GET /api/categories/:id/products
```

### Locations

```
GET /api/locations/wilayas                          -> [{ id, name, nameAr }]  (no nested communes)
GET /api/locations/wilayas/:wilayaId/communes        -> [{ id, name, nameAr }]  (only that wilaya's)
```

### Delivery

```
GET /api/delivery/fee?wilayaId=16&method=home_delivery
→ { "success": true, "data": { "wilayaId": "16", "deliveryMethod": "home_delivery", "fee": 400, "currency": "DZD" } }
```

**Display only.** The fee is recalculated independently when an order
is actually submitted — this endpoint exists so the frontend can show
a live estimate while the customer is still filling out the form.

### Orders

```
POST /api/orders
```

Request:

```json
{
  "items": [{ "productId": "prod-001", "quantity": 1 }],
  "customer": { "firstName": "Amine", "phone": "0551234567" },
  "delivery": {
    "method": "home_delivery",
    "wilayaId": "16",
    "communeId": "16001",
    "address": "12 Rue des Frères, Alger"
  }
}
```

Success (`201`):

```json
{
  "success": true,
  "data": {
    "reference": "PC-482731",
    "status": "pending",
    "subtotal": 8500,
    "deliveryFee": 400,
    "total": 8900,
    "currency": "DZD",
    "items": [{ "productId": "prod-001", "productName": "Whey Protein Isolate", "quantity": 1, "unitPrice": 8500, "subtotal": 8500 }]
  }
}
```

Validation error (`400`) — same shape whether it's a bad phone number,
an unknown wilaya, a commune from the wrong wilaya, an out-of-stock
product, a missing address for home delivery, or an invalid quantity:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please check the submitted information.",
    "fields": { "phone": "Enter a valid Algerian number, e.g. 0555123456." }
  }
}
```

**No price, fee, or total in the request is ever trusted.** The
server looks up each product's current price, recalculates the
delivery fee from the database, and computes the subtotal/total itself
— see `tests/orders.test.js` for the tests that specifically confirm a
spoofed price or fee in the request body has no effect on the order
that actually gets created.

There is deliberately no `GET /api/orders/:id` — an unauthenticated
public order-lookup endpoint would let anyone enumerate other
customers' orders by guessing IDs. Add one later behind a secure
token/lookup code if order tracking becomes a requirement.

---

## Security measures in place

- **Helmet** (sets a set of protective HTTP headers)
- **CORS** restricted to one configured `FRONTEND_URL`, not `*`
- **Rate limiting**: 300 req/15min general, 10 orders/10min per client
- **Zod validation** on every request body/query before it reaches a service
- **Parameterized SQL everywhere** — no query is ever built by
  concatenating user input into a string
- **Request body size capped** at 100kb
- **No stack traces or internal details in error responses**
  (`NODE_ENV=production` also hides the `debug` field that's present
  in development's 500 responses)
- **Database transactions** for order creation — an order and its
  items are either both written or neither is; a race on the order
  reference retries with a new one rather than failing the order

---

## Deploying frontend and backend separately

`FRONTEND_URL` (backend) and `API_BASE_URL` (frontend's `js/config.js`)
are the only two places either side needs to know about the other.
For example:

```
Frontend: https://your-store.netlify.app
Backend:  https://api.your-store.com
```

Update those two values and nothing else needs to change. The backend
works as-is on Render, Railway, Fly.io, or a plain VPS — it only needs
Node.js and a reachable PostgreSQL instance (managed or self-hosted).

---

## Phase 4 — admin backend (done)

Phase 4 added a real, authenticated admin backend on top of the same
PostgreSQL database — no second project, no dashboard redesign, no
customer-site changes.

### Architecture

```
Customer website  →  /api/* (public)   ─┐
                                        ├→  PostgreSQL (one source of truth)
Admin dashboard   →  /api/admin/* (JWT) ─┘
```

The admin dashboard's `frontend/admin/js/admin-api.js` now talks to
the real backend instead of the Phase 3 mock data (the mock files are
deleted). All other admin page code is unchanged — same design, same
9 pages.

### Authentication

- `POST /api/admin/auth/login` — verifies the bcrypt hash, returns an
  **HttpOnly `admin_session` cookie** carrying a signed JWT. The
  browser stores no token anywhere readable by JavaScript, so an XSS
  payload can't steal the session. Invalid credentials (wrong
  password, unknown username, inactive account) all get the same
  generic 401 — the API never reveals whether a username exists.
- `GET /api/admin/auth/session` — tells the dashboard who's logged
  in; on 401 the dashboard redirects to the login page.
- `POST /api/admin/auth/logout` — clears the cookie; the old token
  can no longer be used.
- Every `/api/admin/*` route (except login) runs through
  `requireAdmin`: it verifies the JWT signature, checks the admin
  still exists and is active, and rate-limits login (20 attempts per
  15 minutes).
- Cookie security: `HttpOnly`, `SameSite` configurable
  (`lax` for same-site dev, `none` + HTTPS in production), `Secure`
  automatically enabled in production.

### Admin API reference

All routes below require the admin session cookie. Shapes mirror the
public API (`{ success, data, meta? }`).

```
Dashboard
  GET /api/admin/dashboard/stats
    → { totalOrders, pendingOrders, totalProducts, totalSales,
        revenueByStatus, recentOrders }

Products
  GET    /api/admin/products?page=1&pageSize=20&search=&categoryId=
  GET    /api/admin/products/:id
  POST   /api/admin/products          { name, categoryId, price, ... }
  PUT    /api/admin/products/:id
  DELETE /api/admin/products/:id      (refused if orders reference it)

Categories
  GET    /api/admin/categories
  GET    /api/admin/categories/:id
  POST   /api/admin/categories        { name, ... }
  PUT    /api/admin/categories/:id
  DELETE /api/admin/categories/:id    (refused while products use it)

Orders
  GET   /api/admin/orders?page=1&pageSize=20&status=&search=
  GET   /api/admin/orders/:idOrReference   (accepts numeric id or PC-XXXXXX)
  PATCH /api/admin/orders/:idOrReference/status   { status }
        status ∈ pending|confirmed|processing|shipped|delivered|cancelled

Delivery fees
  GET /api/admin/delivery-fees
    → [{ wilayaId, wilayaName, homeDelivery, pickupPoint, isActive }, ...]
  PUT /api/admin/delivery-fees/:wilayaId   { method, fee }
  PUT /api/admin/delivery-fees/:wilayaId/active   { isActive }

Image uploads
  POST /api/admin/uploads/image   (multipart form, field name `image`)
    → { url } — the full URL of the uploaded photo, stored as the
      product's `image`. JPG/PNG/WebP/GIF only, max 5 MB. Files are
      kept in backend/uploads/ (gitignored) and served at /uploads/*.
      Note: on hosts with an ephemeral filesystem (e.g. free tiers),
      move uploads to object storage before relying on them in
      production.
```

### Key guarantees

- **One database.** Admin writes land in the same PostgreSQL the
  customer site reads — a price change in the dashboard is live on
  the storefront immediately, and a customer's order appears in the
  dashboard the moment it's placed.
- **History is immutable.** Orders keep snapshotted `product_name`
  and `unit_price`; editing a product price never rewrites past
  orders (verified in the test suite).
- **Pickup-point fees are real.** The `delivery_fees` table holds
  both `home_delivery` and `pickup_point` rows per wilaya (seeded at
  0 DA placeholders — **replace with real numbers**), and the admin
  dashboard edits them directly. The customer checkout reads the
  same rows; the Phase 3 review finding (pickup fee hardcoded
  client-side) is fixed.
- **No fake login remains.** The Phase 3 demo login ("any
  credentials") is gone — the dashboard refuses to load until the
  backend session check passes, and an expired session returns the
  admin to the login page.
- **No USD anywhere.** All amounts stay in DA (`currency: "DZD"`).

### Creating more admins

There is no signup endpoint by design. To add an admin, set
`ADMIN_USERNAME`/`ADMIN_PASSWORD` in `.env` and run `npm run seed`
again — it upserts the account (creates or reactivates it with the
new password). Deleting or deactivating an account is a SQL update
on `admin_users`.

### Project structure (Phase 4 additions)

```
backend/
├── db/migrations/007_create_admin_users.sql   admin_users table
├── db/seed/admin-user.seed.js                  first-admin creation
└── src/
    ├── routes/admin.routes.js                  all /api/admin/* routes
    ├── controllers/
    │   ├── admin-auth.controller.js            login/logout/session
    │   ├── admin-products.controller.js
    │   ├── admin-categories.controller.js
    │   ├── admin-orders.controller.js
    │   ├── admin-delivery.controller.js
    │   └── admin-dashboard.controller.js
    ├── services/
    │   ├── admin-auth.service.js               bcrypt verify + JWT issue
    │   ├── admin-orders.service.js             list/detail/status update
    │   └── dashboard.service.js                statistics
    └── middleware/auth.middleware.js          requireAdmin
```

`products.service.js`, `categories.service.js` and
`delivery.service.js` were extended with create/update/delete logic
used by the admin controllers; the public read paths are untouched.
