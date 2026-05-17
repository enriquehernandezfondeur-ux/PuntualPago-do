export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { ConfiguracionContent } from '@/components/configuracion/ConfiguracionContent'

export const metadata = { title: 'Configuración' }

export default async function ConfiguracionPage() {
  const supabase = await createClient()

  const [{ data: settings }, { data: users }] = await Promise.all([
    supabase.from('settings').select('*').order('key'),
    supabase.from('users').select('*').order('full_name'),
  ])

  return (
    <>
      <Header title="Configuración" subtitle="Ajustes del sistema y gestión de usuarios" />
      <ConfiguracionContent settings={settings ?? []} users={users ?? []} />
    </>
  )
}
