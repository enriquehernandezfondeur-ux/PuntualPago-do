'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { createClient } from '@/lib/supabase/client'
import { LogOut, Home, CreditCard, FileUp, Building2, Wallet, FileText, Wrench, Menu, X } from 'lucide-react'

interface NavItem { href: string; label: string; icon: React.ComponentType<{ className?: string }> }

interface Props {
  userName: string
  role: 'inquilino' | 'propietario'
}

const INQUILINO_NAV: NavItem[] = [
  { href: '/portal/inquilino',               label: 'Inicio',        icon: Home },
  { href: '/portal/inquilino/pagos',         label: 'Mis pagos',     icon: CreditCard },
  { href: '/portal/inquilino/documentos',    label: 'Documentos',    icon: FileText },
  { href: '/portal/inquilino/mantenimiento', label: 'Mantenimiento', icon: Wrench },
  { href: '/portal/inquilino/comprobante',   label: 'Subir pago',    icon: FileUp },
]

const PROPIETARIO_NAV: NavItem[] = [
  { href: '/portal/propietario',                 label: 'Inicio',        icon: Home },
  { href: '/portal/propietario/propiedades',     label: 'Propiedades',   icon: Building2 },
  { href: '/portal/propietario/documentos',      label: 'Documentos',    icon: FileText },
  { href: '/portal/propietario/mantenimiento',   label: 'Mantenimiento', icon: Wrench },
  { href: '/portal/propietario/liquidaciones',   label: 'Liquidaciones', icon: Wallet },
]

export function PortalHeader({ userName, role }: Props) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()
  const nav      = role === 'inquilino' ? INQUILINO_NAV : PROPIETARIO_NAV
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const roleBadgeClass = role === 'inquilino'
    ? 'bg-blue-500/15 text-blue-300 border-blue-500/20'
    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'

  return (
    <>
      <header className="bg-slate-900 text-white shrink-0 border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">

          {/* Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-white font-bold text-lg tracking-tight">PuntualPago</span>
            <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-lg border hidden sm:inline-flex', roleBadgeClass)}>
              {role === 'inquilino' ? 'Inquilino' : 'Propietario'}
            </span>
          </div>

          {/* Nav — desktop */}
          <nav className="hidden md:flex items-center gap-1 flex-1">
            {nav.map(item => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition',
                    active
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  )}
                >
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Right — desktop */}
          <div className="hidden md:flex items-center gap-3 ml-auto shrink-0">
            <span className="text-slate-400 text-sm truncate max-w-[140px]">{userName}</span>
            <button
              onClick={handleSignOut}
              title="Cerrar sesión"
              className="flex items-center gap-1.5 text-slate-400 hover:text-red-400 text-sm transition px-2 py-1.5 rounded-lg hover:bg-slate-800"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Salir</span>
            </button>
          </div>

          {/* Mobile — hamburger */}
          <div className="flex md:hidden items-center gap-2 ml-auto">
            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-lg border', roleBadgeClass)}>
              {role === 'inquilino' ? 'Inquilino' : 'Propietario'}
            </span>
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800">
          <nav className="max-w-5xl mx-auto px-4 py-3 space-y-1">
            {nav.map(item => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition',
                    active
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </Link>
              )
            })}
            <div className="pt-2 mt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="text-slate-500 text-sm truncate">{userName}</span>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 text-slate-500 hover:text-red-400 text-sm transition px-2 py-1 rounded-lg"
              >
                <LogOut className="w-3.5 h-3.5" /> Salir
              </button>
            </div>
          </nav>
        </div>
      )}
    </>
  )
}
