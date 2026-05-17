'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { logAudit } from '@/lib/utils/audit'
import { cn } from '@/lib/utils/cn'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { FormModal, FormActions, Field, inputCls, inputStyle } from '@/components/forms/FormModal'
import { Plus, Trash2 } from 'lucide-react'

interface Installment { date: string; amount: string; paid: boolean; note: string }

interface Props {
  open: boolean
  onClose: () => void
  tenantId: string
  tenantName: string
  totalDebt: number
  currency: string
}

export function PaymentPlanModal({ open, onClose, tenantId, tenantName, totalDebt, currency }: Props) {
  const router   = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [notes, setNotes]     = useState('')
  const [installments, setInstallments] = useState<Installment[]>([
    { date: '', amount: String(Math.round(totalDebt / 2)), paid: false, note: '' },
    { date: '', amount: String(Math.round(totalDebt / 2)), paid: false, note: '' },
  ])

  function addInstallment() {
    setInstallments(p => [...p, { date: '', amount: '', paid: false, note: '' }])
  }
  function removeInstallment(i: number) {
    setInstallments(p => p.filter((_, idx) => idx !== i))
  }
  function updateInstallment(i: number, k: keyof Installment, v: string | boolean) {
    setInstallments(p => p.map((inst, idx) => idx === i ? { ...inst, [k]: v } : inst))
  }

  const totalPlan = installments.reduce((s, i) => s + (Number(i.amount) || 0), 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (installments.some(i => !i.date || !i.amount)) { setError('Completa todas las cuotas'); return }
    setLoading(true); setError('')
    try {
      const planContent = `ACUERDO DE PAGO\n\nInquilino: ${tenantName}\nDeuda total: ${formatCurrency(totalDebt, currency as any)}\nTotal acordado: ${formatCurrency(totalPlan, currency as any)}\n\nCuotas:\n${installments.map((i, n) => `${n + 1}. ${formatDate(i.date)} — ${formatCurrency(Number(i.amount), currency as any)}${i.note ? ` (${i.note})` : ''}`).join('\n')}\n\n${notes ? `Notas: ${notes}` : ''}`

      await supabase.from('communications').insert({
        channel: 'nota_interna',
        direction: 'outbound',
        subject: `Acuerdo de pago — ${tenantName}`,
        content: planContent,
        template_used: 'acuerdo_pago',
        tenant_id: tenantId,
        sent_at: new Date().toISOString(),
        delivered: true,
      })

      // Update tenant notes with plan summary
      const { data: tenant } = await supabase.from('tenants').select('notes').eq('id', tenantId).single()
      const currentNotes = tenant?.notes ?? ''
      await supabase.from('tenants').update({
        notes: `${currentNotes ? currentNotes + '\n\n' : ''}[${new Date().toLocaleDateString('es-DO')}] ACUERDO DE PAGO: ${installments.length} cuotas por ${formatCurrency(totalPlan, currency as any)}`,
      }).eq('id', tenantId)

      await logAudit({ action: 'payment_plan_created', entityType: 'tenants', entityId: tenantId, newValues: { total: totalPlan, installments: installments.length } })

      router.refresh()
      onClose()
    } catch (err: any) {
      setError(err.message ?? 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <FormModal open={open} onClose={onClose} title="Acuerdo de pago" subtitle={`${tenantName} — Deuda: ${formatCurrency(totalDebt, currency as any)}`} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Summary */}
        <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: '#FEF3F2', border: '1px solid #FECDCA' }}>
          <span className="text-xs font-semibold" style={{ color: '#B42318' }}>Deuda total</span>
          <span className="font-bold text-sm" style={{ color: '#B42318' }}>{formatCurrency(totalDebt, currency as any)}</span>
        </div>

        {/* Installments */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Cuotas acordadas</p>
            <button type="button" onClick={addInstallment} className="flex items-center gap-1 text-xs font-medium" style={{ color: '#1570EF' }}>
              <Plus className="w-3 h-3" /> Añadir cuota
            </button>
          </div>

          {installments.map((inst, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-start">
              <div className="col-span-4">
                <input type="date" value={inst.date} onChange={e => updateInstallment(i, 'date', e.target.value)}
                  className={inputCls + ' text-xs'} style={inputStyle} />
              </div>
              <div className="col-span-3">
                <input type="number" value={inst.amount} onChange={e => updateInstallment(i, 'amount', e.target.value)}
                  placeholder="Monto" className={inputCls + ' text-xs'} style={inputStyle} />
              </div>
              <div className="col-span-4">
                <input type="text" value={inst.note} onChange={e => updateInstallment(i, 'note', e.target.value)}
                  placeholder="Nota..." className={inputCls + ' text-xs'} style={inputStyle} />
              </div>
              <div className="col-span-1 flex items-center justify-center pt-1">
                <button type="button" onClick={() => removeInstallment(i)}
                  className="p-1 rounded transition" style={{ color: 'var(--text-tertiary)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#F04438')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between pt-1" style={{ borderTop: '1px solid var(--border)' }}>
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Total del plan</span>
            <span className={cn('text-xs font-bold', totalPlan >= totalDebt ? 'text-emerald-600' : 'text-amber-600')}>
              {formatCurrency(totalPlan, currency as any)}
              {totalPlan < totalDebt && ` — faltan ${formatCurrency(totalDebt - totalPlan, currency as any)}`}
            </span>
          </div>
        </div>

        <Field label="Notas del acuerdo">
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            placeholder="Condiciones especiales, fecha límite, observaciones..."
            className={inputCls + ' resize-none text-xs'} style={inputStyle} />
        </Field>

        {error && <p className="text-xs text-red-500">{error}</p>}
        <FormActions onCancel={onClose} loading={loading} submitLabel="Guardar acuerdo" />
      </form>
    </FormModal>
  )
}
