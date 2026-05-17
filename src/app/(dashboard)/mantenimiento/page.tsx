import { createClient, getOrgFilter, withOrg } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { MantenimientoContent } from '@/components/mantenimiento/MantenimientoContent'

export const metadata = { title: 'Mantenimiento' }

export default async function MantenimientoPage() {
  const supabase = await createClient()
  const orgId    = await getOrgFilter()

  const [{ data: requests }, { data: properties }] = await Promise.all([
    withOrg(supabase.from('maintenance_requests')
      .select('*, property:properties(id, name, sector), tenant:tenants(id, full_name, phone)')
      .order('reported_date', { ascending: false }), orgId),
    withOrg(supabase.from('properties').select('id, name').eq('is_active', true).order('name'), orgId),
  ])

  return (
    <>
      <Header title="Mantenimiento" subtitle="Incidencias y solicitudes de reparación" />
      <MantenimientoContent requests={requests ?? []} properties={properties ?? []} />
    </>
  )
}
