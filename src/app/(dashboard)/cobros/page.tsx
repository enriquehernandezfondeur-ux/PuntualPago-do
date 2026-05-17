import { createClient, getOrgFilter, withOrg } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { CobrosContent } from '@/components/cobros/CobrosContent'

export const metadata = { title: 'Centro de Cobros' }

export default async function CobrosPage() {
  const supabase = await createClient()
  const orgId    = await getOrgFilter()

  const [{ data: payments }, { data: cobrosUsers }] = await Promise.all([
    withOrg(supabase
      .from('payments')
      .select(`
        *,
        tenant:tenants(id, full_name, phone, whatsapp, email, status),
        property:properties(id, name, address, sector),
        owner:owners(id, full_name),
        lease:leases(id, contract_number, late_fee_percentage)
      `)
      .not('status', 'eq', 'pagado')
      .order('due_date', { ascending: true }), orgId),
    withOrg(supabase
      .from('users')
      .select('id, full_name, email, role')
      .eq('role', 'equipo_cobros')
      .eq('is_active', true)
      .order('full_name'), orgId),
  ])

  return (
    <>
      <Header
        title="Centro de Cobros"
        subtitle="Gestión completa de pagos, mora y seguimiento"
      />
      <CobrosContent payments={payments ?? []} cobrosUsers={cobrosUsers ?? []} />
    </>
  )
}
