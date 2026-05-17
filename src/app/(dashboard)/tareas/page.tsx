import { createClient, getOrgFilter, withOrg } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { TareasContent } from '@/components/tareas/TareasContent'
import { Plus } from 'lucide-react'

export const metadata = { title: 'Tareas' }

export default async function TareasPage() {
  const supabase = await createClient()
  const [authResult, orgId] = await Promise.all([
    supabase.auth.getUser(),
    getOrgFilter(supabase),
  ])
  const { data: { user } } = authResult

  const [{ data: tasks }, { data: teamUsers }] = await Promise.all([
    withOrg(supabase
      .from('tasks')
      .select('*, assignee:users(id, full_name, role), creator:users!tasks_created_by_fkey(full_name)')
      .order('due_date', { ascending: true, nullsFirst: false }), orgId),
    withOrg(supabase
      .from('users')
      .select('*')
      .eq('is_active', true)
      .order('full_name'), orgId),
  ])

  return (
    <>
      <Header
        title="Tareas"
        subtitle="Control operativo del equipo"
        actions={
          <button className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition">
            <Plus className="w-4 h-4" /> Nueva tarea
          </button>
        }
      />
      <TareasContent tasks={tasks ?? []} teamUsers={teamUsers ?? []} currentUserId={user?.id ?? ''} />
    </>
  )
}
