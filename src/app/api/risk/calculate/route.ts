/**
 * Risk score calculator for tenants.
 *
 * POST /api/risk/calculate          — recalculate all active tenants
 * POST /api/risk/calculate { tenantId } — recalculate one tenant
 *
 * Scoring model (0–100, higher = lower risk):
 *   payment_history_score  30pts — % of payments made on time
 *   days_overdue_score     25pts — current overdue severity
 *   recurrence_score       20pts — how often this tenant is late
 *   income_score           10pts — income / rent ratio
 *   documents_score        10pts — has required documents
 *   references_score        5pts — has references
 *
 * Levels: bajo 75–100 · medio 50–74 · alto 25–49 · critico 0–24
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type RiskLevel = 'bajo' | 'medio' | 'alto' | 'critico'

function scoreToLevel(score: number): RiskLevel {
  if (score >= 75) return 'bajo'
  if (score >= 50) return 'medio'
  if (score >= 25) return 'alto'
  return 'critico'
}

function recommendedAction(score: number, daysOverdue: number): string {
  if (daysOverdue > 60) return 'Escalar a legal inmediatamente'
  if (daysOverdue > 30) return 'Proceso de cobro intensivo'
  if (daysOverdue > 0)  return 'Llamada de recordatorio urgente'
  if (score < 50)       return 'Monitorear de cerca'
  if (score < 75)       return 'Seguimiento preventivo'
  return 'Sin acción requerida'
}

async function calculateTenantRisk(supabase: Awaited<ReturnType<typeof createClient>>, tenantId: string) {
  // Fetch all payments for this tenant
  const { data: payments } = await supabase
    .from('payments')
    .select('status, days_overdue, due_date, paid_date, rent_amount, balance_due')
    .eq('tenant_id', tenantId)
    .order('due_date', { ascending: false })

  // Fetch tenant profile
  const { data: tenant } = await supabase
    .from('tenants')
    .select('estimated_income, income_currency, reference_1_name, reference_1_phone, reference_2_name, status')
    .eq('id', tenantId)
    .maybeSingle()

  // Fetch lease for rent amount
  const { data: lease } = await supabase
    .from('leases')
    .select('rent_amount, currency')
    .eq('tenant_id', tenantId)
    .eq('status', 'activo')
    .maybeSingle()

  // Fetch documents
  const { count: docCount } = await supabase
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)

  const allPayments   = payments ?? []
  const totalPayments = allPayments.length
  const hasHistory    = totalPayments > 0

  // ── 1. Payment history score (30 pts) ──────────────────
  // Sin historial = 0 pts (desconocido, no "perfecto")
  let paymentHistoryScore = 0
  if (hasHistory) {
    let onTimeCount = 0
    for (const p of allPayments) {
      if (p.status === 'pagado') {
        if (!p.paid_date || !p.due_date) { onTimeCount++; continue }
        const paidMs   = new Date(p.paid_date + 'T12:00:00').getTime()
        const dueMs    = new Date(p.due_date + 'T12:00:00').getTime()
        const daysDiff = (paidMs - dueMs) / (1000 * 60 * 60 * 24)
        if (daysDiff <= 5) onTimeCount++
      }
    }
    paymentHistoryScore = Math.round((onTimeCount / totalPayments) * 30)
  }

  // ── 2. Days overdue score (25 pts) ──────────────────────
  // Sin historial = 12 pts (mitad, beneficio de la duda)
  const maxOverdue = hasHistory ? Math.max(0, ...allPayments.map(p => p.days_overdue ?? 0)) : 0
  let daysOverdueScore: number
  if (!hasHistory)            daysOverdueScore = 12
  else if (maxOverdue === 0)  daysOverdueScore = 25
  else if (maxOverdue <= 5)   daysOverdueScore = 22
  else if (maxOverdue <= 15)  daysOverdueScore = 15
  else if (maxOverdue <= 30)  daysOverdueScore = 8
  else if (maxOverdue <= 60)  daysOverdueScore = 3
  else                         daysOverdueScore = 0

  // ── 3. Recurrence score (20 pts) ───────────────────────
  // Sin historial = 0 pts
  let recurrenceScore = 0
  if (hasHistory) {
    const latePayments = allPayments.filter(p =>
      p.status !== 'pagado' || (p.days_overdue ?? 0) > 5
    ).length
    const lateRatio = latePayments / totalPayments
    if (lateRatio === 0)       recurrenceScore = 20
    else if (lateRatio < 0.1)  recurrenceScore = 17
    else if (lateRatio < 0.25) recurrenceScore = 12
    else if (lateRatio < 0.5)  recurrenceScore = 6
    else                        recurrenceScore = 0
  }

  // ── 4. Income score (10 pts) ────────────────────────────
  let incomeScore = 0 // Sin datos de ingreso = 0 pts (no asumir nada)
  if (tenant?.estimated_income && lease?.rent_amount) {
    const incomeCurrency = (tenant as any).income_currency ?? 'DOP'
    const leaseCurrency  = (lease as any).currency ?? 'DOP'
    let normalizedIncome = tenant.estimated_income
    // Convertir USD → DOP usando tasa fija (60 DOP/USD) cuando las monedas no coinciden
    if (incomeCurrency !== leaseCurrency) {
      const USD_DOP_RATE = 60
      normalizedIncome = incomeCurrency === 'USD'
        ? tenant.estimated_income * USD_DOP_RATE
        : tenant.estimated_income / USD_DOP_RATE
    }
    const ratio = normalizedIncome / lease.rent_amount
    if (ratio >= 4)      incomeScore = 10
    else if (ratio >= 3) incomeScore = 8
    else if (ratio >= 2) incomeScore = 5
    else if (ratio >= 1) incomeScore = 2
    else                  incomeScore = 0
  }

  // ── 5. Documents score (10 pts) ─────────────────────────
  const docs          = docCount ?? 0
  const documentsScore = docs >= 3 ? 10 : docs >= 2 ? 7 : docs >= 1 ? 4 : 0

  // ── 6. References score (5 pts) ─────────────────────────
  const refs          = [tenant?.reference_1_name, tenant?.reference_2_name].filter(Boolean).length
  const referencesScore = refs >= 2 ? 5 : refs === 1 ? 3 : 0

  const score = paymentHistoryScore + daysOverdueScore + recurrenceScore + incomeScore + documentsScore + referencesScore
  const level = scoreToLevel(score)
  const action = recommendedAction(score, maxOverdue)

  return {
    entity_type: 'tenant',
    entity_id: tenantId,
    score,
    level,
    payment_history_score: paymentHistoryScore,
    days_overdue_score:    daysOverdueScore,
    recurrence_score:      recurrenceScore,
    income_score:          incomeScore,
    documents_score:       documentsScore,
    references_score:      referencesScore,
    recommended_action:    action,
    calculated_at: new Date().toISOString(),
    calculated_by: 'system',
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  const allowed = ['super_admin','admin','gerente_operativo','equipo_cobros']
  if (!profile || !allowed.includes(profile.role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  let body: { tenantId?: string } = {}
  try { body = await req.json() } catch { /* empty body is ok */ }

  const results: { tenantId: string; score: number; level: string }[] = []

  if (body.tenantId) {
    // Single tenant
    const riskData = await calculateTenantRisk(supabase, body.tenantId)
    await supabase.from('risk_scores').upsert(riskData, { onConflict: 'entity_type,entity_id' })
    results.push({ tenantId: body.tenantId, score: riskData.score, level: riskData.level })
  } else {
    // All active tenants
    const { data: tenants } = await supabase
      .from('tenants')
      .select('id')
      .in('status', ['activo','en_observacion','moroso','en_legal'])

    for (const t of tenants ?? []) {
      try {
        const riskData = await calculateTenantRisk(supabase, t.id)
        await supabase.from('risk_scores').upsert(riskData, { onConflict: 'entity_type,entity_id' })
        results.push({ tenantId: t.id, score: riskData.score, level: riskData.level })
      } catch (err) {
        console.error(`Risk calc failed for tenant ${t.id}:`, err)
      }
    }
  }

  return NextResponse.json({ success: true, calculated: results.length, results })
}
