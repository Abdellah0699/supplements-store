/**
 * categories.js
 * ---------------------------------------------------------
 * Markup helpers for categories: the homepage strip/grid and
 * the pill navigation on the category page both read from here.      
 * ---------------------------------------------------------
 */

const Categories = (() => {
  function imgPath(path) {
    const inPagesFolder = window.location.pathname.includes('/pages/');
    if (!inPagesFolder) return path;
    return path.startsWith('assets/') ? '../' + path : path;
  }

  function cardHTML(category) {
    const name = I18N.categoryName(category);
    return `
      <a class="category-card" href="${Products.categoryHref(category.id)}">
        <div class="category-card__image">
          <img src="${imgPath(category.image || `assets/images/categories/${category.slug}.jpg`)}"
               alt="${Products.escapeHTML(name)}" loading="lazy" width="120" height="120">
        </div>
        <span class="category-card__name">${Products.escapeHTML(name)}</span>
      </a>
    `;
  }

  function pillHTML(category, activeId) {
    const isActive = category.id === activeId;
    return `
      <a class="category-pill" href="${Products.categoryHref(category.id)}"
         ${isActive ? 'aria-current="page"' : ''}>${Products.escapeHTML(I18N.categoryName(category))}</a>
    `;
  }

  function renderStrip(container, categories) {
    container.innerHTML = categories.map(cardHTML).join('');
  }

  function renderPills(container, categories, activeId) {
    container.innerHTML = `
      <a class="category-pill" href="../index.html#categories" ${!activeId ? 'aria-current="page"' : ''}>${I18N.t('category.all')}</a>
      ${categories.map((c) => pillHTML(c, activeId)).join('')}
    `;
  }

  function renderSkeletons(container, count = 8) {
    container.innerHTML = Array.from({ length: count }, () => `
      <div class="category-card">
        <div class="skeleton category-card__image"></div>
        <div class="skeleton" style="height:12px;width:70%;margin:8px auto 0;"></div>
      </div>
    `).join('');
  }

  return { cardHTML, pillHTML, renderStrip, renderPills, renderSkeletons };
})();
