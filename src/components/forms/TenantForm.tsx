'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { logAudit } from '@/lib/utils/audit'
import { FormModal, Field, FormActions, inputCls, inputStyle, Separator } from './FormModal'
import type { Tenant } from '@/types/database'

interface Props {
  open: boolean
  onClose: () => void
  defaultValues?: Partial<Tenant>
  tenantId?: string
}

export function TenantForm({ open, onClose, defaultValues, tenantId }: Props) {
  const isEdit = !!tenantId
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const [form, setForm] = useState({
    full_name:        defaultValues?.full_name ?? '',
    id_type:          defaultValues?.id_type ?? 'cedula',
    id_number:        defaultValues?.id_number ?? '',
    nationality:      defaultValues?.nationality ?? 'Dominicana',
    phone:            defaultValues?.phone ?? '',
    phone_alt:        defaultValues?.phone_alt ?? '',
    whatsapp:         defaultValues?.whatsapp ?? '',
    email:            defaultValues?.email ?? '',
    occupation:       defaultValues?.occupation ?? '',
    employer:         defaultValues?.employer ?? '',
    estimated_income: String(defaultValues?.estimated_income ?? ''),
    income_currency:  defaultValues?.income_currency ?? 'DOP',
    risk_level:       defaultValues?.risk_level ?? 'bajo',
    reference_1_name: defaultValues?.reference_1_name ?? '',
    reference_1_phone:defaultValues?.reference_1_phone ?? '',
    reference_2_name: defaultValues?.reference_2_name ?? '',
    reference_2_phone:defaultValues?.reference_2_phone ?? '',
    notes:            defaultValues?.notes ?? '',
  })

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim()) { setError('El nombre es obligatorio'); return }
    setLoading(true); setError('')
    try {
      const payload = {
        ...form,
        estimated_income: form.estimated_income ? Number(form.estimated_income) : null,
        status: isEdit ? defaultValues?.status : 'activo',
        pending_balance: isEdit ? defaultValues?.pending_balance : 0,
        is_active: true,
      }
      if (isEdit) {
        const { error: err } = await supabase.from('tenants').update(payload).eq('id', tenantId!)
        if (err) throw err
        await logAudit({ action: 'tenant_updated', entityType: 'tenants', entityId: tenantId!, newValues: payload })
      } else {
        const { data, error: err } = await supabase.from('tenants').insert(payload).select('id').single()
        if (err) throw err
        await logAudit({ action: 'tenant_created', entityType: 'tenants', entityId: data.id, newValues: payload })
      }
      router.refresh()
      onClose()
    } catch (err: any) {
      setError(err.message ?? 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  const inp = (k: string, type = 'text', placeholder = '') => (
    <input
      type={type}
      value={(form as any)[k]}
      onChange={e => set(k, e.target.value)}
      placeholder={placeholder}
      className={inputCls}
      style={inputStyle}
    />
  )

  const sel = (k: string, options: { value: string; label: string }[]) => (
    <select value={(form as any)[k]} onChange={e => set(k, e.target.value)} className={inputCls} style={inputStyle}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar inquilino' : 'Nuevo inquilino'}
      subtitle="Información personal y de contacto"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Identidad */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nombre completo" required>
            {inp('full_name', 'text', 'Ej. María García Reyes')}
          </Field>
          <Field label="Nacionalidad">
            {inp('nationality', 'text', 'Dominicana')}
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Tipo de ID">
            {sel('id_type', [
              { value: 'cedula', label: 'Cédula' },
              { value: 'pasaporte', label: 'Pasaporte' },
              { value: 'otro', label: 'Otro' },
            ])}
          </Field>
          <Field label="Número de ID" className="col-span-2">
            {inp('id_number', 'text', '001-0000000-0')}
          </Field>
        </div>

        <Separator />

        {/* Contacto */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Teléfono principal">{inp('phone', 'tel', '809-000-0000')}</Field>
          <Field label="WhatsApp">{inp('whatsapp', 'tel', '809-000-0000')}</Field>
          <Field label="Teléfono alternativo">{inp('phone_alt', 'tel', '')}</Field>
          <Field label="Correo electrónico">{inp('email', 'email', 'correo@ejemplo.com')}</Field>
        </div>

        <Separator />

        {/* Económico */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Ocupación">{inp('occupation', 'text', 'Ej. Médico, Empresario')}</Field>
          <Field label="Empleador / Empresa">{inp('employer', 'text', '')}</Field>
          <Field label="Ingreso estimado">
            {inp('estimated_income', 'number', '0')}
          </Field>
          <Field label="Moneda">
            {sel('income_currency', [{ value: 'DOP', label: 'DOP' }, { value: 'USD', label: 'USD' }])}
          </Field>
        </div>

        <Separator />

        {/* Referencias */}
        <p className="text-xs font-medium" style={{ color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Referencias personales</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Referencia 1 — Nombre">{inp('reference_1_name')}</Field>
          <Field label="Referencia 1 — Teléfono">{inp('reference_1_phone', 'tel')}</Field>
          <Field label="Referencia 2 — Nombre">{inp('reference_2_name')}</Field>
          <Field label="Referencia 2 — Teléfono">{inp('reference_2_phone', 'tel')}</Field>
        </div>

        <Field label="Notas internas">
          <textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            rows={2}
            placeholder="Información relevante sobre el inquilino..."
            className={inputCls + ' resize-none'}
            style={inputStyle}
          />
        </Field>

        {error && <p className="text-xs text-red-500">{error}</p>}
        <FormActions onCancel={onClose} loading={loading} submitLabel={isEdit ? 'Actualizar' : 'Crear inquilino'} />
      </form>
    </FormModal>
  )
}
