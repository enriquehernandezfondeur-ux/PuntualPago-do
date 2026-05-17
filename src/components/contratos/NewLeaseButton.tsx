'use client'
import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { LeaseForm } from '@/components/forms/LeaseForm'
import { createClient } from '@/lib/supabase/client'

export function NewLeaseButton() {
  const [open, setOpen]             = useState(false)
  const [properties, setProperties] = useState<any[]>([])
  const [owners, setOwners]         = useState<any[]>([])
  const [tenants, setTenants]       = useState<any[]>([])

  useEffect(() => {
    if (!open) return
    const sb = createClient()
    Promise.all([
      sb.from('properties').select('id, name, rent_amount, currency, payment_day').eq('is_active', true).order('name'),
      sb.from('owners').select('id, full_name').eq('is_active', true).order('full_name'),
      sb.from('tenants').select('id, full_name').eq('is_active', true).order('full_name'),
    ]).then(([p, o, t]) => { setProperties(p.data ?? []); setOwners(o.data ?? []); setTenants(t.data ?? []) })
  }, [open])

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white transition" style={{ background: '#1570EF' }} onMouseEnter={e => (e.currentTarget.style.background = '#175CD3')} onMouseLeave={e => (e.currentTarget.style.background = '#1570EF')}>
        <Plus className="w-3.5 h-3.5" /> Nuevo contrato
      </button>
      <LeaseForm open={open} onClose={() => setOpen(false)} properties={properties} owners={owners} tenants={tenants} />
    </>
  )
}
