import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PortalHeader } from '@/components/portals/PortalHeader'
import { PropietarioMantenimientoContent } from '@/components/portals/PropietarioMantenimientoContent'

export const metadata = { title: 'Mantenimiento — PuntualPago' }

export default async function PropietarioMantenimientoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single()
  if (!profile || !['propietario', 'super_admin', 'admin'].includes(profile.role)) redirect('/dashboard')

  const { data: owner } = await supabase
    .from('owners').select('id, full_name').eq('user_id', user.id).single()
  if (!owner) redirect('/portal/propietario')

  // RLS filters to owner's properties automatically
  const { data: tickets } = await supabase
    .from('maintenance_requests')
    .select('*, property:properties(name, address)')
    .order('reported_date', { ascending: false })

  return (
    <div className="min-h-screen bg-slate-50">
      <PortalHeader userName={owner.full_name} role="propietario" />
      <PropietarioMantenimientoContent
        ownerName={owner.full_name}
        tickets={(tickets ?? []) as any}
      />
    </div>
  )
}
