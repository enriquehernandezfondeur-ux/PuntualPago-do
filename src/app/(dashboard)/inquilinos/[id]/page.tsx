import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { TenantProfileWrapper } from '@/components/profiles/TenantProfileWrapper'

export async function generateMetadata({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data } = await supabase.from('tenants').select('full_name').eq('id', params.id).single()
  return { title: data?.full_name ?? 'Inquilino' }
}

export default async function TenantProfilePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const [
    { data: tenant },
    { data: leases },
    { data: payments },
    { data: communications },
    { data: documents },
    { data: legalCases },
    { data: maintenance },
    { data: riskScore },
  ] = await Promise.all([
    supabase.from('tenants').select('*').eq('id', params.id).single(),
    supabase.from('leases').select('*, property:properties(id, name, address)').eq('tenant_id', params.id).order('start_date', { ascending: false }),
    supabase.from('payments').select('*').eq('tenant_id', params.id).order('period_year', { ascending: false }).order('period_month', { ascending: false }),
    supabase.from('communications').select('*').eq('tenant_id', params.id).order('created_at', { ascending: false }).limit(50),
    supabase.from('documents').select('*').eq('tenant_id', params.id).order('created_at', { ascending: false }),
    supabase.from('legal_cases').select('*, property:properties(name)').eq('tenant_id', params.id).order('opened_date', { ascending: false }),
    supabase.from('maintenance_requests').select('*').eq('tenant_id', params.id).order('reported_date', { ascending: false }),
    supabase.from('risk_scores').select('*').eq('entity_type', 'tenant').eq('entity_id', params.id).single(),
  ])

  if (!tenant) notFound()

  return (
    <TenantProfileWrapper
      tenant={tenant}
      leases={(leases ?? []) as any}
      payments={payments ?? []}
      communications={communications ?? []}
      documents={documents ?? []}
      legalCases={legalCases ?? []}
      maintenance={maintenance ?? []}
      riskScore={riskScore ?? undefined}
      portalActive={!!tenant.user_id}
    />
  )
}
