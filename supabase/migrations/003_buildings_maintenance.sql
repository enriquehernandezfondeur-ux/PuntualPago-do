-- =============================================================
-- PuntualPago OS - Buildings & Maintenance Fees
-- Migration 003
-- =============================================================

-- ─── BUILDINGS ────────────────────────────────────────────────────────────────
-- Grupos de unidades (edificios, condominios) que comparten un fondo de mantenimiento.
-- Propiedades individuales (casas, locales) no necesitan edificio.

CREATE TABLE buildings (
  id                         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Identity
  name                       TEXT NOT NULL,
  code                       TEXT UNIQUE,
  address                    TEXT,
  sector                     TEXT,
  city                       TEXT NOT NULL DEFAULT 'Santo Domingo',
  province                   TEXT NOT NULL DEFAULT 'Distrito Nacional',
  -- Units
  total_units                INTEGER NOT NULL DEFAULT 1,
  -- Maintenance fund
  monthly_maintenance_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  currency                   currency NOT NULL DEFAULT 'DOP',
  -- Meta
  notes                      TEXT,
  is_active                  BOOLEAN NOT NULL DEFAULT TRUE,
  created_by                 UUID REFERENCES users(id),
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── PROPERTIES: add building + maintenance fields ────────────────────────────

ALTER TABLE properties
  ADD COLUMN building_id      UUID REFERENCES buildings(id) ON DELETE SET NULL,
  ADD COLUMN maintenance_fee  DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN maintenance_fee_override BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN properties.maintenance_fee IS
  'Cuota mensual de mantenimiento que se descuenta de la liquidación al propietario. Si maintenance_fee_override = FALSE, se sugiere calcular como building.monthly_maintenance_amount ÷ unidades_ocupadas.';

COMMENT ON COLUMN properties.maintenance_fee_override IS
  'TRUE si el monto fue definido manualmente. FALSE si debe re-calcularse al cambiar las unidades ocupadas del edificio.';

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;

CREATE POLICY buildings_all ON buildings
  FOR ALL
  USING (TRUE);

-- ─── UPDATED_AT trigger ───────────────────────────────────────────────────────

CREATE TRIGGER buildings_updated_at
  BEFORE UPDATE ON buildings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ─── SEED: sample buildings matching existing seed properties ─────────────────
-- Torre Piantini — PP-001 (Apto 3B), PP-006 (Apto 2 Hab Arroyo Hondo realmente está en Arroyo Hondo, distinto)
-- En datos reales PP-001 y PP-003 son ambos en edificios distintos

INSERT INTO buildings (id, name, code, address, sector, city, total_units, monthly_maintenance_amount, currency, notes) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'Torre Piantini',     'ED-001', 'Av. Abraham Lincoln #105', 'Piantini',     'Santo Domingo', 12, 48000, 'DOP', 'Edificio residencial 12 unidades. Mantenimiento incluye áreas comunes, elevadores y jardines.'),
  ('c0000001-0000-0000-0000-000000000002', 'Torre Naco Premium', 'ED-002', 'Av. Tiradentes #33',       'Naco',         'Santo Domingo',  8, 64000, 'DOP', 'Edificio premium 8 unidades. Piscina, gimnasio y seguridad 24h.');

-- Link properties to buildings and set maintenance_fee
UPDATE properties SET
  building_id     = 'c0000001-0000-0000-0000-000000000001',
  maintenance_fee = 4000  -- 48000 / 12 units
WHERE id = 'b0000001-0000-0000-0000-000000000001';  -- Apto 3B Torre Piantini

UPDATE properties SET
  building_id     = 'c0000001-0000-0000-0000-000000000002',
  maintenance_fee = 8000  -- 64000 / 8 units
WHERE id = 'b0000001-0000-0000-0000-000000000003';  -- Penthouse Naco Vista Mar
