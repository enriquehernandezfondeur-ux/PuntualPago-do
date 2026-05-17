'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { logAudit } from '@/lib/utils/audit'
import { formatCurrency } from '@/lib/utils/format'
import { FormModal, FormActions, Field, inputCls, inputStyle, Separator } from '@/components/forms/FormModal'
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import type { Tenant, Lease } from '@/types/database'

interface Props {
  tenant: Tenant
  activeLease: (Lease & { property?: any }) | null
  onClose: () => void
}

export function SalidaInquilinoModal({ tenant, activeLease, onClose }: Props) {
  const router   = useRouter()
  const supabase = createClient()
  const [step, setStep]   = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [done, setDone]       = useState(false)

  const depositAmount = activeLease?.deposit_amount ?? 0

  const [form, setForm] = useState({
    exitDate:            new Date().toISOString().split('T')[0],
    depositReturn:       'full',           // full | partial | none
    depositDeduction:    '',
    deductionReason:     '',
    propertyCondition:   'buena',          // buena | regular | danos
    inventoryNotes:      '',
    keepHistory:         'true',
    sendPortalNotice:    'true',
    notes:               '',
  })

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  const returnAmount = form.depositReturn === 'full'    ? depositAmount
    : form.depositReturn === 'partial' ? depositAmount - (Number(form.depositDeduction) || 0)
    : 0

  async function handleConfirm() {
    setLoading(true); setError('')
    try {
      // 1. Terminate lease
      if (activeLease) {
        await supabase.from('leases').update({
          status: 'terminado',
          notes: `Salida ${form.exitDate}. Depósito: ${form.depositReturn}. ${form.notes}`,
        }).eq('id', activeLease.id)
      }

      // 2. Update property to disponible
      if (activeLease?.property_id) {
        await supabase.from('properties').update({ status: 'disponible' }).eq('id', activeLease.property_id)
      }

      // 3. Archive tenant
      await supabase.from('tenants').update({
        status: 'historico',
        pending_balance: 0,
        notes: `${tenant.notes ? tenant.notes + '\n\n' : ''}[Salida ${form.exitDate}] ${form.notes}`,
      }).eq('id', tenant.id)

      // 4. Log communication with exit details
      await supabase.from('communications').insert({
        channel: 'nota_interna',
        direction: 'outbound',
        subject: `Salida del inquilino — ${tenant.full_name}`,
        content: [
          `Fecha de salida: ${form.exitDate}`,
          `Propiedad: ${activeLease?.property?.name ?? '—'}`,
          `Estado propiedad: ${form.propertyCondition}`,
          `Depósito: ${form.depositReturn} ${form.depositReturn === 'partial' ? `— Devolución: ${formatCurrency(returnAmount)} (Deducción: ${form.deductionReason})` : ''}`,
          form.inventoryNotes ? `Inventario: ${form.inventoryNotes}` : '',
          form.notes ? `Notas: ${form.notes}` : '',
        ].filter(Boolean).join('\n'),
        tenant_id: tenant.id,
        property_id: activeLease?.property_id ?? null,
        sent_at: new Date().toISOString(),
        delivered: true,
      })

      await logAudit({ action: 'tenant_exit', entityType: 'tenants', entityId: tenant.id, newValues: { exit_date: form.exitDate, deposit_return: form.depositReturn } })

      // 5. Notify admins
      fetch('/api/notifications/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roles: ['admin', 'super_admin', 'gerente_operativo'],
          title: `Inquilino salió — ${tenant.full_name}`,
          message: `${activeLease?.property?.name ?? ''} queda disponible desde ${form.exitDate}`,
          entityType: 'tenants', entityId: tenant.id, type: 'lease',
        }),
      }).catch(() => {})

      setDone(true)
      setTimeout(() => { router.refresh(); onClose() }, 2000)
    } catch (err: any) {
      setError(err.message ?? 'Error al procesar la salida')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <FormModal open onClose={onClose} title="Salida procesada" size="sm">
        <div className="py-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto" style={{ background: '#ECFDF3' }}>
            <CheckCircle2 className="w-6 h-6" style={{ color: '#12B76A' }} />
          </div>
          <p className="font-semibold" style={{ color: 'var(--text)' }}>Salida procesada</p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Contrato terminado · Propiedad disponible · Inquilino archivado</p>
        </div>
      </FormModal>
    )
  }

  return (
    <FormModal open onClose={onClose} title="Proceso de salida" subtitle={`${tenant.full_name} — ${activeLease?.property?.name ?? '—'}`} size="md">
      {/* Warning */}
      <div className="flex items-start gap-3 p-3.5 rounded-xl mb-4" style={{ background: '#FFF6ED', border: '1px solid #FDDCAB' }}>
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#EF6820' }} />
        <div className="text-xs space-y-0.5" style={{ color: '#B93815' }}>
          <p className="font-semibold">Esta acción archiva al inquilino. Se actualizará:</p>
          <p>• Contrato → Terminado · Propiedad → Disponible · Inquilino → Histórico</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Fecha de salida" required>
            <input type="date" value={form.exitDate} onChange={e => set('exitDate', e.target.value)} className={inputCls} style={inputStyle} />
          </Field>
          <Field label="Estado de la propiedad">
            <select value={form.propertyCondition} onChange={e => set('propertyCondition', e.target.value)} className={inputCls} style={inputStyle}>
              <option value="buena">Buena — sin daños</option>
              <option value="regular">Regular — desgaste normal</option>
              <option value="danos">Con daños — requiere reparación</option>
            </select>
          </Field>
        </div>

        <Separator />

        {/* Deposit */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
            Depósito — {formatCurrency(depositAmount)}
          </p>
          <div className="space-y-2">
            {[
              { v: 'full',    l: `Devolver completo — ${formatCurrency(depositAmount)}` },
              { v: 'partial', l: 'Devolver parcial — con deducciones' },
              { v: 'none',    l: 'No devolver — aplicar a deuda/daños' },
            ].map(opt => (
              <label key={opt.v} className="flex items-center gap-2.5 p-3 rounded-lg cursor-pointer transition" style={{ background: form.depositReturn === opt.v ? '#EFF8FF' : 'var(--surface-subtle)', border: `1px solid ${form.depositReturn === opt.v ? '#B2DDFF' : 'var(--border)'}` }}>
                <input type="radio" checked={form.depositReturn === opt.v} onChange={() => set('depositReturn', opt.v)} className="accent-blue-600" />
                <span className="text-sm" style={{ color: 'var(--text)' }}>{opt.l}</span>
              </label>
            ))}
          </div>

          {form.depositReturn === 'partial' && (
            <div className="grid grid-cols-2 gap-4 mt-3">
              <Field label="Monto de deducción">
                <input type="number" value={form.depositDeduction} onChange={e => set('depositDeduction', e.target.value)} placeholder="0" className={inputCls} style={inputStyle} />
              </Field>
              <Field label="Razón de deducción">
                <input value={form.deductionReason} onChange={e => set('deductionReason', e.target.value)} placeholder="Daños, limpieza..." className={inputCls} style={inputStyle} />
              </Field>
              {returnAmount > 0 && (
                <div className="col-span-2 rounded-lg px-3 py-2 text-xs" style={{ background: '#ECFDF3', color: '#027A48' }}>
                  Devolver: <strong>{formatCurrency(returnAmount)}</strong> al inquilino
                </div>
              )}
            </div>
          )}
        </div>

        <Field label="Notas del inventario">
          <textarea value={form.inventoryNotes} onChange={e => set('inventoryNotes', e.target.value)} rows={2} placeholder="Estado de muebles, electrodomésticos, observaciones..." className={inputCls + ' resize-none'} style={inputStyle} />
        </Field>

        <Field label="Notas generales">
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Comentarios adicionales sobre la salida..." className={inputCls + ' resize-none'} style={inputStyle} />
        </Field>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium border transition" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
            Cancelar
          </button>
          <button onClick={handleConfirm} disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition disabled:opacity-60"
            style={{ background: '#EF6820' }}>
            {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Procesando...</> : 'Confirmar salida'}
          </button>
        </div>
      </div>
    </FormModal>
  )
}
