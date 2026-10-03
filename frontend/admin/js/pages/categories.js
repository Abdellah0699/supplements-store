/**
 * categories.js — category management with add/edit modal and delete guard.
 */
(async function () {
  'use strict';

  const U = window.AdminUtils;
  const C = window.Components;

  const content = await window.AdminLayout.init({
    active: 'categories',
    title: 'Categories',
    subtitle: 'Organize the catalog. Categories with products cannot be deleted.',
    actionsHtml: `<button type="button" class="btn btn-primary" id="add-category-btn">+ Add category</button>`,
  });

  content.insertAdjacentHTML('beforeend', `
    <div class="card">
      <div id="categories-result" aria-live="polite"></div>
    </div>`);

  const resultEl = document.getElementById('categories-result');
  let categories = [];
  let productCounts = {};

  async function load() {
    resultEl.innerHTML = C.skeletonRows(5);
    try {
      const [cats, prodPage] = await Promise.all([
        window.AdminAPI.listCategories(),
        window.AdminAPI.listProducts({ page: 1, pageSize: 100 }),
      ]);
      categories = cats;
      productCounts = {};
      prodPage.items.forEach((p) => {
        productCounts[p.categoryId] = (productCounts[p.categoryId] || 0) + 1;
      });
      render();
    } catch (err) {
      resultEl.innerHTML = C.errorBlock({ message: err.message || 'Could not load categories.' });
      const btn = resultEl.querySelector('[data-retry]');
      if (btn) btn.addEventListener('click', load);
    }
  }

  function render() {
    if (!categories.length) {
      resultEl.innerHTML = C.emptyBlock({
        icon: '🗂',
        title: 'No categories yet',
        message: 'Create your first category to organize products.',
        actionHtml: `<button type="button" class="btn btn-primary" id="empty-add-btn">Add category</button>`,
      });
      document.getElementById('empty-add-btn').addEventListener('click', () => openCategoryModal(null));
      return;
    }

    resultEl.innerHTML = `
      <div class="table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Description</th>
              <th class="num">Products</th>
              <th>Status</th>
              <th style="text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${categories.map((c) => `
            <tr>
              <td><strong>${U.escapeHtml(c.name)}</strong></td>
              <td class="mono">${U.escapeHtml(c.slug || '—')}</td>
              <td style="max-width:280px;">${U.escapeHtml(c.description || '—')}</td>
              <td class="num">${productCounts[c.id] || 0}</td>
              <td>${C.activeBadge(c.isActive !== false)}</td>
              <td>
                <div class="table-actions">
                  <button type="button" class="btn btn-sm" data-edit="${U.escapeHtml(c.id)}">Edit</button>
                  <button type="button" class="btn btn-sm btn-danger" data-delete="${U.escapeHtml(c.id)}">Delete</button>
                </div>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

    resultEl.querySelectorAll('[data-edit]').forEach((b) =>
      b.addEventListener('click', () => {
        const cat = categories.find((c) => c.id === b.dataset.edit);
        if (cat) openCategoryModal(cat);
      })
    );
    resultEl.querySelectorAll('[data-delete]').forEach((b) =>
      b.addEventListener('click', () => onDelete(b.dataset.delete))
    );
  }

  function openCategoryModal(category) {
    const isEdit = !!category;
    const close = C.modal({
      title: isEdit ? 'Edit category' : 'Add category',
      bodyHtml: `
        <form id="category-form" novalidate>
          <div class="form-grid" style="grid-template-columns:1fr;">
            <div class="form-field">
              <label for="cf-name">Name *</label>
              <input class="input" id="cf-name" type="text" required maxlength="120"
                     value="${U.escapeHtml(category ? category.name : '')}">
            </div>
            <div class="form-field">
              <label for="cf-slug">Slug</label>
              <input class="input mono" id="cf-slug" type="text" maxlength="120"
                     value="${U.escapeHtml(category ? category.slug || '' : '')}">
              <span class="hint">Auto-generated from the name if left empty.</span>
            </div>
            <div class="form-field">
              <label for="cf-description">Description</label>
              <textarea class="input" id="cf-description" rows="3" maxlength="500">${U.escapeHtml(category ? category.description || '' : '')}</textarea>
            </div>
            <div class="form-field">
              <label class="checkbox-row">
                <input type="checkbox" id="cf-active" ${!category || category.isActive !== false ? 'checked' : ''}>
                Active (visible in the store)
              </label>
            </div>
          </div>
          <p class="field-error" id="cf-error" role="alert" style="display:none;"></p>
        </form>`,
      actions: [
        { label: 'Cancel', onClick: (c) => c(false) },
        {
          label: isEdit ? 'Save changes' : 'Add category',
          kind: 'primary',
          onClick: (c) => submitCategoryForm(c, category),
        },
      ],
    });

    // slug auto-generation
    const nameInput = document.getElementById('cf-name');
    const slugInput = document.getElementById('cf-slug');
    let slugTouched = isEdit;
    slugInput.addEventListener('input', () => { slugTouched = true; });
    nameInput.addEventListener('input', () => {
      if (!slugTouched) slugInput.value = U.slugify(nameInput.value);
    });
    // submit on Enter
    document.getElementById('category-form').addEventListener('submit', (e) => {
      e.preventDefault();
      submitCategoryForm(close, category);
    });
    return close;
  }

  async function submitCategoryForm(close, category) {
    const isEdit = !!category;
    const nameInput = document.getElementById('cf-name');
    const slugInput = document.getElementById('cf-slug');
    const descInput = document.getElementById('cf-description');
    const activeInput = document.getElementById('cf-active');
    const errorEl = document.getElementById('cf-error');

    C.clearFieldError(nameInput);
    errorEl.style.display = 'none';

    const name = nameInput.value.trim();
    if (!name) {
      C.setFieldError(nameInput, 'Category name is required.');
      nameInput.focus();
      return;
    }

    const data = {
      name,
      slug: slugInput.value.trim() || U.slugify(name),
      description: descInput.value.trim() || null,
      isActive: activeInput.checked,
    };

    try {
      if (isEdit) await window.AdminAPI.updateCategory(category.id, data);
      else await window.AdminAPI.createCategory(data);
      C.toast('success', isEdit ? 'Category updated' : 'Category added', name);
      close(true);
      await load();
    } catch (err) {
      errorEl.textContent = err.message || 'Could not save the category.';
      errorEl.style.display = 'block';
    }
  }

  async function onDelete(id) {
    const cat = categories.find((c) => c.id === id);
    const count = productCounts[id] || 0;
    if (count > 0) {
      C.toast(
        'warning',
        'Cannot delete category',
        `"${cat ? cat.name : id}" still has ${count} product${count === 1 ? '' : 's'}.`
      );
      return;
    }
    const ok = await C.confirm({
      title: 'Delete category?',
      message: `"${cat ? cat.name : id}" will be permanently removed.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await window.AdminAPI.deleteCategory(id);
      C.toast('success', 'Category deleted', cat ? cat.name : id);
      await load();
    } catch (err) {
      C.toast('error', 'Delete failed', err.message);
    }
  }

  document.getElementById('add-category-btn').addEventListener('click', () => openCategoryModal(null));

  load();
})();
