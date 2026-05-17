/**
 * Genera las liquidaciones mensuales a propietarios.
 *
 * PuntualPago paga a todos los propietarios el día 1 de cada mes.
 * Este endpoint crea un registro en owner_payouts por cada contrato activo.
 *
 * Llamar el día 1 de cada mes (cron) o manualmente desde Finanzas.
 * GET  /api/payouts/generate-monthly?year=2026&month=5
 * POST /api/payouts/generate-monthly  { year, month }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { timingSafeEqual } from 'crypto'

function safeCompare(a: string, b: string): boolean {
  try { const ba = Buffer.from(a), bb = Buffer.from(b); return ba.length === bb.length && timingSafeEqual(ba, bb) } catch { return false }
}

async function generatePayouts(year: number, month: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Leer comisión desde settings (fallback 10%)
  const { data: feeSetting } = await supabase
    .from('settings').select('value').eq('key', 'management_fee_pct').maybeSingle()
  const MANAGEMENT_FEE_PCT = feeSetting?.value ? parseFloat(feeSetting.value) / 100 : 0.10

  // Primer día del mes a liquidar
  const payoutDate = `${year}-${String(month).padStart(2, '0')}-01`

  // Traer todos los contratos activos con sus propiedades
  const { data: leases, error } = await supabase
    .from('leases')
    .select(`
      id, rent_amount, currency, has_guarantee,
      owner_id, property_id, tenant_id,
      property:properties(id, name, maintenance_fee, currency),
      owner:owners(id, full_name, email),
      tenant:tenants(id, full_name)
    `)
    .in('status', ['activo', 'por_vencer'])

  if (error) throw error

  const results = { created: 0, skipped: 0, errors: 0, details: [] as string[] }

  for (const lease of leases ?? []) {
    // Verificar si ya existe liquidación para este período
    const { count } = await supabase
      .from('owner_payouts')
      .select('id', { count: 'exact', head: true })
      .eq('property_id', lease.property_id)
      .eq('period_year', year)
      .eq('period_month', month)

    if ((count ?? 0) > 0) {
      results.skipped++
      results.details.push(`⏭ Ya existe liquidación para ${(lease.property as any)?.name} — ${year}/${month}`)
      continue
    }

    // Buscar el pago real cobrado del período — usar amount_paid real, no lease.rent_amount
    const { data: periodPayment } = await supabase
      .from('payments')
      .select('amount_paid, status, covered_by_guarantee')
      .eq('lease_id', lease.id)
      .eq('period_year', year)
      .eq('period_month', month)
      .maybeSingle()

    const coveredByGuarantee = periodPayment?.covered_by_guarantee ?? false
    // Si el pago fue cubierto por garantía, PuntualPago ya pagó al propietario
    // Si no hay pago registrado o balance_due > 0, no liquidar (inquilino no ha pagado)
    const rentCollected = Math.max(0,
      periodPayment?.status === 'pagado' || coveredByGuarantee
        ? (periodPayment?.amount_paid ?? lease.rent_amount)
        : 0
    )

    const maintenanceFee = (lease.property as any)?.maintenance_fee ?? 0
    const managementFee  = rentCollected > 0
      ? Math.round(rentCollected * MANAGEMENT_FEE_PCT * 100) / 100
      : 0
    // Nunca retornar neto negativo — mínimo 0 (mantenimiento no lo cubre PuntualPago)
    const netPayout = Math.max(0, rentCollected - managementFee - maintenanceFee)

    const { error: insertError } = await supabase
      .from('owner_payouts')
      .insert({
        owner_id:               lease.owner_id,
        property_id:            lease.property_id,
        period_year:            year,
        period_month:           month,
        rent_collected:         rentCollected,
        management_fee:         managementFee,
        fee_percentage:         MANAGEMENT_FEE_PCT * 100,
        maintenance_deductions: maintenanceFee,
        other_deductions:       0,
        net_payout:             netPayout,
        currency:               lease.currency,
        paid:                   coveredByGuarantee, // Garantía ya pagó al propietario
        covered_by_guarantee:   coveredByGuarantee,
        notes: rentCollected === 0
          ? `Liquidación RD$0 — pago del inquilino no registrado. Período ${month}/${year}.`
          : `Liquidación generada automáticamente. Período ${month}/${year}. ${coveredByGuarantee ? 'Cubierto por garantía PuntualPago.' : ''}`,
        created_by: user?.id ?? null,
      })

    if (insertError) {
      results.errors++
      results.details.push(`✗ Error en ${(lease.property as any)?.name}: ${insertError.message}`)
    } else {
      results.created++
      results.details.push(
        `✓ ${(lease.owner as any)?.full_name} — ${(lease.property as any)?.name}: ` +
        `Cobrado ${rentCollected.toLocaleString()} − Mant. ${maintenanceFee.toLocaleString()} − ` +
        `Comisión ${managementFee.toLocaleString()} = Neto ${netPayout.toLocaleString()}` +
        (coveredByGuarantee ? ' [Garantía]' : rentCollected === 0 ? ' [Sin cobrar]' : '')
      )
    }
  }

  return { year, month, payoutDate, ...results }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (!['super_admin', 'admin', 'gerente_operativo', 'contabilidad'].includes(profile?.role ?? '')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }
    const { year, month } = await req.json()
    if (!year || !month) return NextResponse.json({ error: 'year y month requeridos' }, { status: 400 })
    const result = await generatePayouts(Number(year), Number(month))
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    return NextResponse.json({ error: 'Error generando liquidaciones', detail: String(err) }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    // Detectar CRON_SECRET placeholder
    if (!process.env.CRON_SECRET || process.env.CRON_SECRET === 'change-me-to-a-strong-random-secret') {
      console.error('[generate-monthly] CRON_SECRET no configurado')
      return NextResponse.json({ error: 'CRON_SECRET no configurado' }, { status: 500 })
    }

    const authHeader  = req.headers.get('authorization') ?? ''
    const cronHeader  = req.headers.get('x-cron-secret') ?? ''
    const validVercel = safeCompare(authHeader, `Bearer ${process.env.CRON_SECRET}`)
    const validCustom = safeCompare(cronHeader, process.env.CRON_SECRET!)

    if (!validVercel && !validCustom) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const now   = new Date()
    const year  = Number(searchParams.get('year')  ?? now.getFullYear())
    const month = Number(searchParams.get('month') ?? now.getMonth() + 1)

    const result = await generatePayouts(year, month)
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    return NextResponse.json({ error: 'Error generando liquidaciones', detail: String(err) }, { status: 500 })
  }
}
