'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'
import { Bell, X, CheckCheck, CreditCard, FileText, Wrench, MessageCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'

interface Notification {
  id: string
  title: string
  message?: string
  type: string
  read_at?: string
  created_at: string
  entity_type?: string
  entity_id?: string
}

export function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen]   = useState(false)
  const [loading, setLoading] = useState(true)
  const panelRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const unreadCount = notifications.filter(n => !n.read_at).length

  useEffect(() => {
    // Initial load
    supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => { setNotifications(data ?? []); setLoading(false) })

    // Realtime subscription
    const channel = supabase.channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function markAllRead() {
    const unread = notifications.filter(n => !n.read_at).map(n => n.id)
    if (!unread.length) return
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).in('id', unread)
    setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })))
  }

  async function markRead(id: string) {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
  }

  const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
    payment:  CreditCard,
    lease:    FileText,
    maintenance: Wrench,
    message:  MessageCircle,
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-1.5 rounded-lg transition"
        style={{ color: 'var(--text-tertiary)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-subtle)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center rounded-full text-white font-bold"
            style={{ background: '#F04438', fontSize: '9px' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 rounded-2xl overflow-hidden shadow-xl z-50 animate-fade-in"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Notificaciones</p>
              {unreadCount > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold" style={{ background: '#FEF3F2', color: '#B42318' }}>{unreadCount} nuevas</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="flex items-center gap-1 text-xs transition" style={{ color: 'var(--text-tertiary)' }}>
                  <CheckCheck className="w-3.5 h-3.5" /> Marcar leídas
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {loading ? (
              <div className="py-6 text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>Cargando...</div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--text-tertiary)' }} />
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Sin notificaciones</p>
              </div>
            ) : (
              notifications.map(n => {
                const Icon = TYPE_ICON[n.entity_type ?? ''] ?? Bell
                return (
                  <div
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors"
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      background: !n.read_at ? '#F9FEFF' : '',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-subtle)')}
                    onMouseLeave={e => (e.currentTarget.style.background = !n.read_at ? '#F9FEFF' : '')}
                  >
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: '#EFF8FF' }}>
                      <span style={{ color: '#1570EF', display: 'flex' }}><Icon className="w-3.5 h-3.5" /></span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: 'var(--text)', fontWeight: !n.read_at ? 600 : 400 }}>{n.title}</p>
                      {n.message && <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-tertiary)' }}>{n.message}</p>}
                      <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{formatDate(n.created_at)}</p>
                    </div>
                    {!n.read_at && <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: '#1570EF' }} />}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
