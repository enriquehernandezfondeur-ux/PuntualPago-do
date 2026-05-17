/**
 * Creates notifications for all users matching specified roles.
 * POST /api/notifications/create
 * Body: { roles, title, message, entityType?, entityId?, type? }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { timingSafeEqual } from 'crypto'

function safeCompare(a: string, b: string): boolean {
  try { const ba = Buffer.from(a), bb = Buffer.from(b); return ba.length === bb.length && timingSafeEqual(ba, bb) } catch { return false }
}

const ALLOWED_CALLER_ROLES = ['super_admin','admin','gerente_operativo','equipo_cobros','equipo_legal']

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // Solo usuarios staff autenticados pueden crear notificaciones
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()

  // CRON_SECRET bypass fix: solo válido si CRON_SECRET existe, no es el placeholder, y coincide
  const cronSecret = process.env.CRON_SECRET
  const isCron = !!(
    cronSecret &&
    cronSecret !== 'change-me-to-a-strong-random-secret' &&
    cronSecret.length >= 16 &&
    safeCompare(req.headers.get('x-cron-secret') ?? '', cronSecret)
  )

  if (!isCron && (!profile || !ALLOWED_CALLER_ROLES.includes(profile.role))) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { roles, title, message, entityType, entityId, type = 'system' } = await req.json()
  if (!title || !roles?.length) return NextResponse.json({ error: 'title y roles requeridos' }, { status: 400 })

  // Get all active users with matching roles
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .in('role', roles)
    .eq('is_active', true)

  if (!users?.length) return NextResponse.json({ success: true, sent: 0 })

  const notifications = users.map(u => ({
    user_id:     u.id,
    title,
    message:     message ?? null,
    type,
    entity_type: entityType ?? null,
    entity_id:   entityId ?? null,
  }))

  const { error } = await supabase.from('notifications').insert(notifications)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, sent: notifications.length })
}
