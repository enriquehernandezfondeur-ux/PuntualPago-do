import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ContratoPDFView } from '@/components/contratos/ContratoPDFView'

export async function generateMetadata({ params }: { params: { id: string } }) {
  return { title: 'Contrato de Arrendamiento' }
}

export default async function ContratoPDFPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const [{ data: lease }, { data: settings }] = await Promise.all([
    supabase.from('leases')
      .select(`*, property:properties(name, address, city, province, type), tenant:tenants(full_name, id_number, id_type, nationality, address, phone, email), owner:owners(full_name, cedula, rnc, is_company, address, city, phone, email)`)
      .eq('id', params.id).single(),
    supabase.from('settings').select('key, value'),
  ])

  if (!lease) notFound()

  const settingsMap = Object.fromEntries((settings ?? []).map(s => [s.key, s.value]))

  return (
    <ContratoPDFView
      lease={lease as any}
      companyName={settingsMap.company_name ?? 'PuntualPago'}
      companyAddress={settingsMap.company_address ?? ''}
      companyPhone={settingsMap.company_phone ?? ''}
      companyEmail={settingsMap.cobros_email ?? ''}
    />
  )
}
