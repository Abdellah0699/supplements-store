/**
 * api.js
 * ---------------------------------------------------------
 * A single place that talks to "the backend". For Phase 1 this
 * reads local JSON files and adds a small artificial delay so
 * loading states are visible. In Phase 2, swap the body of each
 * function for a real fetch("/api/...") call — nothing that
 * calls API.* needs to change.
 * ---------------------------------------------------------
 */

const API = (() => {
  const BASE_DATA_PATH = resolveDataPath();

  // Small helper: resolves data/ relative to the page, whether the
  // page lives at the site root or inside /pages/.
  function resolveDataPath() {
    const inPagesFolder = window.location.pathname.includes('/pages/');
    return inPagesFolder ? '../data/' : 'data/';
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function fetchJSON(fileName) {
    const response = await fetch(BASE_DATA_PATH + fileName, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to load ${fileName}`);
    }
    return response.json();
  }

  let productsCache = null;
  let categoriesCache = null;
  let locationsCache = null;

  async function getProducts() {
    await delay(250);
    if (!productsCache) {
      const data = await fetchJSON('products.json');
      productsCache = data.products;
    }
    return productsCache;
  }

  async function getProduct(id) {
    const products = await getProducts();
    return products.find((p) => p.id === id || p.slug === id) || null;
  }

  async function getProductsByCategory(categoryId) {
    const products = await getProducts();
    return products.filter((p) => p.categoryId === categoryId);
  }

  async function getFeaturedProducts() {
    const products = await getProducts();
    return products.filter((p) => p.featured);
  }

  async function getRelatedProducts(product, limit = 4) {
    const products = await getProducts();
    return products
      .filter((p) => p.id !== product.id && p.categoryId === product.categoryId)
      .slice(0, limit);
  }

  async function getCategories() {
    await delay(200);
    if (!categoriesCache) {
      const data = await fetchJSON('categories.json');
      categoriesCache = data.categories;
    }
    return categoriesCache;
  }

  async function getCategory(id) {
    const categories = await getCategories();
    return categories.find((c) => c.id === id || c.slug === id) || null;
  }

  async function getWilayas() {
    await delay(150);
    if (!locationsCache) {
      const data = await fetchJSON('algeria-locations.json');
      locationsCache = data.wilayas;
    }
    return locationsCache;
  }

  async function getCommunes(wilayaId) {
    const wilayas = await getWilayas();
    const wilaya = wilayas.find((w) => w.id === wilayaId);
    return wilaya ? wilaya.communes : [];
  }

  async function searchProducts(query) {
    const [products, categories] = await Promise.all([getProducts(), getCategories()]);
    const categoryNameById = Object.fromEntries(categories.map((c) => [c.id, c.name.toLowerCase()]));
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return products.filter((p) => {
      const haystack = [
        p.name.toLowerCase(),
        p.shortDescription.toLowerCase(),
        categoryNameById[p.categoryId] || '',
      ].join(' ');
      return haystack.includes(needle);
    });
  }

  /**
   * Delivery fee lookup. Phase 1 uses a simple flat-rate rule so the
   * UI has real numbers to show; Phase 2's backend can replace this
   * with per-wilaya pricing without changing how the product page
   * calls it.
   */
  async function getDeliveryFee({ wilayaId, deliveryMethod }) {
    await delay(150);
    if (deliveryMethod === 'pickup_point') {
      return 0;
    }
    if (!wilayaId) return 0;
    // Alger, Blida, Boumerdes, Tipaza ship cheaper (closer to the depot).
    const nearWilayas = new Set(['16', '09', '35', '42']);
    return nearWilayas.has(wilayaId) ? 400 : 600;
  }

  /**
   * Simulates submitting an order. Phase 2 replaces this with:
   *   const res = await fetch('/api/orders', { method: 'POST', body: JSON.stringify(orderData) });
   *   return res.json();
   */
  async function createOrder(orderData) {
    await delay(700);
    const reference = 'PC-' + Math.floor(100000 + Math.random() * 900000);
    // eslint-disable-next-line no-console
    console.log('[mock] Order submitted (no backend yet):', orderData);
    return {
      success: true,
      orderId: reference,
      order: orderData,
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
