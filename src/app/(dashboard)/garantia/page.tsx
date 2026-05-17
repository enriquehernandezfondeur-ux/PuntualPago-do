import { createClient, getOrgFilter, withOrg } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { GarantiaContent } from '@/components/garantia/GarantiaContent'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Garantía PuntualPago' }

export default async function GarantiaPage() {
  const supabase = await createClient()
  const orgId    = await getOrgFilter()

  const [
    { data: guarantees },
    { data: openClaims },
    { data: atRiskPayments },
  ] = await Promise.all([
    withOrg(supabase
      .from('guarantees')
      .select(`
        *,
        property:properties(id, name, address, sector),
        tenant:tenants(id, full_name, phone, status, risk_level, pending_balance),
        owner:owners(id, full_name, bank_name),
        lease:leases(id, contract_number, payment_day)
      `)
      .order('created_at', { ascending: false }), orgId),
    withOrg(supabase
      .from('guarantee_claims')
      .select(`
        *,
        guarantee:guarantees(
          guaranteed_amount, currency,
          property:properties(name),
          tenant:tenants(full_name),
          owner:owners(full_name, bank_name, bank_account)
        )
      `)
      .neq('status', 'cerrado')
      .order('claim_date', { ascending: true }), orgId),
    withOrg(supabase
      .from('payments')
      .select('*, tenant:tenants(full_name, risk_level), property:properties(name), lease:leases(has_guarantee)')
      .in('status', ['vencido', 'en_mora'])
      .order('days_overdue', { ascending: false })
      .limit(10), orgId),
  ])

  // Exposure stats
  const totalExposure = guarantees?.filter(g => g.status === 'activa')
    .reduce((sum, g) => sum + g.total_exposure, 0) ?? 0
  const totalRecovered = guarantees?.filter(g => g.status === 'activa')
    .reduce((sum, g) => sum + g.total_recovered, 0) ?? 0
  const openClaimsAmount = openClaims?.reduce((sum, c) => sum + c.amount_claimed, 0) ?? 0

  return (
    <>
      <Header
        title="Garantía PuntualPago"
        subtitle='"Cobra aunque el inquilino no pague" — Control de exposición y riesgo'
      />
      <GarantiaContent
        guarantees={guarantees ?? []}
        openClaims={openClaims ?? []}
        atRiskPayments={atRiskPayments ?? []}
        totalExposure={totalExposure}
        totalRecovered={totalRecovered}
        openClaimsAmount={openClaimsAmount}
      />
    </>
  )
}
