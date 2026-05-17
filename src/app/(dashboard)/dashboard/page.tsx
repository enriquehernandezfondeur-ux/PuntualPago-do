import { createClient, getOrgFilter, withOrg } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { DashboardContent } from '@/components/dashboard/DashboardContent'
import { toDOP, DEFAULT_USD_TO_DOP } from '@/lib/utils/format'
import type { Payment, Property, Currency } from '@/types/database'

export const metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const orgId    = await getOrgFilter()

  const [
    { data: stats },
    { data: overduePayments },
    { data: expiringLeases },
    { data: openLegalCases },
    { data: overdueTasks },
    { data: guaranteeClaims },
    { data: allPayments },
    { data: properties },
    { data: rateSetting },
  ] = await Promise.all([
    supabase.from('dashboard_stats').select('*').single(),
    withOrg(supabase
      .from('payments')
      .select('*, tenant:tenants(full_name, phone, whatsapp), property:properties(name, address)')
      .in('status', ['vencido', 'en_mora', 'en_legal'])
      .order('days_overdue', { ascending: false })
      .limit(8), orgId),
    withOrg(supabase
      .from('leases')
      .select('*, property:properties(name), tenant:tenants(full_name), owner:owners(full_name)')
      .eq('status', 'activo')
      .lte('end_date', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('end_date', { ascending: true })
      .limit(5), orgId),
    withOrg(supabase
      .from('legal_cases')
      .select('*, property:properties(name), tenant:tenants(full_name)')
      .neq('status', 'cerrado')
      .order('created_at', { ascending: false })
      .limit(5), orgId),
    withOrg(supabase
      .from('tasks')
      .select('*, assignee:users(full_name)')
      .in('status', ['pendiente', 'en_proceso'])
      .lt('due_date', new Date().toISOString().split('T')[0])
      .order('due_date', { ascending: true })
      .limit(5), orgId),
    withOrg(supabase
      .from('guarantee_claims')
      .select('*, guarantee:guarantees(property:properties(name), tenant:tenants(full_name))')
      .eq('status', 'abierto')
      .eq('owner_paid', false)
      .order('claim_date', { ascending: true })
      .limit(5), orgId),
    withOrg(supabase
      .from('payments')
      .select('period_year, period_month, status, amount_paid, balance_due, rent_amount, currency')
      .gte('period_year', new Date().getFullYear() - 1)
      .order('period_year').order('period_month'), orgId),
    withOrg(supabase
      .from('properties')
      .select('status, has_guarantee')
      .eq('is_active', true), orgId),
    supabase.from('settings').select('value').eq('key', 'usd_dop_rate').maybeSingle(),
  ])

  const usdToDOP = rateSetting?.value ? parseFloat(rateSetting.value) : DEFAULT_USD_TO_DOP

  // Build monthly chart data (last 6 months) — all amounts normalized to DOP
  const monthlyData = buildMonthlyChartData((allPayments ?? []) as any, usdToDOP)
  const statusData  = buildStatusChartData((allPayments ?? []) as any)
  const propData    = buildPropertyStatusData((properties ?? []) as any)

  return (
    <>
      <Header
        title="Dashboard Ejecutivo"
        subtitle={`PuntualPago OS · ${new Date().toLocaleDateString('es-DO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
      />
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <DashboardContent
        stats={stats}
        overduePayments={overduePayments ?? []}
        expiringLeases={expiringLeases ?? []}
        openLegalCases={openLegalCases ?? []}
        overdueTasks={overdueTasks ?? []}
        guaranteeClaims={guaranteeClaims ?? []}
        monthlyData={monthlyData}
        statusData={statusData}
        propData={propData}
        usdToDOP={usdToDOP}
      />
    </>
  )
}

// Normaliza todos los montos a DOP para que la gráfica sea comparable
function buildMonthlyChartData(payments: (Payment & { currency: Currency })[], usdToDOP: number) {
  const months: Record<string, { mes: string; cobrado: number; pendiente: number; mora: number }> = {}
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`
    const mes = d.toLocaleDateString('es-DO', { month: 'short' }).replace('.', '')
    months[key] = { mes: mes.charAt(0).toUpperCase() + mes.slice(1), cobrado: 0, pendiente: 0, mora: 0 }
  }
  for (const p of payments) {
    const key = `${p.period_year}-${p.period_month}`
    if (!months[key]) continue
    const cur = (p.currency ?? 'DOP') as Currency
    if (p.status === 'pagado') {
      months[key].cobrado += toDOP(p.amount_paid ?? 0, cur, usdToDOP)
    } else if (['en_mora', 'en_legal'].includes(p.status)) {
      months[key].mora += toDOP(p.balance_due ?? 0, cur, usdToDOP)
    } else {
      months[key].pendiente += toDOP(p.balance_due ?? 0, cur, usdToDOP)
    }
  }
  return Object.values(months)
}

function buildStatusChartData(payments: Payment[]) {
  const counts: Record<string, number> = {}
  for (const p of payments) {
    counts[p.status] = (counts[p.status] ?? 0) + 1
  }
  const labels: Record<string, string> = {
    pagado: 'Pagado', al_dia: 'Al día', vence_pronto: 'Vence pronto',
    vencido: 'Vencido', en_mora: 'En mora', en_legal: 'En legal',
    cubierto_garantia: 'Cub. garantía',
  }
  const colors: Record<string, string> = {
    pagado: '#059669', al_dia: '#10b981', vence_pronto: '#f59e0b',
    vencido: '#ef4444', en_mora: '#dc2626', en_legal: '#7c3aed',
    cubierto_garantia: '#0891b2',
  }
  return Object.entries(counts).map(([status, value]) => ({
    name: labels[status] ?? status,
    value,
    color: colors[status] ?? '#94a3b8',
  }))
}

function buildPropertyStatusData(properties: Property[]) {
  const counts: Record<string, number> = {}
  for (const p of properties) {
    counts[p.status] = (counts[p.status] ?? 0) + 1
  }
  const labels: Record<string, string> = {
    ocupada: 'Ocupada', disponible: 'Disponible',
    en_mantenimiento: 'Mantenimiento', proceso_legal: 'Legal', inactiva: 'Inactiva',
  }
  const colors: Record<string, string> = {
    ocupada: '#2563eb', disponible: '#059669',
    en_mantenimiento: '#f59e0b', proceso_legal: '#7c3aed', inactiva: '#94a3b8',
  }
  return Object.entries(counts).map(([status, value]) => ({
    name: labels[status] ?? status, value, color: colors[status] ?? '#94a3b8',
  }))
}
