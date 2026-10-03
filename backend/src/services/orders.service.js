/**
 * orders.service.js
 * ---------------------------------------------------------
 * Implements the order-creation flow end to end. The guiding rule
 * (brief section 65): the frontend is presentation, the backend is
 * validation + business logic, the database is the source of truth.
 * Nothing about price, availability, or the wilaya/commune pairing is
 * taken on the client's word - it's all re-derived from the database.
 * ---------------------------------------------------------
 */

const { withTransaction } = require('../config/database');
const AppError = require('../utils/app-error');
const { normalizePhone, isValidAlgerianPhone } = require('../utils/phone');
const { generateOrderReference } = require('../utils/order-reference');
const { getProductsByIds } = require('./products.service');
const { getWilayaById, communeBelongsToWilaya } = require('./locations.service');
const { calculateDeliveryFee } = require('./delivery.service');

const MAX_REFERENCE_ATTEMPTS = 3;
const UNIQUE_VIOLATION = '23505';

async function createOrder(payload) {
  const { items, customer, delivery } = payload;

  // --- Customer ---
  const firstName = customer.firstName.trim();
  const phone = normalizePhone(customer.phone);
  if (!isValidAlgerianPhone(phone)) {
    throw AppError.validation('Please check the submitted information.', {
      phone: 'Enter a valid Algerian number, e.g. 0555123456.',
    });
  }

  // --- Wilaya / commune: existence AND the wilaya<->commune relationship ---
  const wilaya = await getWilayaById(delivery.wilayaId);
  if (!wilaya) {
    throw AppError.validation('Please check the submitted information.', {
      wilayaId: 'Unknown wilaya.',
    });
  }
  const communeOk = await communeBelongsToWilaya(delivery.communeId, delivery.wilayaId);
  if (!communeOk) {
    throw AppError.validation('Please check the submitted information.', {
      communeId: 'This commune does not belong to the selected wilaya.',
    });
  }

  // --- Address required only for home delivery ---
  const address = (delivery.address || '').trim();
  if (delivery.method === 'home_delivery' && !address) {
    throw AppError.validation('Please check the submitted information.', {
      address: 'Address is required for home delivery.',
    });
  }

  // --- Products: existence + availability + current DB price ---
  const uniqueIds = [...new Set(items.map((i) => i.productId))];
  const products = await getProductsByIds(uniqueIds);
  const productById = new Map(products.map((p) => [p.id, p]));

  const orderItemsData = items.map((item) => {
    const product = productById.get(item.productId);
    if (!product) {
      throw AppError.validation('Please check the submitted information.', {
        items: `Product not found: ${item.productId}`,
      });
    }
    if (!product.available) {
      throw AppError.validation('Please check the submitted information.', {
        items: `"${product.name}" is currently out of stock.`,
      });
    }
    return {
      productId: product.id,
      productName: product.name, // snapshot
      quantity: item.quantity,
      unitPrice: product.price, // snapshot - never trust a client-sent price
      subtotal: product.price * item.quantity,
    };
  });

  const subtotal = orderItemsData.reduce((sum, i) => sum + i.subtotal, 0);

  // --- Delivery fee: recalculated server-side, never taken from the request ---
  const { fee: deliveryFee } = await calculateDeliveryFee({
    wilayaId: delivery.wilayaId,
    method: delivery.method,
  });

  const total = subtotal + deliveryFee;

  return persistOrder({
    firstName,
    phone,
    delivery,
    address,
    deliveryFee,
    subtotal,
    total,
    orderItemsData,
  });
}

/** Inserts the order + items in one transaction, retrying the reference on the rare collision. */
async function persistOrder({ firstName, phone, delivery, address, deliveryFee, subtotal, total, orderItemsData }) {
  let lastErr;

  for (let attempt = 0; attempt < MAX_REFERENCE_ATTEMPTS; attempt += 1) {
    const orderReference = generateOrderReference();
    try {
      return await withTransaction(async (client) => {
        const { rows } = await client.query(
          `INSERT INTO orders (
             order_reference, status, customer_first_name, customer_phone,
             wilaya_id, commune_id, address, delivery_method, delivery_fee,
             subtotal, total
           ) VALUES ($1, 'pending', $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING id, order_reference, status`,
          [
            orderReference,
            firstName,
            phone,
            delivery.wilayaId,
            delivery.communeId,
            delivery.method === 'home_delivery' ? address : null,
            delivery.method,
            deliveryFee,
            subtotal,
            total,
          ]
        );

        const order = rows[0];

        for (const item of orderItemsData) {
          await client.query(
            `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [order.id, item.productId, item.productName, item.quantity, item.unitPrice, item.subtotal]
          );
        }

        return {
          reference: order.order_reference,
          status: order.status,
          subtotal,
          deliveryFee,
          total,
          currency: 'DZD',
          items: orderItemsData,
        };
      });
    } catch (err) {
      const isReferenceCollision = err.code === UNIQUE_VIOLATION && String(err.constraint).includes('order_reference');
      if (isReferenceCollision) {
        lastErr = err;
        continue; // extremely rare - try again with a fresh reference
      }
      throw err;
    }
  }

  throw lastErr || new Error('Failed to create order after multiple attempts.');
}

module.exports = { createOrder };
