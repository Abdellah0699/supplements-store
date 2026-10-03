/**
 * products.js — product catalog management (search, filters, pagination,
 * add / edit / delete). Data via AdminAPI.
 */
(async function () {
  'use strict';

  const U = window.AdminUtils;
  const C = window.Components;

  const content = await window.AdminLayout.init({
    active: 'products',
    title: 'Products',
    subtitle: 'Search, filter and manage the product catalog.',
    actionsHtml: `<a class="btn btn-primary" href="product-form.html?mode=add">+ Add product</a>`,
  });

  const state = {
    search: '',
    category: '',
    available: '',
    page: 1,
    pageSize: 10,
    categories: [],
    categoryNames: {},
  };

  content.insertAdjacentHTML('beforeend', `
    <div class="card">
      <div class="card-body" style="padding-bottom:0;">
        <div class="toolbar" role="search">
          <input class="input search-input" id="f-search" type="search"
                 placeholder="Search products…" aria-label="Search products">
          <select class="select" id="f-category" aria-label="Filter by category">
            <option value="">All categories</option>
          </select>
          <select class="select" id="f-available" aria-label="Filter by availability">
            <option value="">All statuses</option>
            <option value="true">Available</option>
            <option value="false">Unavailable</option>
          </select>
        </div>
      </div>
      <div id="products-result" aria-live="polite"></div>
    </div>`);

  const resultEl = document.getElementById('products-result');
  const searchInput = document.getElementById('f-search');
  const categorySelect = document.getElementById('f-category');
  const availableSelect = document.getElementById('f-available');

  async function init() {
    try {
      state.categories = await window.AdminAPI.listCategories();
      state.categories.forEach((c) => { state.categoryNames[c.id] = c.name; });
      categorySelect.insertAdjacentHTML(
        'beforeend',
        state.categories
          .map((c) => `<option value="${U.escapeHtml(c.id)}">${U.escapeHtml(c.name)}</option>`)
          .join('')
      );
    } catch (err) {
      // categories are a nice-to-have for the filter; products still load
    }
    await load();
  }

  function currentFilters() {
    return {
      search: state.search || undefined,
      category: state.category || undefined,
      available: state.available === '' ? undefined : state.available,
      page: state.page,
      pageSize: state.pageSize,
    };
  }

  async function load() {
    resultEl.innerHTML = C.skeletonRows(6);
    try {
      const data = await window.AdminAPI.listProducts(currentFilters());
      render(data);
    } catch (err) {
      resultEl.innerHTML = C.errorBlock({ message: err.message || 'Could not load products.' });
      const btn = resultEl.querySelector('[data-retry]');
      if (btn) btn.addEventListener('click', load);
    }
  }

  function productImage(p) {
    // product images live next to the customer frontend; resolve relative to /admin/
    // absolute URLs (uploaded photos served by the API) are used as-is
    if (!p.image) return `<span class="thumb" aria-hidden="true"></span>`;
    const src = /^(https?:)?\/\//i.test(p.image) ? p.image : `../${p.image.replace(/^\//, '')}`;
    return `<img class="thumb" src="${U.escapeHtml(src)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`;
  }

  function render(data) {
    if (!data.items.length) {
      const hasFilters = state.search || state.category || state.available;
      resultEl.innerHTML = C.emptyBlock({
        icon: '💊',
        title: 'No products found',
        message: hasFilters
          ? 'Try adjusting your search or filters.'
          : 'Add your first product to get started.',
        actionHtml: hasFilters
          ? `<button type="button" class="btn" id="clear-filters">Clear filters</button>`
          : `<a class="btn btn-primary" href="product-form.html?mode=add">Add product</a>`,
      });
      const clear = document.getElementById('clear-filters');
      if (clear) clear.addEventListener('click', resetFilters);
      return;
    }

    resultEl.innerHTML = `
      <div class="table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th class="num">Price</th>
              <th>Availability</th>
              <th style="text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.map((p) => `
            <tr>
              <td>
                <div class="cell-product">
                  ${productImage(p)}
                  <div>
                    <div class="p-name">${U.escapeHtml(p.name)}</div>
                    <div class="p-sub mono">${U.escapeHtml(p.slug || p.id)}</div>
                    ${p.featured ? C.featuredBadge() : ''}
                  </div>
                </div>
              </td>
              <td>${U.escapeHtml(state.categoryNames[p.categoryId] || p.categoryId || '—')}</td>
              <td class="num">
                ${U.formatDA(p.price)}
                ${p.oldPrice ? `<div class="p-sub" style="text-decoration:line-through;">${U.formatDA(p.oldPrice)}</div>` : ''}
              </td>
              <td>${C.activeBadge(p.available)}</td>
              <td>
                <div class="table-actions">
                  <a class="btn btn-sm" href="product-form.html?id=${encodeURIComponent(p.id)}">Edit</a>
                  <button type="button" class="btn btn-sm btn-danger" data-delete="${U.escapeHtml(p.id)}" data-name="${U.escapeHtml(p.name)}">Delete</button>
                </div>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      ${C.paginationHtml(data)}`;

    C.bindPagination(resultEl, (page) => {
      state.page = page;
      load();
      resultEl.scrollIntoView({ block: 'nearest' });
    });

    resultEl.querySelectorAll('[data-delete]').forEach((btn) =>
      btn.addEventListener('click', () => onDelete(btn.dataset.delete, btn.dataset.name))
    );
  }

  async function onDelete(id, name) {
    const ok = await C.confirm({
      title: 'Delete product?',
      message: `"${name}" will be permanently removed from the catalog.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await window.AdminAPI.deleteProduct(id);
      C.toast('success', 'Product deleted', name);
      if (state.page > 1) state.page = 1;
      await load();
    } catch (err) {
      C.toast('error', 'Delete failed', err.message);
    }
  }

  function resetFilters() {
    state.search = '';
    state.category = '';
    state.available = '';
    state.page = 1;
    searchInput.value = '';
    categorySelect.value = '';
    availableSelect.value = '';
    load();
  }

  searchInput.addEventListener(
    'input',
    U.debounce(() => {
      state.search = searchInput.value.trim();
      state.page = 1;
      load();
    }, 300)
  );
  categorySelect.addEventListener('change', () => {
    state.category = categorySelect.value;
    state.page = 1;
    load();
  });
  availableSelect.addEventListener('change', () => {
    state.available = availableSelect.value;
    state.page = 1;
    load();
  });

  init();
})();
