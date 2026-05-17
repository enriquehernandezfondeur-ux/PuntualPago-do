/**
 * Server-side payment registration with validation.
 * POST /api/payments/register
 *
 * Validates amounts server-side, updates balance_due correctly,
 * handles partial payments, triggers risk score recalculation.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const STAFF_ROLES = ['super_admin','admin','gerente_operativo','equipo_cobros','contabilidad','equipo_legal','equipo_mantenimiento','solo_lectura']

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!profile || !STAFF_ROLES.includes(profile.role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await req.json()
  const { paymentId, amountPaid, method, reference, paidDate, notes, sendEmail } = body

  if (!paymentId || !method) {
    return NextResponse.json({ error: 'paymentId y method son obligatorios' }, { status: 400 })
  }

  // Fetch current payment state from server — never trust client amounts
  const { data: payment, error: fetchErr } = await supabase
    .from('payments')
    .select('id, tenant_id, property_id, lease_id, balance_due, rent_amount, late_fee, discount, amount_paid, paid_date, status, currency')
    .eq('id', paymentId)
    .single()

  if (fetchErr || !payment) {
    return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 })
  }

  if (payment.status === 'pagado') {
    return NextResponse.json({ error: 'Este pago ya fue registrado como pagado' }, { status: 409 })
  }

  // Validate and cap amount server-side
  const requestedAmount = parseFloat(amountPaid)
  if (isNaN(requestedAmount) || requestedAmount <= 0) {
    return NextResponse.json({ error: 'Monto inválido' }, { status: 400 })
  }

  // Cap at current balance — prevent negative balances
  const amount     = Math.min(requestedAmount, payment.balance_due)
  const newBalance = Math.max(0, payment.balance_due - amount)
  const isFullPayment = newBalance <= 0
  const newStatus  = isFullPayment ? 'pagado' : payment.status

  // total_due = rent + late_fee — mantener sincronizado para evitar violaciones de constraints
  const correctTotalDue = payment.rent_amount + (payment.late_fee ?? 0)

  const { error: updateErr } = await supabase
    .from('payments')
    .update({
      amount_paid:        payment.amount_paid + amount,
      balance_due:        newBalance,
      total_due:          correctTotalDue,
      payment_method:     method,
      payment_reference:  reference || null,
      // paid_date: en pago completo siempre actualizar; en parcial, solo si aún no tiene fecha
      paid_date:          isFullPayment
        ? (paidDate ?? new Date().toISOString().split('T')[0])
        : (payment.paid_date ?? paidDate ?? new Date().toISOString().split('T')[0]),
      status:             newStatus,
      notes:              notes || null,
      updated_at:         new Date().toISOString(),
    })
    .eq('id', paymentId)

  if (updateErr) {
    return NextResponse.json({ error: 'Error al registrar el pago', detail: updateErr.message }, { status: 500 })
  }

  // Update tenant pending_balance
  if (payment.tenant_id) {
    const { data: tenant } = await supabase
      .from('tenants').select('pending_balance').eq('id', payment.tenant_id).single()
    if (tenant) {
      await supabase
        .from('tenants')
        .update({ pending_balance: Math.max(0, (tenant.pending_balance ?? 0) - amount) })
        .eq('id', payment.tenant_id)
    }
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    action:      'payment_registered',
    entity_type: 'payments',
    entity_id:   paymentId,
    old_values:  { status: payment.status, balance_due: payment.balance_due, amount_paid: payment.amount_paid },
    new_values:  { status: newStatus, balance_due: newBalance, amount_paid: payment.amount_paid + amount, method },
    created_by:  user.id,
  }).then(({ error }) => { if (error) console.error('[audit_logs]', error.message) })

  const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://puntualpago.do'

  // Email confirmation (fire and forget)
  if (sendEmail && isFullPayment) {
    fetch(`${SITE}/api/emails/send-confirmation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId }),
    }).catch(() => {})
  }

  // Recalculate risk score (fire and forget)
  if (payment.tenant_id) {
    fetch(`${SITE}/api/risk/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: payment.tenant_id }),
    }).catch(() => {})
  }

  // Notify admins
  fetch(`${SITE}/api/notifications/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-cron-secret': process.env.CRON_SECRET ?? '' },
    body: JSON.stringify({
      roles: ['admin', 'super_admin', 'gerente_operativo', 'contabilidad'],
      title: `Pago registrado — ${isFullPayment ? 'completo' : 'parcial'}`,
      message: `${method} · RD$${amount.toLocaleString()} · Balance restante: ${newBalance > 0 ? `RD$${newBalance.toLocaleString()}` : 'Pagado'}`,
      entityType: 'payments',
      entityId:   paymentId,
      type:       'payment',
    }),
  }).catch(() => {})

  return NextResponse.json({
    success:     true,
    amountApplied: amount,
    newBalance,
    newStatus,
    isFullPayment,
  })
}
