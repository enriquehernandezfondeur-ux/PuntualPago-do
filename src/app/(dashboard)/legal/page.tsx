export const dynamic = 'force-dynamic'
import { createClient, getOrgFilter, withOrg } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { LegalContent } from '@/components/legal/LegalContent'

export const metadata = { title: 'Legal / Recuperación' }

export default async function LegalPage() {
  const supabase = await createClient()
  const orgId    = await getOrgFilter()

  const { data: cases } = await withOrg(supabase
    .from('legal_cases')
    .select(`
      *,
      property:properties(id, name, sector),
      tenant:tenants(id, full_name, phone, whatsapp),
      owner:owners(id, full_name),
      assignee:users!legal_cases_internal_assigned_fkey(full_name)
    `)
    .order('opened_date', { ascending: false }), orgId)

  const totalOwed = cases?.reduce((s, c) => s + c.amount_owed, 0) ?? 0

  return (
    <>
      <Header title="Legal / Recuperación" subtitle="Seguimiento de casos legales y procesos de desalojo" />
      <LegalContent cases={cases ?? []} totalOwed={totalOwed} />
    </>
  )
}
