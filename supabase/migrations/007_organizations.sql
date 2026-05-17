-- =============================================================
-- PuntualPago OS - Migration 007: Multi-Tenancy / Organizations
-- Adds organizations table, subscription plans, organization_id
-- columns on every core table, helper function, RLS policies,
-- and org-scoped indexes.
-- =============================================================

-- =============================================================
-- SUBSCRIPTION PLANS
-- =============================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT NOT NULL,
  slug             TEXT UNIQUE NOT NULL,
  price_dop        DECIMAL(12, 2),
  price_usd        DECIMAL(12, 2),
  properties_limit INTEGER DEFAULT 50,
  users_limit      INTEGER DEFAULT 5,
  features         JSONB DEFAULT '{}',
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed initial plans
INSERT INTO subscription_plans (slug, name, price_dop, price_usd, properties_limit, users_limit, features) VALUES
  ('basico',      'Básico',      3500,  NULL, 30,           3,  '{"whatsapp":false,"email":true,"portal":true,"reports":"basico"}'),
  ('profesional', 'Profesional', 7500,  NULL, 100,          10, '{"whatsapp":true,"email":true,"portal":true,"reports":"avanzado","api":true}'),
  ('empresarial', 'Empresarial', 15000, NULL, 2147483647,   50, '{"whatsapp":true,"email":true,"portal":true,"reports":"completo","api":true,"sla":true}')
ON CONFLICT (slug) DO NOTHING;

-- =============================================================
-- ORGANIZATIONS
-- =============================================================

CREATE TABLE IF NOT EXISTS organizations (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT NOT NULL,
  slug             TEXT UNIQUE,
  logo_url         TEXT,
  phone            TEXT,
  email            TEXT,
  address          TEXT,
  city             TEXT,
  rnc              TEXT,
  plan             TEXT NOT NULL DEFAULT 'basico',
  plan_expires_at  TIMESTAMPTZ,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================
-- ADD organization_id TO ALL CORE TABLES
-- =============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

ALTER TABLE owners
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

ALTER TABLE buildings
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

ALTER TABLE leases
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

ALTER TABLE owner_payouts
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

ALTER TABLE communications
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

ALTER TABLE legal_cases
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

ALTER TABLE maintenance_requests
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

ALTER TABLE guarantees
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

ALTER TABLE risk_scores
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- =============================================================
-- INDEXES ON organization_id
-- =============================================================

CREATE INDEX IF NOT EXISTS idx_users_org_id              ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_owners_org_id             ON owners(organization_id);
CREATE INDEX IF NOT EXISTS idx_tenants_org_id            ON tenants(organization_id);
CREATE INDEX IF NOT EXISTS idx_properties_org_id         ON properties(organization_id);
CREATE INDEX IF NOT EXISTS idx_buildings_org_id          ON buildings(organization_id);
CREATE INDEX IF NOT EXISTS idx_leases_org_id             ON leases(organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_org_id           ON payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_owner_payouts_org_id      ON owner_payouts(organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_org_id          ON documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_org_id              ON tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_communications_org_id     ON communications(organization_id);
CREATE INDEX IF NOT EXISTS idx_legal_cases_org_id        ON legal_cases(organization_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_org_id ON maintenance_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_guarantees_org_id         ON guarantees(organization_id);
CREATE INDEX IF NOT EXISTS idx_risk_scores_org_id        ON risk_scores(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id         ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org_id      ON notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_settings_org_id           ON settings(organization_id);

-- =============================================================
-- HELPER FUNCTION: get_user_org_id()
-- Returns the organization_id of the currently authenticated user.
-- =============================================================

CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================================
-- RLS: Enable on new tables
-- =============================================================

ALTER TABLE organizations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- subscription_plans: readable by everyone authenticated
CREATE POLICY subscription_plans_read ON subscription_plans
  FOR SELECT TO authenticated USING (true);

-- subscription_plans: writable only by super_admin
CREATE POLICY subscription_plans_write ON subscription_plans
  FOR ALL
  USING (get_user_role(auth.uid()) = 'super_admin');

-- organizations: super_admin sees all; org members see their own
CREATE POLICY organizations_read ON organizations
  FOR SELECT
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR id = get_user_org_id()
  );

CREATE POLICY organizations_write ON organizations
  FOR ALL
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR (id = get_user_org_id() AND get_user_role(auth.uid()) IN ('admin'))
  );

-- =============================================================
-- RLS: Update existing table policies to scope by organization_id
--
-- Strategy:
--   • super_admin bypasses org scoping (sees everything).
--   • All other roles see only rows where organization_id = get_user_org_id().
--   • Portal policies from 005 are LEFT INTACT — they filter by
--     tenant/owner identity and remain valid within an org because
--     the user's tenant/owner record also carries organization_id.
--   • We ADD new org-scoped policies alongside the existing ones
--     using OR-style checks, but because Postgres evaluates multiple
--     policies with OR semantics for the same command, we DROP the
--     broad "read all" policies that ignore org boundaries and
--     replace them with org-aware versions.
-- =============================================================

-- ── USERS ────────────────────────────────────────────────────
DROP POLICY IF EXISTS users_self ON users;
DROP POLICY IF EXISTS users_admin_update ON users;

CREATE POLICY users_select ON users FOR SELECT
  USING (
    id = auth.uid()
    OR get_user_role(auth.uid()) = 'super_admin'
    OR (
      get_user_role(auth.uid()) IN ('admin','gerente_operativo','equipo_cobros','equipo_legal','equipo_mantenimiento','contabilidad','solo_lectura')
      AND organization_id = get_user_org_id()
    )
  );

CREATE POLICY users_update ON users FOR UPDATE
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR (is_admin_or_above() AND organization_id = get_user_org_id())
  );

CREATE POLICY users_insert ON users FOR INSERT
  WITH CHECK (
    get_user_role(auth.uid()) = 'super_admin'
    OR (is_admin_or_above() AND organization_id = get_user_org_id())
  );

CREATE POLICY users_delete ON users FOR DELETE
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR (is_admin_or_above() AND organization_id = get_user_org_id())
  );

-- ── OWNERS ───────────────────────────────────────────────────
DROP POLICY IF EXISTS owners_read ON owners;
DROP POLICY IF EXISTS owners_write ON owners;

CREATE POLICY owners_select ON owners FOR SELECT
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR organization_id = get_user_org_id()
    OR user_id = auth.uid()  -- portal: own record (from 005 owners_portal_self)
  );

CREATE POLICY owners_insert ON owners FOR INSERT
  WITH CHECK (
    get_user_role(auth.uid()) = 'super_admin'
    OR (
      get_user_role(auth.uid()) IN ('admin','gerente_operativo')
      AND organization_id = get_user_org_id()
    )
  );

CREATE POLICY owners_update ON owners FOR UPDATE
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR (
      get_user_role(auth.uid()) IN ('admin','gerente_operativo')
      AND organization_id = get_user_org_id()
    )
  );

CREATE POLICY owners_delete ON owners FOR DELETE
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR (
      get_user_role(auth.uid()) IN ('admin','gerente_operativo')
      AND organization_id = get_user_org_id()
    )
  );

-- Drop the old portal_self policy — now covered by owners_select above
DROP POLICY IF EXISTS owners_portal_self ON owners;

-- ── TENANTS ──────────────────────────────────────────────────
DROP POLICY IF EXISTS tenants_read ON tenants;
DROP POLICY IF EXISTS tenants_write ON tenants;

CREATE POLICY tenants_select ON tenants FOR SELECT
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR organization_id = get_user_org_id()
    OR user_id = auth.uid()  -- portal: own record (from 005 tenants_portal_self)
  );

CREATE POLICY tenants_insert ON tenants FOR INSERT
  WITH CHECK (
    get_user_role(auth.uid()) = 'super_admin'
    OR (
      get_user_role(auth.uid()) IN ('admin','gerente_operativo','equipo_cobros')
      AND organization_id = get_user_org_id()
    )
  );

CREATE POLICY tenants_update ON tenants FOR UPDATE
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR (
      get_user_role(auth.uid()) IN ('admin','gerente_operativo','equipo_cobros')
      AND organization_id = get_user_org_id()
    )
  );

CREATE POLICY tenants_delete ON tenants FOR DELETE
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR (
      get_user_role(auth.uid()) IN ('admin','gerente_operativo','equipo_cobros')
      AND organization_id = get_user_org_id()
    )
  );

-- Drop old portal policy — now merged into tenants_select
DROP POLICY IF EXISTS tenants_portal_self ON tenants;

-- ── PROPERTIES ───────────────────────────────────────────────
DROP POLICY IF EXISTS properties_read ON properties;
DROP POLICY IF EXISTS properties_write ON properties;

CREATE POLICY properties_select ON properties FOR SELECT
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR organization_id = get_user_org_id()
    -- portal tenant: active lease on this property (from 005 properties_portal_tenant)
    OR id IN (
      SELECT property_id FROM leases
      WHERE tenant_id = get_tenant_id_for_user()
      AND status = 'activo'
    )
    -- portal owner: own properties (from 005 properties_portal_owner)
    OR owner_id = get_owner_id_for_user()
  );

CREATE POLICY properties_insert ON properties FOR INSERT
  WITH CHECK (
    get_user_role(auth.uid()) = 'super_admin'
    OR (
      get_user_role(auth.uid()) IN ('admin','gerente_operativo')
      AND organization_id = get_user_org_id()
    )
  );

CREATE POLICY properties_update ON properties FOR UPDATE
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR (
      get_user_role(auth.uid()) IN ('admin','gerente_operativo')
      AND organization_id = get_user_org_id()
    )
  );

CREATE POLICY properties_delete ON properties FOR DELETE
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR (
      get_user_role(auth.uid()) IN ('admin','gerente_operativo')
      AND organization_id = get_user_org_id()
    )
  );

-- Drop old portal policies — merged into properties_select above
DROP POLICY IF EXISTS properties_portal_tenant ON properties;
DROP POLICY IF EXISTS properties_portal_owner ON properties;

-- ── BUILDINGS ────────────────────────────────────────────────
DROP POLICY IF EXISTS buildings_all ON buildings;

CREATE POLICY buildings_select ON buildings FOR SELECT
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR organization_id = get_user_org_id()
  );

CREATE POLICY buildings_insert ON buildings FOR INSERT
  WITH CHECK (
    get_user_role(auth.uid()) = 'super_admin'
    OR (
      get_user_role(auth.uid()) IN ('admin','gerente_operativo')
      AND organization_id = get_user_org_id()
    )
  );

CREATE POLICY buildings_update ON buildings FOR UPDATE
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR (
      get_user_role(auth.uid()) IN ('admin','gerente_operativo')
      AND organization_id = get_user_org_id()
    )
  );

CREATE POLICY buildings_delete ON buildings FOR DELETE
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR (
      get_user_role(auth.uid()) IN ('admin','gerente_operativo')
      AND organization_id = get_user_org_id()
    )
  );

-- ── LEASES ───────────────────────────────────────────────────
DROP POLICY IF EXISTS leases_read ON leases;
DROP POLICY IF EXISTS leases_write ON leases;

CREATE POLICY leases_select ON leases FOR SELECT
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR organization_id = get_user_org_id()
    OR tenant_id = get_tenant_id_for_user()  -- portal tenant (from 005)
    OR owner_id  = get_owner_id_for_user()   -- portal owner  (from 005)
  );

CREATE POLICY leases_insert ON leases FOR INSERT
  WITH CHECK (
    get_user_role(auth.uid()) = 'super_admin'
    OR (
      get_user_role(auth.uid()) IN ('admin','gerente_operativo')
      AND organization_id = get_user_org_id()
    )
  );

CREATE POLICY leases_update ON leases FOR UPDATE
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR (
      get_user_role(auth.uid()) IN ('admin','gerente_operativo')
      AND organization_id = get_user_org_id()
    )
  );

CREATE POLICY leases_delete ON leases FOR DELETE
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR (
      get_user_role(auth.uid()) IN ('admin','gerente_operativo')
      AND organization_id = get_user_org_id()
    )
  );

DROP POLICY IF EXISTS leases_portal_tenant ON leases;
DROP POLICY IF EXISTS leases_portal_owner  ON leases;

-- ── PAYMENTS ─────────────────────────────────────────────────
DROP POLICY IF EXISTS payments_read ON payments;
DROP POLICY IF EXISTS payments_write ON payments;

CREATE POLICY payments_select ON payments FOR SELECT
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR organization_id = get_user_org_id()
    OR tenant_id = get_tenant_id_for_user()  -- portal tenant (from 005)
    OR owner_id  = get_owner_id_for_user()   -- portal owner  (from 005)
  );

CREATE POLICY payments_insert ON payments FOR INSERT
  WITH CHECK (
    get_user_role(auth.uid()) = 'super_admin'
    OR (
      get_user_role(auth.uid()) IN ('admin','gerente_operativo','equipo_cobros')
      AND organization_id = get_user_org_id()
    )
  );

CREATE POLICY payments_update ON payments FOR UPDATE
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR (
      get_user_role(auth.uid()) IN ('admin','gerente_operativo','equipo_cobros')
      AND organization_id = get_user_org_id()
    )
  );

CREATE POLICY payments_delete ON payments FOR DELETE
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR (
      get_user_role(auth.uid()) IN ('admin','gerente_operativo','equipo_cobros')
      AND organization_id = get_user_org_id()
    )
  );

DROP POLICY IF EXISTS payments_portal_tenant ON payments;
DROP POLICY IF EXISTS payments_portal_owner  ON payments;

-- ── GUARANTEES ───────────────────────────────────────────────
DROP POLICY IF EXISTS guarantees_read ON guarantees;
DROP POLICY IF EXISTS guarantees_write ON guarantees;

CREATE POLICY guarantees_select ON guarantees FOR SELECT
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR organization_id = get_user_org_id()
  );

CREATE POLICY guarantees_insert ON guarantees FOR INSERT
  WITH CHECK (
    get_user_role(auth.uid()) = 'super_admin'
    OR (
      get_user_role(auth.uid()) IN ('admin','gerente_operativo')
      AND organization_id = get_user_org_id()
    )
  );

CREATE POLICY guarantees_update ON guarantees FOR UPDATE
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR (
      get_user_role(auth.uid()) IN ('admin','gerente_operativo')
      AND organization_id = get_user_org_id()
    )
  );

CREATE POLICY guarantees_delete ON guarantees FOR DELETE
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR (
      get_user_role(auth.uid()) IN ('admin','gerente_operativo')
      AND organization_id = get_user_org_id()
    )
  );

-- ── OWNER PAYOUTS ────────────────────────────────────────────
CREATE POLICY owner_payouts_select ON owner_payouts FOR SELECT
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR organization_id = get_user_org_id()
    OR owner_id = get_owner_id_for_user()  -- portal owner (from 005)
  );

CREATE POLICY owner_payouts_insert ON owner_payouts FOR INSERT
  WITH CHECK (
    get_user_role(auth.uid()) = 'super_admin'
    OR (
      get_user_role(auth.uid()) IN ('admin','gerente_operativo','contabilidad')
      AND organization_id = get_user_org_id()
    )
  );

CREATE POLICY owner_payouts_update ON owner_payouts FOR UPDATE
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR (
      get_user_role(auth.uid()) IN ('admin','gerente_operativo','contabilidad')
      AND organization_id = get_user_org_id()
    )
  );

CREATE POLICY owner_payouts_delete ON owner_payouts FOR DELETE
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR (
      get_user_role(auth.uid()) IN ('admin','gerente_operativo','contabilidad')
      AND organization_id = get_user_org_id()
    )
  );

-- Drop old broad portal policy — merged into owner_payouts_select above
DROP POLICY IF EXISTS payouts_portal_owner ON owner_payouts;

-- ── DOCUMENTS ────────────────────────────────────────────────
DROP POLICY IF EXISTS documents_read ON documents;
DROP POLICY IF EXISTS documents_write ON documents;

CREATE POLICY documents_select ON documents FOR SELECT
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR (organization_id = get_user_org_id() AND (NOT is_private OR get_user_role(auth.uid()) IN ('super_admin','admin')))
    OR (tenant_id = get_tenant_id_for_user() AND is_private = false)  -- portal tenant
    OR (owner_id  = get_owner_id_for_user()  AND is_private = false)  -- portal owner
  );

CREATE POLICY documents_insert ON documents FOR INSERT
  WITH CHECK (
    get_user_role(auth.uid()) = 'super_admin'
    OR (
      get_user_role(auth.uid()) IN ('admin','gerente_operativo','equipo_cobros','equipo_legal')
      AND organization_id = get_user_org_id()
    )
    OR tenant_id = get_tenant_id_for_user()  -- portal tenant upload
    OR owner_id  = get_owner_id_for_user()   -- portal owner upload
  );

CREATE POLICY documents_update ON documents FOR UPDATE
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR (
      get_user_role(auth.uid()) IN ('admin','gerente_operativo','equipo_cobros','equipo_legal')
      AND organization_id = get_user_org_id()
    )
  );

CREATE POLICY documents_delete ON documents FOR DELETE
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR (
      get_user_role(auth.uid()) IN ('admin','gerente_operativo')
      AND organization_id = get_user_org_id()
    )
  );

DROP POLICY IF EXISTS documents_portal_tenant        ON documents;
DROP POLICY IF EXISTS documents_portal_tenant_insert ON documents;
DROP POLICY IF EXISTS documents_portal_owner         ON documents;

-- ── TASKS ────────────────────────────────────────────────────
DROP POLICY IF EXISTS tasks_read ON tasks;
DROP POLICY IF EXISTS tasks_write ON tasks;

CREATE POLICY tasks_select ON tasks FOR SELECT
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR organization_id = get_user_org_id()
  );

CREATE POLICY tasks_insert ON tasks FOR INSERT
  WITH CHECK (
    get_user_role(auth.uid()) = 'super_admin'
    OR organization_id = get_user_org_id()
  );

CREATE POLICY tasks_update ON tasks FOR UPDATE
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR organization_id = get_user_org_id()
  );

CREATE POLICY tasks_delete ON tasks FOR DELETE
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR organization_id = get_user_org_id()
  );

-- ── COMMUNICATIONS ───────────────────────────────────────────
CREATE POLICY communications_select ON communications FOR SELECT
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR organization_id = get_user_org_id()
  );

CREATE POLICY communications_insert ON communications FOR INSERT
  WITH CHECK (
    get_user_role(auth.uid()) = 'super_admin'
    OR organization_id = get_user_org_id()
    OR tenant_id = get_tenant_id_for_user()  -- portal (from 005)
    OR owner_id  = get_owner_id_for_user()   -- portal (from 005)
  );

CREATE POLICY communications_update ON communications FOR UPDATE
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR organization_id = get_user_org_id()
  );

CREATE POLICY communications_delete ON communications FOR DELETE
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR organization_id = get_user_org_id()
  );

-- Drop old portal insert — merged into communications_insert above
DROP POLICY IF EXISTS communications_portal_insert ON communications;

-- ── LEGAL CASES ──────────────────────────────────────────────
DROP POLICY IF EXISTS legal_read ON legal_cases;
DROP POLICY IF EXISTS legal_write ON legal_cases;

CREATE POLICY legal_cases_select ON legal_cases FOR SELECT
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR (
      get_user_role(auth.uid()) IN ('admin','gerente_operativo','equipo_legal','equipo_cobros')
      AND organization_id = get_user_org_id()
    )
  );

CREATE POLICY legal_cases_insert ON legal_cases FOR INSERT
  WITH CHECK (
    get_user_role(auth.uid()) = 'super_admin'
    OR (
      get_user_role(auth.uid()) IN ('admin','gerente_operativo','equipo_legal')
      AND organization_id = get_user_org_id()
    )
  );

CREATE POLICY legal_cases_update ON legal_cases FOR UPDATE
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR (
      get_user_role(auth.uid()) IN ('admin','gerente_operativo','equipo_legal')
      AND organization_id = get_user_org_id()
    )
  );

CREATE POLICY legal_cases_delete ON legal_cases FOR DELETE
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR (
      get_user_role(auth.uid()) IN ('admin','gerente_operativo','equipo_legal')
      AND organization_id = get_user_org_id()
    )
  );

-- ── MAINTENANCE REQUESTS ─────────────────────────────────────
DROP POLICY IF EXISTS maintenance_read ON maintenance_requests;
DROP POLICY IF EXISTS maintenance_write ON maintenance_requests;

CREATE POLICY maintenance_select ON maintenance_requests FOR SELECT
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR organization_id = get_user_org_id()
  );

CREATE POLICY maintenance_insert ON maintenance_requests FOR INSERT
  WITH CHECK (
    get_user_role(auth.uid()) = 'super_admin'
    OR (
      get_user_role(auth.uid()) IN ('admin','gerente_operativo','equipo_mantenimiento')
      AND organization_id = get_user_org_id()
    )
  );

CREATE POLICY maintenance_update ON maintenance_requests FOR UPDATE
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR (
      get_user_role(auth.uid()) IN ('admin','gerente_operativo','equipo_mantenimiento')
      AND organization_id = get_user_org_id()
    )
  );

CREATE POLICY maintenance_delete ON maintenance_requests FOR DELETE
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR (
      get_user_role(auth.uid()) IN ('admin','gerente_operativo','equipo_mantenimiento')
      AND organization_id = get_user_org_id()
    )
  );

-- ── RISK SCORES ──────────────────────────────────────────────
DROP POLICY IF EXISTS risk_scores_staff_read  ON risk_scores;
DROP POLICY IF EXISTS risk_scores_staff_write ON risk_scores;

CREATE POLICY risk_scores_select ON risk_scores FOR SELECT
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR organization_id = get_user_org_id()
    OR (entity_type = 'tenant' AND entity_id = get_tenant_id_for_user())  -- portal tenant
  );

CREATE POLICY risk_scores_insert ON risk_scores FOR INSERT
  WITH CHECK (
    get_user_role(auth.uid()) = 'super_admin'
    OR (
      get_user_role(auth.uid()) IN ('admin','gerente_operativo','equipo_cobros')
      AND organization_id = get_user_org_id()
    )
  );

CREATE POLICY risk_scores_update ON risk_scores FOR UPDATE
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR (
      get_user_role(auth.uid()) IN ('admin','gerente_operativo','equipo_cobros')
      AND organization_id = get_user_org_id()
    )
  );

CREATE POLICY risk_scores_delete ON risk_scores FOR DELETE
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR (
      get_user_role(auth.uid()) IN ('admin','gerente_operativo','equipo_cobros')
      AND organization_id = get_user_org_id()
    )
  );

-- Drop old portal risk scores policy — merged above
DROP POLICY IF EXISTS risk_scores_portal_tenant ON risk_scores;

-- ── NOTIFICATIONS ────────────────────────────────────────────
-- Keep the own-user policy; add org scoping for admins
DROP POLICY IF EXISTS notifications_own ON notifications;

CREATE POLICY notifications_select ON notifications FOR SELECT
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR user_id = auth.uid()
    OR (is_admin_or_above() AND organization_id = get_user_org_id())
  );

CREATE POLICY notifications_insert ON notifications FOR INSERT
  WITH CHECK (
    get_user_role(auth.uid()) = 'super_admin'
    OR organization_id = get_user_org_id()
  );

CREATE POLICY notifications_update ON notifications FOR UPDATE
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR user_id = auth.uid()
  );

CREATE POLICY notifications_delete ON notifications FOR DELETE
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR (is_admin_or_above() AND organization_id = get_user_org_id())
  );

-- ── AUDIT LOGS ───────────────────────────────────────────────
DROP POLICY IF EXISTS audit_read ON audit_logs;
DROP POLICY IF EXISTS audit_insert ON audit_logs;

CREATE POLICY audit_logs_select ON audit_logs FOR SELECT
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR (get_user_role(auth.uid()) = 'admin' AND organization_id = get_user_org_id())
  );

CREATE POLICY audit_logs_insert ON audit_logs FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND organization_id = get_user_org_id()
  );

-- ── SETTINGS ─────────────────────────────────────────────────
DROP POLICY IF EXISTS settings_read ON settings;
DROP POLICY IF EXISTS settings_write ON settings;
DROP POLICY IF EXISTS settings_portal_read ON settings;

-- Global settings (organization_id IS NULL) readable by all authenticated users.
-- Org-specific settings readable only within the org.
CREATE POLICY settings_select ON settings FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      organization_id IS NULL
      OR get_user_role(auth.uid()) = 'super_admin'
      OR organization_id = get_user_org_id()
    )
  );

CREATE POLICY settings_insert ON settings FOR INSERT
  WITH CHECK (
    get_user_role(auth.uid()) = 'super_admin'
    OR (is_admin_or_above() AND organization_id = get_user_org_id())
  );

CREATE POLICY settings_update ON settings FOR UPDATE
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR (is_admin_or_above() AND organization_id = get_user_org_id())
  );

CREATE POLICY settings_delete ON settings FOR DELETE
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR (is_admin_or_above() AND organization_id = get_user_org_id())
  );
