'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { logAudit } from '@/lib/utils/audit'
import { FormModal, Field, FormActions, inputCls, inputStyle, Separator } from './FormModal'
import type { Owner } from '@/types/database'

interface Props {
  open: boolean; onClose: () => void
  defaultValues?: Partial<Owner>; ownerId?: string
}

export function OwnerForm({ open, onClose, defaultValues, ownerId }: Props) {
  const isEdit = !!ownerId
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const [form, setForm] = useState({
    full_name:         defaultValues?.full_name ?? '',
    legal_name:        defaultValues?.legal_name ?? '',
    is_company:        defaultValues?.is_company ? 'true' : 'false',
    cedula:            defaultValues?.cedula ?? '',
    rnc:               defaultValues?.rnc ?? '',
    email:             defaultValues?.email ?? '',
    phone:             defaultValues?.phone ?? '',
    phone_alt:         defaultValues?.phone_alt ?? '',
    whatsapp:          defaultValues?.whatsapp ?? '',
    address:           defaultValues?.address ?? '',
    sector:            defaultValues?.sector ?? '',
    city:              defaultValues?.city ?? 'Santo Domingo',
    bank_name:         defaultValues?.bank_name ?? '',
    bank_account:      defaultValues?.bank_account ?? '',
    bank_account_type: defaultValues?.bank_account_type ?? 'corriente',
    payment_preference:defaultValues?.payment_preference ?? 'transferencia',
    relationship_level:defaultValues?.relationship_level ?? 'estandar',
    sensitivity_notes: defaultValues?.sensitivity_notes ?? '',
    notes:             defaultValues?.notes ?? '',
  })

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim()) { setError('El nombre es obligatorio'); return }
    setLoading(true); setError('')
    try {
      const payload = { ...form, is_company: form.is_company === 'true', is_active: true }
      if (isEdit) {
        const { error: err } = await supabase.from('owners').update(payload).eq('id', ownerId!)
        if (err) throw err
        await logAudit({ action: 'owner_updated', entityType: 'owners', entityId: ownerId!, newValues: payload })
      } else {
        const { data, error: err } = await supabase.from('owners').insert(payload).select('id').single()
        if (err) throw err
        await logAudit({ action: 'owner_created', entityType: 'owners', entityId: data.id, newValues: payload })
      }
      router.refresh(); onClose()
    } catch (err: any) { setError(err.message ?? 'Error al guardar') }
    finally { setLoading(false) }
  }

  const inp = (k: string, type = 'text', placeholder = '') => (
    <input type={type} value={(form as any)[k]} onChange={e => set(k, e.target.value)} placeholder={placeholder} className={inputCls} style={inputStyle} />
  )
  const sel = (k: string, options: { value: string; label: string }[]) => (
    <select value={(form as any)[k]} onChange={e => set(k, e.target.value)} className={inputCls} style={inputStyle}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )

  return (
    <FormModal open={open} onClose={onClose} title={isEdit ? 'Editar propietario' : 'Nuevo propietario'} subtitle="Información personal y bancaria" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nombre / Razón social" required>{inp('full_name', 'text', 'Juan Pérez Familia')}</Field>
          <Field label="Tipo">
            {sel('is_company', [{ value: 'false', label: 'Persona física' }, { value: 'true', label: 'Empresa / RNC' }])}
          </Field>
          {form.is_company === 'true' && (
            <>
              <Field label="Nombre legal">{inp('legal_name')}</Field>
              <Field label="RNC">{inp('rnc', 'text', '1-00-00000-0')}</Field>
            </>
          )}
          {form.is_company === 'false' && (
            <Field label="Cédula">{inp('cedula', 'text', '001-0000000-0')}</Field>
          )}
        </div>
        <Separator />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Teléfono">{inp('phone', 'tel', '809-000-0000')}</Field>
          <Field label="WhatsApp">{inp('whatsapp', 'tel')}</Field>
          <Field label="Correo">{inp('email', 'email', 'correo@ejemplo.com')}</Field>
          <Field label="Teléfono alternativo">{inp('phone_alt', 'tel')}</Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Dirección" className="col-span-2">{inp('address')}</Field>
          <Field label="Ciudad">{inp('city', 'text', 'Santo Domingo')}</Field>
        </div>
        <Separator />
        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Información bancaria</p>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Banco">{inp('bank_name', 'text', 'BHD, Popular, BanReservas...')}</Field>
          <Field label="No. de cuenta">{inp('bank_account')}</Field>
          <Field label="Tipo de cuenta">
            {sel('bank_account_type', [
              { value: 'corriente', label: 'Corriente' }, { value: 'ahorro', label: 'Ahorro' },
              { value: 'nomina', label: 'Nómina' }, { value: 'otro', label: 'Otro' },
            ])}
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Preferencia de pago">
            {sel('payment_preference', [
              { value: 'transferencia', label: 'Transferencia bancaria' }, { value: 'cheque', label: 'Cheque' },
              { value: 'efectivo', label: 'Efectivo' }, { value: 'otro', label: 'Otro' },
            ])}
          </Field>
          <Field label="Nivel de relación">
            {sel('relationship_level', [
              { value: 'vip', label: 'VIP' }, { value: 'estandar', label: 'Estándar' }, { value: 'nuevo', label: 'Nuevo' },
            ])}
          </Field>
        </div>
        <Field label="Notas de sensibilidad" hint="Información que el equipo debe conocer sobre cómo tratar a este propietario">
          <textarea value={form.sensitivity_notes} onChange={e => set('sensitivity_notes', e.target.value)} rows={2} className={inputCls + ' resize-none'} style={inputStyle} placeholder="Ej. Prefiere comunicación formal, no llamar antes de las 9am..." />
        </Field>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <FormActions onCancel={onClose} loading={loading} submitLabel={isEdit ? 'Actualizar' : 'Crear propietario'} />
      </form>
    </FormModal>
  )
}
