import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { ReciboView } from '@/components/cobros/ReciboView'

export const metadata = { title: 'Recibo de Pago — PuntualPago' }

export default async function PortalReciboPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  const isPortalUser = profile?.role === 'inquilino'
  const isStaff = ['super_admin', 'admin', 'gerente_operativo'].includes(profile?.role ?? '')
  if (!isPortalUser && !isStaff) redirect('/portal/inquilino')

  const [{ data: payment }, { data: settings }] = await Promise.all([
    supabase.from('payments')
      .select('*, tenant:tenants(full_name, id_number, phone, email, user_id), property:properties(name, address, city), owner:owners(full_name)')
      .eq('id', params.id).single(),
    supabase.from('settings').select('key, value'),
  ])

  if (!payment || !payment.paid_date) notFound()

  // Inquilinos solo pueden ver sus propios recibos
  if (isPortalUser && (payment.tenant as any)?.user_id !== user.id) notFound()

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
