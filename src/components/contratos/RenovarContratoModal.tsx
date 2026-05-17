'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { logAudit } from '@/lib/utils/audit'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { FormModal, FormActions, Field, inputCls, inputStyle, Separator } from '@/components/forms/FormModal'
import { CheckCircle2, RefreshCw } from 'lucide-react'
import type { Lease } from '@/types/database'

interface Props { lease: Lease & { property?: any; tenant?: any }; onClose: () => void }

export function RenovarContratoModal({ lease, onClose }: Props) {
  const router   = useRouter()
  const supabase = createClient()

  // Calculate suggested new dates (same period length)
  const oldStart = new Date(lease.start_date + 'T12:00:00')
  const oldEnd   = new Date(lease.end_date   + 'T12:00:00')
  const months   = Math.round((oldEnd.getTime() - oldStart.getTime()) / (1000 * 60 * 60 * 24 * 30))
  const newStart = new Date(lease.end_date    + 'T12:00:00')
  newStart.setDate(newStart.getDate() + 1)
  const newEnd   = new Date(newStart)
  newEnd.setMonth(newEnd.getMonth() + months)

  const [startDate, setStartDate] = useState(newStart.toISOString().split('T')[0])
  const [endDate,   setEndDate]   = useState(newEnd.toISOString().split('T')[0])
  const [rentAmount, setRentAmount] = useState(String(lease.rent_amount))
  const [notes, setNotes]          = useState('')
  const [loading, setLoading]      = useState(false)
  const [error, setError]          = useState('')
  const [done, setDone]            = useState(false)

  const rentChange = Number(rentAmount) - lease.rent_amount
  const rentChangePct = lease.rent_amount > 0 ? ((rentChange / lease.rent_amount) * 100).toFixed(1) : '0'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!startDate || !endDate) { setError('Las fechas son obligatorias'); return }
    setLoading(true); setError('')
    try {
      // 1. Mark old lease as renovated
      await supabase.from('leases').update({ status: 'renovado', notes: notes || lease.notes }).eq('id', lease.id)

      // 2. Create new lease
      const { data: newLease, error: lErr } = await supabase.from('leases').insert({
        property_id:         lease.property_id,
        tenant_id:           lease.tenant_id,
        owner_id:            lease.owner_id,
        start_date:          startDate,
        end_date:            endDate,
        rent_amount:         Number(rentAmount),
        currency:            lease.currency,
        deposit_amount:      lease.deposit_amount,
        payment_day:         lease.payment_day,
        late_fee_percentage: lease.late_fee_percentage,
        late_fee_grace_days: lease.late_fee_grace_days,
        has_guarantee:       lease.has_guarantee,
        guarantee_id:        lease.guarantee_id,
        status:              'activo',
        signing_status:      'pendiente',
        inventory_included:  lease.inventory_included,
        notes,
      }).select('id').single()
      if (lErr) throw lErr

      // 3. Generate payments for new period
      await fetch('/api/leases/generate-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaseId: newLease.id }),
      })

      await logAudit({ action: 'lease_renewed', entityType: 'leases', entityId: newLease.id, newValues: { old_lease: lease.id, new_rent: rentAmount } })

      // 4. Notify
      fetch('/api/notifications/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roles: ['admin', 'super_admin', 'gerente_operativo'],
          title: `Contrato renovado — ${lease.tenant?.full_name ?? 'Inquilino'}`,
          message: `${lease.property?.name ?? ''} · ${formatCurrency(Number(rentAmount), lease.currency)}/mes · hasta ${formatDate(endDate)}`,
          entityType: 'leases', entityId: newLease.id, type: 'lease',
        }),
      }).catch(() => {})

      setDone(true)
      setTimeout(() => { router.refresh(); onClose() }, 1800)
    } catch (err: any) {
      setError(err.message ?? 'Error al renovar')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <FormModal open onClose={onClose} title="Contrato renovado" size="sm">
        <div className="py-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto" style={{ background: '#ECFDF3' }}>
            <CheckCircle2 className="w-6 h-6" style={{ color: '#12B76A' }} />
          </div>
          <p className="font-semibold" style={{ color: 'var(--text)' }}>¡Contrato renovado exitosamente!</p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Nuevo período: {formatDate(startDate)} → {formatDate(endDate)}</p>
        </div>
      </FormModal>
    )
  }

  return (
    <FormModal open onClose={onClose} title="Renovar contrato" subtitle={`${lease.tenant?.full_name} · ${lease.property?.name}`} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Current contract info */}
        <div className="rounded-xl p-4" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>Contrato actual</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'Inicio', value: formatDate(lease.start_date) },
              { label: 'Fin', value: formatDate(lease.end_date) },
              { label: 'Renta', value: formatCurrency(lease.rent_amount, lease.currency) },
            ].map(item => (
              <div key={item.label}>
                <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{item.value}</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* New period */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nueva fecha de inicio" required>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} style={inputStyle} />
          </Field>
          <Field label="Nueva fecha de fin" required>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputCls} style={inputStyle} />
          </Field>
        </div>

        <Field label="Nueva renta mensual" hint={rentChange !== 0 ? `${rentChange > 0 ? '+' : ''}${rentChangePct}% vs contrato anterior` : 'Sin cambio de renta'}>
          <input type="number" value={rentAmount} onChange={e => setRentAmount(e.target.value)} className={inputCls} style={inputStyle} />
        </Field>

        {rentChange > 0 && (
          <div className="rounded-lg px-3.5 py-2.5 text-xs" style={{ background: '#FFFAEB', border: '1px solid #FEF0C7', color: '#B54708' }}>
            La renta sube {formatCurrency(rentChange, lease.currency)}/mes ({rentChangePct}%). El inquilino será notificado.
          </div>
        )}

        <Field label="Notas de renovación">
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Condiciones de la renovación, acuerdos especiales..." className={inputCls + ' resize-none'} style={inputStyle} />
        </Field>

        <div className="rounded-xl px-4 py-3 text-xs" style={{ background: '#EFF8FF', border: '1px solid #B2DDFF', color: '#175CD3' }}>
          Al renovar: el contrato actual quedará como "Renovado", se creará uno nuevo activo y se generarán los pagos del nuevo período automáticamente.
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}
        <FormActions onCancel={onClose} loading={loading} submitLabel="Renovar contrato" />
      </form>
    </FormModal>
  )
}
