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

  // Derivar stats del array ya cargado — evita 4 queries extra a la DB
  const comms = communications ?? []
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const stats = {
    total:    comms.length,
    email:    comms.filter(c => c.channel === 'email').length,
    whatsapp: comms.filter(c => c.channel === 'whatsapp').length,
    today:    comms.filter(c => new Date(c.created_at) >= todayStart).length,
  }

  return (
    <>
      <Header title="Comunicaciones" subtitle="Historial de contacto con inquilinos y propietarios" />
      <ComunicacionesContent
        communications={comms as unknown as Communication[]}
        stats={stats}
      />
    </>
  )
}
