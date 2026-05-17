import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PortalHeader } from '@/components/portals/PortalHeader'
import { InquilinoDocumentosContent } from '@/components/portals/InquilinoDocumentosContent'

export const metadata = { title: 'Mis Documentos — PuntualPago' }

export default async function InquilinoDocumentosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single()
  if (!profile || !['inquilino', 'super_admin', 'admin'].includes(profile.role)) redirect('/dashboard')

  const { data: tenant } = await supabase
    .from('tenants').select('id, full_name').eq('user_id', user.id).single()
  if (!tenant) redirect('/portal/inquilino')

  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('tenant_id', tenant.id)
    .in('visibility', ['inquilino', 'ambos'])
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-slate-50">
      <PortalHeader userName={tenant.full_name} role="inquilino" />
      <InquilinoDocumentosContent
        tenantName={tenant.full_name}
        documents={documents ?? []}
      />
    </div>
  )
}
