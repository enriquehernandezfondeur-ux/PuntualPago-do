'use client'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { OwnerForm } from '@/components/forms/OwnerForm'

export function NewOwnerButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white transition" style={{ background: '#1570EF' }} onMouseEnter={e => (e.currentTarget.style.background = '#175CD3')} onMouseLeave={e => (e.currentTarget.style.background = '#1570EF')}>
        <Plus className="w-3.5 h-3.5" /> Nuevo propietario
      </button>
      <OwnerForm open={open} onClose={() => setOpen(false)} />
    </>
  )
}
