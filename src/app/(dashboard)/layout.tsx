import { SidebarWrapper } from '@/components/layout/SidebarWrapper'
import { GlobalSearch } from '@/components/shared/GlobalSearch'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <SidebarWrapper />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
      <GlobalSearch />
      <div id="notification-user" data-user-id={user.id} className="hidden" />
    </div>
  )
}
