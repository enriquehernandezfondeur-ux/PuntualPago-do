import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { ReportesContent } from '@/components/reportes/ReportesContent'

export const metadata = { title: 'Reportes' }

export default async function ReportesPage() {
  const supabase = await createClient()
  const now      = new Date()
  const year     = now.getFullYear()
  const month    = now.getMonth() + 1

  const twoYearsAgo = year - 2

  const [{ data: payments }, { data: tenants }, { data: owners }, { data: payouts }] = await Promise.all([
    supabase.from('payments')
      .select('*, tenant:tenants(full_name, status), property:properties(name, address), owner:owners(full_name)')
      .gte('period_year', twoYearsAgo)
      .order('period_year', { ascending: false }).order('period_month', { ascending: false }).order('due_date', { ascending: false }),
    supabase.from('tenants').select('id, full_name, status, risk_level, pending_balance, phone, email').eq('is_active', true).order('full_name'),
    supabase.from('owners').select('id, full_name, phone, email, city').eq('is_active', true).order('full_name'),
    supabase.from('owner_payouts').select('*, owner:owners(full_name), property:properties(name)')
      .gte('period_year', twoYearsAgo)
      .order('period_year', { ascending: false }).order('period_month', { ascending: false }),
  ])

  return (
    <>
      <Header title="Reportes" subtitle="Exporta y analiza tus datos" />
      <ReportesContent
        payments={(payments ?? []) as any}
        tenants={tenants ?? []}
        owners={owners ?? []}
        payouts={(payouts ?? []) as any}
        currentYear={year}
        currentMonth={month}
      />
    </>
  )
}
