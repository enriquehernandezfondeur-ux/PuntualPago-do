import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PortalHeader } from '@/components/portals/PortalHeader'
import { InquilinoPageContent } from '@/components/portals/InquilinoPageContent'

export const metadata = { title: 'Mis Pagos — PuntualPago' }

export default async function InquilinoPageosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('role, full_name').eq('id', user.id).single()
  if (!profile || !['inquilino', 'super_admin', 'admin'].includes(profile.role)) redirect('/dashboard')

  const { data: tenant } = await supabase
    .from('tenants').select('*').eq('user_id', user.id).single()
  if (!tenant) redirect('/portal/inquilino')

  const { data: payments } = await supabase
    .from('payments')
    .select('*, property:properties(name, address)')
    .eq('tenant_id', tenant.id)
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false })

  return (
    <div className="min-h-screen bg-slate-50">
      <PortalHeader userName={tenant.full_name} role="inquilino" />
      <InquilinoPageContent payments={payments ?? []} tenantName={tenant.full_name} />
    </div>
  )
}
