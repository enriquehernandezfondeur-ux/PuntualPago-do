-- ============================================================
-- Migración 009: Fix constraints de pagos
-- Los constraints de 006 causaban violaciones cuando late_fee
-- fue añadido a balance_due sin actualizar total_due.
-- ============================================================

-- Primero sincronizar total_due con rent_amount + late_fee en todos los registros
UPDATE payments
SET total_due = rent_amount + COALESCE(late_fee, 0)
WHERE total_due < rent_amount + COALESCE(late_fee, 0);

-- Eliminar los constraints que causaban problemas
ALTER TABLE payments DROP CONSTRAINT IF EXISTS chk_payments_balance_not_exceeds_total;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS chk_payments_paid_not_exceeds_total;

-- Recrear solo el constraint de montos positivos (seguro)
ALTER TABLE payments DROP CONSTRAINT IF EXISTS chk_payments_amounts_positive;
ALTER TABLE payments ADD CONSTRAINT chk_payments_amounts_positive
  CHECK (
    rent_amount >= 0 AND
    COALESCE(late_fee, 0) >= 0 AND
    COALESCE(discount, 0) >= 0 AND
    amount_paid >= 0 AND
    balance_due >= 0
  );
