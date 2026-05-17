'use client'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export function NewTenantButton() {
  return (
    <Link
      href="/inquilinos/nuevo"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white transition"
      style={{ background: '#1570EF' }}
      onMouseEnter={e => (e.currentTarget.style.background = '#175CD3')}
      onMouseLeave={e => (e.currentTarget.style.background = '#1570EF')}
    >
      <Plus className="w-3.5 h-3.5" /> Nuevo inquilino
    </Link>
  )
}
