-- =============================================================
-- PuntualPago OS - Migration 005: Portal Support
-- Adds tenant/owner portal roles, user linkage, RLS policies,
-- WhatsApp logging support, and risk score RLS.
-- =============================================================

-- New portal roles
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'inquilino';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'propietario';

-- Link tenants and owners to a Supabase auth user for portal login
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE owners  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_user_id ON tenants(user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_owners_user_id  ON owners(user_id)  WHERE user_id IS NOT NULL;

-- =============================================================
-- HELPER FUNCTIONS FOR PORTAL RLS
-- =============================================================

-- Returns the tenant.id linked to the current auth user (or NULL)
CREATE OR REPLACE FUNCTION get_tenant_id_for_user()
RETURNS UUID AS $$
  SELECT id FROM tenants WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Returns the owner.id linked to the current auth user (or NULL)
CREATE OR REPLACE FUNCTION get_owner_id_for_user()
RETURNS UUID AS $$
  SELECT id FROM owners WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================================
-- PORTAL RLS POLICIES — TENANTS can see their own data
-- =============================================================

-- Tenants: see own record
CREATE POLICY tenants_portal_self ON tenants
  FOR SELECT
  USING (user_id = auth.uid());

-- Leases: tenant sees their own leases
CREATE POLICY leases_portal_tenant ON leases
  FOR SELECT
  USING (tenant_id = get_tenant_id_for_user());

-- Payments: tenant sees their own payments
CREATE POLICY payments_portal_tenant ON payments
  FOR SELECT
  USING (tenant_id = get_tenant_id_for_user());

-- Documents: tenant sees non-private docs linked to their tenant_id
CREATE POLICY documents_portal_tenant ON documents
  FOR SELECT
  USING (tenant_id = get_tenant_id_for_user() AND is_private = false);

-- Documents: tenant can insert (upload comprobante)
CREATE POLICY documents_portal_tenant_insert ON documents
  FOR INSERT
  WITH CHECK (tenant_id = get_tenant_id_for_user() AND type = 'comprobante_pago');

-- Properties: tenant can see their rented property
CREATE POLICY properties_portal_tenant ON properties
  FOR SELECT
  USING (
    id IN (
      SELECT property_id FROM leases
      WHERE tenant_id = get_tenant_id_for_user()
      AND status = 'activo'
    )
  );

-- =============================================================
-- PORTAL RLS POLICIES — OWNERS can see their own data
-- =============================================================

-- Owners: see own record
CREATE POLICY owners_portal_self ON owners
  FOR SELECT
  USING (user_id = auth.uid());

-- Properties: owner sees their properties
CREATE POLICY properties_portal_owner ON properties
  FOR SELECT
  USING (owner_id = get_owner_id_for_user());

-- Leases: owner sees leases on their properties
CREATE POLICY leases_portal_owner ON leases
  FOR SELECT
  USING (owner_id = get_owner_id_for_user());

-- Payments: owner sees payments on their properties
CREATE POLICY payments_portal_owner ON payments
  FOR SELECT
  USING (owner_id = get_owner_id_for_user());

-- Owner payouts: owner sees their own liquidaciones
CREATE POLICY payouts_portal_owner ON owner_payouts
  FOR SELECT
  USING (owner_id = get_owner_id_for_user());

-- Documents: owner sees non-private docs on their properties/tenants
CREATE POLICY documents_portal_owner ON documents
  FOR SELECT
  USING (owner_id = get_owner_id_for_user() AND is_private = false);

-- =============================================================
-- RISK SCORES RLS
-- =============================================================

-- Staff (any authenticated internal role) can read all
CREATE POLICY risk_scores_staff_read ON risk_scores
  FOR SELECT
  USING (
    get_user_role(auth.uid()) IN (
      'super_admin','admin','gerente_operativo',
      'equipo_cobros','equipo_legal','contabilidad','solo_lectura','equipo_mantenimiento'
    )
  );

-- Staff can insert/update (for calculation API)
CREATE POLICY risk_scores_staff_write ON risk_scores
  FOR ALL
  USING (
    get_user_role(auth.uid()) IN ('super_admin','admin','gerente_operativo','equipo_cobros')
  );

-- Tenants can see their own risk score (optional transparency)
CREATE POLICY risk_scores_portal_tenant ON risk_scores
  FOR SELECT
  USING (entity_type = 'tenant' AND entity_id = get_tenant_id_for_user());

-- =============================================================
-- COMMUNICATIONS: portal users can insert (reporting contact)
-- =============================================================

CREATE POLICY communications_portal_insert ON communications
  FOR INSERT
  WITH CHECK (
    tenant_id = get_tenant_id_for_user()
    OR owner_id = get_owner_id_for_user()
  );

-- =============================================================
-- SETTINGS: portal users can read (for phone numbers, etc.)
-- =============================================================

CREATE POLICY settings_portal_read ON settings
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
