export const dynamic = 'force-dynamic'
import { createClient, getOrgFilter, withOrg } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { PropiedadesContent } from '@/components/propiedades/PropiedadesContent'
import { NewPropertyButton } from '@/components/propiedades/NewPropertyButton'

export const metadata = { title: 'Propiedades' }

export default async function PropiedadesPage() {
  const supabase = await createClient()
  const orgId    = await getOrgFilter()
  const { data: properties } = await withOrg(supabase
    .from('properties')
    .select('*, owner:owners(id, full_name), building:buildings(id, name, code)')
    .eq('is_active', true)
    .order('name'), orgId)

  return (
    <>
      <Header
        title="Propiedades"
        subtitle={`${properties?.length ?? 0} propiedades en cartera`}
        actions={<NewPropertyButton />}
      />
      <PropiedadesContent properties={properties ?? []} />
    </>
  )
}
