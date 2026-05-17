import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { DocumentosContent } from '@/components/documentos/DocumentosContent'

export const metadata = { title: 'Documentos' }

export default async function DocumentosPage() {
  const supabase = await createClient()

  const [{ data: documents }, { data: properties }, { data: tenants }, { data: owners }] = await Promise.all([
    supabase.from('documents')
      .select('*, property:properties(name), owner:owners(full_name), tenant:tenants(full_name), uploader:users!documents_uploaded_by_fkey(full_name)')
      .order('created_at', { ascending: false }),
    supabase.from('properties').select('id, name').eq('is_active', true).order('name'),
    supabase.from('tenants').select('id, full_name').eq('is_active', true).order('full_name'),
    supabase.from('owners').select('id, full_name').eq('is_active', true).order('full_name'),
  ])

  return (
    <>
      <Header title="Documentos" subtitle="Centro documental seguro" />
      <DocumentosContent documents={documents ?? []} properties={properties ?? []} tenants={tenants ?? []} owners={owners ?? []} />
    </>
  )
}
