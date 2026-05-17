export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ReciboView } from '@/components/cobros/ReciboView'

export async function generateMetadata({ params }: { params: { id: string } }) {
  return { title: `Recibo de Pago` }
}

export default async function ReciboPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const [{ data: payment }, { data: settings }] = await Promise.all([
    supabase.from('payments')
      .select(`*, tenant:tenants(full_name, id_number, phone, email), property:properties(name, address, city), owner:owners(full_name)`)
      .eq('id', params.id).single(),
    supabase.from('settings').select('key, value'),
  ])

  if (!payment || !payment.paid_date) notFound()

  const settingsMap = Object.fromEntries((settings ?? []).map(s => [s.key, s.value]))

  return (
    <ReciboView
      payment={payment as any}
      companyName={settingsMap.company_name ?? 'PuntualPago'}
      companyPhone={settingsMap.company_phone ?? ''}
      companyEmail={settingsMap.cobros_email ?? 'contacto@puntualpago.do'}
      companyAddress={settingsMap.company_address ?? ''}
    />
  )
}
