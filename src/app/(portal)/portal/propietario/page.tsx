import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PortalHeader } from '@/components/portals/PortalHeader'
import { PropietarioPortalContent } from '@/components/portals/PropietarioPortalContent'
import type { PropertyEvent } from '@/types/database'

export const metadata = { title: 'Portal Propietario — PuntualPago' }

export default async function PropietarioPortalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('role, full_name').eq('id', user.id).single()
  if (!profile || !['propietario', 'super_admin', 'admin'].includes(profile.role)) redirect('/dashboard')

  const { data: owner } = await supabase
    .from('owners').select('id, full_name').eq('user_id', user.id).single()

  if (!owner) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PortalHeader userName={profile.full_name} role="propietario" />
        <div className="max-w-5xl mx-auto px-4 py-16 text-center">
          <p className="text-slate-500">Tu cuenta de propietario no está vinculada aún. Contacta a PuntualPago.</p>
        </div>
      </div>
    )
  }

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const twelveMonthsAgo = new Date(now)
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11)
  const startYear = twelveMonthsAgo.getFullYear()

  const [
    { data: allProperties },
    { data: monthPayments },
    { data: pendingPayouts },
    { data: yearPayouts },
    { data: events },
    { data: adminNotes },
    { data: phoneSettings },
    { data: waSettings },
  ] = await Promise.all([
    supabase
      .from('properties')
      .select('*, current_lease:leases(id, status, tenant:tenants(full_name))')
      .eq('owner_id', owner.id)
      .eq('is_active', true)
      .order('name'),

    supabase
      .from('payments')
      .select('*, tenant:tenants(full_name), property:properties(name)')
      .eq('owner_id', owner.id)
      .eq('period_year', currentYear)
      .eq('period_month', currentMonth)
      .order('due_date'),

    supabase
      .from('owner_payouts')
      .select('*, property:properties(name)')
      .eq('owner_id', owner.id)
      .eq('paid', false)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false }),

    supabase
      .from('owner_payouts')
      .select('*, property:properties(name, address)')
      .eq('owner_id', owner.id)
      .gte('period_year', startYear)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false }),

    supabase
      .from('property_events')
      .select('*')
      .in('visibility', ['propietario', 'ambos'])
      .order('created_at', { ascending: false })
      .limit(10),

    supabase
      .from('notes')
      .select('id, content, created_at, property_id, visibility')
      .eq('owner_id', owner.id)
      .in('visibility', ['propietario', 'ambos'])
      .order('created_at', { ascending: false })
      .limit(5),

    supabase.from('settings').select('value').eq('key', 'company_phone').maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'company_whatsapp').maybeSingle(),
  ])

  const allPays = monthPayments ?? []
  const allPayouts = pendingPayouts ?? []
  const allYearPayouts = yearPayouts ?? []
  const totalCollected = allPays.filter(p => p.status === 'pagado').reduce((s, p) => s + (p.amount_paid ?? 0), 0)
  const totalPending = allPays.filter(p => p.status !== 'pagado').reduce((s, p) => s + (p.balance_due ?? 0), 0)
  const pendingPayoutsAmount = allPayouts.reduce((s, p) => s + p.net_payout, 0)

  return (
    <div className="min-h-screen bg-slate-50">
      <PortalHeader userName={owner.full_name} role="propietario" />
      <PropietarioPortalContent
        ownerName={owner.full_name}
        properties={(allProperties ?? []) as any}
        monthPayments={allPays as any}
        pendingPayouts={allPayouts as any}
        yearPayouts={allYearPayouts as any}
        totalCollected={totalCollected}
        totalPending={totalPending}
        pendingPayoutsAmount={pendingPayoutsAmount}
        recentEvents={(events ?? []) as PropertyEvent[]}
        adminNotes={(adminNotes ?? []) as Array<{ id: string; content: string; created_at: string; property_id?: string }>}
        companyPhone={phoneSettings?.value as string | undefined}
        companyWhatsapp={waSettings?.value as string | undefined}
      />
    </div>
  )
}
