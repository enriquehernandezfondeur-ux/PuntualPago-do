'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { logAudit } from '@/lib/utils/audit'
import { FormModal, Field, FormActions, inputCls, inputStyle, Separator } from './FormModal'
import type { Property, Owner, Tenant } from '@/types/database'

interface Props {
  open: boolean; onClose: () => void
  properties: Pick<Property, 'id' | 'name' | 'rent_amount' | 'currency' | 'payment_day'>[]
  owners: Pick<Owner, 'id' | 'full_name'>[]
  tenants: Pick<Tenant, 'id' | 'full_name'>[]
}

export function LeaseForm({ open, onClose, properties, owners, tenants }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const [form, setForm] = useState({
    property_id:          '',
    tenant_id:            '',
    owner_id:             '',
    start_date:           '',
    end_date:             '',
    rent_amount:          '',
    currency:             'DOP',
    deposit_amount:       '',
    payment_day:          '1',
    late_fee_percentage:  '5',
    late_fee_grace_days:  '5',
    has_guarantee:        'false',
    special_conditions:   '',
    inventory_included:   'false',
    notes:                '',
  })

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  // Auto-fill from selected property
  function onPropertyChange(propId: string) {
    const prop = properties.find(p => p.id === propId)
    if (prop) {
      setForm(f => ({
        ...f,
        property_id: propId,
        rent_amount: String(prop.rent_amount),
        currency:    prop.currency,
        payment_day: String(prop.payment_day),
      }))
    } else {
      set('property_id', propId)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.property_id || !form.tenant_id || !form.owner_id) { setError('Propiedad, inquilino y propietario son obligatorios'); return }
    if (!form.start_date || !form.end_date) { setError('Las fechas son obligatorias'); return }
    setLoading(true); setError('')
    try {
      // Verificar que la propiedad no tiene ya un contrato activo
      const { count: activeLeases } = await supabase
        .from('leases')
        .select('id', { count: 'exact', head: true })
        .eq('property_id', form.property_id)
        .in('status', ['activo', 'por_vencer'])

      if ((activeLeases ?? 0) > 0) {
        setError('Esta propiedad ya tiene un contrato activo. Termina el contrato anterior antes de crear uno nuevo.')
        setLoading(false)
        return
      }

      const hasGuarantee = form.has_guarantee === 'true'
      const rentAmount   = Number(form.rent_amount)

      const payload = {
        ...form,
        rent_amount:         rentAmount,
        deposit_amount:      form.deposit_amount ? Number(form.deposit_amount) : null,
        payment_day:         Number(form.payment_day),
        late_fee_percentage: Number(form.late_fee_percentage),
        late_fee_grace_days: Number(form.late_fee_grace_days),
        has_guarantee:       hasGuarantee,
        inventory_included:  form.inventory_included === 'true',
        status:              'activo',
        signing_status:      'pendiente',
      }
      const { data, error: err } = await supabase.from('leases').insert(payload).select('id').single()
      if (err) throw err

      // Si tiene garantía, crear automáticamente el registro en guarantees
      if (hasGuarantee) {
        const { data: guarantee } = await supabase
          .from('guarantees')
          .insert({
            lease_id:          data.id,
            property_id:       form.property_id,
            tenant_id:         form.tenant_id,
            owner_id:          form.owner_id,
            status:            'activa',
            start_date:        form.start_date,
            guaranteed_amount: rentAmount,
            currency:          form.currency,
          })
          .select('id')
          .single()

        // Vincular guarantee_id en el lease
        if (guarantee) {
          await supabase.from('leases').update({ guarantee_id: guarantee.id }).eq('id', data.id)
        }
      }

      // Update property status to ocupada
      await supabase.from('properties').update({ status: 'ocupada' }).eq('id', form.property_id)
      await logAudit({ action: 'lease_created', entityType: 'leases', entityId: data.id, newValues: payload })

      // Auto-generate payments
      await fetch('/api/leases/generate-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaseId: data.id }),
      }).catch(() => {})

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
    <FormModal open={open} onClose={onClose} title="Nuevo contrato" subtitle="Vincular propiedad, inquilino y propietario" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Partes */}
        <Field label="Propiedad" required>
          <select value={form.property_id} onChange={e => onPropertyChange(e.target.value)} className={inputCls} style={inputStyle}>
            <option value="">Seleccionar propiedad...</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Inquilino" required>
            <select value={form.tenant_id} onChange={e => set('tenant_id', e.target.value)} className={inputCls} style={inputStyle}>
              <option value="">Seleccionar inquilino...</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </Field>
          <Field label="Propietario" required>
            <select value={form.owner_id} onChange={e => set('owner_id', e.target.value)} className={inputCls} style={inputStyle}>
              <option value="">Seleccionar propietario...</option>
              {owners.map(o => <option key={o.id} value={o.id}>{o.full_name}</option>)}
            </select>
          </Field>
        </div>
        <Separator />
        {/* Fechas */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Fecha de inicio" required>{inp('start_date', 'date')}</Field>
          <Field label="Fecha de vencimiento" required>{inp('end_date', 'date')}</Field>
        </div>
        <Separator />
        {/* Económico */}
        <div className="grid grid-cols-3 gap-4">
          <Field label="Renta mensual" required>{inp('rent_amount', 'number')}</Field>
          <Field label="Moneda">{sel('currency', [{ value: 'DOP', label: 'DOP' }, { value: 'USD', label: 'USD' }])}</Field>
          <Field label="Día de pago">{inp('payment_day', 'number', '1')}</Field>
          <Field label="Depósito">{inp('deposit_amount', 'number', '0')}</Field>
          <Field label="% mora">{inp('late_fee_percentage', 'number', '5')}</Field>
          <Field label="Días de gracia">{inp('late_fee_grace_days', 'number', '5')}</Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Garantía PuntualPago">{sel('has_guarantee', [{ value: 'false', label: 'No' }, { value: 'true', label: 'Sí' }])}</Field>
          <Field label="Incluye inventario">{sel('inventory_included', [{ value: 'false', label: 'No' }, { value: 'true', label: 'Sí' }])}</Field>
        </div>
        <Field label="Condiciones especiales">
          <textarea value={form.special_conditions} onChange={e => set('special_conditions', e.target.value)} rows={2} className={inputCls + ' resize-none'} style={inputStyle} placeholder="Ej. Se permite una mascota, no se puede fumar..." />
        </Field>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <FormActions onCancel={onClose} loading={loading} submitLabel="Crear contrato" />
      </form>
    </FormModal>
  )
}
