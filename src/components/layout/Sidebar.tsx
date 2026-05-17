'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { useUser, ROLE_LABELS } from '@/lib/hooks/useUser'
import { initials } from '@/lib/utils/format'
import {
  LayoutDashboard, CreditCard, Shield, Building2, Users, UserCheck,
  FileText, FolderOpen, Scale, Wrench, CheckSquare, MessageSquare,
  BarChart3, Wallet, Settings, LogOut, ChevronRight, Landmark, CalendarDays, History, Globe,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ThemeToggle } from '@/components/shared/ThemeToggle'

// primary: ítem grande, siempre visible
// secondary: ítem pequeño, para uso ocasional
const navItems = [
  {
    group: 'Principal',
    items: [
      { href: '/dashboard',      icon: LayoutDashboard, label: 'Dashboard',      primary: true },
      { href: '/cobros',         icon: CreditCard,      label: 'Cobros',         primary: true, badge: 'HOT' },
      { href: '/inquilinos',     icon: UserCheck,       label: 'Inquilinos',     primary: true },
      { href: '/finanzas',       icon: Wallet,          label: 'Finanzas',       primary: true },
      { href: '/garantia',       icon: Shield,          label: 'Garantía PP',    primary: false },
      { href: '/calendario',     icon: CalendarDays,    label: 'Calendario',     primary: false },
    ],
  },
  {
    group: 'Gestión',
    items: [
      { href: '/propiedades',    icon: Building2,       label: 'Propiedades',    primary: true },
      { href: '/propietarios',   icon: Users,           label: 'Propietarios',   primary: true },
      { href: '/contratos',      icon: FileText,        label: 'Contratos',      primary: true },
      { href: '/edificios',      icon: Landmark,        label: 'Edificios',      primary: false },
      { href: '/documentos',     icon: FolderOpen,      label: 'Documentos',     primary: false },
    ],
  },
  {
    group: 'Operaciones',
    items: [
      { href: '/legal',          icon: Scale,           label: 'Legal',          primary: true },
      { href: '/mantenimiento',  icon: Wrench,          label: 'Mantenimiento',  primary: true },
      { href: '/tareas',         icon: CheckSquare,     label: 'Tareas',         primary: false },
      { href: '/comunicaciones', icon: MessageSquare,   label: 'Comunicaciones', primary: false },
    ],
  },
  {
    group: 'Reportes',
    items: [
      { href: '/reportes',       icon: BarChart3,       label: 'Reportes',       primary: true },
      { href: '/configuracion',  icon: Settings,        label: 'Configuración',  primary: false },
      { href: '/auditoria',      icon: History,         label: 'Auditoría',      primary: false },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user } = useUser()
  const router   = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside
      className="w-56 min-h-screen flex flex-col shrink-0"
      style={{ backgroundColor: '#0C1120', borderRight: '1px solid #1a2235' }}
    >
      {/* Nombre */}
      <div className="px-4 py-3.5 flex items-center gap-2.5" style={{ borderBottom: '1px solid #1a2235' }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
          style={{ background: '#1570EF', letterSpacing: '-0.02em' }}>P</div>
        <Link href="/dashboard" className="block group">
          <span className="text-white font-bold text-sm tracking-tight group-hover:opacity-80 transition-opacity">
            PuntualPago
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto scrollbar-thin py-3 px-2.5 space-y-5">
        {navItems.map((group) => (
          <div key={group.group}>
            <p
              className="px-2.5 mb-1.5"
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#475569',
              }}
            >
              {group.group}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active    = pathname === item.href || pathname.startsWith(item.href + '/')
                const isPrimary = (item as any).primary !== false
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-2.5 rounded-md transition-all',
                        'px-2.5 py-1.5',
                        active ? 'font-medium' : 'hover:text-slate-200'
                      )}
                      style={active
                        ? { background: 'rgba(59,130,246,0.12)', color: '#93c5fd' }
                        : { color: isPrimary ? '#94a3b8' : '#4B5563' }
                      }
                    >
                      <item.icon
                        className={cn('shrink-0', isPrimary ? 'w-3.5 h-3.5' : 'w-3 h-3')}
                        style={{ color: active ? '#93c5fd' : '#64748b' }}
                      />
                      <span
                        className="flex-1 truncate"
                        style={{ fontSize: isPrimary ? '13px' : '12px' }}
                      >
                        {item.label}
                      </span>
                      {'badge' in item && item.badge && (
                        <span className="text-[9px] font-bold bg-red-500 text-white px-1.5 py-px rounded-full leading-none">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="p-2.5" style={{ borderTop: '1px solid #1a2235' }}>
        <div
          className="flex items-center gap-2 px-2 py-2 rounded-md transition-colors group"
          style={{ cursor: 'default' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold shrink-0"
            style={{ fontSize: '10px', background: '#1570EF' }}
          >
            {user ? initials(user.full_name) : '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: '#e2e8f0' }}>
              {user?.full_name ?? '—'}
            </p>
            <p className="truncate" style={{ fontSize: '10px', color: '#475569' }}>
              {user ? ROLE_LABELS[user.role] : ''}
            </p>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <ThemeToggle />
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Ver página principal"
              title="Ver página principal"
              className="p-1.5 rounded transition"
              style={{ color: '#475569' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#38bdf8')}
              onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
            >
              <Globe className="w-3 h-3" />
            </Link>
            <button
              onClick={handleSignOut}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              className="p-1.5 rounded transition"
              style={{ color: '#475569' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
              onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
            >
              <LogOut className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
