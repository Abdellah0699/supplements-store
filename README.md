# Your Supplement Store — Customer Frontend (Phase 1)

A mobile-first customer-facing frontend for an Algerian dietary supplements
store. Plain HTML, CSS and JavaScript — no frameworks, no build step, no
backend yet.

## Running it locally

Because the pages load data via `fetch()`, they need to be served over
`http://`, not opened directly as `file://` (browsers block local fetches
and the icon sprite's `<use href="...">` references over `file://`).

From this folder, run any static server, for example:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/
```

or, with Node installed:

```bash
npx serve .
```

## Structure

```text
index.html                 Homepage
pages/
  product.html              Product detail + on-page order form
  category.html              Category listing (banner, sort, pill nav)
  search.html                 Search results
  order-success.html           Order confirmation
css/                        style, components, responsive, product,
                              category, checkout — see file headers
js/
  api.js                     The ONLY file that "talks to the backend".
                                Reads local JSON today; swap the body of
                                each function for fetch("/api/...") in
                                Phase 2 and nothing else needs to change.
  products.js / categories.js  Shared markup + formatting helpers
  location.js                  Wilaya -> Commune cascading select logic
  checkout.js                  Order form validation, totals, submission
  product-page.js / category-page.js / search.js
                                Page-specific controllers
  app.js                      Site-wide chrome (mobile nav, header search)
                                + homepage content loading
data/
  products.json                16 sample products across all 10 categories
  categories.json               10 categories
  algeria-locations.json         All 69 wilayas with their communes
                                  (1,708 communes total)
assets/                      SVG placeholders for logo, hero banner,
                              category icons and product images, plus an
                              icon sprite (assets/icons/sprite.svg)
```

## Notes on the sample data

- **Products and categories are placeholders.** They're realistic enough to
  demonstrate the UI (discounts, featured flags, flavors, out-of-stock
  state) but are meant to be replaced by the admin dashboard in a later
  phase.
- **Images are generated SVG placeholders**, not real product photos — swap
  the files under `assets/images/` (same filenames) once real photography
  is available, or point `image` in `products.json` at new files.
- **`algeria-locations.json` is real data**, not a placeholder: all 69
  wilayas (Algeria's current administrative count) with their communes.
- **The logo is a placeholder** (`assets/images/logo/logo.jpg`). Replace it
  with the client's real logo file at the same path, or update the `<img
  src>` references if the filename changes.

## Delivery fee logic (Phase 1 mock)

`API.getDeliveryFee()` in `js/api.js` currently returns a flat rate: free
for pickup points, a lower rate for a few wilayas near the depot (Alger,
Blida, Boumerdès, Tipaza), and a flat rate elsewhere. This is a stand-in —
Phase 2's backend should own real per-wilaya pricing. Nothing on the
product page needs to change; it already awaits whatever
`API.getDeliveryFee()` resolves to.

## What's intentionally NOT here yet

Per the Phase 1 brief: no backend, no database, no admin dashboard, no
authentication, no payment gateway. `js/api.js` is written so that Phase 2
only requires replacing local JSON reads with real `fetch()` calls —
`API.createOrder()`, `API.getProducts()` etc. are already shaped like
future endpoints.

## Multilingual support (prepared, not built)

Text isn't yet centralized into a translation file — for a static site
this size that would have added complexity without payoff yet. All
user-facing strings live directly in the HTML/JS, in clearly-scoped
places (page templates, `products.json` fields), so introducing an
Arabic/French translation layer later is a matter of extracting those
strings rather than restructuring the app.

## Browser support

Modern evergreen browsers. Uses `:has()` (for the delivery-method radio
card styling) and `aspect-ratio` — both are supported in current Chrome,
Safari, Firefox and Edge, but not in older browser versions.
