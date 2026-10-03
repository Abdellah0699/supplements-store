-- Orders reference wilaya/commune/delivery_method by ID (not free text)
-- so the foreign keys themselves guarantee the values are real. The
-- commune-belongs-to-wilaya check still has to happen in application
-- code (see orders.service.js) since that's a cross-row business rule,
-- not something a single FK constraint can express.

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_reference VARCHAR(32) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),

  customer_first_name VARCHAR(120) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,

  wilaya_id VARCHAR(8) NOT NULL REFERENCES wilayas (id),
  commune_id VARCHAR(16) NOT NULL REFERENCES communes (id),
  address TEXT,

  delivery_method VARCHAR(32) NOT NULL REFERENCES delivery_methods (id),
  delivery_fee NUMERIC(10, 2) NOT NULL CHECK (delivery_fee >= 0),

  subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
  total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at);
