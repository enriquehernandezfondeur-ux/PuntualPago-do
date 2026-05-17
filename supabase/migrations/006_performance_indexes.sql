-- ============================================================
-- Migración 006: Índices de performance y constraints de integridad
-- ============================================================

-- Índices para queries frecuentes del cron de recordatorios
CREATE INDEX IF NOT EXISTS idx_communications_payment_sent
  ON communications(payment_id, channel, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_communications_sent_at
  ON communications(sent_at DESC);

-- Índices para queries de cobros y mora
CREATE INDEX IF NOT EXISTS idx_payments_status_overdue
  ON payments(status, days_overdue DESC)
  WHERE status IN ('vencido', 'en_mora', 'en_legal');

CREATE INDEX IF NOT EXISTS idx_payments_tenant_status
  ON payments(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_payments_due_date
  ON payments(due_date, status)
  WHERE status NOT IN ('pagado', 'en_legal', 'cubierto_garantia');

CREATE INDEX IF NOT EXISTS idx_payments_lease_period
  ON payments(lease_id, period_year, period_month);

-- Índices para dashboard y liquidaciones
CREATE INDEX IF NOT EXISTS idx_owner_payouts_period
  ON owner_payouts(period_year, period_month, paid);

CREATE INDEX IF NOT EXISTS idx_owner_payouts_property_period
  ON owner_payouts(property_id, period_year, period_month);

-- Índices para búsqueda global
CREATE INDEX IF NOT EXISTS idx_tenants_full_name
  ON tenants USING gin(to_tsvector('spanish', full_name));

CREATE INDEX IF NOT EXISTS idx_owners_full_name
  ON owners USING gin(to_tsvector('spanish', full_name));

-- Índice para risk scores
CREATE INDEX IF NOT EXISTS idx_risk_scores_entity
  ON risk_scores(entity_type, entity_id);

-- Índice para notificaciones no leídas (query más frecuente)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, read)
  WHERE read = false;

-- Índice para audit log por entidad
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON audit_logs(entity_type, entity_id, created_at DESC);

-- Constraint: una propiedad no puede tener dos contratos activos simultáneamente
-- (Usamos un índice único parcial en lugar de EXCLUDE para compatibilidad)
CREATE UNIQUE INDEX IF NOT EXISTS idx_leases_one_active_per_property
  ON leases(property_id)
  WHERE status IN ('activo', 'por_vencer');

-- Constraint: montos de pago no pueden ser negativos
ALTER TABLE payments
  ADD CONSTRAINT IF NOT EXISTS chk_payments_amounts_positive
  CHECK (
    rent_amount >= 0 AND
    late_fee >= 0 AND
    discount >= 0 AND
    amount_paid >= 0 AND
    balance_due >= 0
  );

-- Constraint: balance_due no puede exceder total_due
ALTER TABLE payments
  ADD CONSTRAINT IF NOT EXISTS chk_payments_balance_not_exceeds_total
  CHECK (balance_due <= total_due);

-- Constraint: amount_paid no puede exceder total_due
ALTER TABLE payments
  ADD CONSTRAINT IF NOT EXISTS chk_payments_paid_not_exceeds_total
  CHECK (amount_paid <= total_due);
