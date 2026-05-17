'use client'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { Menu, X } from 'lucide-react'

export function SidebarWrapper() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  // Close on route change
  useEffect(() => { setMobileOpen(false) }, [pathname])

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Mobile hamburger */}
      <button
        className="lg:hidden fixed top-3 left-3 z-40 p-2 rounded-lg shadow-sm"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menú"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <div className="lg:hidden fixed inset-y-0 left-0 z-50 animate-slide-in">
            <div className="relative h-full">
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-3 right-3 z-10 p-1.5 rounded-md"
                style={{ color: '#475569' }}
              >
                <X className="w-4 h-4" />
              </button>
              <Sidebar />
            </div>
          </div>
        </>
      )}
    </>
  )
}
