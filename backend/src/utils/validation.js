/**
 * validation.js
 * Zod schemas for the *shape* of incoming requests (right types,
 * required fields, sane ranges). Business rules that need the
 * database - product exists, commune belongs to wilaya, product is
 * available - are checked in the services, not here.
 */

const { z } = require('zod');

const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1, 'productId is required'),
        quantity: z
          .number()
          .int('Quantity must be a whole number')
          .positive('Quantity must be at least 1')
          .max(50, 'Quantity is too large'),
      })
    )
    .min(1, 'At least one item is required'),

  customer: z.object({
    firstName: z.string().trim().min(1, 'First name is required').max(120),
    phone: z.string().trim().min(1, 'Phone number is required'),
  }),

  delivery: z.object({
    method: z.enum(['home_delivery', 'pickup_point'], {
      errorMap: () => ({ message: 'Delivery method must be home_delivery or pickup_point' }),
    }),
    wilayaId: z.string().min(1, 'Wilaya is required'),
    communeId: z.string().min(1, 'Commune is required'),
    address: z.string().trim().max(500).optional().default(''),
  }),
});

const productsQuerySchema = z.object({
  category: z.string().optional(),
  featured: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  available: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .refine((v) => Number.isInteger(v) && v >= 1, 'page must be a positive integer'),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 20))
    .refine((v) => Number.isInteger(v) && v >= 1 && v <= 100, 'limit must be between 1 and 100'),
});

const searchQuerySchema = z.object({
  q: z.string().trim().min(1, 'A search query (q) is required'),
});

const deliveryFeeQuerySchema = z.object({
  wilayaId: z.string().min(1, 'wilayaId is required'),
  method: z.enum(['home_delivery', 'pickup_point'], {
    errorMap: () => ({ message: 'method must be home_delivery or pickup_point' }),
  }),
});

/**
 * Parses `schema` against `data`. On failure, throws an AppError shaped
 * like the rest of the API's error responses (with per-field messages)
 * instead of Zod's own error format.
 */
function parseOrThrow(schema, data) {
  const AppError = require('./app-error');
  const result = schema.safeParse(data);
  if (!result.success) {
    const fields = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_';
      if (!fields[key]) fields[key] = issue.message;
    }
    throw AppError.validation('Please check the submitted information.', fields);
  }
  return result.data;
}

/* ------------------------------------------------------------------
 * Phase 4: admin schemas. Same philosophy as above - shape validation
 * here, database/business rules in the services.
 * ------------------------------------------------------------------ */

const adminLoginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required').max(64),
  password: z.string().min(1, 'Password is required').max(256),
});

const productUpsertSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required').max(200),
  slug: z
    .string()
    .trim()
    .max(220)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers and hyphens')
    .optional()
    .or(z.literal('')),
  categoryId: z.string().trim().min(1, 'Category is required').max(64),
  price: z.number().positive('Price must be positive').max(100000000),
  oldPrice: z.number().positive('Old price must be positive').max(100000000).nullable().optional(),
  currency: z.string().trim().length(3).default('DZD'),
  image: z.string().trim().max(500).nullable().optional(),
  shortDescription: z.string().trim().max(500).nullable().optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  benefits: z.array(z.string().trim().max(300)).max(30).optional().default([]),
  usage: z.string().trim().max(2000).nullable().optional(),
  flavors: z.array(z.string().trim().max(100)).max(30).optional().default([]),
  available: z.boolean().optional().default(true),
  featured: z.boolean().optional().default(false),
});

const categoryUpsertSchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(120),
  slug: z
    .string()
    .trim()
    .max(140)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers and hyphens')
    .optional()
    .or(z.literal('')),
  description: z.string().trim().max(1000).nullable().optional(),
  image: z.string().trim().max(500).nullable().optional(),
  isActive: z.boolean().optional().default(true),
});

const orderStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'], {
    errorMap: () => ({ message: 'Invalid order status.' }),
  }),
});

const deliveryFeeUpdateSchema = z.object({
  fee: z.number().min(0, 'Fee cannot be negative').max(1000000),
  isActive: z.boolean().optional(),
});

const deliveryFeeMethodSchema = z.object({
  method: z.enum(['home_delivery', 'pickup_point'], {
    errorMap: () => ({ message: 'method must be home_delivery or pickup_point' }),
  }),
  fee: z.number().min(0, 'Fee cannot be negative').max(1000000),
});

const deliveryActiveSchema = z.object({
  isActive: z.boolean(),
});

const adminListQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: z.string().trim().max(30).optional(),
  category: z.string().trim().max(64).optional(),
  available: z.enum(['true', 'false']).optional(),
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .refine((v) => Number.isInteger(v) && v >= 1, 'page must be a positive integer'),
  pageSize: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 10))
    .refine((v) => Number.isInteger(v) && v >= 1 && v <= 100, 'pageSize must be between 1 and 100'),
});

module.exports = {
  createOrderSchema,
  productsQuerySchema,
  searchQuerySchema,
  deliveryFeeQuerySchema,
  parseOrThrow,
  adminLoginSchema,
  productUpsertSchema,
  categoryUpsertSchema,
  orderStatusSchema,
  deliveryFeeUpdateSchema,
  deliveryFeeMethodSchema,
  deliveryActiveSchema,
  adminListQuerySchema,
};
