/**
 * phone.js
 * Algerian mobile numbers: 05/06/07 followed by 8 digits. Same rule
 * the frontend already uses (js/checkout.js) - the backend re-checks
 * it independently rather than trusting the browser.
 */

const PHONE_PATTERN = /^0[567][0-9]{8}$/;

/** Strips spaces, dots and dashes so "0555 12 34 56" and "0555-12-34-56" normalize the same way. */
function normalizePhone(raw) {
  return String(raw || '').replace(/[\s.-]/g, '');
}

function isValidAlgerianPhone(raw) {
  return PHONE_PATTERN.test(normalizePhone(raw));
}

module.exports = { normalizePhone, isValidAlgerianPhone };
