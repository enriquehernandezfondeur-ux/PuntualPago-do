export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { FinanzasContent } from '@/components/finanzas/FinanzasContent'

export const metadata = { title: 'Finanzas' }

export default async function FinanzasPage() {
  const supabase = await createClient()
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const [
    { data: monthPayments },
    { data: pendingPayouts },
    { data: historicPayouts },
    { data: overduePayments },
  ] = await Promise.all([
    supabase
      .from('payments')
      .select('*, property:properties(name), tenant:tenants(full_name), owner:owners(full_name)')
      .eq('period_year', year)
      .eq('period_month', month)
      .order('status'),
    supabase
      .from('owner_payouts')
      .select('*, owner:owners(full_name, bank_name, bank_account), property:properties(name)')
      .eq('paid', false)
      .order('period_year', { ascending: false }),
    // Últimos 6 meses de liquidaciones para cashflow real
    supabase
      .from('owner_payouts')
      .select('period_year, period_month, rent_collected, management_fee, net_payout, currency')
      .gte('period_year', new Date().getFullYear() - 1)
      .order('period_year').order('period_month'),
    supabase
      .from('payments')
      .select('id, tenant_id, status, balance_due, days_overdue, due_date, paid_date, currency, tenant:tenants(full_name), property:properties(name)')
      .in('status', ['vencido','en_mora','en_legal'])
      .gt('balance_due', 0)
      .order('days_overdue', { ascending: false }),
  ])

  const totalCollected  = monthPayments?.filter(p => p.status === 'pagado').reduce((s, p) => s + p.amount_paid, 0) ?? 0
  const totalPending    = monthPayments?.filter(p => p.status !== 'pagado').reduce((s, p) => s + p.balance_due, 0) ?? 0
  const pendingPayoutsTotal = pendingPayouts?.reduce((s, p) => s + p.net_payout, 0) ?? 0

  // Cashflow basado en owner_payouts reales (lo que se cobró y liquidó de verdad)
  const cashFlowData = buildCashFlowData(historicPayouts ?? [])

  return (
    <>
      <Header title="Finanzas" subtitle="Liquidaciones, flujo de caja y control financiero" />
      <FinanzasContent
        monthPayments={monthPayments ?? []}
        pendingPayouts={pendingPayouts ?? []}
        totalCollected={totalCollected}
        totalPending={totalPending}
        pendingPayoutsTotal={pendingPayoutsTotal}
        guaranteeExposure={0}
        currentMonth={month}
        currentYear={year}
        cashFlowData={cashFlowData}
        overduePayments={(overduePayments ?? []) as any}
      />
    </>
  )
}

type PayoutRow = { period_year: number; period_month: number; rent_collected: number; management_fee: number; net_payout: number }

function buildCashFlowData(payouts: PayoutRow[]) {
  const now = new Date()
  const months: Record<string, { mes: string; cobrado: number; comisiones: number; neto: number }> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`
    const mes = d.toLocaleDateString('es-DO', { month: 'short' }).replace('.', '')
    months[key] = { mes: mes.charAt(0).toUpperCase() + mes.slice(1), cobrado: 0, comisiones: 0, neto: 0 }
  }
  // Sumar liquidaciones reales por mes — rent_collected, management_fee y net_payout
  for (const p of payouts) {
    const key = `${p.period_year}-${p.period_month}`
    if (!months[key]) continue
    months[key].cobrado    += p.rent_collected ?? 0
    months[key].comisiones += p.management_fee ?? 0
    months[key].neto       += p.net_payout ?? 0
  }
  return Object.values(months)
}
