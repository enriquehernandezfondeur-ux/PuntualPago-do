'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { logAudit } from '@/lib/utils/audit'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { FormModal, FormActions, Field, inputCls, inputStyle } from '@/components/forms/FormModal'
import { Scale, AlertTriangle } from 'lucide-react'
import type { Payment } from '@/types/database'

interface Props { payment: Payment; onClose: () => void }

const REASONS = [
  'Mora acumulada — múltiples meses',
  'No responde a comunicaciones',
  'Abandono de propiedad',
  'Daños a la propiedad',
  'Incumplimiento de contrato',
  'Uso indebido de la propiedad',
  'Otro',
]

export function EscalarLegalModal({ payment, onClose }: Props) {
  const router   = useRouter()
  const supabase = createClient()
  const tenant   = (payment as any).tenant
  const property = (payment as any).property

  const [reason, setReason]           = useState(REASONS[0])
  const [notes, setNotes]             = useState('')
  const [lawyerName, setLawyerName]   = useState('')
  const [nextAction, setNextAction]   = useState('')
  const [nextDate, setNextDate]       = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      // 1. Create legal case
      const { data: legalCase, error: lcErr } = await supabase
        .from('legal_cases')
        .insert({
          property_id:   payment.property_id,
          tenant_id:     payment.tenant_id,
          owner_id:      payment.owner_id,
          lease_id:      payment.lease_id,
          status:        'prelegal',
          reason,
          amount_owed:   payment.balance_due,
          currency:      payment.currency,
          days_in_arrears: payment.days_overdue,
          lawyer_assigned: lawyerName || null,
          opened_date:   new Date().toISOString().split('T')[0],
          next_action_date: nextDate || null,
          next_action:   nextAction || null,
          notes,
        })
        .select('id').single()
      if (lcErr) throw lcErr

      // 2. Update payment status
      await supabase.from('payments').update({ status: 'en_legal', sent_to_legal: true }).eq('id', payment.id)

      // 3. Update tenant status
      await supabase.from('tenants').update({ status: 'en_legal' }).eq('id', payment.tenant_id)

      // 4. Log audit
      await logAudit({ action: 'payment_escalated_legal', entityType: 'legal_cases', entityId: legalCase.id, newValues: { reason, amount_owed: payment.balance_due } })

      // 5. Create notification for legal team
      await fetch('/api/notifications/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roles: ['equipo_legal', 'admin', 'super_admin', 'gerente_operativo'],
          title: `Caso legal abierto — ${tenant?.full_name}`,
          message: `${property?.name} · ${formatCurrency(payment.balance_due, payment.currency)} · ${reason}`,
          entityType: 'legal_cases',
          entityId: legalCase.id,
        }),
      }).catch(() => {})

      router.refresh()
      onClose()
    } catch (err: any) {
      setError(err.message ?? 'Error al escalar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <FormModal open onClose={onClose} title="Escalar a Legal" subtitle={`${tenant?.full_name} · ${property?.name}`} size="md">
      {/* Warning */}
      <div className="flex items-start gap-3 p-3.5 rounded-xl mb-4" style={{ background: '#FEF3F2', border: '1px solid #FECDCA' }}>
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#F04438' }} />
        <div>
          <p className="text-xs font-semibold" style={{ color: '#B42318' }}>Esta acción:</p>
          <ul className="text-xs mt-1 space-y-0.5" style={{ color: '#B42318' }}>
            <li>• Cambia el estado del pago a "En legal"</li>
            <li>• Cambia el estado del inquilino a "En legal"</li>
            <li>• Crea un caso en el módulo Legal</li>
            <li>• Notifica al equipo legal</li>
          </ul>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Balance adeudado', value: formatCurrency(payment.balance_due, payment.currency) },
            { label: 'Días en mora', value: `${payment.days_overdue} días` },
            { label: 'Vencía', value: formatDate(payment.due_date) },
          ].map(item => (
            <div key={item.label} className="rounded-lg p-3 text-center" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
              <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{item.value}</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{item.label}</p>
            </div>
          ))}
        </div>

        <Field label="Razón del escalado" required>
          <select value={reason} onChange={e => setReason(e.target.value)} className={inputCls} style={inputStyle}>
            {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Abogado asignado" hint="Opcional">
            <input value={lawyerName} onChange={e => setLawyerName(e.target.value)} placeholder="Lic. García..." className={inputCls} style={inputStyle} />
          </Field>
          <Field label="Próxima acción">
            <input value={nextAction} onChange={e => setNextAction(e.target.value)} placeholder="Enviar carta notarial..." className={inputCls} style={inputStyle} />
          </Field>
          <Field label="Fecha próxima acción">
            <input type="date" value={nextDate} onChange={e => setNextDate(e.target.value)} className={inputCls} style={inputStyle} />
          </Field>
        </div>

        <Field label="Notas del caso">
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Antecedentes, intentos de comunicación, detalles relevantes..." className={inputCls + ' resize-none'} style={inputStyle} />
        </Field>

        {error && <p className="text-xs text-red-500">{error}</p>}
        <FormActions onCancel={onClose} loading={loading} submitLabel="Crear caso legal" />
      </form>
    </FormModal>
  )
}
