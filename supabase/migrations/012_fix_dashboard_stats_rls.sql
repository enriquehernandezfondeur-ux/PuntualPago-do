-- =============================================================
-- PuntualPago OS - Migration 012: Fix dashboard_stats currency
--   conversion + RLS para notes y payment_attempts
-- =============================================================
-- Problema 1: dashboard_stats sumaba DOP y USD sin convertir.
-- Problema 2: tabla notes sin política para staff interno.
-- Problema 3: tabla payment_attempts sin ninguna política (acceso 0).
-- =============================================================

-- ── 0. Helpers (CREATE OR REPLACE — seguros si ya existen) ────

CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role NOT IN ('inquilino', 'propietario')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION has_role(roles TEXT[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role::TEXT = ANY(roles)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── 1. Recrear vista dashboard_stats con conversión de moneda ──
--
-- monthly_rent_managed y total_arrears convierten USD→DOP usando
-- la tasa guardada en settings con key 'usd_dop_rate' (default 59.5).
-- Todas las demás columnas son COUNT(*) y no dependen de moneda.

CREATE OR REPLACE VIEW dashboard_stats AS
SELECT
  -- Propiedades
  (SELECT COUNT(*)
     FROM properties
    WHERE status = 'ocupada' AND is_active = true)                          AS active_properties,

  (SELECT COUNT(*)
     FROM properties
    WHERE is_active = true)                                                  AS total_properties,

  -- Renta mensual gestionada — convertir USD a DOP antes de sumar
  (SELECT COALESCE(SUM(
      CASE
        WHEN p.currency = 'USD'
          THEN p.rent_amount * (
                 SELECT COALESCE((value::TEXT)::NUMERIC, 59.5)
                   FROM settings
                  WHERE key = 'usd_dop_rate'
                  LIMIT 1
               )
        ELSE p.rent_amount
      END
   ), 0)
     FROM properties p
    WHERE p.status = 'ocupada' AND p.is_active = true)                      AS monthly_rent_managed,

  -- Pagos del mes en curso
  (SELECT COUNT(*)
     FROM payments
    WHERE status = 'pagado'
      AND period_month = EXTRACT(MONTH FROM NOW())
      AND period_year  = EXTRACT(YEAR  FROM NOW()))                          AS paid_this_month,

  -- Mora
  (SELECT COUNT(*)
     FROM payments
    WHERE status IN ('vencido','en_mora'))                                   AS overdue_count,

  -- Total en mora — convertir USD a DOP antes de sumar
  (SELECT COALESCE(SUM(
      CASE
        WHEN py.currency = 'USD'
          THEN py.balance_due * (
                 SELECT COALESCE((value::TEXT)::NUMERIC, 59.5)
                   FROM settings
                  WHERE key = 'usd_dop_rate'
                  LIMIT 1
               )
        ELSE py.balance_due
      END
   ), 0)
     FROM payments py
    WHERE py.status IN ('vencido','en_mora'))                                AS total_arrears,

  -- Garantía PuntualPago
  (SELECT COUNT(*)
     FROM payments
    WHERE covered_by_guarantee = true
      AND period_month = EXTRACT(MONTH FROM NOW())
      AND period_year  = EXTRACT(YEAR  FROM NOW()))                          AS covered_by_guarantee,

  -- Contratos por vencer
  (SELECT COUNT(*)
     FROM leases
    WHERE status = 'activo'
      AND end_date BETWEEN NOW() AND NOW() + INTERVAL '90 days')            AS leases_expiring_90d,

  (SELECT COUNT(*)
     FROM leases
    WHERE status = 'activo'
      AND end_date BETWEEN NOW() AND NOW() + INTERVAL '30 days')            AS leases_expiring_30d,

  -- Casos legales abiertos
  (SELECT COUNT(*)
     FROM legal_cases
    WHERE status != 'cerrado')                                               AS open_legal_cases,

  -- Mantenimiento pendiente
  (SELECT COUNT(*)
     FROM maintenance_requests
    WHERE status NOT IN ('completado','rechazado'))                          AS open_maintenance,

  -- Tareas vencidas
  (SELECT COUNT(*)
     FROM tasks
    WHERE status IN ('pendiente','en_proceso')
      AND due_date < CURRENT_DATE)                                           AS overdue_tasks,

  -- Pagos a propietarios pendientes
  (SELECT COUNT(*)
     FROM owner_payouts
    WHERE paid = false)                                                      AS pending_owner_payouts,

  NOW() AS calculated_at;


-- ── 2. Políticas RLS para `notes` — acceso staff interno ───────
--
-- Las políticas de portal (notes_portal_owner, notes_portal_tenant)
-- se crearon en 011 y se conservan.  Solo añadimos las de staff.

DROP POLICY IF EXISTS notes_staff_read  ON notes;
DROP POLICY IF EXISTS notes_staff_write ON notes;

-- Todo el staff interno puede leer notas
CREATE POLICY notes_staff_read ON notes
  FOR SELECT
  USING (is_staff());

-- Solo roles operativos pueden crear/editar/borrar notas
CREATE POLICY notes_staff_write ON notes
  FOR ALL
  USING (
    has_role(ARRAY[
      'super_admin','admin','gerente_operativo',
      'equipo_cobros','equipo_legal','equipo_mantenimiento',
      'contabilidad'
    ])
  );


-- ── 3. Políticas RLS para `payment_attempts` ───────────────────
--
-- Esta tabla nunca tuvo políticas; RLS bloqueaba todo el acceso.
-- El equipo de cobros, contabilidad y admins necesitan leer y escribir.

DROP POLICY IF EXISTS payment_attempts_read  ON payment_attempts;
DROP POLICY IF EXISTS payment_attempts_write ON payment_attempts;

-- Lectura: roles financieros y operativos
CREATE POLICY payment_attempts_read ON payment_attempts
  FOR SELECT
  USING (
    has_role(ARRAY[
      'super_admin','admin','gerente_operativo',
      'equipo_cobros','contabilidad','solo_lectura'
    ])
  );

-- Escritura: quienes gestionan cobros
CREATE POLICY payment_attempts_write ON payment_attempts
  FOR ALL
  USING (
    has_role(ARRAY[
      'super_admin','admin','gerente_operativo',
      'equipo_cobros','contabilidad'
    ])
  );
