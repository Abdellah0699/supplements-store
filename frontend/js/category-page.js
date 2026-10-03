/**
 * category-page.js
 * ---------------------------------------------------------
 * Drives pages/category.html: reads ?id= from the URL, shows the
 * category banner and pill navigation, and lists its products with
 * a simple client-side sort.
 * ---------------------------------------------------------
 */

(async function initCategoryPage() {
  const root = document.querySelector('[data-page="category"]');
  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  const categoryId = params.get('id');

  const loadingEl = root.querySelector('#category-loading');
  const contentEl = root.querySelector('#category-content');
  const errorEl = root.querySelector('#category-error');
  const grid = root.querySelector('#category-product-grid');
  const pillsEl = root.querySelector('#category-pills');
  const sortSelect = root.querySelector('#category-sort');
  const countEl = root.querySelector('#category-count');

  if (!categoryId) {
    showError();
    return;
  }

  Products.renderSkeletons(grid, 6);

  let products = [];

  try {
    const [category, categories, categoryProducts] = await Promise.all([
      API.getCategory(categoryId),
      API.getCategories(),
      API.getProductsByCategory(categoryId),
    ]);

    if (!category) {
      showError();
      return;
    }

    root.querySelector('#category-banner-title').textContent = I18N.categoryName(category);
    root.querySelector('#category-banner-desc').textContent = category.description || '';
    root.querySelector('#breadcrumb-category-name').textContent = I18N.categoryName(category);
    document.title = `${I18N.categoryName(category)} | ${I18N.t('footer.storeName')}`;

    Categories.renderPills(pillsEl, categories, categoryId);

    products = categoryProducts;
    renderSorted();

    loadingEl.hidden = true;
    contentEl.hidden = false;

    sortSelect.addEventListener('change', renderSorted);
  } catch (err) {
    showError();
  }

  function renderSorted() {
    const sorted = [...products];
    switch (sortSelect.value) {
      case 'price-asc':
        sorted.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        sorted.sort((a, b) => b.price - a.price);
        break;
      case 'name-asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        // featured first, keep original order otherwise
        sorted.sort((a, b) => Number(b.featured) - Number(a.featured));
    }
    countEl.textContent = I18N.plural('category.productCount', sorted.length);
    Products.renderList(grid, sorted, { emptyMessage: I18N.t('common.noCategoryProducts') });
  }

  function showError() {
    loadingEl.hidden = true;
    errorEl.hidden = false;
  }
})();
