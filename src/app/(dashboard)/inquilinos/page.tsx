export const dynamic = 'force-dynamic'
import { createClient, getOrgFilter, withOrg } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { InquilinosContent } from '@/components/inquilinos/InquilinosContent'
import { RiskScorePanel } from '@/components/inquilinos/RiskScorePanel'
import { NewTenantButton } from '@/components/inquilinos/NewTenantButton'

export const metadata = { title: 'Inquilinos' }

export default async function InquilinosPage() {
  const supabase = await createClient()
  const orgId    = await getOrgFilter()
  const [{ data: tenants }, { data: riskScores }] = await Promise.all([
    withOrg(supabase.from('tenants').select('*, leases:leases(id, contract_number, status, rent_amount, currency, end_date, property:properties(id, name))').eq('is_active', true).order('full_name'), orgId),
    withOrg(supabase.from('risk_scores').select('*, tenant:tenants(full_name, pending_balance)').eq('entity_type', 'tenant').order('score', { ascending: true }), orgId),
  ])
  return (
    <>
      <Header title="Inquilinos" subtitle={`${tenants?.length ?? 0} inquilinos`} actions={<NewTenantButton />} />
      <div className="flex-1 p-6 space-y-5 overflow-y-auto scrollbar-thin" style={{ background: 'var(--bg)' }}>
        <RiskScorePanel scores={(riskScores ?? []) as any} tenantCount={tenants?.length ?? 0} />
        <InquilinosContent tenants={tenants ?? []} />
      </div>
    </>
  )
}
