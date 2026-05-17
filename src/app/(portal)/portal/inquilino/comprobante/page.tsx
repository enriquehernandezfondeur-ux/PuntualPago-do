import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PortalHeader } from '@/components/portals/PortalHeader'
import { ComprobanteUpload } from '@/components/portals/ComprobanteUpload'

export const metadata = { title: 'Subir Comprobante — PuntualPago' }

export default async function ComprobantePortalPage() {
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
    .select('id, property_id, property:properties(name)')
    .eq('tenant_id', tenant.id)
    .eq('status', 'activo')
    .maybeSingle()

  const { data: pendingPayments } = await supabase
    .from('payments')
    .select('id, payment_number, period_month, period_year, balance_due, currency')
    .eq('tenant_id', tenant.id)
    .in('status', ['al_dia', 'vence_pronto', 'vencido', 'en_mora'])
    .gt('balance_due', 0)
    .order('due_date')

  return (
    <div className="min-h-screen bg-slate-50">
      <PortalHeader userName={tenant.full_name} role="inquilino" />
      <ComprobanteUpload
        tenantId={tenant.id}
        tenantName={tenant.full_name}
        leaseId={activeLease?.id ?? null}
        propertyId={activeLease?.property_id ?? null}
        propertyName={(activeLease?.property as any)?.name ?? null}
        pendingPayments={(pendingPayments ?? []) as any[]}
      />
    </div>
  )
}
