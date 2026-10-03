/**
 * location.js
 * ---------------------------------------------------------
 * Handles the Wilaya -> Commune cascading dropdowns. The commune
 * select is disabled and empty until a wilaya is chosen, and its
 * options are replaced every time the wilaya changes.
 * ---------------------------------------------------------
 */

const LocationPicker = (() => {
  /**
   * Wires a wilaya <select> and a commune <select> together.
   * @param {HTMLSelectElement} wilayaSelect
   * @param {HTMLSelectElement} communeSelect
   * @param {Function} [onChange] optional callback fired after either changes
   */
  async function init(wilayaSelect, communeSelect, onChange) {
    let wilayas = [];
    try {
      wilayas = await API.getWilayas();
    } catch (err) {
      wilayaSelect.innerHTML = `<option value="">${I18N.t('orderForm.couldntLoadWilayas')}</option>`;
      return;
    }

    const isArabic = I18N.getLang() === 'ar';
    const wilayaLabel = (w) => (isArabic && w.nameAr ? w.nameAr : w.name);
    const communeLabel = (c) => (isArabic && c.nameAr ? c.nameAr : c.name);

    wilayaSelect.innerHTML =
      `<option value="">${I18N.t('orderForm.selectWilaya')}</option>` +
      wilayas
        .map((w) => `<option value="${w.id}">${w.id} - ${escapeHTML(wilayaLabel(w))}</option>`)
        .join('');

    resetCommuneSelect(communeSelect, I18N.t('orderForm.selectWilayaFirst'));

    wilayaSelect.addEventListener('change', () => {
      const wilaya = wilayas.find((w) => w.id === wilayaSelect.value);
      if (!wilaya) {
        resetCommuneSelect(communeSelect, I18N.t('orderForm.selectWilayaFirst'));
      } else {
        communeSelect.disabled = false;
        communeSelect.innerHTML =
          `<option value="">${I18N.t('orderForm.selectCommune')}</option>` +
          wilaya.communes.map((c) => `<option value="${c.id}">${escapeHTML(communeLabel(c))}</option>`).join('');
      }
      if (onChange) onChange();
    });

    communeSelect.addEventListener('change', () => {
      if (onChange) onChange();
    });
  }

  function resetCommuneSelect(communeSelect, placeholder) {
    communeSelect.disabled = true;
    communeSelect.innerHTML = `<option value="">${placeholder}</option>`;
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return { init };
})();
