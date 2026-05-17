'use client'
import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { PropertyForm } from '@/components/forms/PropertyForm'
import { createClient } from '@/lib/supabase/client'

export function NewPropertyButton() {
  const [open, setOpen]       = useState(false)
  const [owners, setOwners]   = useState<any[]>([])
  const [buildings, setBuildings] = useState<any[]>([])

  useEffect(() => {
    if (!open) return
    const sb = createClient()
    Promise.all([
      sb.from('owners').select('id, full_name').eq('is_active', true).order('full_name'),
      sb.from('buildings').select('id, name').eq('is_active', true).order('name'),
    ]).then(([o, b]) => { setOwners(o.data ?? []); setBuildings(b.data ?? []) })
  }, [open])

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white transition" style={{ background: '#1570EF' }} onMouseEnter={e => (e.currentTarget.style.background = '#175CD3')} onMouseLeave={e => (e.currentTarget.style.background = '#1570EF')}>
        <Plus className="w-3.5 h-3.5" /> Nueva propiedad
      </button>
      <PropertyForm open={open} onClose={() => setOpen(false)} owners={owners} buildings={buildings} />
    </>
  )
}
