export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { AuditoriaContent } from '@/components/auditoria/AuditoriaContent'

export const metadata = { title: 'Auditoría' }

export default async function AuditoriaPage() {
  const supabase = await createClient()

  const { data: logs } = await supabase
    .from('audit_logs')
    .select('*, user:users(full_name, role)')
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <>
      <Header title="Auditoría" subtitle="Historial de cambios del sistema" />
      <AuditoriaContent logs={(logs ?? []) as any} />
    </>
  )
}
