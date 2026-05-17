import { createClient } from '@/lib/supabase/client'

export async function logAudit({
  action,
  entityType,
  entityId,
  oldValues,
  newValues,
  metadata,
}: {
  action: string
  entityType: string
  entityId?: string
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  metadata?: Record<string, unknown>
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase
    .from('users')
    .select('role, email')
    .eq('id', user.id)
    .single()

  await supabase.from('audit_logs').insert({
    user_id: user.id,
    user_email: profile?.email ?? user.email,
    user_role: profile?.role,
    action,
    entity_type: entityType,
    entity_id: entityId,
    old_values: oldValues,
    new_values: newValues,
    metadata,
  })
}
