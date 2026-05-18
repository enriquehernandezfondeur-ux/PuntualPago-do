/**
 * Daily cron: actualiza days_overdue, status y late_fee en pagos vencidos.
 * GET /api/cron/update-overdue
 *
 * - Calcula días de mora para cada pago no pagado cuya due_date ya pasó
 * - Aplica late_fee según el porcentaje del contrato y los días de gracia
 * - Actualiza status: al_dia → vence_pronto → vencido → en_mora
 * - Auto-escala a legal si supera el umbral configurado en settings
 *
 * Cron schedule: 0 14 * * * (2pm hora RD = 18:00 UTC)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { timingSafeEqual } from 'crypto'

function safeCompare(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a), bb = Buffer.from(b)
    return ba.length === bb.length && timingSafeEqual(ba, bb)
  } catch { return false }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? ''
  const cronHeader = req.headers.get('x-cron-secret') ?? ''

  if (!process.env.CRON_SECRET || process.env.CRON_SECRET === 'change-me-to-a-strong-random-secret') {
    return NextResponse.json({ error: 'CRON_SECRET no configurado' }, { status: 500 })
  }

  const valid = safeCompare(authHeader, `Bearer ${process.env.CRON_SECRET}`) || safeCompare(cronHeader, process.env.CRON_SECRET)
  if (!valid) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  // Leer umbral de días para auto-escalar a legal desde settings (default 45 días)
  const { data: legalThresholdSetting } = await supabase
    .from('settings').select('value').eq('key', 'legal_escalation_days').maybeSingle()
  const legalEscalationDays = legalThresholdSetting?.value
    ? parseInt(legalThresholdSetting.value, 10)
    : 45

  // Traer todos los pagos pendientes con datos del contrato
  const { data: payments, error } = await supabase
    .from('payments')
    .select('id, due_date, rent_amount, late_fee, days_overdue, status, lease_id, tenant_id, owner_id, property_id, sent_to_legal, amount_paid, lease:leases(late_fee_percentage, late_fee_grace_days, currency)')
    .not('status', 'in', '("pagado","en_legal","cubierto_garantia")')
    .order('due_date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results = { updated: 0, escalated: 0, errors: 0 }

  for (const p of payments ?? []) {
    const lease = p.lease as unknown as { late_fee_percentage: number; late_fee_grace_days: number } | null
    const graceDays = lease?.late_fee_grace_days ?? 5

    const dueDate = new Date(p.due_date + 'T12:00:00')
    const nowDate = new Date(today + 'T12:00:00')
    const diffMs  = nowDate.getTime() - dueDate.getTime()
    const daysOverdue = diffMs > 0 ? Math.floor(diffMs / (1000 * 60 * 60 * 24)) : 0
    const daysUntilDue = diffMs < 0 ? Math.ceil(Math.abs(diffMs) / (1000 * 60 * 60 * 24)) : 0

    // Calcular nuevo status
    let newStatus = p.status
    if (daysOverdue === 0 && daysUntilDue > 5) newStatus = 'al_dia'
    else if (daysOverdue === 0 && daysUntilDue <= 5) newStatus = 'vence_pronto'
    else if (daysOverdue > 0 && daysOverdue <= 30) newStatus = 'vencido'
    else if (daysOverdue > 30) newStatus = 'en_mora'

    // Calcular late_fee: solo si superó los días de gracia
    const feePct = lease?.late_fee_percentage ?? 5
    const newLateFee = daysOverdue > graceDays
      ? Math.round(p.rent_amount * (feePct / 100) * 100) / 100
      : 0

    const changed = newStatus !== p.status || newLateFee !== p.late_fee || daysOverdue !== p.days_overdue

    if (!changed) continue

    const updates: Record<string, unknown> = {
      status:       newStatus,
      days_overdue: daysOverdue,
      late_fee:     newLateFee,
      total_due:    p.rent_amount + newLateFee,
      // Respetar pagos parciales ya registrados al recalcular la mora
      balance_due:  Math.max(0, p.rent_amount + newLateFee - ((p as any).amount_paid ?? 0)),
      updated_at:   new Date().toISOString(),
    }

    const { error: updateErr } = await supabase
      .from('payments').update(updates).eq('id', p.id)

    if (updateErr) { results.errors++; continue }
    results.updated++

    // Auto-escalar a legal si supera el umbral y no está ya escalado
    if (daysOverdue >= legalEscalationDays && !p.sent_to_legal && newStatus !== 'en_legal') {
      // Insert primero con upsert (idempotente por payment_id) — luego marcar flag
      // Así evitamos el race condition donde el cron podría marcar sent_to_legal
      // antes de que el insert llegue a completarse
      const { error: legalErr } = await supabase
        .from('legal_cases')
        .upsert({
          property_id:  p.property_id,
          tenant_id:    p.tenant_id,
          owner_id:     p.owner_id,
          payment_id:   p.id,
          status:       'prelegal',
          reason:       'Mora automática',
          amount_owed:  p.rent_amount + newLateFee,
          currency:     (lease as any)?.currency ?? 'DOP',
          opened_date:  today,
          days_in_arrears: daysOverdue,
          notes:        `Escalado automáticamente — ${daysOverdue} días de mora. Umbral: ${legalEscalationDays} días.`,
          created_by:   null,
        }, { onConflict: 'payment_id', ignoreDuplicates: true })

      if (!legalErr) {
        // Solo marcar flags después del insert exitoso
        await supabase.from('payments').update({ status: 'en_legal', sent_to_legal: true }).eq('id', p.id)
        results.escalated++

        // Notificar al equipo legal
        fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/api/notifications/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-cron-secret': process.env.CRON_SECRET ?? '' },
          body: JSON.stringify({
            roles: ['equipo_legal', 'admin', 'super_admin', 'gerente_operativo'],
            title: `Auto-escalado a legal — ${daysOverdue} días de mora`,
            message: `Pago ${p.id} escalado automáticamente por superar ${legalEscalationDays} días sin pago.`,
            entityType: 'legal_cases',
            type: 'legal',
          }),
        }).catch(err => console.error('[update-overdue] notifications/create failed:', err))
      }
    }
  }

  return NextResponse.json({
    success:   true,
    date:      today,
    updated:   results.updated,
    escalated: results.escalated,
    errors:    results.errors,
  })
}
