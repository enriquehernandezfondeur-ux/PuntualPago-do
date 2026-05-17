import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PortalHeader } from '@/components/portals/PortalHeader'
import { PropietarioLiquidacionesContent } from '@/components/portals/PropietarioLiquidacionesContent'

export const metadata = { title: 'Liquidaciones — PuntualPago' }

export default async function PropietarioLiquidacionesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single()
  if (!profile || !['propietario', 'super_admin', 'admin'].includes(profile.role)) redirect('/dashboard')

  const { data: owner } = await supabase
    .from('owners').select('id, full_name').eq('user_id', user.id).single()
  if (!owner) redirect('/portal/propietario')

  const { data: payouts } = await supabase
    .from('owner_payouts')
    .select('*, property:properties(name, address)')
    .eq('owner_id', owner.id)
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false })
    .limit(48)

  return (
    <div className="min-h-screen bg-slate-50">
      <PortalHeader userName={owner.full_name} role="propietario" />
      <PropietarioLiquidacionesContent payouts={(payouts ?? []) as any} ownerName={owner.full_name} />
    </div>
  )
}
