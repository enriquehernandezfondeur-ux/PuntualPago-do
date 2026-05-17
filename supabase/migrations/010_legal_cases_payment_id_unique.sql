-- ============================================================
-- Migración 010: UNIQUE constraint en legal_cases.payment_id
-- Permite que el upsert en el cron de auto-escalado use
-- onConflict: 'payment_id' sin duplicar casos legales.
-- ============================================================

-- Primero asegurar que no haya duplicados existentes
-- (mantener solo el más reciente por payment_id)
DELETE FROM legal_cases lc1
USING legal_cases lc2
WHERE lc1.payment_id = lc2.payment_id
  AND lc1.created_at < lc2.created_at
  AND lc1.payment_id IS NOT NULL;

-- Añadir constraint UNIQUE en payment_id (nullable — no todos los casos vienen de un pago)
CREATE UNIQUE INDEX IF NOT EXISTS idx_legal_cases_payment_id_unique
  ON legal_cases(payment_id)
  WHERE payment_id IS NOT NULL;
