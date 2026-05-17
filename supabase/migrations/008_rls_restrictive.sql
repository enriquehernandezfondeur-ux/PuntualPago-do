-- ============================================================
-- Migración 008: RLS restrictivo por rol
-- Reemplaza las policies USING (true) con checks de rol real.
-- Portal policies (005) se mantienen — solo afectan SELECT de inquilinos/propietarios.
-- ============================================================

-- ── Helpers adicionales ─────────────────────────────────────

-- Devuelve true si el usuario actual es staff (no portal)
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role NOT IN ('inquilino', 'propietario')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Devuelve true si el usuario tiene al menos uno de los roles dados
CREATE OR REPLACE FUNCTION has_role(roles TEXT[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role::TEXT = ANY(roles)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── OWNERS ──────────────────────────────────────────────────

DROP POLICY IF EXISTS owners_read ON owners;
CREATE POLICY owners_read ON owners FOR SELECT USING (
  -- Staff con permisos de ver propietarios
  has_role(ARRAY['super_admin','admin','gerente_operativo','equipo_cobros','contabilidad','solo_lectura'])
  -- Portal: propietario ve su propio registro (policy de 005)
  OR id = get_owner_id_for_user()
);

-- ── PROPERTIES ──────────────────────────────────────────────

DROP POLICY IF EXISTS properties_read ON properties;
CREATE POLICY properties_read ON properties FOR SELECT USING (
  is_staff()
  -- Portal propietario ve sus propiedades
  OR owner_id = get_owner_id_for_user()
  -- Portal inquilino ve su propiedad rentada (policy de 005)
  OR id IN (
    SELECT property_id FROM leases
    WHERE tenant_id = get_tenant_id_for_user()
    AND status = 'activo'
  )
);

-- ── TENANTS ─────────────────────────────────────────────────

DROP POLICY IF EXISTS tenants_read ON tenants;
CREATE POLICY tenants_read ON tenants FOR SELECT USING (
  is_staff()
  -- Portal: inquilino ve su propio registro (policy de 005)
  OR user_id = auth.uid()
);

-- ── LEASES ──────────────────────────────────────────────────

DROP POLICY IF EXISTS leases_read ON leases;
CREATE POLICY leases_read ON leases FOR SELECT USING (
  is_staff()
  -- Portal inquilino ve sus contratos
  OR tenant_id = get_tenant_id_for_user()
  -- Portal propietario ve contratos de sus propiedades
  OR owner_id = get_owner_id_for_user()
);

-- ── PAYMENTS ────────────────────────────────────────────────

DROP POLICY IF EXISTS payments_read ON payments;
CREATE POLICY payments_read ON payments FOR SELECT USING (
  is_staff()
  -- Portal inquilino ve sus pagos
  OR tenant_id = get_tenant_id_for_user()
  -- Portal propietario ve pagos de sus propiedades
  OR owner_id = get_owner_id_for_user()
);

-- ── GUARANTEES ──────────────────────────────────────────────

DROP POLICY IF EXISTS guarantees_read ON guarantees;
CREATE POLICY guarantees_read ON guarantees FOR SELECT USING (
  has_role(ARRAY['super_admin','admin','gerente_operativo','equipo_cobros','contabilidad','solo_lectura'])
);

-- ── TASKS — solo staff puede ver ────────────────────────────

DROP POLICY IF EXISTS tasks_read  ON tasks;
DROP POLICY IF EXISTS tasks_write ON tasks;
CREATE POLICY tasks_read ON tasks FOR SELECT USING (is_staff());
CREATE POLICY tasks_write ON tasks FOR ALL
  USING (has_role(ARRAY['super_admin','admin','gerente_operativo','equipo_cobros','equipo_legal','equipo_mantenimiento']));

-- ── LEGAL CASES ─────────────────────────────────────────────

DROP POLICY IF EXISTS legal_read  ON legal_cases;
CREATE POLICY legal_read ON legal_cases FOR SELECT USING (
  has_role(ARRAY['super_admin','admin','gerente_operativo','equipo_legal','equipo_cobros','solo_lectura'])
);

-- ── MAINTENANCE ─────────────────────────────────────────────

DROP POLICY IF EXISTS maintenance_read ON maintenance_requests;
CREATE POLICY maintenance_read ON maintenance_requests FOR SELECT USING (
  has_role(ARRAY['super_admin','admin','gerente_operativo','equipo_mantenimiento','solo_lectura'])
);

-- ── OWNER PAYOUTS — solo finanzas y admins ──────────────────

ALTER TABLE owner_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payouts_read  ON owner_payouts;
DROP POLICY IF EXISTS payouts_write ON owner_payouts;
CREATE POLICY payouts_read ON owner_payouts FOR SELECT USING (
  has_role(ARRAY['super_admin','admin','gerente_operativo','contabilidad','solo_lectura'])
  OR owner_id = get_owner_id_for_user()
);
CREATE POLICY payouts_write ON owner_payouts FOR ALL
  USING (has_role(ARRAY['super_admin','admin','gerente_operativo','contabilidad']));

-- ── DOCUMENTS — staff + portales ────────────────────────────

DROP POLICY IF EXISTS documents_read ON documents;
CREATE POLICY documents_read ON documents FOR SELECT USING (
  is_staff()
  OR (tenant_id = get_tenant_id_for_user() AND NOT is_private)
  OR owner_id = get_owner_id_for_user()
);

-- ── COMMUNICATIONS — solo staff + portales con insert ───────

ALTER TABLE communications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS comms_read   ON communications;
DROP POLICY IF EXISTS comms_write  ON communications;
DROP POLICY IF EXISTS communications_portal_insert ON communications;

CREATE POLICY comms_read ON communications FOR SELECT USING (is_staff());
CREATE POLICY comms_write ON communications FOR INSERT
  WITH CHECK (
    is_staff()
    OR tenant_id = get_tenant_id_for_user()
    OR owner_id  = get_owner_id_for_user()
  );

-- ── RISK SCORES — staff y portales limitados ────────────────

DROP POLICY IF EXISTS risk_scores_staff ON risk_scores;
CREATE POLICY risk_scores_staff ON risk_scores FOR SELECT USING (
  has_role(ARRAY['super_admin','admin','gerente_operativo','equipo_cobros','solo_lectura'])
);

-- ── SETTINGS — todos los staff pueden leer, solo admin escribe

DROP POLICY IF EXISTS settings_read  ON settings;
DROP POLICY IF EXISTS settings_write ON settings;
CREATE POLICY settings_read  ON settings FOR SELECT USING (is_staff());
CREATE POLICY settings_write ON settings FOR ALL
  USING (has_role(ARRAY['super_admin','admin']));

-- ── BUILDINGS — todos los staff ─────────────────────────────

ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS buildings_read  ON buildings;
DROP POLICY IF EXISTS buildings_write ON buildings;
CREATE POLICY buildings_read  ON buildings FOR SELECT USING (is_staff());
CREATE POLICY buildings_write ON buildings FOR ALL
  USING (has_role(ARRAY['super_admin','admin','gerente_operativo']));

-- ── AUDIT LOG — solo lectura para staff ─────────────────────

DROP POLICY IF EXISTS audit_read   ON audit_logs;
DROP POLICY IF EXISTS audit_insert ON audit_logs;
CREATE POLICY audit_read   ON audit_logs FOR SELECT
  USING (has_role(ARRAY['super_admin','admin','gerente_operativo','solo_lectura']));
CREATE POLICY audit_insert ON audit_logs FOR INSERT WITH CHECK (is_staff());

-- ── GUARANTEE CLAIMS — staff con permisos ───────────────────

DROP POLICY IF EXISTS guarantee_claims_read  ON guarantee_claims;
DROP POLICY IF EXISTS guarantee_claims_write ON guarantee_claims;
CREATE POLICY guarantee_claims_read ON guarantee_claims FOR SELECT USING (
  has_role(ARRAY['super_admin','admin','gerente_operativo','equipo_cobros','contabilidad'])
);
CREATE POLICY guarantee_claims_write ON guarantee_claims FOR ALL
  USING (has_role(ARRAY['super_admin','admin','gerente_operativo']));
