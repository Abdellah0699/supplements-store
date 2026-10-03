/**
 * checkout.js
 * ---------------------------------------------------------
 * Everything about the on-page order form: quantity/total math,
 * delivery-method toggling, validation, and the simulated submit.
 * Phase 2 only needs to change what happens inside handleSubmit().
 * ---------------------------------------------------------
 */

const Checkout = (() => {
  const PHONE_PATTERN = /^(0)(5|6|7)[0-9]{8}$/; // 05/06/07 + 8 digits, spaces stripped first

  function normalizePhone(raw) {
    return raw.replace(/[\s.-]/g, '');
  }

  function isValidPhone(raw) {
    return PHONE_PATTERN.test(normalizePhone(raw));
  }

  function setFieldError(fieldEl, message) {
    fieldEl.classList.toggle('has-error', Boolean(message));
    const errorEl = fieldEl.querySelector('.field__error');
    if (errorEl) errorEl.textContent = message || '';
  }

  /**
   * @param {HTMLFormElement} form
   * @param {Object} product - {id, name, price}
   */
  function init(form, product) {
    const qtyInput = form.querySelector('#order-qty');
    const qtyIncrease = form.querySelector('[data-qty-action="increase"]');
    const qtyDecrease = form.querySelector('[data-qty-action="decrease"]');
    const deliveryRadios = form.querySelectorAll('input[name="deliveryMethod"]');
    const addressBlock = form.querySelector('#order-address-block');
    const wilayaSelect = form.querySelector('#order-wilaya');
    const communeSelect = form.querySelector('#order-commune');

    const summarySubtotal = form.querySelector('#summary-subtotal');
    const summaryDelivery = form.querySelector('#summary-delivery');
    const summaryTotal = form.querySelector('#summary-total');

    const MIN_QTY = 1;
    const MAX_QTY = 20;

    function currentQty() {
      return Math.min(MAX_QTY, Math.max(MIN_QTY, parseInt(qtyInput.value, 10) || MIN_QTY));
    }

    function currentDeliveryMethod() {
      const checked = form.querySelector('input[name="deliveryMethod"]:checked');
      return checked ? checked.value : 'home_delivery';
    }

    async function recalculate() {
      const qty = currentQty();
      const subtotal = product.price * qty;
      summarySubtotal.innerHTML = `<bdi>${Products.formatPrice(subtotal)}</bdi>`;

      const deliveryMethod = currentDeliveryMethod();
      let fee = 0;
      let deliveryKnown = true;
      if (!wilayaSelect.value) {
        deliveryKnown = false;
      } else {
        try {
          fee = await API.getDeliveryFee({ wilayaId: wilayaSelect.value, deliveryMethod });
        } catch (err) {
          fee = 0;
        }
      }

      summaryDelivery.innerHTML = !deliveryKnown
        ? I18N.t('orderForm.selectWilayaShort')
        : fee === 0
          ? I18N.t('orderForm.free')
          : `<bdi>${Products.formatPrice(fee)}</bdi>`;
      summaryTotal.innerHTML = `<bdi>${Products.formatPrice(subtotal + fee)}</bdi>`;
      return { qty, subtotal, fee, total: subtotal + fee, deliveryMethod };
    }

    // Quantity stepper
    qtyInput.addEventListener('change', () => {
      qtyInput.value = currentQty();
      recalculate();
    });
    qtyIncrease.addEventListener('click', () => {
      qtyInput.value = Math.min(MAX_QTY, currentQty() + 1);
      qtyIncrease.disabled = qtyInput.value >= MAX_QTY;
      qtyDecrease.disabled = false;
      recalculate();
    });
    qtyDecrease.addEventListener('click', () => {
      qtyInput.value = Math.max(MIN_QTY, currentQty() - 1);
      qtyDecrease.disabled = qtyInput.value <= MIN_QTY;
      qtyIncrease.disabled = false;
      recalculate();
    });

    // Delivery method toggling
    deliveryRadios.forEach((radio) => {
      radio.addEventListener('change', () => {
        const isHomeDelivery = currentDeliveryMethod() === 'home_delivery';
        addressBlock.classList.toggle('is-collapsed', !isHomeDelivery);
        form.querySelector('#order-address').required = isHomeDelivery;
        recalculate();
      });
    });

    // Wilaya/commune changes affect delivery fee
    wilayaSelect.addEventListener('change', recalculate);
    communeSelect.addEventListener('change', recalculate);

    recalculate();

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      handleSubmit(form, product, { currentQty, currentDeliveryMethod, recalculate });
    });
  }

  async function handleSubmit(form, product, helpers) {
    const firstName = form.querySelector('#order-firstname');
    const phone = form.querySelector('#order-phone');
    const wilayaSelect = form.querySelector('#order-wilaya');
    const communeSelect = form.querySelector('#order-commune');
    const address = form.querySelector('#order-address');
    const deliveryMethod = helpers.currentDeliveryMethod();

    let valid = true;

    if (!firstName.value.trim()) {
      setFieldError(firstName.closest('.field'), I18N.t('validation.firstName'));
      valid = false;
    } else {
      setFieldError(firstName.closest('.field'), '');
    }

    if (!isValidPhone(phone.value)) {
      setFieldError(phone.closest('.field'), I18N.t('validation.phone'));
      valid = false;
    } else {
      setFieldError(phone.closest('.field'), '');
    }

    if (!wilayaSelect.value) {
      setFieldError(wilayaSelect.closest('.field'), I18N.t('validation.wilaya'));
      valid = false;
    } else {
      setFieldError(wilayaSelect.closest('.field'), '');
    }

    if (!communeSelect.value) {
      setFieldError(communeSelect.closest('.field'), I18N.t('validation.commune'));
      valid = false;
    } else {
      setFieldError(communeSelect.closest('.field'), '');
    }

    if (deliveryMethod === 'home_delivery' && !address.value.trim()) {
      setFieldError(address.closest('.field'), I18N.t('validation.address'));
      valid = false;
    } else {
      setFieldError(address.closest('.field'), '');
    }

    if (!valid) {
      const firstInvalid = form.querySelector('.has-error');
      if (firstInvalid) firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    const originalLabel = submitBtn.textContent;
    submitBtn.textContent = I18N.t('orderForm.placingOrder');

    const totals = await helpers.recalculate();

    // Phase 2: the backend calculates prices, fees and totals itself
    // from the database - the browser only sends what it's choosing,
    // never what it should cost. See js/api.js createOrder() for how
    // the response maps back onto what this page displays next.
    const orderData = {
      items: [{ productId: product.id, quantity: totals.qty }],
      customer: {
        firstName: firstName.value.trim(),
        phone: normalizePhone(phone.value),
      },
      delivery: {
        method: totals.deliveryMethod,
        wilayaId: wilayaSelect.value,
        communeId: communeSelect.value,
        address: totals.deliveryMethod === 'home_delivery' ? address.value.trim() : '',
      },
    };

    try {
      const result = await API.createOrder(orderData);
      sessionStorage.setItem('lastOrder', JSON.stringify(result));
      window.location.href = 'order-success.html';
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
      applyServerErrors(form, err);
    }
  }

  /**
   * The frontend already validates before submitting, but the server
   * re-checks everything independently and can still reject a request
   * the frontend thought was fine (a product went out of stock in the
   * meantime, a delivery fee was removed, etc.). When that happens,
   * show it on the matching field if we recognize it; otherwise fall
   * back to the generic banner.
   */
  function applyServerErrors(form, err) {
    const fieldMap = {
      phone: '#order-phone',
      firstName: '#order-firstname',
      wilayaId: '#order-wilaya',
      communeId: '#order-commune',
      address: '#order-address',
    };

    let matchedAny = false;
    if (err.fields) {
      Object.keys(err.fields).forEach((key) => {
        const selector = fieldMap[key];
        const input = selector ? form.querySelector(selector) : null;
        if (input) {
          setFieldError(input.closest('.field'), err.fields[key]);
          matchedAny = true;
        }
      });
    }

    const banner = form.querySelector('#order-form-error');
    if (banner) {
      banner.textContent =
        (err.fields && !matchedAny && Object.values(err.fields)[0]) || I18N.t('orderForm.errorSubmit');
      banner.hidden = false;
    }
  }

  return { init, isValidPhone, normalizePhone };
})();
