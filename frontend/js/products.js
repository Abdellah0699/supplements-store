/**
 * products.js
 * ---------------------------------------------------------
 * Formatting and markup helpers for products. Any page that
 * needs to print a price or draw a product card uses these,
 * so the look of a "product card" only has to change in one
 * place.
 * ---------------------------------------------------------
 */

const Products = (() => {
  function formatPrice(amount) {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' DA';
  }

  function productHref(product) {
    const inPagesFolder = window.location.pathname.includes('/pages/');
    const prefix = inPagesFolder ? '' : 'pages/';
    return `${prefix}product.html?id=${encodeURIComponent(product.id)}`;
  }

  function categoryHref(categoryId) {
    const inPagesFolder = window.location.pathname.includes('/pages/');
    const prefix = inPagesFolder ? '' : 'pages/';
    return `${prefix}category.html?id=${encodeURIComponent(categoryId)}`;
  }

  function badgeFor(product) {
    if (!product.available) {
      return `<span class="product-card__badge product-card__badge--out">${I18N.t('common.outOfStock')}</span>`;
    }
    if (product.oldPrice && product.oldPrice > product.price) {
      const percent = Math.round(100 - (product.price / product.oldPrice) * 100);
      return `<span class="product-card__badge">-${percent}%</span>`;
    }
    return '';
  }

  function priceRowHTML(product) {
    if (product.oldPrice && product.oldPrice > product.price) {
      return `
        <span class="price">${formatPrice(product.price)}</span>
        <span class="price price--old">${formatPrice(product.oldPrice)}</span>
      `;
    }
    return `<span class="price">${formatPrice(product.price)}</span>`;
  }

  function cardHTML(product, categoryName) {
    return `
      <article class="product-card">
        <a class="product-card__link" href="${productHref(product)}">
          <div class="product-card__media">
            ${badgeFor(product)}
            ${imgPath(product.image) ? `<img src="${imgPath(product.image)}" alt="${escapeHTML(product.name)}" loading="lazy" width="400" height="300">` : ''}
          </div>
          <div class="product-card__body">
            ${categoryName ? `<span class="product-card__category">${escapeHTML(categoryName)}</span>` : ''}
            <h3 class="product-card__name">${escapeHTML(product.name)}</h3>
            <div class="product-card__price-row">
              ${priceRowHTML(product)}
            </div>
          </div>
        </a>
      </article>
    `;
  }

  function imgPath(path) {
    if (!path) return '';
    const inPagesFolder = window.location.pathname.includes('/pages/');
    if (!inPagesFolder) return path;
    return path.startsWith('assets/') ? '../' + path : path;
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function skeletonCardHTML() {
    return `
      <div class="product-card">
        <div class="skeleton" style="aspect-ratio:4/3;"></div>
        <div style="padding:14px;">
          <div class="skeleton" style="height:12px;width:60%;margin-bottom:8px;"></div>
          <div class="skeleton" style="height:16px;width:85%;margin-bottom:10px;"></div>
          <div class="skeleton" style="height:16px;width:40%;"></div>
        </div>
      </div>
    `;
  }

  function renderList(container, products, { categoryNameById = {}, emptyMessage } = {}) {
    if (!products.length) {
      container.innerHTML = `
        <div class="empty-state">
          <p class="empty-state__title">${I18N.t('common.nothingHereYet')}</p>
          <p>${escapeHTML(emptyMessage || I18N.t('common.noProductsFound'))}</p>
        </div>
      `;
      return;
    }
    container.innerHTML = products
      .map((p) => cardHTML(p, categoryNameById[p.categoryId]))
      .join('');
  }

  function renderSkeletons(container, count = 4) {
    container.innerHTML = Array.from({ length: count }, skeletonCardHTML).join('');
  }

  function renderError(container, message) {
    container.innerHTML = `
      <div class="error-state">
        <p class="error-state__title">${I18N.t('common.couldntLoadProducts')}</p>
        <p>${escapeHTML(message || I18N.t('common.somethingWentWrong'))}</p>
      </div>
    `;
  }

  return {
    formatPrice,
    productHref,
    categoryHref,
    cardHTML,
    renderList,
    renderSkeletons,
    renderError,
    escapeHTML,
    imgPath,
  };
})();
