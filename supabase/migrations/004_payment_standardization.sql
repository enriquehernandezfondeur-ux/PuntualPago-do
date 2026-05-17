-- =============================================================
-- PuntualPago OS - Payment Standardization
-- Migration 004
--
-- Regla de negocio:
--   • Todos los inquilinos pagan del 1 al 5 de cada mes
--   • PuntualPago liquida a propietarios el día 1 de cada mes
--   • Mora empieza el día 6 (grace_days = 5)
-- =============================================================

-- ─── 1. Estandarizar contratos activos ───────────────────────────────────────

UPDATE leases
SET
  payment_day          = 1,
  late_fee_grace_days  = 5,
  updated_at           = NOW()
WHERE is_active = TRUE
  AND status IN ('activo', 'por_vencer');

-- ─── 2. Estandarizar propiedades ─────────────────────────────────────────────

UPDATE properties
SET
  payment_day = 1,
  updated_at  = NOW()
WHERE is_active = TRUE;

-- ─── 3. Nuevos defaults en leases ────────────────────────────────────────────

ALTER TABLE leases
  ALTER COLUMN payment_day         SET DEFAULT 1,
  ALTER COLUMN late_fee_grace_days SET DEFAULT 5;

-- ─── 4. Nuevo default en properties ──────────────────────────────────────────

ALTER TABLE properties
  ALTER COLUMN payment_day SET DEFAULT 1;

-- ─── 5. Re-calcular due_date de pagos abiertos al día 1 de su período ───────
--    (solo pagos no cobrados que tienen due_date distinto al día 1)

UPDATE payments
SET
  due_date   = (DATE_TRUNC('month', due_date::DATE))::DATE,  -- primer día del mes
  updated_at = NOW()
WHERE status NOT IN ('pagado', 'en_legal', 'cubierto_garantia')
  AND EXTRACT(DAY FROM due_date::DATE) != 1;

-- ─── 6. Re-calcular days_overdue usando gracia de 5 días ─────────────────────
--    days_overdue = MAX(0, hoy - (due_date + 5 días))
--    Solo actualiza pagos abiertos

UPDATE payments
SET
  days_overdue = GREATEST(0, CURRENT_DATE - (due_date::DATE + INTERVAL '5 days'))::INTEGER,
  updated_at   = NOW()
WHERE status NOT IN ('pagado', 'cubierto_garantia');

-- ─── 7. Re-calcular status de pagos abiertos con la nueva lógica ─────────────

UPDATE payments SET
  status = CASE
    WHEN status IN ('pagado', 'cubierto_garantia', 'en_legal') THEN status
    -- Pagado parcialmente, dentro de período de gracia
    WHEN CURRENT_DATE <= (due_date::DATE + INTERVAL '5 days') AND balance_due > 0
      THEN 'vence_pronto'   -- dentro del período 1-5: "vence pronto"
    -- Vencido: entre 6 y 30 días de mora
    WHEN days_overdue BETWEEN 1 AND 30
      THEN 'vencido'
    -- En mora: más de 30 días
    WHEN days_overdue > 30
      THEN 'en_mora'
    ELSE status
  END,
  updated_at = NOW()
WHERE status NOT IN ('pagado', 'cubierto_garantia', 'en_legal');

-- ─── 8. Configuración global de PuntualPago ──────────────────────────────────

INSERT INTO settings (key, value, description) VALUES
  ('owner_payout_day',     '1',    'Día del mes en que PuntualPago liquida a propietarios'),
  ('tenant_payment_window_start', '1', 'Día de inicio del período de pago de inquilinos'),
  ('tenant_payment_window_end',   '5', 'Último día del período de pago (después empieza mora)')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
