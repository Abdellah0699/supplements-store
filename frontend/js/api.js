/**
 * api.js
 * ---------------------------------------------------------
 * Phase 2: this now calls the real backend (see config.js for the
 * base URL) instead of reading local JSON. Every function keeps the
 * exact name and return shape the rest of the frontend already
 * expects, so products.js/categories.js/product-page.js/category-page.js/
 * search.js did not need to change at all.
 *
 * The one real behavior change is createOrder(): the frontend no
 * longer sends prices/totals to the backend (see checkout.js) - the
 * server calculates and returns the authoritative numbers, which this
 * file translates back into the shape the rest of the app expects.
 * ---------------------------------------------------------
 */

const API = (() => {
  const BASE_URL = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || 'http://localhost:5000/api';

  /** Parses a fetch Response, throwing a normal Error (with .code/.fields attached) on failure. */
  async function handleResponse(response) {
    let body;
    try {
      body = await response.json();
    } catch (err) {
      throw new Error('Unexpected response from the server.');
    }

    if (!response.ok || !body.success) {
      const message = (body.error && body.error.message) || 'Something went wrong. Please try again.';
      const err = new Error(message);
      err.code = body.error && body.error.code;
      err.fields = body.error && body.error.fields;
      throw err;
    }

    return body;
  }

  async function getJSON(path) {
    const response = await fetch(`${BASE_URL}${path}`);
    const body = await handleResponse(response);
    return body.data;
  }

  async function getProducts() {
    return getJSON('/products?limit=100');
  }

  async function getProduct(id) {
    try {
      return await getJSON(`/products/${encodeURIComponent(id)}`);
    } catch (err) {
      if (err.code === 'NOT_FOUND') return null;
      throw err;
    }
  }

  async function getProductsByCategory(categoryId) {
    return getJSON(`/categories/${encodeURIComponent(categoryId)}/products`);
  }

  async function getFeaturedProducts() {
    return getJSON('/products?featured=true&limit=100');
  }

  async function getRelatedProducts(product, limit = 4) {
    return getJSON(`/products/${encodeURIComponent(product.id)}/related?limit=${limit}`);
  }

  async function getCategories() {
    return getJSON('/categories');
  }

  async function getCategory(id) {
    try {
      return await getJSON(`/categories/${encodeURIComponent(id)}`);
    } catch (err) {
      if (err.code === 'NOT_FOUND') return null;
      throw err;
    }
  }

  /** Lightweight list (no nested communes) - see location.js for how communes are fetched per-wilaya. */
  async function getWilayas() {
    return getJSON('/locations/wilayas');
  }

  async function getCommunes(wilayaId) {
    return getJSON(`/locations/wilayas/${encodeURIComponent(wilayaId)}/communes`);
  }

  async function searchProducts(query) {
    return getJSON(`/products/search?q=${encodeURIComponent(query)}`);
  }

  /**
   * Display-only estimate (used live as the customer picks a wilaya).
   * Returns a plain number, matching the old mock's contract - the
   * server independently recalculates this again at order submission,
   * so nothing here needs to be trusted.
   */
  async function getDeliveryFee({ wilayaId, deliveryMethod }) {
    if (!wilayaId) return 0;
    const params = new URLSearchParams({ wilayaId, method: deliveryMethod });
    const data = await getJSON(`/delivery/fee?${params.toString()}`);
    return data.fee;
  }

  /**
   * orderData is the minimal, price-free shape built by checkout.js:
   *   { items: [{ productId, quantity }],
   *     customer: { firstName, phone },
   *     delivery: { method, wilayaId, communeId, address } }
   *
   * The response is translated back into the shape order-success.html
   * already reads ({ orderId, order: { productName, quantity, subtotal,
   * delivery: { method, fee }, total } }), so that page needed no changes.
   */
  async function createOrder(orderData) {
    const response = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });
    const body = await handleResponse(response);
    const data = body.data;
    const firstItem = data.items && data.items[0] ? data.items[0] : {};

    return {
      success: true,
      orderId: data.reference,
      order: {
        productName: firstItem.productName,
        quantity: firstItem.quantity,
        unitPrice: firstItem.unitPrice,
        subtotal: data.subtotal,
        delivery: {
          method: orderData.delivery.method,
          fee: data.deliveryFee,
        },
        total: data.total,
      },
    };
  }

  return {
    getProducts,
    getProduct,
    getProductsByCategory,
    getFeaturedProducts,
    getRelatedProducts,
    getCategories,
    getCategory,
    getWilayas,
    getCommunes,
    searchProducts,
    getDeliveryFee,
    createOrder,
  };
})();
