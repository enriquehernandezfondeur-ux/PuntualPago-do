export const dynamic = 'force-dynamic'
import { Header } from '@/components/layout/Header'
import { createClient } from '@/lib/supabase/server'
import { EdificiosContent } from '@/components/edificios/EdificiosContent'
import type { Building, Property } from '@/types/database'

export const metadata = { title: 'Edificios' }

export default async function EdificiosPage() {
  const supabase = await createClient()

  const { data: buildings } = await supabase
    .from('buildings')
    .select(`
      *,
      properties:properties(
        id, name, code, status, rent_amount, currency, maintenance_fee, maintenance_fee_override,
        owner:owners(id, full_name)
      )
    `)
    .eq('is_active', true)
    .order('name')

  // Enrich buildings with computed fields
  const enriched = (buildings ?? []).map(b => {
    const props = (b.properties ?? []) as Property[]
    const occupied = props.filter(p => p.status === 'ocupada').length
    const maintenancePerUnit = occupied > 0
      ? b.monthly_maintenance_amount / occupied
      : b.monthly_maintenance_amount / Math.max(b.total_units, 1)
    return {
      ...b,
      occupied_units: occupied,
      maintenance_per_unit: maintenancePerUnit,
    }
  })

  return (
    <>
      <Header
        title="Edificios"
        subtitle="Gestión de edificios y fondos de mantenimiento"
      />
      <EdificiosContent buildings={enriched as unknown as Building[]} />
    </>
  )
}
