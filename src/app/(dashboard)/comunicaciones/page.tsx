import { Header } from '@/components/layout/Header'
import { createClient } from '@/lib/supabase/server'
import { ComunicacionesContent } from '@/components/comunicaciones/ComunicacionesContent'
import type { Communication } from '@/types/database'

export const metadata = { title: 'Comunicaciones' }

export default async function ComunicacionesPage() {
  const supabase = await createClient()

  const { data: communications } = await supabase
    .from('communications')
    .select(`
      *,
      tenant:tenants(id, full_name, email, phone),
      owner:owners(id, full_name, email),
      property:properties(id, name)
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  // Stats
  const { count: totalCount } = await supabase
    .from('communications')
    .select('id', { count: 'exact', head: true })

  const { count: emailCount } = await supabase
    .from('communications')
    .select('id', { count: 'exact', head: true })
    .eq('channel', 'email')

  const { count: whatsappCount } = await supabase
    .from('communications')
    .select('id', { count: 'exact', head: true })
    .eq('channel', 'whatsapp')

  const { count: todayCount } = await supabase
    .from('communications')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())

  return (
    <>
      <Header title="Comunicaciones" subtitle="Historial de contacto con inquilinos y propietarios" />
      <ComunicacionesContent
        communications={(communications ?? []) as unknown as Communication[]}
        stats={{
          total: totalCount ?? 0,
          email: emailCount ?? 0,
          whatsapp: whatsappCount ?? 0,
          today: todayCount ?? 0,
        }}
      />
    </>
  )
}
