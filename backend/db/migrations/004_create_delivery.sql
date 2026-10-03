-- Delivery methods are a small fixed lookup table (not a free-text
-- column) so orders and delivery_fees can both reference it and the
-- database rejects an unknown method by construction.

CREATE TABLE IF NOT EXISTS delivery_methods (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO delivery_methods (id, name, is_active) VALUES
  ('home_delivery', 'Home Delivery', true),
  ('pickup_point', 'Pick Up Point', true)
ON CONFLICT (id) DO NOTHING;

-- One fee per (wilaya, method). This is the real, admin-configurable
-- replacement for the flat mock rate the Phase 1 frontend used.
CREATE TABLE IF NOT EXISTS delivery_fees (
  id SERIAL PRIMARY KEY,
  wilaya_id VARCHAR(8) NOT NULL REFERENCES wilayas (id),
  delivery_method VARCHAR(32) NOT NULL REFERENCES delivery_methods (id),
  fee NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (fee >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (wilaya_id, delivery_method)
);
