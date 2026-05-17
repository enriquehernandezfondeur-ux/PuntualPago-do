import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PortalHeader } from '@/components/portals/PortalHeader'
import { InquilinoPortalContent } from '@/components/portals/InquilinoPortalContent'
import type { PropertyEvent } from '@/types/database'

export const metadata = { title: 'Mi Portal — PuntualPago' }

export default async function InquilinoPortalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('role, full_name').eq('id', user.id).single()
  if (!profile || !['inquilino', 'super_admin', 'admin'].includes(profile.role)) redirect('/dashboard')

  const { data: tenant } = await supabase
    .from('tenants').select('*').eq('user_id', user.id).single()

  if (!tenant) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PortalHeader userName={profile.full_name} role="inquilino" />
        <div className="max-w-5xl mx-auto px-4 py-16 text-center">
          <p className="text-slate-500">Tu cuenta de inquilino no está vinculada aún. Contacta a PuntualPago.</p>
        </div>
      </div>
    )
  }

  const [
    { data: leaseRaw },
    { data: payments },
    { data: phoneSettings },
    { data: waSettings },
    { data: usdRateSetting },
    { data: events },
    { data: notes },
  ] = await Promise.all([
    supabase
      .from('leases')
      .select('*, property:properties(*)')
      .eq('tenant_id', tenant.id)
      .eq('status', 'activo')
      .limit(1)
      .maybeSingle(),
    supabase
      .from('payments')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false })
      .limit(24),
    supabase.from('settings').select('value').eq('key', 'company_phone').maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'company_whatsapp').maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'usd_dop_rate').maybeSingle(),
    supabase
      .from('property_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('notes')
      .select('id, content, created_at, visibility')
      .in('visibility', ['inquilino', 'ambos'])
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const activeLease = leaseRaw ?? null
  const allPayments = payments ?? []

  // Fetch contract doc
  let contractDocumentUrl: string | null = null
  if (activeLease?.id) {
    const { data: doc } = await supabase
      .from('documents')
      .select('file_path')
      .eq('lease_id', activeLease.id)
      .eq('type', 'contrato')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    contractDocumentUrl = doc?.file_path ?? null
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PortalHeader userName={tenant.full_name} role="inquilino" />
      <InquilinoPortalContent
        tenant={tenant}
        activeLease={activeLease as any}
        payments={allPayments}
        pendingBalance={tenant.pending_balance ?? 0}
        companyPhone={phoneSettings?.value as string | undefined}
        companyWhatsapp={waSettings?.value as string | undefined}
        contractDocumentUrl={contractDocumentUrl}
        usdRate={usdRateSetting?.value ? Number(usdRateSetting.value) : undefined}
        recentEvents={(events ?? []) as PropertyEvent[]}
        adminNotes={(notes ?? []) as Array<{ id: string; content: string; created_at: string }>}
      />
    </div>
  )
}
