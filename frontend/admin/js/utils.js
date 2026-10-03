/**
 * utils.js — shared helpers for the admin dashboard (Phase 3).
 * No dependencies.
 */
(function () {
  'use strict';

  /** Escape a string for safe insertion into HTML. */
  function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Format a number as Algerian dinars: 8500 -> "8 500 DA". */
  function formatDA(amount) {
    const n = Number(amount);
    if (!Number.isFinite(n)) return '—';
    const grouped = Math.round(n)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${grouped} DA`;
  }

  /** Format an ISO date string for the admin UI. */
  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatDateShort(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  /** Read a URL query parameter. */
  function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  /** Generate a URL slug from a product/category name. */
  function slugify(text) {
    return String(text || '')
      .toLowerCase()
      .trim()
      .replace(/['’]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /** Simple debounce for search inputs. */
  function debounce(fn, ms) {
    let t = null;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms || 250);
    };
  }

  /** Canonical order statuses — must match backend migration 005. */
  const ORDER_STATUSES = [
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
  ];

  const DELIVERY_METHODS = {
    home_delivery: 'Home delivery',
    pickup_point: 'Pickup point',
  };

  function deliveryMethodLabel(method) {
    return DELIVERY_METHODS[method] || method || '—';
  }

  /** Status -> badge CSS class suffix. */
  function statusBadgeClass(status) {
    const map = {
      pending: 'badge-pending',
      confirmed: 'badge-confirmed',
      processing: 'badge-processing',
      shipped: 'badge-shipped',
      delivered: 'badge-delivered',
      cancelled: 'badge-cancelled',
    };
    return map[status] || 'badge-inactive';
  }

  function statusLabel(status) {
    if (!status) return '—';
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  window.AdminUtils = {
    escapeHtml,
    formatDA,
    formatDate,
    formatDateShort,
    getQueryParam,
    slugify,
    debounce,
    ORDER_STATUSES,
    DELIVERY_METHODS,
    deliveryMethodLabel,
    statusBadgeClass,
    statusLabel,
  };
})();
