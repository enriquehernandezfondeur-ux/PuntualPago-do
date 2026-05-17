import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PortalHeader } from '@/components/portals/PortalHeader'
import { PropietarioDocumentosContent } from '@/components/portals/PropietarioDocumentosContent'

export const metadata = { title: 'Mis Documentos — PuntualPago' }

export default async function PropietarioDocumentosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single()
  if (!profile || !['propietario', 'super_admin', 'admin'].includes(profile.role)) redirect('/dashboard')

  const { data: owner } = await supabase
    .from('owners').select('id, full_name').eq('user_id', user.id).single()
  if (!owner) redirect('/portal/propietario')

  // RLS already limits to owner's data — just filter by visibility
  const { data: ownerDocs } = await supabase
    .from('documents')
    .select('*, property:properties(name)')
    .in('visibility', ['propietario', 'ambos'])
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-slate-50">
      <PortalHeader userName={owner.full_name} role="propietario" />
      <PropietarioDocumentosContent
        ownerName={owner.full_name}
        documents={(ownerDocs ?? []) as any}
      />
    </div>
  )
}
