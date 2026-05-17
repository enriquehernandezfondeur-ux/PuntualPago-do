import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role, organization_id').eq('id', user.id).single()

  const staffRoles = ['super_admin','admin','gerente_operativo','equipo_cobros','equipo_legal','equipo_mantenimiento','contabilidad','solo_lectura']
  if (!profile || !staffRoles.includes(profile.role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 3) return NextResponse.json({ results: [] })

  const safeQ = q.replace(/[(),]/g, '').trim()
  if (safeQ.length < 3) return NextResponse.json({ results: [] })

  const pattern = `%${safeQ}%`
  const orgId = profile.organization_id

  // Helper para añadir filtro de org si existe
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const org = (query: any) => orgId ? query.eq('organization_id', orgId) : query

  const [tenants, owners, properties, payments, leases] = await Promise.all([
    org(supabase.from('tenants')
      .select('id, full_name, phone, id_number, status, risk_level, pending_balance')
      .or(`full_name.ilike.${pattern},phone.ilike.${pattern},id_number.ilike.${pattern}`)
      .eq('is_active', true)).limit(5),

    org(supabase.from('owners')
      .select('id, full_name, phone, email, city')
      .or(`full_name.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern}`)
      .eq('is_active', true)).limit(4),

    org(supabase.from('properties')
      .select('id, name, address, status, rent_amount, currency, city')
      .or(`name.ilike.${pattern},address.ilike.${pattern},code.ilike.${pattern}`)
      .eq('is_active', true)).limit(4),

    org(supabase.from('payments')
      .select('id, payment_number, balance_due, currency, status, due_date, tenant:tenants(full_name), property:properties(name)')
      .or(`payment_number.ilike.${pattern}`)).limit(3),

    org(supabase.from('leases')
      .select('id, contract_number, status, start_date, end_date, tenant:tenants(full_name), property:properties(name)')
      .or(`contract_number.ilike.${pattern}`)).limit(3),
  ])

  return NextResponse.json({
    results: {
      tenants:    tenants.data    ?? [],
      owners:     owners.data     ?? [],
      properties: properties.data ?? [],
      payments:   payments.data   ?? [],
      leases:     leases.data     ?? [],
    },
    total: (tenants.data?.length ?? 0) + (owners.data?.length ?? 0) + (properties.data?.length ?? 0) + (payments.data?.length ?? 0) + (leases.data?.length ?? 0),
  })
}
