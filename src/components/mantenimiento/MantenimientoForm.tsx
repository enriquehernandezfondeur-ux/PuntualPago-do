'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { logAudit } from '@/lib/utils/audit'
import { FormModal, Field, FormActions, inputCls, inputStyle, Separator } from '@/components/forms/FormModal'
import type { MaintenanceRequest } from '@/types/database'

interface Props {
  open: boolean; onClose: () => void
  properties: { id: string; name: string }[]
  tenants?: { id: string; full_name: string }[]
  defaultValues?: Partial<MaintenanceRequest>; requestId?: string
}

export function MantenimientoForm({ open, onClose, properties, tenants, defaultValues, requestId }: Props) {
  const isEdit = !!requestId
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    property_id:     defaultValues?.property_id ?? '',
    tenant_id:       defaultValues?.tenant_id ?? '',
    title:           defaultValues?.title ?? '',
    description:     defaultValues?.description ?? '',
    priority:        defaultValues?.priority ?? 'media',
    status:          defaultValues?.status ?? 'pendiente',
    estimated_cost:  String(defaultValues?.estimated_cost ?? ''),
    actual_cost:     String(defaultValues?.actual_cost ?? ''),
    currency:        defaultValues?.currency ?? 'DOP',
    paid_by:         defaultValues?.paid_by ?? 'propietario',
    provider_name:   defaultValues?.provider_name ?? '',
    provider_phone:  defaultValues?.provider_phone ?? '',
    assigned_to:     defaultValues?.assigned_to ?? '',
    reported_date:   defaultValues?.reported_date ?? new Date().toISOString().split('T')[0],
    scheduled_date:  defaultValues?.scheduled_date ?? '',
    notes:           defaultValues?.notes ?? '',
  })

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.property_id || !form.title.trim()) { setError('Propiedad y título son obligatorios'); return }
    setLoading(true); setError('')
    try {
      const payload = {
        ...form,
        tenant_id:      form.tenant_id || null,
        estimated_cost: form.estimated_cost ? Number(form.estimated_cost) : null,
        actual_cost:    form.actual_cost ? Number(form.actual_cost) : null,
        scheduled_date: form.scheduled_date || null,
        assigned_to:    form.assigned_to || null,
      }
      if (isEdit) {
        const { error: err } = await supabase.from('maintenance_requests').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', requestId!)
        if (err) throw err
        await logAudit({ action: 'maintenance_updated', entityType: 'maintenance_requests', entityId: requestId!, newValues: payload })
      } else {
        const { data, error: err } = await supabase.from('maintenance_requests').insert(payload).select('id').single()
        if (err) throw err
        await logAudit({ action: 'maintenance_created', entityType: 'maintenance_requests', entityId: data.id, newValues: payload })
      }
      router.refresh(); onClose()
    } catch (err: any) { setError(err.message ?? 'Error al guardar') }
    finally { setLoading(false) }
  }

  const inp = (k: string, type = 'text', ph = '') => (
    <input type={type} value={(form as any)[k]} onChange={e => set(k, e.target.value)} placeholder={ph} className={inputCls} style={inputStyle} />
  )
  const sel = (k: string, opts: { v: string; l: string }[]) => (
    <select value={(form as any)[k]} onChange={e => set(k, e.target.value)} className={inputCls} style={inputStyle}>
      {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  )

  return (
    <FormModal open={open} onClose={onClose} title={isEdit ? 'Editar ticket' : 'Nuevo ticket de mantenimiento'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Propiedad" required className="col-span-2">
            <select value={form.property_id} onChange={e => set('property_id', e.target.value)} className={inputCls} style={inputStyle}>
              <option value="">Seleccionar propiedad...</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Título / Problema" required className="col-span-2">{inp('title', 'text', 'Ej. Fuga en el baño, AC no enfría...')}</Field>
          <Field label="Prioridad">{sel('priority', [{ v: 'baja', l: 'Baja' }, { v: 'media', l: 'Media' }, { v: 'alta', l: 'Alta' }, { v: 'urgente', l: 'Urgente' }])}</Field>
          <Field label="Estado">
            {sel('status', [
              { v: 'pendiente', l: 'Pendiente' }, { v: 'revisando', l: 'Revisando' },
              { v: 'cotizado', l: 'Cotizado' }, { v: 'aprobado', l: 'Aprobado' },
              { v: 'en_proceso', l: 'En proceso' }, { v: 'completado', l: 'Completado' },
              { v: 'rechazado', l: 'Rechazado' },
            ])}
          </Field>
          <Field label="Fecha reportado">{inp('reported_date', 'date')}</Field>
          <Field label="Fecha programada">{inp('scheduled_date', 'date')}</Field>
        </div>
        <Field label="Descripción detallada">
          <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} className={inputCls + ' resize-none'} style={inputStyle} placeholder="Detalles del problema..." />
        </Field>
        <Separator />
        <div className="grid grid-cols-3 gap-4">
          <Field label="Costo estimado">{inp('estimated_cost', 'number', '0')}</Field>
          <Field label="Costo real">{inp('actual_cost', 'number', '0')}</Field>
          <Field label="Moneda">{sel('currency', [{ v: 'DOP', l: 'DOP' }, { v: 'USD', l: 'USD' }])}</Field>
          <Field label="Pagado por">{sel('paid_by', [{ v: 'propietario', l: 'Propietario' }, { v: 'inquilino', l: 'Inquilino' }, { v: 'puntualpago', l: 'PuntualPago' }])}</Field>
          <Field label="Proveedor / Técnico">{inp('provider_name', 'text', 'Nombre del técnico...')}</Field>
          <Field label="Teléfono proveedor">{inp('provider_phone', 'tel')}</Field>
        </div>
        <Field label="Notas internas">
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className={inputCls + ' resize-none'} style={inputStyle} />
        </Field>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <FormActions onCancel={onClose} loading={loading} submitLabel={isEdit ? 'Actualizar' : 'Crear ticket'} />
      </form>
    </FormModal>
  )
}
