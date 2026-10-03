# Admin Dashboard — Phase 4

The store owner's interface: a professional, mobile-friendly
dashboard for managing the catalog, orders, delivery fees, and
locations. It lives in `frontend/admin/` and does **not** touch the
customer storefront — the Phase 1 site is unchanged.

**Phase 4 is done:** the dashboard now talks to the real backend
(`backend/` → PostgreSQL) over authenticated HTTP. No mock data
remains.

## Run it

Serve the whole `frontend/` folder with any static server:

```bash
cd frontend
python3 -m http.server 5500
```

Open `http://localhost:5500/admin/` and sign in.

## Sign-in (real authentication)

Sign in with an admin account created by the backend seed script
(see `backend/README.md` → "Phase 4 — admin backend"). The backend
verifies your password (bcrypt), then gives your browser an HttpOnly
`admin_session` cookie holding a signed JWT — no token is ever
visible to JavaScript. Every page verifies the session with the
server before loading; an expired or missing session sends you back
to the login page.

## Pages

| Page | What it does |
|---|---|
| `index.html` | Sign-in (demo) |
| `dashboard.html` | Total orders, pending orders, products, total sales (DA), recent orders, orders by status |
| `products.html` | Search, filter by category/availability, paginate, add/edit/delete |
| `product-form.html` | Reusable add/edit form — every field of the Phase 2 product model |
| `categories.html` | Add/edit/delete (deletion blocked while products use the category) |
| `orders.html` | Search + status filter, pagination, full customer/delivery/financial columns |
| `order-detail.html` | Items, customer, delivery address, totals, status control, timeline |
| `delivery.html` | Per-wilaya home-delivery & pickup fees, enable/disable |
| `locations.html` | Wilaya → commune browser (69 wilayas, 1,708 communes) |

Every page has loading, empty, and error states, and works from mobile
(drawer navigation) through tablet to desktop (sidebar).

## Architecture

```
frontend/admin/
├── index.html … locations.html   one file per page, no framework
├── css/admin.css                 the admin theme (tokens → components → responsive)
├── js/
│   ├── config.js                 the one place the API base URL lives
│   ├── admin-api.js              THE contract: every page talks to the backend only through AdminAPI
│   ├── utils.js                  formatting, slug, debounce…
│   ├── components.js             modal, confirm, toast, pagination, badges, state blocks
│   ├── layout.js                 sidebar / header / mobile drawer / auth guard (server-verified)
│   └── pages/*.js                one small script per page
```

`js/admin-api.js` is the real HTTP adapter: credentialed `fetch()`
against `/api/admin/*`, with automatic redirect to the login page on
401 (expired session). Nothing in the UI holds a token — the session
lives in the HttpOnly cookie the backend set at login.

## Backend contract

Method names, arguments, and resolved shapes in `js/admin-api.js`
are the contract with `backend/src/routes/admin.routes.js` and the
controllers/services behind it. The full endpoint reference is in
`backend/README.md` → "Phase 4 — admin backend".
