/**
 * product-form.js — reusable add/edit product form.
 * Modes: product-form.html?mode=add  |  product-form.html?id=<product id>
 * Field names mirror the Phase 2 product model exactly.
 */
(async function () {
  'use strict';

  const U = window.AdminUtils;
  const C = window.Components;

  const editId = U.getQueryParam('id');
  const isEdit = !!editId;

  const content = await window.AdminLayout.init({
    active: 'products',
    title: isEdit ? 'Edit product' : 'Add product',
    subtitle: isEdit
      ? 'Update the product details below.'
      : 'Fill in the details for the new product.',
    actionsHtml: `<a class="btn" href="products.html">&larr; Back to products</a>`,
  });

  let categories = [];

  function fieldHtml() {
    return `
    <form id="product-form" novalidate>
      <div class="card">
        <div class="card-head"><h2>Basic information</h2></div>
        <div class="card-body">
          <div class="form-grid">
            <div class="form-field">
              <label for="pf-name">Name *</label>
              <input class="input" id="pf-name" name="name" type="text" required maxlength="200">
            </div>
            <div class="form-field">
              <label for="pf-slug">Slug</label>
              <input class="input mono" id="pf-slug" name="slug" type="text" maxlength="200">
              <span class="hint">Auto-generated from the name if left empty.</span>
            </div>
            <div class="form-field">
              <label for="pf-category">Category *</label>
              <select class="select" id="pf-category" name="categoryId" required>
                <option value="">Select a category…</option>
              </select>
            </div>
            <div class="form-field">
              <label for="pf-currency">Currency</label>
              <input class="input" id="pf-currency" name="currency" type="text" value="DZD" maxlength="8">
            </div>
            <div class="form-field">
              <label for="pf-price">Price (DA) *</label>
              <input class="input" id="pf-price" name="price" type="number" min="0" step="1" required>
            </div>
            <div class="form-field">
              <label for="pf-old-price">Old price (DA)</label>
              <input class="input" id="pf-old-price" name="oldPrice" type="number" min="0" step="1">
              <span class="hint">Optional — shown as a strikethrough discount.</span>
            </div>
            <div class="form-field full">
              <label for="pf-image-file">Product photo</label>
              <input class="input" id="pf-image-file" type="file"
                     accept="image/jpeg,image/png,image/webp,image/gif">
              <img id="pf-image-preview" alt="Product photo preview"
                   style="display:none;max-width:220px;margin-top:8px;border-radius:8px;border:1px solid var(--border);">
              <span class="hint">Upload a photo from your device (JPG, PNG, WebP or GIF, max 5 MB) — or paste an image path below instead.</span>
            </div>
            <div class="form-field full">
              <label for="pf-image">Image path</label>
              <input class="input mono" id="pf-image" name="image" type="text" maxlength="500"
                     placeholder="images/products/whey-isolate.jpg">
              <span class="hint">Optional when you upload above. Path relative to the customer frontend (e.g. images/products/…) or a full URL.</span>
            </div>
            <div class="form-field full">
              <label for="pf-short">Short description</label>
              <textarea class="input" id="pf-short" name="shortDescription" rows="2" maxlength="500"></textarea>
            </div>
            <div class="form-field full">
              <label for="pf-description">Full description</label>
              <textarea class="input" id="pf-description" name="description" rows="5"></textarea>
            </div>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:16px;">
        <div class="card-head"><h2>Details</h2></div>
        <div class="card-body">
          <div class="form-grid">
            <div class="form-field full">
              <label for="pf-benefits">Benefits</label>
              <textarea class="input" id="pf-benefits" name="benefits" rows="3"
                        placeholder="One benefit per line"></textarea>
              <span class="hint">One benefit per line — stored as a list.</span>
            </div>
            <div class="form-field full">
              <label for="pf-usage">Usage instructions</label>
              <textarea class="input" id="pf-usage" name="usage" rows="3"></textarea>
            </div>
            <div class="form-field full">
              <label for="pf-flavors">Flavors</label>
              <textarea class="input" id="pf-flavors" name="flavors" rows="2"
                        placeholder="One flavor per line"></textarea>
              <span class="hint">One flavor per line — stored as a list.</span>
            </div>
            <div class="form-field">
              <label class="checkbox-row">
                <input type="checkbox" id="pf-available" name="available" checked>
                Available for sale
              </label>
            </div>
            <div class="form-field">
              <label class="checkbox-row">
                <input type="checkbox" id="pf-featured" name="featured">
                Featured product
              </label>
            </div>
          </div>

          <p class="field-error" id="form-error" role="alert" style="display:none;"></p>

          <div class="form-actions">
            <a class="btn" href="products.html">Cancel</a>
            <button type="submit" class="btn btn-primary" id="pf-submit">
              ${isEdit ? 'Save changes' : 'Add product'}
            </button>
          </div>
        </div>
      </div>
    </form>`;
  }

  function linesToArray(text) {
    return String(text || '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  }

  function arrayToLines(arr) {
    return Array.isArray(arr) ? arr.join('\n') : '';
  }

  function fillForm(p) {
    const set = (id, v) => { document.getElementById(id).value = v == null ? '' : v; };
    set('pf-name', p.name);
    set('pf-slug', p.slug);
    set('pf-category', p.categoryId);
    set('pf-currency', p.currency || 'DZD');
    set('pf-price', p.price);
    set('pf-old-price', p.oldPrice);
    set('pf-image', p.image);
    set('pf-short', p.shortDescription);
    set('pf-description', p.description);
    set('pf-benefits', arrayToLines(p.benefits));
    set('pf-usage', p.usage);
    set('pf-flavors', arrayToLines(p.flavors));
    document.getElementById('pf-available').checked = p.available !== false;
    document.getElementById('pf-featured').checked = !!p.featured;
    // NOTE: showPreview() is defined inside init() and is out of scope here,
    // so set the preview directly. Calling it would throw a ReferenceError,
    // abort init() before the submit handler is attached, and break saving.
    if (p.image) {
      const previewImg = document.getElementById('pf-image-preview');
      if (previewImg) {
        previewImg.src = p.image;
        previewImg.style.display = 'block';
      }
    }
  }

  function showFormError(msg) {
    const el = document.getElementById('form-error');
    el.textContent = msg;
    el.style.display = 'block';
  }

  function validate(form) {
    C.clearAllFieldErrors(form);
    document.getElementById('form-error').style.display = 'none';
    const F = (n) => form.elements[n];
    let ok = true;
    const name = F('name').value.trim();
    const price = Number(F('price').value);
    const oldPriceRaw = F('oldPrice').value.trim();

    if (!name) { C.setFieldError(F('name'), 'Product name is required.'); ok = false; }
    if (!F('categoryId').value) { C.setFieldError(F('categoryId'), 'Choose a category.'); ok = false; }
    if (F('price').value.trim() === '' || !Number.isFinite(price) || price < 0) {
      C.setFieldError(F('price'), 'Enter a valid price in DA (0 or more).');
      ok = false;
    }
    if (oldPriceRaw !== '') {
      const op = Number(oldPriceRaw);
      if (!Number.isFinite(op) || op < 0) {
        C.setFieldError(F('oldPrice'), 'Old price must be 0 or more.');
        ok = false;
      } else if (Number.isFinite(price) && op <= price) {
        C.setFieldError(F('oldPrice'), 'Old price should be higher than the current price.');
        ok = false;
      }
    }
    return ok;
  }

  async function init() {
    content.insertAdjacentHTML('beforeend', C.loadingBlock('Loading…'));

    try {
      categories = await window.AdminAPI.listCategories();
    } catch (err) {
      content.innerHTML = C.errorBlock({ message: 'Could not load categories: ' + err.message });
      const btn = content.querySelector('[data-retry]');
      if (btn) btn.addEventListener('click', () => window.location.reload());
      return;
    }

    let product = null;
    if (isEdit) {
      try {
        product = await window.AdminAPI.getProduct(editId);
      } catch (err) {
        content.innerHTML = C.errorBlock({ message: err.message || 'Product not found.' });
        return;
      }
    }

    content.innerHTML = fieldHtml();

    const categorySelect = document.getElementById('pf-category');
    categorySelect.insertAdjacentHTML(
      'beforeend',
      categories
        .map((c) => `<option value="${U.escapeHtml(c.id)}">${U.escapeHtml(c.name)}</option>`)
        .join('')
    );

    const nameInput = document.getElementById('pf-name');
    const slugInput = document.getElementById('pf-slug');
    let slugTouched = isEdit;
    slugInput.addEventListener('input', () => { slugTouched = true; });
    nameInput.addEventListener('input', () => {
      if (!slugTouched) slugInput.value = U.slugify(nameInput.value);
    });

    // Photo upload: instant preview; the file is uploaded on submit.
    const fileInput = document.getElementById('pf-image-file');
    const previewImg = document.getElementById('pf-image-preview');
    const showPreview = (src) => {
      if (src) {
        previewImg.src = src;
        previewImg.style.display = 'block';
      } else {
        previewImg.removeAttribute('src');
        previewImg.style.display = 'none';
      }
    };
    fileInput.addEventListener('change', () => {
      const f = fileInput.files[0];
      showPreview(f ? URL.createObjectURL(f) : document.getElementById('pf-image').value.trim() || null);
    });

    if (product) fillForm(product);

    const form = document.getElementById('product-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!validate(form)) {
        const firstInvalid = form.querySelector('[aria-invalid="true"]');
        if (firstInvalid) firstInvalid.focus();
        return;
      }
      const submitBtn = document.getElementById('pf-submit');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving…';

      const F = (n) => form.elements[n];

      // A chosen photo is uploaded first; its URL becomes the image.
      let imageValue = F('image').value.trim() || null;
      if (fileInput.files.length) {
        try {
          submitBtn.textContent = 'Uploading photo…';
          imageValue = await window.AdminAPI.uploadImage(fileInput.files[0]);
        } catch (err) {
          showFormError(err.message || 'Could not upload the photo.');
          submitBtn.disabled = false;
          submitBtn.textContent = isEdit ? 'Save changes' : 'Add product';
          return;
        }
        submitBtn.textContent = 'Saving…';
      }

      const data = {
        name: F('name').value.trim(),
        slug: F('slug').value.trim() || U.slugify(F('name').value),
        categoryId: F('categoryId').value,
        price: Number(F('price').value),
        oldPrice: F('oldPrice').value.trim() === '' ? null : Number(F('oldPrice').value),
        currency: F('currency').value.trim() || 'DZD',
        image: imageValue,
        shortDescription: F('shortDescription').value.trim() || null,
        description: F('description').value.trim() || null,
        benefits: linesToArray(F('benefits').value),
        usage: F('usage').value.trim() || null,
        flavors: linesToArray(F('flavors').value),
        available: F('available').checked,
        featured: F('featured').checked,
      };

      try {
        if (isEdit) await window.AdminAPI.updateProduct(editId, data);
        else await window.AdminAPI.createProduct(data);
        C.toast('success', isEdit ? 'Product updated' : 'Product added', data.name);
        // toast lives ~3.6s; navigate after a short beat so it is seen
        setTimeout(() => { window.location.href = 'products.html'; }, 600);
      } catch (err) {
        showFormError(err.message || 'Could not save the product.');
        submitBtn.disabled = false;
        submitBtn.textContent = isEdit ? 'Save changes' : 'Add product';
      }
    });
  }

  init();
})();
