/**
 * admin-api.js — the admin dashboard's API abstraction (Phase 4).
 * ============================================================================
 * Every page in frontend/admin/ talks to the backend ONLY through `AdminAPI`.
 *
 * Phase 4: the mock adapter is gone. Every method below performs a real
 * fetch() against the admin API. Authentication uses an HttpOnly cookie
 * set by POST /api/admin/auth/login - JavaScript never sees the token.
 * The only thing kept client-side is the admin's display info
 * (username), which is NOT a credential.
 *
 * API base URL comes from window.APP_CONFIG (frontend/js/config.js),
 * the same single place the customer site configures it.
 *
 * Method catalogue (all return Promises):
 *   Auth:      login, logout, getSession, getSessionAsync
 *   Dashboard: getDashboardStats
 *   Products:  listProducts, getProduct, createProduct, updateProduct, deleteProduct
 *   Categories:listCategories, getCategory, createCategory, updateCategory, deleteCategory
 *   Orders:    listOrders, getOrder, updateOrderStatus
 *   Delivery:  listDeliveryFees, updateDeliveryFee, setDeliveryActive
 *   Uploads:   uploadImage (product photo from the admin's device)
 *   Locations: listWilayas, getCommunes  (public read-only endpoints, reused)
 * ============================================================================
 */
(function () {
  'use strict';

  const SESSION_KEY = 'admin_session';
  const EXPIRED_KEY = 'admin_session_expired';

  function apiBase() {
    return (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || 'http://localhost:5000/api';
  }

  /* ---- session cache (display info only; the real session is the cookie) ---- */
  let _session = null;

  function readStoredSession() {
    if (_session) return _session;
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) _session = JSON.parse(raw);
    } catch (e) {
      /* storage unavailable */
    }
    return _session;
  }

  function storeSession(session) {
    _session = session;
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (e) {
      /* storage unavailable: session lives in memory only */
    }
  }

  function clearSession() {
    _session = null;
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch (e) {}
  }

  function isLoginPage() {
    return /(^|\/)index\.html$/.test(window.location.pathname) || window.location.pathname.endsWith('/admin/');
  }

  /** A 401 on a data call means the session died: clear it and bounce to login. */
  function handleUnauthorized() {
    clearSession();
    try {
      sessionStorage.setItem(EXPIRED_KEY, '1');
    } catch (e) {}
    if (!isLoginPage()) window.location.replace('index.html');
  }

  function toError(status, body) {
    const err = new Error(
      (body && body.error && body.error.message) || 'Something went wrong. Please try again.'
    );
    err.status = status;
    err.code = body && body.error && body.error.code;
    err.fields = body && body.error && body.error.fields;
    return err;
  }

  /**
   * Core request helper. `auth: false` skips the 401 -> login redirect
   * (used by login() itself, where a 401 just means bad credentials).
   * `withMeta: true` returns { data, meta } instead of just data
   * (for the paginated list endpoints).
   */
  async function request(path, { method = 'GET', body, query, auth = true, withMeta = false } = {}) {
    let url = apiBase() + path;
    if (query) {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null && v !== '') qs.set(k, v);
      }
      const s = qs.toString();
      if (s) url += '?' + s;
    }
    let res;
    try {
      res = await fetch(url, {
        method,
        credentials: 'include', // send the HttpOnly session cookie
        headers: { 'Content-Type': 'application/json' },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      throw new Error('Cannot reach the server. Check that the backend is running.');
    }
    let payload = null;
    try {
      payload = await res.json();
    } catch (e) {
      /* non-JSON response */
    }
    if (res.status === 401) {
      if (auth) handleUnauthorized();
      throw toError(401, payload);
    }
    if (!res.ok || (payload && payload.success === false)) {
      throw toError(res.status, payload);
    }
    if (withMeta) return { data: payload ? payload.data : null, meta: (payload && payload.meta) || {} };
    return payload ? payload.data : null;
  }

  /** Normalizes a paginated backend response to the { items, page, pageSize, total, totalPages } shape. */
  function paged(promise) {
    return promise.then(({ data, meta }) => ({
      items: data || [],
      page: meta.page || 1,
      pageSize: meta.pageSize || 10,
      total: meta.total || 0,
      totalPages: meta.totalPages || 1,
    }));
  }

  const AdminAPI = {
    /* ---- auth ---- */
    async login(username, password) {
      if (!username || !String(username).trim() || !password) {
        throw new Error('Username and password are required.');
      }
      const data = await request('/admin/auth/login', {
        method: 'POST',
        body: { username: String(username).trim(), password },
        auth: false, // a 401 here means bad credentials, not an expired session
      });
      const session = {
        username: data.admin.username,
        displayName: data.admin.username,
        createdAt: new Date().toISOString(),
      };
      storeSession(session);
      try {
        sessionStorage.removeItem(EXPIRED_KEY);
      } catch (e) {}
      return { session };
    },

    async logout() {
      try {
        await request('/admin/auth/logout', { method: 'POST', auth: false });
      } catch (e) {
        /* logout is best-effort: the cookie is cleared either way */
      }
      clearSession();
      return { success: true };
    },

    /** Synchronous cached session (display info only). Null when unknown. */
    getSession() {
      return readStoredSession();
    },

    /**
     * Authoritative session check against the backend. Returns the
     * session object, or null when not authenticated (no redirect -
     * the caller decides, e.g. the layout guard redirects to login).
     */
    async getSessionAsync() {
      try {
        const data = await request('/admin/auth/session', { auth: false });
        const session = {
          username: data.admin.username,
          displayName: data.admin.username,
          createdAt: new Date().toISOString(),
        };
        storeSession(session);
        return session;
      } catch (e) {
        clearSession();
        return null;
      }
    },

    /** True when the last data call bounced us for an expired session (one-shot). */
    wasSessionExpired() {
      try {
        if (sessionStorage.getItem(EXPIRED_KEY)) {
          sessionStorage.removeItem(EXPIRED_KEY);
          return true;
        }
      } catch (e) {}
      return false;
    },

    /* ---- dashboard ---- */
    getDashboardStats() {
      return request('/admin/dashboard/stats');
    },

    /* ---- products ---- */
    listProducts({ search, category, available, page, pageSize } = {}) {
      return paged(
        request('/admin/products', {
          query: { search, category, available, page, pageSize },
          withMeta: true,
        })
      );
    },
    getProduct(id) {
      return request(`/admin/products/${encodeURIComponent(id)}`);
    },
    createProduct(data) {
      return request('/admin/products', { method: 'POST', body: data });
    },
    updateProduct(id, data) {
      return request(`/admin/products/${encodeURIComponent(id)}`, { method: 'PUT', body: data });
    },
    deleteProduct(id) {
      return request(`/admin/products/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },

    /* ---- categories ---- */
    listCategories({ search } = {}) {
      return request('/admin/categories', { query: { search } });
    },
    getCategory(id) {
      return request(`/admin/categories/${encodeURIComponent(id)}`);
    },
    createCategory(data) {
      return request('/admin/categories', { method: 'POST', body: data });
    },
    updateCategory(id, data) {
      return request(`/admin/categories/${encodeURIComponent(id)}`, { method: 'PUT', body: data });
    },
    deleteCategory(id) {
      return request(`/admin/categories/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },

    /* ---- orders ---- */
    listOrders({ search, status, page, pageSize } = {}) {
      return paged(
        request('/admin/orders', { query: { search, status, page, pageSize }, withMeta: true })
      );
    },
    getOrder(id) {
      return request(`/admin/orders/${encodeURIComponent(id)}`);
    },
    updateOrderStatus(id, status) {
      return request(`/admin/orders/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        body: { status },
      });
    },

    /* ---- delivery fees ---- */
    listDeliveryFees({ search } = {}) {
      return request('/admin/delivery-fees', { query: { search } });
    },
    updateDeliveryFee(wilayaId, method, fee) {
      return request(`/admin/delivery-fees/${encodeURIComponent(wilayaId)}`, {
        method: 'PUT',
        body: { method, fee: Number(fee) },
      });
    },
    setDeliveryActive(wilayaId, isActive) {
      return request(`/admin/delivery-fees/${encodeURIComponent(wilayaId)}/active`, {
        method: 'PUT',
        body: { isActive: !!isActive },
      });
    },

    /* ---- image upload ---- */
    async uploadImage(file) {
      const fd = new FormData();
      fd.append('image', file);
      let res;
      try {
        res = await fetch(apiBase() + '/admin/uploads/image', {
          method: 'POST',
          credentials: 'include', // send the HttpOnly session cookie
          body: fd, // no Content-Type header: the browser sets the multipart boundary
        });
      } catch (e) {
        throw new Error('Cannot reach the server. Check that the backend is running.');
      }
      let payload = null;
      try {
        payload = await res.json();
      } catch (e) {
        /* non-JSON response */
      }
      if (res.status === 401) {
        handleUnauthorized();
        throw toError(401, payload);
      }
      if (!res.ok || (payload && payload.success === false)) {
        throw toError(res.status, payload);
      }
      return payload.data.url;
    },

    /* ---- locations (public read-only endpoints, reused - no duplication) ---- */
    listWilayas({ search } = {}) {
      return request('/locations/wilayas', { query: { search }, auth: false });
    },
    getCommunes(wilayaId, { search } = {}) {
      return request(`/locations/wilayas/${encodeURIComponent(wilayaId)}/communes`, {
        query: { search },
        auth: false,
      });
    },
  };

  // Keep the flag so any leftover Phase 3 check keeps working.
  AdminAPI.USE_MOCK = false;

  window.AdminAPI = AdminAPI;
})();
