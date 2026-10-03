# Supplements Store

An Algerian dietary supplements e-commerce site: a vanilla HTML/CSS/JS
customer storefront backed by a Node.js/Express/PostgreSQL API.

```
supplements-store/
├── frontend/           Phase 1 — the customer-facing site (unchanged design)
│   └── admin/          Phase 3 — the admin dashboard (this phase)
├── backend/            Phase 2 — REST API + PostgreSQL
└── README.md           you are here
```

## Quick start

Two things need to run at once: the backend (API + database) and the
frontend (a static file server). Full detail for each is in its own
README — this is just the fastest path to seeing it work.

**1. Backend** — see [`backend/README.md`](backend/README.md) for full
setup. Short version:

```bash
cd backend
npm install
cp .env.example .env        # then edit DATABASE_URL if needed
createdb supplements_store
npm run migrate
npm run seed
npm run dev
```

The API is now at `http://localhost:5000/api`.

**2. Frontend** — serve it with any static server:

```bash
cd frontend
python3 -m http.server 5500
```

Open `http://localhost:5500`. If your backend isn't on
`localhost:5000`, update the one line in `frontend/js/config.js`
first.

## What's where

- **`frontend/`** — the site a customer sees: homepage, category and
  product pages, search, the on-page checkout form, order
  confirmation. English/French/Arabic (with full right-to-left layout
  for Arabic). This is the Phase 1 build; its design was not changed
  for Phase 2 or Phase 3 — see `backend/README.md` → "What changed in
  the existing frontend" for the short, specific list of files that
  *were* touched to connect it to the real API.
- **`frontend/admin/`** — the store owner's dashboard (your light
  theme, deep-green sidebar, mobile fixes all intact): real login
  (bcrypt + JWT cookie, no more demo credentials), sales/order/
  product stats from the live database, product and category
  management, order list + order details with status control,
  delivery-fee management (both home-delivery and pickup-point fees,
  stored in the database), and a wilaya/commune browser. No mock
  data remains — every page reads from PostgreSQL. See
  `frontend/admin/README.md`.
- **`backend/`** — the REST API and PostgreSQL database that now
  back it: products, categories, Algeria's wilayas/communes, delivery
  pricing, and order creation with full server-side validation (a
  customer's browser is never trusted for price, availability, or
  whether a commune actually belongs to the wilaya they picked).

## Phase 4 (done)

Admin authentication (bcrypt-hashed accounts, JWT in an HttpOnly
cookie, login rate limiting) and the real admin API —
`/api/admin/*` — that `frontend/admin/js/admin-api.js` is wired to.
Customer website → public API → PostgreSQL ← admin API ← admin
dashboard: one database, one source of truth. Full details, the
auth architecture, and the endpoint reference are in
[`backend/README.md`](backend/README.md) → "Phase 4 — admin backend".
