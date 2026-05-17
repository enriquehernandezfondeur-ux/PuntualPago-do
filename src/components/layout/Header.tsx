'use client'
import { Search, Bell } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { createClient } from '@/lib/supabase/client'

interface HeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    // Try data attribute first (from layout), then fetch
    const el = document.getElementById('notification-user')
    if (el?.dataset.userId) { setUserId(el.dataset.userId); return }
    createClient().auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [])

  function openSearch() {
    window.dispatchEvent(new CustomEvent('open-global-search'))
  }

  return (
    <header
      className="flex items-center px-6 gap-4 shrink-0"
      style={{ height: '52px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
    >
      {/* Title — add left padding on mobile for hamburger button */}
      <div className="flex-1 min-w-0 pl-10 lg:pl-0">
        <h1 className="font-semibold truncate leading-tight" style={{ fontSize: '14px', color: 'var(--text)' }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs truncate mt-px" style={{ color: 'var(--text-tertiary)' }}>{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Search trigger */}
        <button
          onClick={openSearch}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 transition text-sm"
          style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--text-tertiary)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#94a3b8'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)' }}
        >
          <Search className="w-3.5 h-3.5" />
          <span className="text-xs">Buscar</span>
          <kbd className="text-[10px] font-mono font-semibold rounded px-1.5 py-0.5 ml-1" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--blue)' }}>
            ⌘K
          </kbd>
        </button>

        {/* Notification bell */}
        {userId ? (
          <NotificationBell userId={userId} />
        ) : (
          <button className="relative p-1.5 rounded-lg" style={{ color: 'var(--text-tertiary)' }}>
            <Bell className="w-4 h-4" />
          </button>
        )}

        {/* Page actions */}
        {actions && (
          <div className="flex items-center gap-2 ml-1 pl-2" style={{ borderLeft: '1px solid var(--border)' }}>
            {actions}
          </div>
        )}
      </div>
    </header>
  )
}
