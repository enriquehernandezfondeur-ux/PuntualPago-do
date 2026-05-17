import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { TenantProfileWrapper } from '@/components/profiles/TenantProfileWrapper'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Perfil de Inquilino' }

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
    supabase.from('payments').select('id, payment_number, period_year, period_month, rent_amount, late_fee, balance_due, amount_paid, status, due_date, paid_date, currency, days_overdue, covered_by_guarantee').eq('tenant_id', params.id).order('period_year', { ascending: false }).order('period_month', { ascending: false }).limit(60),
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
      payments={(payments ?? []) as any}
      communications={communications ?? []}
      documents={documents ?? []}
      legalCases={legalCases ?? []}
      maintenance={maintenance ?? []}
      riskScore={riskScore ?? undefined}
      portalActive={!!tenant.user_id}
    />
  )
}
