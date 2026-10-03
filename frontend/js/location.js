/**
 * location.js
 * ---------------------------------------------------------
 * Handles the Wilaya -> Commune cascading dropdowns. The commune
 * select is disabled and empty until a wilaya is chosen.
 *
 * Phase 2 change: API.getWilayas() now returns a lightweight list
 * (no nested communes - that would mean ~1,700 rows on every page
 * load). Instead, communes are fetched per-wilaya, on demand, via
 * API.getCommunes(wilayaId) each time the wilaya changes.
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

    // Guards against a slow response for an earlier wilaya arriving
    // after the customer has already picked a different one.
    let requestToken = 0;

    wilayaSelect.addEventListener('change', async () => {
      const wilayaId = wilayaSelect.value;
      const thisRequest = ++requestToken;

      if (!wilayaId) {
        resetCommuneSelect(communeSelect, I18N.t('orderForm.selectWilayaFirst'));
        if (onChange) onChange();
        return;
      }

      communeSelect.disabled = true;
      communeSelect.innerHTML = `<option value="">${I18N.t('orderForm.loadingWilayas')}</option>`;

      try {
        const communes = await API.getCommunes(wilayaId);
        if (thisRequest !== requestToken) return; // a newer selection has since started loading

        communeSelect.disabled = false;
        communeSelect.innerHTML =
          `<option value="">${I18N.t('orderForm.selectCommune')}</option>` +
          communes.map((c) => `<option value="${c.id}">${escapeHTML(communeLabel(c))}</option>`).join('');
      } catch (err) {
        if (thisRequest !== requestToken) return;
        resetCommuneSelect(communeSelect, I18N.t('orderForm.couldntLoadWilayas'));
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
