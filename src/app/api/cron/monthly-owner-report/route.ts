/**
 * Monthly cron: envía el reporte mensual a cada propietario.
 * GET /api/cron/monthly-owner-report
 *
 * - Se activa el día 2 de cada mes (las liquidaciones ya fueron generadas el día 1)
 * - Trae todos los propietarios activos con email + sus liquidaciones del mes anterior
 * - Detecta propiedades vacantes del propietario (sin contrato activo)
 * - Envía el email de reporte usando Resend
 * - Registra en `communications` que se envió
 *
 * Cron schedule: 0 14 2 * * (10am hora RD = 14:00 UTC, día 2 de cada mes)
 */
import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { resend, FROM_EMAIL, REPLY_TO } from '@/lib/email/resend'

function safeCompare(a: string, b: string): boolean {
  try { const ba = Buffer.from(a), bb = Buffer.from(b); return ba.length === bb.length && timingSafeEqual(ba, bb) } catch { return false }
}
import { monthlyOwnerReportTemplate } from '@/lib/email/templates'
import type { MonthlyOwnerReportPropertyRow } from '@/lib/email/templates'

export async function GET(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization') ?? ''
  const cronHeader = req.headers.get('x-cron-secret') ?? ''

  if (!process.env.CRON_SECRET || process.env.CRON_SECRET === 'change-me-to-a-strong-random-secret') {
    return NextResponse.json({ error: 'CRON_SECRET no configurado' }, { status: 500 })
  }

  const valid = safeCompare(authHeader, `Bearer ${process.env.CRON_SECRET}`) || safeCompare(cronHeader, process.env.CRON_SECRET)
  if (!valid) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ skipped: true, reason: 'RESEND_API_KEY no configurado' })
  }

  // ── Período: mes anterior ─────────────────────────────────────────────────
  const now = new Date()
  const reportDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const reportYear  = reportDate.getFullYear()
  const reportMonth = reportDate.getMonth() + 1

  const supabase = await createClient()

  // ── Propietarios con email ─────────────────────────────────────────────────
  const { data: owners, error: ownersErr } = await supabase
    .from('owners')
    .select('id, full_name, email')
    .not('email', 'is', null)
    .eq('is_active', true)

  if (ownersErr) return NextResponse.json({ error: ownersErr.message }, { status: 500 })

  const results = { sent: 0, skipped: 0, errors: 0, details: [] as string[] }

  for (const owner of owners ?? []) {
    if (!owner.email) { results.skipped++; continue }

    // ── Liquidaciones del mes anterior para este propietario ──────────────
    const { data: payouts } = await supabase
      .from('owner_payouts')
      .select(`
        id, property_id, rent_collected, management_fee, maintenance_deductions,
        net_payout, currency, paid,
        property:properties(id, name, status)
      `)
      .eq('owner_id', owner.id)
      .eq('period_year', reportYear)
      .eq('period_month', reportMonth)

    // Skip propietarios sin liquidaciones este mes
    if (!payouts || payouts.length === 0) {
      results.skipped++
      results.details.push(`⏭ ${owner.full_name}: sin liquidaciones en ${reportMonth}/${reportYear}`)
      continue
    }

    // ── Obtener inquilinos activos por propiedad ───────────────────────────
    const propertyIds = payouts.map(p => p.property_id)
    const { data: activeLeases } = await supabase
      .from('leases')
      .select('property_id, tenant:tenants(full_name)')
      .in('property_id', propertyIds)
      .in('status', ['activo', 'por_vencer'])

    const tenantByProperty = new Map<string, string>()
    for (const l of activeLeases ?? []) {
      const t = (l as any).tenant as { full_name: string } | null
      if (t) tenantByProperty.set(l.property_id, t.full_name)
    }

    // ── Construir filas de propiedades ────────────────────────────────────
    const propertyRows: MonthlyOwnerReportPropertyRow[] = payouts.map(p => {
      const tenantName = tenantByProperty.get(p.property_id) ?? 'Sin inquilino'
      return {
        propertyName:          (p as any).property?.name ?? '—',
        tenantName,
        rentCollected:         p.rent_collected,
        managementFee:         p.management_fee,
        maintenanceDeductions: p.maintenance_deductions ?? 0,
        netPayout:             p.net_payout,
        currency:              p.currency,
        paid:                  p.paid,
      }
    })

    // ── Detectar propiedades vacantes del propietario ─────────────────────
    const { data: allProps } = await supabase
      .from('properties')
      .select('id, name, status')
      .eq('owner_id', owner.id)
      .eq('is_active', true)

    const payoutPropertyIds = new Set(payouts.map(p => p.property_id))
    const vacantProperties = (allProps ?? [])
      .filter(pr => pr.status === 'disponible' || !payoutPropertyIds.has(pr.id))
      .map(pr => pr.name)

    // ── Generar email ──────────────────────────────────────────────────────
    const { subject, html } = monthlyOwnerReportTemplate({
      ownerName:         owner.full_name,
      periodMonth:       reportMonth,
      periodYear:        reportYear,
      properties:        propertyRows,
      vacantProperties,
    })

    // ── Enviar via Resend ──────────────────────────────────────────────────
    const { error: sendError } = await resend.emails.send({
      from:     FROM_EMAIL,
      to:       [owner.email],
      replyTo:  REPLY_TO,
      subject,
      html,
    })

    if (sendError) {
      results.errors++
      results.details.push(`✗ Error enviando a ${owner.full_name} <${owner.email}>: ${sendError.message}`)
      continue
    }

    // ── Registrar en communications ────────────────────────────────────────
    await supabase.from('communications').insert({
      channel:       'email',
      direction:     'outbound',
      subject,
      content:       `Reporte mensual ${reportMonth}/${reportYear} enviado automáticamente.`,
      template_used: 'reporte_mensual_propietario',
      owner_id:      owner.id,
      sent_at:       new Date().toISOString(),
      delivered:     true,
      created_by:    null,
    })

    results.sent++
    results.details.push(`✓ Enviado a ${owner.full_name} <${owner.email}> — ${propertyRows.length} propiedad(es)`)
  }

  return NextResponse.json({
    success:     true,
    period:      `${reportYear}-${String(reportMonth).padStart(2, '0')}`,
    owners_total: (owners ?? []).length,
    ...results,
  })
}
