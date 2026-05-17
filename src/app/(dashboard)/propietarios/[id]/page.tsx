import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { OwnerProfileWrapper } from '@/components/profiles/OwnerProfileWrapper'

export async function generateMetadata({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data } = await supabase.from('owners').select('full_name').eq('id', params.id).single()
  return { title: data?.full_name ?? 'Propietario' }
}

export default async function OwnerProfilePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const [
    { data: owner },
    { data: properties },
    { data: payouts },
    { data: communications },
    { data: documents },
  ] = await Promise.all([
    supabase.from('owners').select('*').eq('id', params.id).single(),
    supabase.from('properties').select('*, current_lease:leases(id, status, rent_amount, currency, start_date, end_date, tenant:tenants(full_name, status, risk_level, pending_balance))').eq('owner_id', params.id).eq('is_active', true).order('name'),
    supabase.from('owner_payouts').select('*, property:properties(name)').eq('owner_id', params.id).order('period_year', { ascending: false }).order('period_month', { ascending: false }).limit(24),
    supabase.from('communications').select('*').eq('owner_id', params.id).order('created_at', { ascending: false }).limit(30),
    supabase.from('documents').select('*').eq('owner_id', params.id).order('created_at', { ascending: false }),
  ])

  if (!owner) notFound()

  return (
    <OwnerProfileWrapper
      owner={owner}
      properties={(properties ?? []) as any}
      payouts={(payouts ?? []) as any}
      communications={communications ?? []}
      documents={documents ?? []}
      portalActive={!!owner.user_id}
    />
  )
}
