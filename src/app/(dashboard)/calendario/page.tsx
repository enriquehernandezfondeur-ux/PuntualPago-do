export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { CalendarioContent } from '@/components/calendario/CalendarioContent'

export const metadata = { title: 'Calendario' }

export default async function CalendarioPage() {
  const supabase = await createClient()
  const now      = new Date()
  const start    = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
  const end      = new Date(now.getFullYear(), now.getMonth() + 6, 0).toISOString().split('T')[0]

  const [
    { data: payments },
    { data: allLeases },
    { data: tasks },
    { data: properties },
  ] = await Promise.all([
    supabase.from('payments')
      .select('id, due_date, status, balance_due, currency, tenant:tenants(full_name), property:properties(name, id)')
      .neq('status', 'pagado')
      .gte('due_date', start).lte('due_date', end)
      .order('due_date'),

    // Todos los contratos activos para la vista de ocupación
    supabase.from('leases')
      .select('id, start_date, end_date, contract_number, status, rent_amount, currency, tenant:tenants(id, full_name, phone), property:properties(id, name, address)')
      .in('status', ['activo', 'por_vencer'])
      .order('end_date'),

    supabase.from('tasks')
      .select('id, title, due_date, priority, status, assignee:users(full_name)')
      .not('due_date', 'is', null)
      .neq('status', 'completada')
      .gte('due_date', start).lte('due_date', end)
      .order('due_date'),

    // Todas las propiedades con su estado actual
    supabase.from('properties')
      .select('id, name, address, status, rent_amount, currency, type')
      .eq('is_active', true)
      .order('name'),
  ])

  return (
    <>
      <Header
        title="Calendario"
        subtitle="Ocupación de apartamentos, vencimientos y tareas"
      />
      <CalendarioContent
        payments={(payments ?? []) as any}
        leases={(allLeases ?? []) as any}
        tasks={(tasks ?? []) as any}
        properties={(properties ?? []) as any}
      />
    </>
  )
}
