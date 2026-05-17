/**
 * Invita a un inquilino o propietario al portal.
 * Crea un usuario en Supabase Auth y envía un magic link por email.
 * POST /api/portal/invite { entityType: 'tenant'|'owner', entityId, email }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!['super_admin','admin','gerente_operativo'].includes(profile?.role ?? '')) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { entityType, entityId, email } = await req.json()
  if (!entityType || !entityId || !email) {
    return NextResponse.json({ error: 'entityType, entityId y email son requeridos' }, { status: 400 })
  }

  // Need service_role key for admin operations
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json({
      error: 'SUPABASE_SERVICE_ROLE_KEY no configurado',
      message: 'Configura la variable de entorno SUPABASE_SERVICE_ROLE_KEY para activar portales.',
    }, { status: 503 })
  }

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

  // Check if user exists in the users table (avoids loading all auth users into memory)
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  let authUserId: string

  if (existingUser?.id) {
    authUserId = existingUser.id
  } else {
    // Create new auth user (invite)
    const role = entityType === 'tenant' ? 'inquilino' : 'propietario'
    const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: { role },
    })
    if (createErr || !newUser.user) {
      return NextResponse.json({ error: createErr?.message ?? 'Error al crear usuario' }, { status: 500 })
    }
    authUserId = newUser.user.id

    // Create profile in users table
    await supabase.from('users').upsert({
      id: authUserId,
      email,
      full_name: email.split('@')[0],
      role,
      is_active: true,
    })
  }

  // Verificar que el entity existe antes de vincularlo
  const table = entityType === 'tenant' ? 'tenants' : 'owners'
  const { data: entity, error: entityErr } = await supabase
    .from(table).select('id').eq('id', entityId).single()

  if (entityErr || !entity) {
    return NextResponse.json({ error: `${entityType === 'tenant' ? 'Inquilino' : 'Propietario'} no encontrado` }, { status: 404 })
  }

  const { error: linkEntityErr } = await supabase.from(table).update({ user_id: authUserId }).eq('id', entityId)
  if (linkEntityErr) {
    return NextResponse.json({ error: 'Error vinculando usuario al perfil', detail: linkEntityErr.message }, { status: 500 })
  }

  // Send magic link
  const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/portal/${entityType === 'tenant' ? 'inquilino' : 'propietario'}`
  const { error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: redirectUrl },
  })

  if (linkErr) {
    // Still succeeded linking — just couldn't send email
    return NextResponse.json({ success: true, warning: 'Usuario vinculado pero no se pudo enviar email: ' + linkErr.message })
  }

  return NextResponse.json({ success: true, message: `Invitación enviada a ${email}` })
}
