import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PortalHeader } from '@/components/portals/PortalHeader'
import { PropietarioPropiedadesContent } from '@/components/portals/PropietarioPropiedadesContent'

export const metadata = { title: 'Mis Propiedades — PuntualPago' }

export default async function PropietarioPropiedadesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single()
  if (!profile || !['propietario', 'super_admin', 'admin'].includes(profile.role)) redirect('/dashboard')

  const { data: owner } = await supabase
    .from('owners').select('id, full_name').eq('user_id', user.id).single()
  if (!owner) redirect('/portal/propietario')

  const { data: properties } = await supabase
    .from('properties')
    .select(`
      *,
      building:buildings(name),
      leases(
        id, contract_number, status, start_date, end_date, rent_amount, currency, payment_day,
        tenant:tenants(full_name, phone, whatsapp, risk_level, status)
      )
    `)
    .eq('owner_id', owner.id)
    .eq('is_active', true)
    .order('name')

  return (
    <div className="min-h-screen bg-slate-50">
      <PortalHeader userName={owner.full_name} role="propietario" />
      <PropietarioPropiedadesContent properties={(properties ?? []) as any} ownerName={owner.full_name} />
    </div>
  )
}
