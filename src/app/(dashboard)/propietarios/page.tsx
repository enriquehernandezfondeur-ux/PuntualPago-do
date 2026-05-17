export const dynamic = 'force-dynamic'
import { createClient, getOrgFilter, withOrg } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { PropietariosContent } from '@/components/propietarios/PropietariosContent'
import Link from 'next/link'
import { NewOwnerButton } from '@/components/propietarios/NewOwnerButton'
import { Plus } from 'lucide-react'

export const metadata = { title: 'Propietarios' }

export default async function PropietariosPage() {
  const supabase = await createClient()
  const orgId    = await getOrgFilter()

  const { data: owners } = await withOrg(supabase
    .from('owners')
    .select('*, properties:properties(id, name, status, rent_amount, currency)')
    .eq('is_active', true)
    .order('full_name'), orgId)

  return (
    <>
      <Header
        title="Propietarios"
        subtitle={`${owners?.length ?? 0} propietarios en cartera`}
        actions={
          <Link href="/propietarios/nuevo" className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition">
            <Plus className="w-4 h-4" /> Nuevo propietario
          </Link>
        }
      />
      <PropietariosContent owners={owners ?? []} />
    </>
  )
}
