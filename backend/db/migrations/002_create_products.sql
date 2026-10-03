-- Products keep their stable string IDs (e.g. 'prod-001') to match
-- the existing frontend and its sample data. benefits/flavors stay as
-- JSONB arrays - they're small, product-specific lists with no need
-- for their own join tables at this stage.

CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  category_id VARCHAR(64) NOT NULL REFERENCES categories (id),
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  old_price NUMERIC(10, 2) CHECK (old_price IS NULL OR old_price >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'DZD',
  image VARCHAR(255),
  short_description TEXT,
  description TEXT,
  benefits JSONB NOT NULL DEFAULT '[]'::jsonb,
  usage TEXT,
  flavors JSONB NOT NULL DEFAULT '[]'::jsonb,
  available BOOLEAN NOT NULL DEFAULT true,
  featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category_id ON products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_available ON products (available);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products (featured);

-- Full-text-ish search across name/short_description/description without
-- extra extensions: a trigram-free ILIKE search is enough at this scale
-- and keeps the migration dependency-free. An index still helps ILIKE
-- '%term%' less than it would help a prefix search, so this is a plain
-- btree for now; revisit with pg_trgm if the catalog grows much larger.
CREATE INDEX IF NOT EXISTS idx_products_name ON products (name);
