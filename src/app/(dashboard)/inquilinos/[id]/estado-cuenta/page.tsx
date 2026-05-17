import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { EstadoCuentaView } from '@/components/profiles/EstadoCuentaView'

export async function generateMetadata({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data } = await supabase.from('tenants').select('full_name').eq('id', params.id).single()
  return { title: `Estado de Cuenta — ${data?.full_name ?? 'Inquilino'}` }
}

export default async function EstadoCuentaPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const [{ data: tenant }, { data: payments }, { data: lease }, { data: settings }] = await Promise.all([
    supabase.from('tenants').select('*').eq('id', params.id).single(),
    supabase.from('payments')
      .select('*, property:properties(name, address)')
      .eq('tenant_id', params.id)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false }),
    supabase.from('leases')
      .select('*, property:properties(name, address, city)')
      .eq('tenant_id', params.id).eq('status', 'activo').single(),
    supabase.from('settings').select('key, value'),
  ])

  if (!tenant) notFound()

  const settingsMap = Object.fromEntries((settings ?? []).map(s => [s.key, s.value]))

  return (
    <EstadoCuentaView
      tenant={tenant}
      payments={payments ?? []}
      lease={lease as any}
      companyName={settingsMap.company_name ?? 'PuntualPago'}
      companyPhone={settingsMap.company_phone ?? ''}
      companyEmail={settingsMap.cobros_email ?? 'cobros@puntualpago.com'}
    />
  )
}
