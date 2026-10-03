/**
 * product-page.js
 * ---------------------------------------------------------
 * Drives pages/product.html. Reads ?id= from the URL, loads the
 * product from API.getProduct(), and fills in every part of the
 * template: gallery, price, tabs, flavor chips, related products,
 * and finally hands the order form to Checkout.init().
 * ---------------------------------------------------------
 */

(async function initProductPage() {
  const root = document.querySelector('[data-page="product"]');
  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  const productId = params.get('id');

  const loadingEl = root.querySelector('#product-loading');
  const contentEl = root.querySelector('#product-content');
  const errorEl = root.querySelector('#product-error');

  if (!productId) {
    showError();
    return;
  }

  try {
    const product = await API.getProduct(productId);
    if (!product) {
      showError();
      return;
    }
    const category = await API.getCategory(product.categoryId);
    renderProduct(product, category);
    loadingEl.hidden = true;
    contentEl.hidden = false;
    document.title = `${product.name} | ${I18N.t('footer.storeName')}`;

    renderRelated(product);

    const form = document.getElementById('order-form');
    if (form) {
      const wilayaSelect = form.querySelector('#order-wilaya');
      const communeSelect = form.querySelector('#order-commune');
      await LocationPicker.init(wilayaSelect, communeSelect);
      Checkout.init(form, product);
    }
  } catch (err) {
    showError();
  }

  function showError() {
    loadingEl.hidden = true;
    errorEl.hidden = false;
  }

  function renderProduct(product, category) {
    const productImg = root.querySelector('#product-image');
    const imgSrc = Products.imgPath(product.image);
    if (imgSrc) {
      productImg.src = imgSrc;
      productImg.alt = product.name;
    } else {
      productImg.style.display = 'none';
    }

    const categoryLink = root.querySelector('#product-category-link');
    if (category) {
      categoryLink.textContent = I18N.categoryName(category);
      categoryLink.href = Products.categoryHref(category.id);
    }

    root.querySelector('#product-name').textContent = product.name;
    root.querySelector('#breadcrumb-product-name').textContent = product.name;
    if (category) {
      const breadcrumbCategory = root.querySelector('#breadcrumb-category-link');
      breadcrumbCategory.textContent = I18N.categoryName(category);
      breadcrumbCategory.href = Products.categoryHref(category.id);
    }

    const priceRow = root.querySelector('#product-price-row');
    if (product.oldPrice && product.oldPrice > product.price) {
      const percent = Math.round(100 - (product.price / product.oldPrice) * 100);
      priceRow.innerHTML = `
        <span class="price price--lg">${Products.formatPrice(product.price)}</span>
        <span class="price price--old">${Products.formatPrice(product.oldPrice)}</span>
        <span class="product-info__discount">-${percent}%</span>
      `;
    } else {
      priceRow.innerHTML = `<span class="price price--lg">${Products.formatPrice(product.price)}</span>`;
    }

    const availability = root.querySelector('#product-availability');
    availability.innerHTML = product.available
      ? `<span class="badge badge--available">${I18N.t('common.inStock')}</span>`
      : `<span class="badge badge--unavailable">${I18N.t('common.outOfStock')}</span>`;

    root.querySelector('#product-short-description').textContent = product.shortDescription;

    // Flavor / variant chips
    const variantBlock = root.querySelector('#product-variant-block');
    const chipGroup = root.querySelector('#product-chip-group');
    if (product.flavors && product.flavors.length > 0) {
      chipGroup.innerHTML = product.flavors
        .map((flavor, i) => `
          <button type="button" class="chip" aria-pressed="${i === 0}" data-flavor="${Products.escapeHTML(flavor)}">
            ${Products.escapeHTML(flavor)}
          </button>
        `)
        .join('');
      chipGroup.addEventListener('click', (event) => {
        const chip = event.target.closest('.chip');
        if (!chip) return;
        chipGroup.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', 'false'));
        chip.setAttribute('aria-pressed', 'true');
      });
      variantBlock.hidden = false;
    } else {
      variantBlock.hidden = true;
    }

    renderTabs(product);

    // Order form CTA sets the product name for context
    const orderFormTitle = root.querySelector('#order-form-product-name');
    if (orderFormTitle) orderFormTitle.textContent = product.name;
    root.querySelector('#order-unit-price-line').innerHTML = I18N.t('orderForm.unitPriceLine', {
      price: `<strong><bdi>${Products.formatPrice(product.price)}</bdi></strong>`,
    });

    if (!product.available) {
      const form = root.querySelector('#order-form');
      if (form) {
        form.querySelectorAll('input, select, button, textarea').forEach((el) => (el.disabled = true));
        root.querySelector('#order-form-error').hidden = false;
        root.querySelector('#order-form-error').textContent = I18N.t('orderForm.outOfStockNotice');
      }
    }
  }

  function renderTabs(product) {
    const tabsList = root.querySelector('#product-tabs-list');
    const tabsPanels = root.querySelector('#product-tabs-panels');
    const sections = [];

    if (product.description) {
      sections.push({ id: 'description', label: I18N.t('product.tabsDescription'), html: `<p>${Products.escapeHTML(product.description)}</p>` });
    }
    if (product.benefits && product.benefits.length) {
      sections.push({
        id: 'benefits',
        label: I18N.t('product.tabsBenefits'),
        html: `<ul>${product.benefits.map((b) => `<li>${Products.escapeHTML(b)}</li>`).join('')}</ul>`,
      });
    }
    if (product.usage) {
      sections.push({ id: 'usage', label: I18N.t('product.tabsUsage'), html: `<p>${Products.escapeHTML(product.usage)}</p>` });
    }

    if (!sections.length) {
      root.querySelector('.product-tabs').hidden = true;
      return;
    }

    tabsList.innerHTML = sections
      .map((s, i) => `
        <button class="tabs__tab" id="tab-${s.id}" role="tab" aria-selected="${i === 0}"
                aria-controls="panel-${s.id}" data-tab="${s.id}">${s.label}</button>
      `)
      .join('');

    tabsPanels.innerHTML = sections
      .map((s, i) => `
        <div class="tabs__panel ${i === 0 ? 'is-active' : ''}" id="panel-${s.id}" role="tabpanel"
             aria-labelledby="tab-${s.id}">${s.html}</div>
      `)
      .join('');

    tabsList.addEventListener('click', (event) => {
      const btn = event.target.closest('.tabs__tab');
      if (!btn) return;
      tabsList.querySelectorAll('.tabs__tab').forEach((t) => t.setAttribute('aria-selected', 'false'));
      tabsPanels.querySelectorAll('.tabs__panel').forEach((p) => p.classList.remove('is-active'));
      btn.setAttribute('aria-selected', 'true');
      root.querySelector(`#panel-${btn.dataset.tab}`).classList.add('is-active');
    });
  }

  async function renderRelated(product) {
    const section = root.querySelector('#related-products');
    const rail = root.querySelector('#related-products-rail');
    try {
      const related = await API.getRelatedProducts(product, 4);
      if (!related.length) {
        section.hidden = true;
        return;
      }
      rail.innerHTML = related.map((p) => Products.cardHTML(p)).join('');
    } catch (err) {
      section.hidden = true;
    }
  }
})();
