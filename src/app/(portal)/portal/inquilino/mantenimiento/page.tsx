import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PortalHeader } from '@/components/portals/PortalHeader'
import { InquilinoMantenimientoContent } from '@/components/portals/InquilinoMantenimientoContent'

export const metadata = { title: 'Mantenimiento — PuntualPago' }

export default async function InquilinoMantenimientoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single()
  if (!profile || !['inquilino', 'super_admin', 'admin'].includes(profile.role)) redirect('/dashboard')

  const { data: tenant } = await supabase
    .from('tenants').select('id, full_name').eq('user_id', user.id).single()
  if (!tenant) redirect('/portal/inquilino')

  const { data: activeLease } = await supabase
    .from('leases')
    .select('id, property_id, property:properties(id, name, address)')
    .eq('tenant_id', tenant.id)
    .eq('status', 'activo')
    .maybeSingle()

  const { data: tickets } = await supabase
    .from('maintenance_requests')
    .select('*')
    .eq('tenant_id', tenant.id)
    .order('reported_date', { ascending: false })

  return (
    <div className="min-h-screen bg-slate-50">
      <PortalHeader userName={tenant.full_name} role="inquilino" />
      <InquilinoMantenimientoContent
        tenantId={tenant.id}
        tenantName={tenant.full_name}
        activeLease={activeLease as any}
        tickets={tickets ?? []}
      />
    </div>
  )
}
