-- =============================================================
-- PuntualPago OS - Migration 011: Portal Visibility & Timeline
-- Adds document/note visibility control and property event timeline.
-- Fixes portal RLS for maintenance + notes.
-- =============================================================

-- ── 1. Document visibility enum ───────────────────────────────
-- 'admin_only'  → solo admin ve el documento
-- 'propietario' → admin + propietario
-- 'inquilino'   → admin + inquilino
-- 'ambos'       → admin + propietario + inquilino
DO $$ BEGIN
  CREATE TYPE document_visibility AS ENUM ('admin_only', 'propietario', 'inquilino', 'ambos');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 2. Visibility en documents ────────────────────────────────
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS visibility document_visibility NOT NULL DEFAULT 'admin_only';

-- Backfill: no privado → ambos, privado → admin_only
UPDATE documents
  SET visibility = CASE WHEN is_private = false THEN 'ambos' ELSE 'admin_only' END
  WHERE visibility = 'admin_only';

-- ── 3. Visibility en notes ────────────────────────────────────
ALTER TABLE notes
  ADD COLUMN IF NOT EXISTS visibility document_visibility NOT NULL DEFAULT 'admin_only';

-- ── 4. Property events timeline ───────────────────────────────
CREATE TABLE IF NOT EXISTS property_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL,   -- 'pago', 'documento', 'mantenimiento', 'nota', 'contrato', 'estado', 'renovacion'
  title           TEXT NOT NULL,
  description     TEXT,
  visibility      document_visibility NOT NULL DEFAULT 'ambos',
  icon            TEXT,            -- lucide icon name for UI
  color           TEXT,            -- tailwind color key: 'blue','green','red','amber','purple'
  metadata        JSONB DEFAULT '{}',
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_events_property ON property_events(property_id, created_at DESC);

ALTER TABLE property_events ENABLE ROW LEVEL SECURITY;

-- Staff ve y gestiona todos los eventos
CREATE POLICY property_events_staff ON property_events
  FOR ALL
  USING (
    get_user_role(auth.uid()) IN (
      'super_admin','admin','gerente_operativo','equipo_cobros',
      'equipo_legal','equipo_mantenimiento','contabilidad','solo_lectura'
    )
  );

-- Propietario ve eventos de sus propiedades (con visibilidad propietario o ambos)
CREATE POLICY property_events_owner ON property_events
  FOR SELECT
  USING (
    property_id IN (SELECT id FROM properties WHERE owner_id = get_owner_id_for_user())
    AND visibility IN ('propietario','ambos')
  );

-- Inquilino ve eventos de su propiedad activa (con visibilidad inquilino o ambos)
CREATE POLICY property_events_tenant ON property_events
  FOR SELECT
  USING (
    property_id IN (
      SELECT property_id FROM leases
      WHERE tenant_id = get_tenant_id_for_user() AND status = 'activo'
    )
    AND visibility IN ('inquilino','ambos')
  );

-- ── 5. Actualizar RLS de documents para usar visibility ───────
-- Eliminar políticas antiguas de portal (usaban is_private)
DROP POLICY IF EXISTS documents_portal_tenant ON documents;
DROP POLICY IF EXISTS documents_portal_owner  ON documents;

-- Inquilino ve docs donde visibility = inquilino o ambos, vinculados a su tenant_id
CREATE POLICY documents_portal_tenant ON documents
  FOR SELECT
  USING (
    tenant_id = get_tenant_id_for_user()
    AND visibility IN ('inquilino','ambos')
  );

-- Propietario ve docs de sus propiedades donde visibility lo permite
CREATE POLICY documents_portal_owner ON documents
  FOR SELECT
  USING (
    (
      owner_id = get_owner_id_for_user()
      OR property_id IN (SELECT id FROM properties WHERE owner_id = get_owner_id_for_user())
    )
    AND visibility IN ('propietario','ambos')
  );

-- ── 6. RLS de notes para portal ───────────────────────────────
-- Propietario ve notas de sus propiedades (visibility propietario/ambos)
CREATE POLICY notes_portal_owner ON notes
  FOR SELECT
  USING (
    (
      owner_id = get_owner_id_for_user()
      OR property_id IN (SELECT id FROM properties WHERE owner_id = get_owner_id_for_user())
    )
    AND visibility IN ('propietario','ambos')
  );

-- Inquilino ve notas ligadas a su tenant_id o propiedad activa (visibility inquilino/ambos)
CREATE POLICY notes_portal_tenant ON notes
  FOR SELECT
  USING (
    (
      tenant_id = get_tenant_id_for_user()
      OR property_id IN (
        SELECT property_id FROM leases
        WHERE tenant_id = get_tenant_id_for_user() AND status = 'activo'
      )
    )
    AND visibility IN ('inquilino','ambos')
  );

-- ── 7. RLS de maintenance_requests para portal ────────────────
-- Propietario ve todos los tickets de mantenimiento de sus propiedades
CREATE POLICY maintenance_portal_owner ON maintenance_requests
  FOR SELECT
  USING (
    property_id IN (SELECT id FROM properties WHERE owner_id = get_owner_id_for_user())
  );

-- Inquilino ve sus propios tickets
CREATE POLICY maintenance_portal_tenant_read ON maintenance_requests
  FOR SELECT
  USING (tenant_id = get_tenant_id_for_user());

-- Inquilino puede reportar nuevo ticket
CREATE POLICY maintenance_portal_tenant_insert ON maintenance_requests
  FOR INSERT
  WITH CHECK (tenant_id = get_tenant_id_for_user());
