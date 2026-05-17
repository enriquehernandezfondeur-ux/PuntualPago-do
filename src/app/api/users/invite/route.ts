import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!['super_admin','admin'].includes(profile?.role ?? '')) {
    return NextResponse.json({ error: 'Solo administradores pueden invitar usuarios' }, { status: 403 })
  }

  const { email, full_name, role } = await req.json()
  if (!email || !full_name || !role) return NextResponse.json({ error: 'email, full_name y role son requeridos' }, { status: 400 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json({
      error: 'SUPABASE_SERVICE_ROLE_KEY no configurado',
      message: 'Configura esta variable en Vercel para poder invitar usuarios.',
    }, { status: 503 })
  }

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

  // Create Supabase auth user
  const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: false,
    user_metadata: { full_name, role },
  })
  if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 })

  // Create profile in users table
  const { error: profileErr } = await supabase.from('users').upsert({
    id:        newUser.user!.id,
    email,
    full_name,
    role,
    is_active: true,
  })
  if (profileErr) {
    // Rollback — eliminar el auth user para evitar inconsistencia (auth sin perfil)
    await admin.auth.admin.deleteUser(newUser.user!.id).catch(() => {})
    return NextResponse.json({ error: `Error creando perfil: ${profileErr.message}` }, { status: 500 })
  }

  // Send magic link for first login
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  await admin.auth.admin.generateLink({ type: 'magiclink', email, options: { redirectTo: `${siteUrl}/dashboard` } }).catch(() => {})

  return NextResponse.json({ success: true, userId: newUser.user!.id })
}
