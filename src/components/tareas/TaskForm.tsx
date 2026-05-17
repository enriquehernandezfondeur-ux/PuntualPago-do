'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { logAudit } from '@/lib/utils/audit'
import { FormModal, Field, FormActions, inputCls, inputStyle } from '@/components/forms/FormModal'
import type { Task, User } from '@/types/database'

interface Props {
  open: boolean; onClose: () => void
  teamUsers: User[]
  defaultValues?: Partial<Task>; taskId?: string
}

export function TaskForm({ open, onClose, teamUsers, defaultValues, taskId }: Props) {
  const isEdit = !!taskId
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const [form, setForm] = useState({
    title:       defaultValues?.title ?? '',
    description: defaultValues?.description ?? '',
    assigned_to: defaultValues?.assigned_to ?? '',
    priority:    defaultValues?.priority ?? 'media',
    due_date:    defaultValues?.due_date?.split('T')[0] ?? '',
    entity_type: defaultValues?.entity_type ?? '',
    entity_id:   defaultValues?.entity_id ?? '',
  })

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { setError('El título es obligatorio'); return }
    setLoading(true); setError('')
    try {
      const payload = {
        ...form,
        assigned_to: form.assigned_to || null,
        due_date:    form.due_date || null,
        entity_type: form.entity_type || null,
        entity_id:   form.entity_id || null,
      }
      if (isEdit) {
        const { error: err } = await supabase.from('tasks').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', taskId!)
        if (err) throw err
        await logAudit({ action: 'task_updated', entityType: 'tasks', entityId: taskId!, newValues: payload })
      } else {
        const { data, error: err } = await supabase.from('tasks').insert({ ...payload, status: 'pendiente' }).select('id').single()
        if (err) throw err
        await logAudit({ action: 'task_created', entityType: 'tasks', entityId: data.id, newValues: payload })
      }
      router.refresh(); onClose()
    } catch (err: any) { setError(err.message ?? 'Error al guardar') }
    finally { setLoading(false) }
  }

  return (
    <FormModal open={open} onClose={onClose} title={isEdit ? 'Editar tarea' : 'Nueva tarea'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Título" required>
          <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ej. Llamar a cliente para confirmar pago..." className={inputCls} style={inputStyle} />
        </Field>
        <Field label="Descripción">
          <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Detalles adicionales..." className={inputCls + ' resize-none'} style={inputStyle} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Asignado a">
            <select value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)} className={inputCls} style={inputStyle}>
              <option value="">Sin asignar</option>
              {teamUsers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
          </Field>
          <Field label="Prioridad">
            <select value={form.priority} onChange={e => set('priority', e.target.value)} className={inputCls} style={inputStyle}>
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
          </Field>
          <Field label="Fecha límite">
            <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} className={inputCls} style={inputStyle} />
          </Field>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <FormActions onCancel={onClose} loading={loading} submitLabel={isEdit ? 'Actualizar' : 'Crear tarea'} />
      </form>
    </FormModal>
  )
}
