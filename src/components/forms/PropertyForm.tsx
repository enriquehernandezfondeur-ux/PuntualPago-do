'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { logAudit } from '@/lib/utils/audit'
import { FormModal, Field, FormActions, inputCls, inputStyle, Separator } from './FormModal'
import type { Property, Owner, Building } from '@/types/database'

interface Props {
  open: boolean; onClose: () => void
  owners: Pick<Owner, 'id' | 'full_name'>[]
  buildings: Pick<Building, 'id' | 'name'>[]
  defaultValues?: Partial<Property>; propertyId?: string
}

export function PropertyForm({ open, onClose, owners, buildings, defaultValues, propertyId }: Props) {
  const isEdit = !!propertyId
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const [form, setForm] = useState({
    name:             defaultValues?.name ?? '',
    code:             defaultValues?.code ?? '',
    type:             defaultValues?.type ?? 'apartamento',
    status:           defaultValues?.status ?? 'disponible',
    address:          defaultValues?.address ?? '',
    sector:           defaultValues?.sector ?? '',
    city:             defaultValues?.city ?? 'Santo Domingo',
    province:         defaultValues?.province ?? 'Distrito Nacional',
    rent_amount:      String(defaultValues?.rent_amount ?? ''),
    currency:         defaultValues?.currency ?? 'DOP',
    deposit_amount:   String(defaultValues?.deposit_amount ?? ''),
    payment_day:      String(defaultValues?.payment_day ?? '1'),
    has_guarantee:    defaultValues?.has_guarantee ? 'true' : 'false',
    owner_id:         defaultValues?.owner_id ?? '',
    building_id:      defaultValues?.building_id ?? '',
    maintenance_fee:  String(defaultValues?.maintenance_fee ?? '0'),
    description:      defaultValues?.description ?? '',
    notes:            defaultValues?.notes ?? '',
  })

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('El nombre es obligatorio'); return }
    if (!form.rent_amount || Number(form.rent_amount) <= 0) { setError('La renta es obligatoria'); return }
    setLoading(true); setError('')
    try {
      const payload = {
        ...form,
        rent_amount:    Number(form.rent_amount),
        deposit_amount: form.deposit_amount ? Number(form.deposit_amount) : null,
        payment_day:    Number(form.payment_day),
        maintenance_fee:Number(form.maintenance_fee),
        has_guarantee:  form.has_guarantee === 'true',
        maintenance_fee_override: false,
        owner_id:    form.owner_id || null,
        building_id: form.building_id || null,
        is_active:   true,
      }
      if (isEdit) {
        const { error: err } = await supabase.from('properties').update(payload).eq('id', propertyId!)
        if (err) throw err
        await logAudit({ action: 'property_updated', entityType: 'properties', entityId: propertyId!, newValues: payload })
      } else {
        const { data, error: err } = await supabase.from('properties').insert(payload).select('id').single()
        if (err) throw err
        await logAudit({ action: 'property_created', entityType: 'properties', entityId: data.id, newValues: payload })
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
    <FormModal open={open} onClose={onClose} title={isEdit ? 'Editar propiedad' : 'Nueva propiedad'} subtitle="Datos de la unidad" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <Field label="Nombre / Código interno" required className="col-span-2">{inp('name', 'text', 'Ej. Apto 3B Torre Piantini')}</Field>
          <Field label="Código">{inp('code', 'text', 'A-301')}</Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tipo">
            {sel('type', [
              { value: 'apartamento', label: 'Apartamento' }, { value: 'casa', label: 'Casa' },
              { value: 'local_comercial', label: 'Local comercial' }, { value: 'oficina', label: 'Oficina' },
              { value: 'villa', label: 'Villa' }, { value: 'penthouse', label: 'Penthouse' },
              { value: 'estudio', label: 'Estudio' }, { value: 'otro', label: 'Otro' },
            ])}
          </Field>
          <Field label="Estado">
            {sel('status', [
              { value: 'disponible', label: 'Disponible' }, { value: 'ocupada', label: 'Ocupada' },
              { value: 'en_mantenimiento', label: 'En mantenimiento' }, { value: 'inactiva', label: 'Inactiva' },
            ])}
          </Field>
        </div>
        <Separator />
        <div className="grid grid-cols-3 gap-4">
          <Field label="Dirección" className="col-span-2">{inp('address', 'text', 'Calle, No., Torre...')}</Field>
          <Field label="Sector">{inp('sector', 'text', 'Piantini, Naco...')}</Field>
          <Field label="Ciudad">{inp('city', 'text', 'Santo Domingo')}</Field>
          <Field label="Provincia" className="col-span-2">{inp('province', 'text', 'Distrito Nacional')}</Field>
        </div>
        <Separator />
        <div className="grid grid-cols-3 gap-4">
          <Field label="Renta mensual" required>{inp('rent_amount', 'number', '0')}</Field>
          <Field label="Moneda">{sel('currency', [{ value: 'DOP', label: 'DOP' }, { value: 'USD', label: 'USD' }])}</Field>
          <Field label="Día de pago">{inp('payment_day', 'number', '1')}</Field>
          <Field label="Depósito">{inp('deposit_amount', 'number', '0')}</Field>
          <Field label="Cuota mantenimiento">{inp('maintenance_fee', 'number', '0')}</Field>
          <Field label="Garantía PP">{sel('has_guarantee', [{ value: 'true', label: 'Sí' }, { value: 'false', label: 'No' }])}</Field>
        </div>
        <Separator />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Propietario">
            <select value={form.owner_id} onChange={e => set('owner_id', e.target.value)} className={inputCls} style={inputStyle}>
              <option value="">Sin propietario</option>
              {owners.map(o => <option key={o.id} value={o.id}>{o.full_name}</option>)}
            </select>
          </Field>
          <Field label="Edificio">
            <select value={form.building_id} onChange={e => set('building_id', e.target.value)} className={inputCls} style={inputStyle}>
              <option value="">Sin edificio</option>
              {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Notas">
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className={inputCls + ' resize-none'} style={inputStyle} />
        </Field>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <FormActions onCancel={onClose} loading={loading} submitLabel={isEdit ? 'Actualizar' : 'Crear propiedad'} />
      </form>
    </FormModal>
  )
}
