/**
 * Portal users send a message to the admin team.
 * POST /api/portal/message { subject?, content }
 * Auth: inquilino or propietario (or admin/super_admin for testing)
 * Creates a communication record (channel: nota_interna, direction: inbound)
 * and fires in-app notifications to equipo_cobros.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile || !['inquilino', 'propietario', 'super_admin', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await req.json()
  const content: string = (body.content ?? '').trim()
  const subject: string = (body.subject ?? '').trim()

  if (!content) {
    return NextResponse.json({ error: 'El contenido del mensaje es requerido' }, { status: 400 })
  }

  // Resolve entity based on role
  let tenantId: string | null = null
  let ownerId: string | null = null
  let entityName: string = profile.full_name ?? 'Usuario'
  let propertyId: string | null = null

  if (profile.role === 'propietario') {
    const { data: owner } = await supabase
      .from('owners')
      .select('id, full_name')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!owner) return NextResponse.json({ error: 'Propietario no encontrado' }, { status: 404 })
    ownerId = owner.id
    entityName = owner.full_name
  } else if (profile.role === 'inquilino') {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, full_name')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!tenant) return NextResponse.json({ error: 'Inquilino no encontrado' }, { status: 404 })
    tenantId = tenant.id
    entityName = tenant.full_name

    // Get active lease for property_id
    const { data: lease } = await supabase
      .from('leases')
      .select('property_id')
      .eq('tenant_id', tenantId)
      .eq('status', 'activo')
      .limit(1)
      .maybeSingle()
    propertyId = lease?.property_id ?? null
  }

  const { data: comm, error: commErr } = await supabase
    .from('communications')
    .insert({
      channel:     'nota_interna',
      direction:   'inbound',
      subject:     subject || `Mensaje de ${entityName}`,
      content,
      tenant_id:   tenantId,
      owner_id:    ownerId,
      property_id: propertyId,
      sent_at:     new Date().toISOString(),
      delivered:   true,
      created_by:  user.id,
    })
    .select('id')
    .single()

  if (commErr) {
    console.error('portal/message comm insert error:', commErr)
    return NextResponse.json({ error: 'Error al guardar el mensaje' }, { status: 500 })
  }

  // Notify equipo_cobros + admin via in-app notifications
  const { data: staffUsers } = await supabase
    .from('users')
    .select('id')
    .in('role', ['super_admin', 'admin', 'equipo_cobros'])
    .eq('is_active', true)

  if (staffUsers?.length) {
    const roleLabel = profile.role === 'propietario' ? 'propietario' : 'inquilino'
    await supabase.from('notifications').insert(
      staffUsers.map(u => ({
        user_id:     u.id,
        title:       `Mensaje de ${roleLabel}: ${entityName}`,
        body:        content.length > 120 ? content.slice(0, 120) + '…' : content,
        type:        'message',
        entity_type: profile.role === 'propietario' ? 'owner' : 'tenant',
        entity_id:   ownerId ?? tenantId,
      }))
    )
  }

  return NextResponse.json({ success: true, id: comm.id })
}
