import { createClient, getOrgFilter, withOrg } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { ContratosContent } from '@/components/contratos/ContratosContent'
import { NewLeaseButton } from '@/components/contratos/NewLeaseButton'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Contratos' }

export default async function ContratosPage() {
  const supabase = await createClient()
  const orgId    = await getOrgFilter()

  const { data: leases } = await withOrg(supabase
    .from('leases')
    .select(`
      *,
      property:properties(id, name, address, sector, type),
      tenant:tenants(id, full_name, phone, status, risk_level),
      owner:owners(id, full_name)
    `)
    .order('end_date', { ascending: true }), orgId)

  return (
    <>
      <Header
        title="Contratos"
        subtitle={`${leases?.length ?? 0} contratos registrados`}
        actions={<NewLeaseButton />}
      />
      <ContratosContent leases={leases ?? []} />
    </>
  )
}
