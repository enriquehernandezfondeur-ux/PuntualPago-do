import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { NewTenantWizard } from '@/components/wizard/NewTenantWizard'

export const metadata = { title: 'Nuevo Inquilino' }

export default async function NuevoInquilinoPage() {
  const supabase = await createClient()

  const [{ data: properties }, { data: owners }, { data: buildings }] = await Promise.all([
    supabase.from('properties').select('id, name, rent_amount, currency, payment_day, address, status').eq('is_active', true).in('status', ['disponible', 'ocupada']).order('name'),
    supabase.from('owners').select('id, full_name').eq('is_active', true).order('full_name'),
    supabase.from('buildings').select('id, name').eq('is_active', true).order('name'),
  ])

  return (
    <>
      <Header title="Nuevo inquilino" subtitle="Registrar en 3 pasos" />
      <NewTenantWizard
        properties={properties ?? []}
        owners={owners ?? []}
        buildings={buildings ?? []}
      />
    </>
  )
}
