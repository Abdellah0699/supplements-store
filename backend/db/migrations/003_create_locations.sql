-- Algeria's administrative divisions. Seeded from the existing
-- frontend's data/algeria-locations.json (69 wilayas, ~1,700 communes),
-- which already carries French and Arabic names for each.

CREATE TABLE IF NOT EXISTS wilayas (
  id VARCHAR(8) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  name_ar VARCHAR(120)
);

CREATE TABLE IF NOT EXISTS communes (
  id VARCHAR(16) PRIMARY KEY,
  wilaya_id VARCHAR(8) NOT NULL REFERENCES wilayas (id),
  name VARCHAR(120) NOT NULL,
  name_ar VARCHAR(120)
);

CREATE INDEX IF NOT EXISTS idx_communes_wilaya_id ON communes (wilaya_id);
