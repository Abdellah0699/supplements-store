/**
 * search.js
 * ---------------------------------------------------------
 * Drives pages/search.html. Reads ?q= from the URL and filters
 * products by name/category/short description. The header search
 * box on every page also submits here.
 * ---------------------------------------------------------
 */

(async function initSearchPage() {
  const root = document.querySelector('[data-page="search"]');
  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  const query = (params.get('q') || '').trim();

  const input = root.querySelector('#search-page-input');
  const form = root.querySelector('#search-page-form');
  const grid = root.querySelector('#search-results-grid');
  const countEl = root.querySelector('#search-count');
  const loadingEl = root.querySelector('#search-loading');
  const promptEl = root.querySelector('#search-prompt');

  input.value = query;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const q = input.value.trim();
    window.location.search = q ? `?q=${encodeURIComponent(q)}` : '';
  });

  if (!query) {
    const promptText = root.querySelector('#search-prompt-text');
    if (promptText) {
      promptText.textContent = I18N.t('search.promptText', {
        cat1: I18N.t('categoryNames.protein'),
        cat2: I18N.t('categoryNames.creatine'),
      });
    }
    promptEl.hidden = false;
    return;
  }

  document.title = `"${query}" - ${I18N.t('search.title')} | ${I18N.t('footer.storeName')}`;
  loadingEl.hidden = false;
  Products.renderSkeletons(grid, 6);

  try {
    const results = await API.searchProducts(query);
    countEl.textContent = I18N.plural('search.results', results.length, { query });
    Products.renderList(grid, results, { emptyMessage: I18N.t('search.noResults') });
  } catch (err) {
    Products.renderError(grid);
  } finally {
    loadingEl.hidden = true;
  }
})();
