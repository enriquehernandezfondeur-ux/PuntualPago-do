-- =============================================================
-- PuntualPago OS - Database Schema v1.0
-- Phase 1 MVP Core
-- =============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================================
-- ENUM TYPES
-- =============================================================

CREATE TYPE user_role AS ENUM (
  'super_admin',
  'admin',
  'gerente_operativo',
  'equipo_cobros',
  'equipo_legal',
  'equipo_mantenimiento',
  'contabilidad',
  'solo_lectura'
);

CREATE TYPE property_status AS ENUM (
  'disponible',
  'ocupada',
  'en_mantenimiento',
  'proceso_legal',
  'inactiva'
);

CREATE TYPE property_type AS ENUM (
  'apartamento',
  'casa',
  'local_comercial',
  'oficina',
  'villa',
  'penthouse',
  'estudio',
  'otro'
);

CREATE TYPE tenant_status AS ENUM (
  'activo',
  'en_observacion',
  'moroso',
  'en_legal',
  'desalojado',
  'historico'
);

CREATE TYPE lease_status AS ENUM (
  'activo',
  'por_vencer',
  'vencido',
  'renovado',
  'terminado',
  'cancelado'
);

CREATE TYPE payment_status AS ENUM (
  'al_dia',
  'vence_pronto',
  'vencido',
  'en_mora',
  'en_legal',
  'cubierto_garantia',
  'pagado'
);

CREATE TYPE currency AS ENUM ('DOP', 'USD');

CREATE TYPE guarantee_status AS ENUM (
  'activa',
  'inactiva',
  'reclamada',
  'recuperada',
  'perdida'
);

CREATE TYPE risk_level AS ENUM ('bajo', 'medio', 'alto', 'critico');

CREATE TYPE task_priority AS ENUM ('baja', 'media', 'alta', 'urgente');
CREATE TYPE task_status AS ENUM ('pendiente', 'en_proceso', 'completada', 'cancelada', 'vencida');

CREATE TYPE document_type AS ENUM (
  'contrato',
  'cedula',
  'pasaporte',
  'comprobante_pago',
  'inventario',
  'carta',
  'acta',
  'foto',
  'factura',
  'documento_legal',
  'cotizacion',
  'otro'
);

CREATE TYPE communication_channel AS ENUM ('whatsapp', 'email', 'llamada', 'nota_interna', 'sms');

CREATE TYPE legal_status AS ENUM ('prelegal', 'en_legal', 'desalojo', 'cerrado', 'recuperado');

CREATE TYPE maintenance_status AS ENUM (
  'pendiente', 'revisando', 'cotizado', 'aprobado',
  'en_proceso', 'completado', 'rechazado'
);

CREATE TYPE maintenance_payer AS ENUM ('propietario', 'inquilino', 'puntualpago');

-- =============================================================
-- USERS (extends Supabase auth.users)
-- =============================================================

CREATE TABLE users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL UNIQUE,
  full_name   TEXT NOT NULL,
  role        user_role NOT NULL DEFAULT 'solo_lectura',
  avatar_url  TEXT,
  phone       TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  last_login  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- OWNERS (Propietarios)
-- =============================================================

CREATE TABLE owners (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Personal / company
  full_name         TEXT NOT NULL,
  legal_name        TEXT,
  is_company        BOOLEAN NOT NULL DEFAULT false,
  cedula            TEXT,
  rnc               TEXT,
  email             TEXT,
  phone             TEXT,
  phone_alt         TEXT,
  whatsapp          TEXT,
  -- Address
  address           TEXT,
  sector            TEXT,
  city              TEXT DEFAULT 'Santo Domingo',
  -- Banking
  bank_name         TEXT,
  bank_account      TEXT,
  bank_account_type TEXT,
  payment_preference TEXT,
  -- Relationship
  relationship_level TEXT DEFAULT 'estandar',
  sensitivity_notes  TEXT,
  is_active          BOOLEAN NOT NULL DEFAULT true,
  -- Meta
  notes             TEXT,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- PROPERTIES (Propiedades)
-- =============================================================

CREATE TABLE properties (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Identity
  code            TEXT UNIQUE,
  name            TEXT NOT NULL,
  type            property_type NOT NULL,
  status          property_status NOT NULL DEFAULT 'disponible',
  -- Location
  address         TEXT NOT NULL,
  sector          TEXT,
  city            TEXT DEFAULT 'Santo Domingo',
  province        TEXT DEFAULT 'Distrito Nacional',
  lat             DECIMAL(10, 8),
  lng             DECIMAL(11, 8),
  -- Financial
  rent_amount     DECIMAL(12, 2) NOT NULL,
  currency        currency NOT NULL DEFAULT 'DOP',
  deposit_amount  DECIMAL(12, 2),
  payment_day     INTEGER NOT NULL DEFAULT 1 CHECK (payment_day BETWEEN 1 AND 31),
  -- Guarantee
  has_guarantee   BOOLEAN NOT NULL DEFAULT false,
  -- Relationships
  owner_id        UUID REFERENCES owners(id) ON DELETE SET NULL,
  -- Meta
  description     TEXT,
  notes           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- TENANTS (Inquilinos)
-- =============================================================

CREATE TABLE tenants (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Identity
  full_name         TEXT NOT NULL,
  id_type           TEXT DEFAULT 'cedula',
  id_number         TEXT,
  nationality       TEXT DEFAULT 'Dominicana',
  -- Contact
  email             TEXT,
  phone             TEXT,
  phone_alt         TEXT,
  whatsapp          TEXT,
  -- Employment
  occupation        TEXT,
  employer          TEXT,
  estimated_income  DECIMAL(12, 2),
  income_currency   currency DEFAULT 'DOP',
  -- Status
  status            tenant_status NOT NULL DEFAULT 'activo',
  risk_level        risk_level DEFAULT 'bajo',
  -- Balance
  pending_balance   DECIMAL(12, 2) NOT NULL DEFAULT 0,
  -- Address
  current_address   TEXT,
  -- References
  reference_1_name  TEXT,
  reference_1_phone TEXT,
  reference_2_name  TEXT,
  reference_2_phone TEXT,
  -- Meta
  notes             TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- LEASES (Contratos)
-- =============================================================

CREATE TABLE leases (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Code
  contract_number     TEXT UNIQUE,
  -- Relationships
  property_id         UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  owner_id            UUID NOT NULL REFERENCES owners(id) ON DELETE RESTRICT,
  -- Dates
  start_date          DATE NOT NULL,
  end_date            DATE NOT NULL,
  -- Financial
  rent_amount         DECIMAL(12, 2) NOT NULL,
  currency            currency NOT NULL DEFAULT 'DOP',
  deposit_amount      DECIMAL(12, 2),
  late_fee_percentage DECIMAL(5, 2) DEFAULT 5.00,
  late_fee_grace_days INTEGER DEFAULT 5,
  payment_day         INTEGER NOT NULL DEFAULT 1,
  -- Status
  status              lease_status NOT NULL DEFAULT 'activo',
  -- Guarantee
  has_guarantee       BOOLEAN NOT NULL DEFAULT false,
  guarantee_id        UUID,
  -- Signing
  signed_date         DATE,
  signing_status      TEXT DEFAULT 'pendiente',
  -- Special conditions
  special_conditions  TEXT,
  inventory_included  BOOLEAN DEFAULT false,
  -- Meta
  notes               TEXT,
  created_by          UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- GUARANTEES (Garantía PuntualPago)
-- =============================================================

CREATE TABLE guarantees (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lease_id            UUID NOT NULL REFERENCES leases(id) ON DELETE RESTRICT,
  property_id         UUID NOT NULL REFERENCES properties(id),
  tenant_id           UUID NOT NULL REFERENCES tenants(id),
  owner_id            UUID NOT NULL REFERENCES owners(id),
  -- Status
  status              guarantee_status NOT NULL DEFAULT 'activa',
  -- Dates
  start_date          DATE NOT NULL,
  end_date            DATE,
  -- Financial
  guaranteed_amount   DECIMAL(12, 2) NOT NULL,
  currency            currency NOT NULL DEFAULT 'DOP',
  total_exposure      DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_recovered     DECIMAL(12, 2) NOT NULL DEFAULT 0,
  -- Payout deadline
  payout_deadline_days INTEGER DEFAULT 5,
  -- Meta
  notes               TEXT,
  created_by          UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK from leases to guarantees
ALTER TABLE leases ADD CONSTRAINT fk_lease_guarantee
  FOREIGN KEY (guarantee_id) REFERENCES guarantees(id);

-- =============================================================
-- PAYMENTS (Pagos)
-- =============================================================

CREATE TABLE payments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Reference
  payment_number    TEXT UNIQUE,
  lease_id          UUID NOT NULL REFERENCES leases(id) ON DELETE RESTRICT,
  property_id       UUID NOT NULL REFERENCES properties(id),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  owner_id          UUID NOT NULL REFERENCES owners(id),
  -- Period
  period_year       INTEGER NOT NULL,
  period_month      INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  due_date          DATE NOT NULL,
  -- Amounts
  rent_amount       DECIMAL(12, 2) NOT NULL,
  currency          currency NOT NULL DEFAULT 'DOP',
  late_fee          DECIMAL(12, 2) NOT NULL DEFAULT 0,
  discount          DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_due         DECIMAL(12, 2) GENERATED ALWAYS AS (rent_amount + late_fee - discount) STORED,
  amount_paid       DECIMAL(12, 2) NOT NULL DEFAULT 0,
  balance_due       DECIMAL(12, 2) GENERATED ALWAYS AS (rent_amount + late_fee - discount - amount_paid) STORED,
  -- Status
  status            payment_status NOT NULL DEFAULT 'al_dia',
  days_overdue      INTEGER NOT NULL DEFAULT 0,
  -- Guarantee
  covered_by_guarantee BOOLEAN NOT NULL DEFAULT false,
  guarantee_id      UUID REFERENCES guarantees(id),
  -- Payment info
  paid_date         DATE,
  payment_method    TEXT,
  payment_reference TEXT,
  -- Flags
  sent_to_legal     BOOLEAN NOT NULL DEFAULT false,
  -- Meta
  notes             TEXT,
  created_by        UUID REFERENCES users(id),
  updated_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (lease_id, period_year, period_month)
);

-- =============================================================
-- PAYMENT ATTEMPTS (Intentos de cobro)
-- =============================================================

CREATE TABLE payment_attempts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id    UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  -- Attempt info
  attempt_date  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  channel       communication_channel NOT NULL DEFAULT 'llamada',
  result        TEXT,
  next_action   TEXT,
  -- Meta
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- GUARANTEE CLAIMS (Reclamaciones de garantía)
-- =============================================================

CREATE TABLE guarantee_claims (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guarantee_id      UUID NOT NULL REFERENCES guarantees(id) ON DELETE RESTRICT,
  payment_id        UUID NOT NULL REFERENCES payments(id),
  -- Claim info
  claim_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  amount_claimed    DECIMAL(12, 2) NOT NULL,
  currency          currency NOT NULL DEFAULT 'DOP',
  -- Payout to owner
  payout_date       DATE,
  payout_amount     DECIMAL(12, 2),
  payout_reference  TEXT,
  owner_paid        BOOLEAN NOT NULL DEFAULT false,
  -- Recovery from tenant
  recovery_amount   DECIMAL(12, 2) NOT NULL DEFAULT 0,
  recovery_date     DATE,
  fully_recovered   BOOLEAN NOT NULL DEFAULT false,
  -- Status
  status            TEXT DEFAULT 'abierto',
  -- Meta
  notes             TEXT,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- OWNER PAYOUTS (Liquidaciones a propietarios)
-- =============================================================

CREATE TABLE owner_payouts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id        UUID NOT NULL REFERENCES owners(id) ON DELETE RESTRICT,
  property_id     UUID NOT NULL REFERENCES properties(id),
  -- Period
  period_year     INTEGER NOT NULL,
  period_month    INTEGER NOT NULL,
  -- Amounts
  rent_collected  DECIMAL(12, 2) NOT NULL,
  management_fee  DECIMAL(12, 2) NOT NULL DEFAULT 0,
  fee_percentage  DECIMAL(5, 2),
  maintenance_deductions DECIMAL(12, 2) DEFAULT 0,
  other_deductions       DECIMAL(12, 2) DEFAULT 0,
  net_payout      DECIMAL(12, 2) NOT NULL,
  currency        currency NOT NULL DEFAULT 'DOP',
  -- Status
  paid            BOOLEAN NOT NULL DEFAULT false,
  paid_date       DATE,
  payment_reference TEXT,
  payment_method  TEXT,
  -- Guarantee
  covered_by_guarantee BOOLEAN NOT NULL DEFAULT false,
  -- Meta
  notes           TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- RISK SCORES
-- =============================================================

CREATE TABLE risk_scores (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type     TEXT NOT NULL,
  entity_id       UUID NOT NULL,
  -- Score components (0-100)
  score           INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  level           risk_level NOT NULL DEFAULT 'bajo',
  -- Factors
  payment_history_score  INTEGER DEFAULT 0,
  days_overdue_score     INTEGER DEFAULT 0,
  recurrence_score       INTEGER DEFAULT 0,
  income_score           INTEGER DEFAULT 0,
  documents_score        INTEGER DEFAULT 0,
  references_score       INTEGER DEFAULT 0,
  -- Recommended action
  recommended_action TEXT,
  -- Meta
  calculated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  calculated_by   TEXT DEFAULT 'system',
  UNIQUE (entity_type, entity_id)
);

-- =============================================================
-- DOCUMENTS (Documentos)
-- =============================================================

CREATE TABLE documents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Type and entity
  type          document_type NOT NULL,
  -- Polymorphic associations
  property_id   UUID REFERENCES properties(id) ON DELETE CASCADE,
  owner_id      UUID REFERENCES owners(id) ON DELETE CASCADE,
  tenant_id     UUID REFERENCES tenants(id) ON DELETE CASCADE,
  lease_id      UUID REFERENCES leases(id) ON DELETE CASCADE,
  -- File
  file_name     TEXT NOT NULL,
  file_path     TEXT NOT NULL,
  file_size     INTEGER,
  mime_type     TEXT,
  -- Metadata
  is_private    BOOLEAN NOT NULL DEFAULT false,
  description   TEXT,
  -- Meta
  uploaded_by   UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- TASKS (Tareas internas)
-- =============================================================

CREATE TABLE tasks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         TEXT NOT NULL,
  description   TEXT,
  -- Assignment
  assigned_to   UUID REFERENCES users(id),
  created_by    UUID REFERENCES users(id),
  -- Priority & status
  priority      task_priority NOT NULL DEFAULT 'media',
  status        task_status NOT NULL DEFAULT 'pendiente',
  -- Dates
  due_date      DATE,
  completed_at  TIMESTAMPTZ,
  -- Polymorphic entity link
  entity_type   TEXT,
  entity_id     UUID,
  -- Specific FKs for easy queries
  property_id   UUID REFERENCES properties(id),
  owner_id      UUID REFERENCES owners(id),
  tenant_id     UUID REFERENCES tenants(id),
  lease_id      UUID REFERENCES leases(id),
  payment_id    UUID REFERENCES payments(id),
  -- Meta
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- NOTES (Notas internas)
-- =============================================================

CREATE TABLE notes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content       TEXT NOT NULL,
  -- Polymorphic
  property_id   UUID REFERENCES properties(id) ON DELETE CASCADE,
  owner_id      UUID REFERENCES owners(id) ON DELETE CASCADE,
  tenant_id     UUID REFERENCES tenants(id) ON DELETE CASCADE,
  lease_id      UUID REFERENCES leases(id) ON DELETE CASCADE,
  payment_id    UUID REFERENCES payments(id) ON DELETE CASCADE,
  -- Meta
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- COMMUNICATIONS (Comunicaciones)
-- =============================================================

CREATE TABLE communications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Channel and direction
  channel       communication_channel NOT NULL,
  direction     TEXT DEFAULT 'outbound',
  -- Subject / content
  subject       TEXT,
  content       TEXT NOT NULL,
  template_used TEXT,
  -- Entity links
  tenant_id     UUID REFERENCES tenants(id),
  owner_id      UUID REFERENCES owners(id),
  property_id   UUID REFERENCES properties(id),
  payment_id    UUID REFERENCES payments(id),
  -- Status
  sent_at       TIMESTAMPTZ,
  delivered     BOOLEAN,
  read_at       TIMESTAMPTZ,
  -- Meta
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- LEGAL CASES (Casos legales)
-- =============================================================

CREATE TABLE legal_cases (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_number       TEXT UNIQUE,
  -- Links
  property_id       UUID NOT NULL REFERENCES properties(id),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  owner_id          UUID NOT NULL REFERENCES owners(id),
  lease_id          UUID REFERENCES leases(id),
  -- Details
  status            legal_status NOT NULL DEFAULT 'prelegal',
  reason            TEXT NOT NULL,
  amount_owed       DECIMAL(12, 2) NOT NULL,
  currency          currency DEFAULT 'DOP',
  days_in_arrears   INTEGER,
  -- Assignment
  lawyer_assigned   TEXT,
  internal_assigned UUID REFERENCES users(id),
  -- Dates
  opened_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  next_action_date  DATE,
  next_action       TEXT,
  closed_date       DATE,
  -- Meta
  notes             TEXT,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- MAINTENANCE REQUESTS (Mantenimiento)
-- =============================================================

CREATE TABLE maintenance_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number   TEXT UNIQUE,
  -- Links
  property_id     UUID NOT NULL REFERENCES properties(id),
  tenant_id       UUID REFERENCES tenants(id),
  -- Details
  title           TEXT NOT NULL,
  description     TEXT,
  priority        task_priority NOT NULL DEFAULT 'media',
  status          maintenance_status NOT NULL DEFAULT 'pendiente',
  -- Financial
  estimated_cost  DECIMAL(12, 2),
  actual_cost     DECIMAL(12, 2),
  currency        currency DEFAULT 'DOP',
  paid_by         maintenance_payer,
  -- Assignment
  provider_name   TEXT,
  provider_phone  TEXT,
  assigned_to     UUID REFERENCES users(id),
  -- Dates
  reported_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  scheduled_date  DATE,
  completed_date  DATE,
  -- Meta
  notes           TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- NOTIFICATIONS (Notificaciones)
-- =============================================================

CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  type          TEXT NOT NULL,
  entity_type   TEXT,
  entity_id     UUID,
  read          BOOLEAN NOT NULL DEFAULT false,
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- AUDIT LOGS (Registro de auditoría)
-- =============================================================

CREATE TABLE audit_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Who
  user_id       UUID REFERENCES users(id),
  user_email    TEXT,
  user_role     TEXT,
  -- What
  action        TEXT NOT NULL,
  entity_type   TEXT NOT NULL,
  entity_id     UUID,
  -- Change detail
  old_values    JSONB,
  new_values    JSONB,
  metadata      JSONB,
  -- Context
  ip_address    INET,
  user_agent    TEXT,
  -- When
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- SETTINGS
-- =============================================================

CREATE TABLE settings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key         TEXT NOT NULL UNIQUE,
  value       JSONB NOT NULL,
  description TEXT,
  updated_by  UUID REFERENCES users(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- INDEXES
-- =============================================================

-- Payments
CREATE INDEX idx_payments_lease_id ON payments(lease_id);
CREATE INDEX idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_due_date ON payments(due_date);
CREATE INDEX idx_payments_period ON payments(period_year, period_month);

-- Properties
CREATE INDEX idx_properties_owner_id ON properties(owner_id);
CREATE INDEX idx_properties_status ON properties(status);

-- Leases
CREATE INDEX idx_leases_property_id ON leases(property_id);
CREATE INDEX idx_leases_tenant_id ON leases(tenant_id);
CREATE INDEX idx_leases_status ON leases(status);
CREATE INDEX idx_leases_end_date ON leases(end_date);

-- Tasks
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

-- Audit logs
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Full-text search
CREATE INDEX idx_tenants_name_trgm ON tenants USING GIN (full_name gin_trgm_ops);
CREATE INDEX idx_owners_name_trgm ON owners USING GIN (full_name gin_trgm_ops);
CREATE INDEX idx_properties_name_trgm ON properties USING GIN (name gin_trgm_ops);

-- =============================================================
-- AUTO-UPDATE updated_at
-- =============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','owners','properties','tenants','leases',
    'guarantees','payments','guarantee_claims','owner_payouts',
    'tasks','notes','legal_cases','maintenance_requests','settings'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON %s
       FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      t, t
    );
  END LOOP;
END;
$$;

-- =============================================================
-- AUTO-GENERATE CODES
-- =============================================================

CREATE SEQUENCE payment_number_seq START 1000;
CREATE SEQUENCE contract_number_seq START 1000;
CREATE SEQUENCE legal_case_number_seq START 100;
CREATE SEQUENCE maintenance_ticket_seq START 1000;

CREATE OR REPLACE FUNCTION generate_payment_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_number IS NULL THEN
    NEW.payment_number := 'PAY-' || LPAD(nextval('payment_number_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_payment_number
  BEFORE INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION generate_payment_number();

CREATE OR REPLACE FUNCTION generate_contract_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contract_number IS NULL THEN
    NEW.contract_number := 'CON-' || LPAD(nextval('contract_number_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_contract_number
  BEFORE INSERT ON leases
  FOR EACH ROW EXECUTE FUNCTION generate_contract_number();

-- =============================================================
-- AUDIT LOG FUNCTION
-- =============================================================

CREATE OR REPLACE FUNCTION log_audit_event(
  p_user_id     UUID,
  p_user_email  TEXT,
  p_user_role   TEXT,
  p_action      TEXT,
  p_entity_type TEXT,
  p_entity_id   UUID,
  p_old_values  JSONB DEFAULT NULL,
  p_new_values  JSONB DEFAULT NULL,
  p_metadata    JSONB DEFAULT NULL,
  p_ip_address  INET DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO audit_logs (
    user_id, user_email, user_role, action, entity_type, entity_id,
    old_values, new_values, metadata, ip_address
  ) VALUES (
    p_user_id, p_user_email, p_user_role, p_action, p_entity_type, p_entity_id,
    p_old_values, p_new_values, p_metadata, p_ip_address
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================
-- DASHBOARD STATS VIEW
-- =============================================================

CREATE OR REPLACE VIEW dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM properties WHERE status = 'ocupada' AND is_active = true)          AS active_properties,
  (SELECT COUNT(*) FROM properties WHERE is_active = true)                                  AS total_properties,
  (SELECT COALESCE(SUM(rent_amount), 0) FROM properties WHERE status = 'ocupada' AND is_active = true)  AS monthly_rent_managed,
  (SELECT COUNT(*) FROM payments WHERE status = 'pagado' AND period_month = EXTRACT(MONTH FROM NOW()) AND period_year = EXTRACT(YEAR FROM NOW()))  AS paid_this_month,
  (SELECT COUNT(*) FROM payments WHERE status IN ('vencido','en_mora') )                    AS overdue_count,
  (SELECT COALESCE(SUM(balance_due), 0) FROM payments WHERE status IN ('vencido','en_mora'))  AS total_arrears,
  (SELECT COUNT(*) FROM payments WHERE covered_by_guarantee = true AND period_month = EXTRACT(MONTH FROM NOW()) AND period_year = EXTRACT(YEAR FROM NOW()))  AS covered_by_guarantee,
  (SELECT COUNT(*) FROM leases WHERE status = 'activo' AND end_date BETWEEN NOW() AND NOW() + INTERVAL '90 days')  AS leases_expiring_90d,
  (SELECT COUNT(*) FROM leases WHERE status = 'activo' AND end_date BETWEEN NOW() AND NOW() + INTERVAL '30 days')  AS leases_expiring_30d,
  (SELECT COUNT(*) FROM legal_cases WHERE status != 'cerrado')                               AS open_legal_cases,
  (SELECT COUNT(*) FROM maintenance_requests WHERE status NOT IN ('completado','rechazado')) AS open_maintenance,
  (SELECT COUNT(*) FROM tasks WHERE status IN ('pendiente','en_proceso') AND due_date < CURRENT_DATE)  AS overdue_tasks,
  (SELECT COUNT(*) FROM owner_payouts WHERE paid = false)                                    AS pending_owner_payouts,
  NOW() AS calculated_at;

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================

ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE owners             ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants            ENABLE ROW LEVEL SECURITY;
ALTER TABLE leases             ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_attempts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE guarantees         ENABLE ROW LEVEL SECURITY;
ALTER TABLE guarantee_claims   ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_payouts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_cases        ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_scores        ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings           ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS user_role AS $$
  SELECT role FROM users WHERE id = user_uuid;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check if user is admin or above
CREATE OR REPLACE FUNCTION is_admin_or_above()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('super_admin','admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Users: can see own record; admins see all
CREATE POLICY users_self ON users FOR SELECT
  USING (id = auth.uid() OR is_admin_or_above());

CREATE POLICY users_admin_update ON users FOR UPDATE
  USING (is_admin_or_above());

-- All authenticated users can read core data
CREATE POLICY owners_read ON owners FOR SELECT
  TO authenticated USING (true);
CREATE POLICY owners_write ON owners FOR ALL
  USING (get_user_role(auth.uid()) IN ('super_admin','admin','gerente_operativo'));

CREATE POLICY properties_read ON properties FOR SELECT
  TO authenticated USING (true);
CREATE POLICY properties_write ON properties FOR ALL
  USING (get_user_role(auth.uid()) IN ('super_admin','admin','gerente_operativo'));

CREATE POLICY tenants_read ON tenants FOR SELECT
  TO authenticated USING (true);
CREATE POLICY tenants_write ON tenants FOR ALL
  USING (get_user_role(auth.uid()) IN ('super_admin','admin','gerente_operativo','equipo_cobros'));

CREATE POLICY leases_read ON leases FOR SELECT
  TO authenticated USING (true);
CREATE POLICY leases_write ON leases FOR ALL
  USING (get_user_role(auth.uid()) IN ('super_admin','admin','gerente_operativo'));

CREATE POLICY payments_read ON payments FOR SELECT
  TO authenticated USING (true);
CREATE POLICY payments_write ON payments FOR ALL
  USING (get_user_role(auth.uid()) IN ('super_admin','admin','gerente_operativo','equipo_cobros'));

CREATE POLICY guarantees_read ON guarantees FOR SELECT
  TO authenticated USING (true);
CREATE POLICY guarantees_write ON guarantees FOR ALL
  USING (get_user_role(auth.uid()) IN ('super_admin','admin','gerente_operativo'));

CREATE POLICY documents_read ON documents FOR SELECT
  TO authenticated USING (NOT is_private OR get_user_role(auth.uid()) IN ('super_admin','admin'));
CREATE POLICY documents_write ON documents FOR ALL
  USING (get_user_role(auth.uid()) IN ('super_admin','admin','gerente_operativo','equipo_cobros','equipo_legal'));

CREATE POLICY tasks_read ON tasks FOR SELECT
  TO authenticated USING (true);
CREATE POLICY tasks_write ON tasks FOR ALL
  TO authenticated USING (true);

CREATE POLICY legal_read ON legal_cases FOR SELECT
  USING (get_user_role(auth.uid()) IN ('super_admin','admin','gerente_operativo','equipo_legal','equipo_cobros'));
CREATE POLICY legal_write ON legal_cases FOR ALL
  USING (get_user_role(auth.uid()) IN ('super_admin','admin','gerente_operativo','equipo_legal'));

CREATE POLICY maintenance_read ON maintenance_requests FOR SELECT
  TO authenticated USING (true);
CREATE POLICY maintenance_write ON maintenance_requests FOR ALL
  USING (get_user_role(auth.uid()) IN ('super_admin','admin','gerente_operativo','equipo_mantenimiento'));

CREATE POLICY audit_read ON audit_logs FOR SELECT
  USING (get_user_role(auth.uid()) IN ('super_admin','admin'));
CREATE POLICY audit_insert ON audit_logs FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY notifications_own ON notifications FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY settings_read ON settings FOR SELECT
  TO authenticated USING (true);
CREATE POLICY settings_write ON settings FOR ALL
  USING (is_admin_or_above());

-- =============================================================
-- DEFAULT SETTINGS
-- =============================================================

INSERT INTO settings (key, value, description) VALUES
  ('company_name',           '"PuntualPago"',               'Nombre de la empresa'),
  ('company_tagline',        '"Alquiler Garantizado"',       'Eslogan'),
  ('default_currency',       '"DOP"',                        'Moneda por defecto'),
  ('late_fee_percentage',    '5',                            '% de mora por defecto'),
  ('late_fee_grace_days',    '5',                            'Días de gracia antes de mora'),
  ('guarantee_payout_days',  '5',                            'Días límite para pagar propietario en garantía'),
  ('contract_alert_days',    '[90, 60, 30]',                 'Días de alerta antes de vencer contrato'),
  ('whatsapp_enabled',       'false',                        'WhatsApp API activado'),
  ('email_enabled',          'false',                        'Email automático activado');
