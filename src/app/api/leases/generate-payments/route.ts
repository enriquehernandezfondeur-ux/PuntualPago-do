/**
 * Genera automáticamente todos los pagos mensuales de un contrato activo.
 * POST /api/leases/generate-payments { leaseId }
 *
 * Para un contrato de 12 meses crea 12 registros en payments,
 * uno por mes con la fecha de vencimiento correcta.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin','admin','gerente_operativo'].includes(profile.role)) {
    return NextResponse.json({ error: 'Sin permisos para generar pagos' }, { status: 403 })
  }

  const { leaseId } = await req.json()
  if (!leaseId) return NextResponse.json({ error: 'leaseId requerido' }, { status: 400 })

  // Fetch lease
  const { data: lease, error: lErr } = await supabase
    .from('leases')
    .select('id, tenant_id, owner_id, property_id, start_date, end_date, rent_amount, currency, payment_day, late_fee_percentage, late_fee_grace_days, has_guarantee')
    .eq('id', leaseId)
    .single()

  if (lErr || !lease) return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 })

  const start   = new Date(lease.start_date + 'T12:00:00')
  const end     = new Date(lease.end_date   + 'T12:00:00')
  const created: string[] = []

  // Check existing payments to avoid duplicates
  const { data: existing } = await supabase
    .from('payments')
    .select('period_year, period_month')
    .eq('lease_id', leaseId)

  const existingSet = new Set((existing ?? []).map(p => `${p.period_year}-${p.period_month}`))

  // Walk month by month from start to end
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1)

  while (cursor <= endMonth) {
    const year  = cursor.getFullYear()
    const month = cursor.getMonth() + 1
    const key   = `${year}-${month}`

    if (!existingSet.has(key)) {
      // Due date = payment_day of that month
      const dueDay = Math.min(lease.payment_day, new Date(year, month, 0).getDate())
      const dueDate = `${year}-${String(month).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`

      const { data: p, error: pErr } = await supabase.from('payments').insert({
        lease_id:    leaseId,
        property_id: lease.property_id,
        tenant_id:   lease.tenant_id,
        owner_id:    lease.owner_id,
        period_year: year,
        period_month: month,
        due_date:    dueDate,
        rent_amount: lease.rent_amount,
        currency:    lease.currency,
        late_fee:    0,
        discount:    0,
        total_due:   lease.rent_amount,
        amount_paid: 0,
        balance_due: lease.rent_amount,
        status:      'al_dia',
        days_overdue: 0,
        covered_by_guarantee: false,
        sent_to_legal: false,
        created_by:  user.id,
      }).select('id').single()

      if (!pErr && p) created.push(p.id)
    }

    cursor.setMonth(cursor.getMonth() + 1)
  }

  return NextResponse.json({ success: true, generated: created.length, paymentIds: created })
}
