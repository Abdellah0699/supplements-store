/**
 * order-reference.js
 * Generates references like "PC-482731" - the same shape the Phase 1
 * frontend already mocked, so the success page doesn't need to change.
 * Uniqueness is enforced by the database's UNIQUE constraint on
 * orders.order_reference; the caller should retry on a rare collision
 * (see orders.service.js).
 */

function generateOrderReference() {
  const number = Math.floor(100000 + Math.random() * 900000); // 6 digits
  return `PC-${number}`;
}

module.exports = { generateOrderReference };
