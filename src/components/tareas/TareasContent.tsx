'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { formatDate, initials } from '@/lib/utils/format'
import { EmptyState } from '@/components/shared/EmptyState'
import { TaskForm } from './TaskForm'
import type { Task, TaskStatus, TaskPriority, User } from '@/types/database'
import { CheckSquare, Clock, AlertTriangle, CheckCircle2, Calendar, Pencil, X, Plus, MessageSquare, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { logAudit } from '@/lib/utils/audit'
import { useRouter } from 'next/navigation'

const PRIORITY: Record<TaskPriority, { dot: string; bg: string; text: string }> = {
  urgente: { dot: '#F04438', bg: '#FEF3F2', text: '#B42318' },
  alta:    { dot: '#EF6820', bg: '#FFF6ED', text: '#B93815' },
  media:   { dot: '#F79009', bg: '#FFFAEB', text: '#B54708' },
  baja:    { dot: '#98A2B3', bg: '#F9FAFB', text: '#344054' },
}

interface Props { tasks: Task[]; teamUsers: User[]; currentUserId: string }

export function TareasContent({ tasks, teamUsers, currentUserId }: Props) {
  const [tab, setTab]             = useState<'todas' | 'mis_tareas' | 'hoy' | 'vencidas'>('todas')
  const [statusFilter, setStatus] = useState<TaskStatus | 'todos'>('todos')
  const [formOpen, setFormOpen]   = useState(false)
  const [editTarget, setEditTarget] = useState<Task | null>(null)
  const [selected, setSelected]   = useState<Task | null>(null)
  const [comment, setComment]     = useState('')
  const [saving, setSaving]       = useState<string | null>(null)
  const router  = useRouter()
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  const filtered = tasks.filter(t => {
    if (tab === 'mis_tareas' && t.assigned_to !== currentUserId) return false
    if (tab === 'hoy' && t.due_date?.split('T')[0] !== today) return false
    if (tab === 'vencidas' && (!(t.due_date && t.due_date.split('T')[0] < today) || ['completada','cancelada'].includes(t.status))) return false
    if (statusFilter !== 'todos' && t.status !== statusFilter) return false
    return true
  })

  const overdue   = tasks.filter(t => t.due_date && t.due_date.split('T')[0] < today && !['completada','cancelada'].includes(t.status))
  const dueToday  = tasks.filter(t => t.due_date?.split('T')[0] === today && !['completada','cancelada'].includes(t.status))

  async function toggleComplete(task: Task) {
    const newStatus = task.status === 'completada' ? 'pendiente' : 'completada'
    setSaving(task.id)
    await supabase.from('tasks').update({ status: newStatus, completed_at: newStatus === 'completada' ? new Date().toISOString() : null }).eq('id', task.id)
    await logAudit({ action: 'task_status_changed', entityType: 'tasks', entityId: task.id, newValues: { status: newStatus } })
    setSaving(null)
    router.refresh()
  }

  async function deleteTask(id: string) {
    if (!confirm('¿Eliminar esta tarea?')) return
    await supabase.from('tasks').delete().eq('id', id)
    router.refresh()
  }

  async function addComment() {
    if (!comment.trim() || !selected) return
    await supabase.from('communications').insert({
      channel: 'nota_interna', direction: 'outbound',
      subject: `Comentario en tarea: ${selected.title}`,
      content: comment, sent_at: new Date().toISOString(), delivered: true,
      entity_type: 'task', entity_id: selected.id,
    })
    setComment('')
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden" style={{ background: 'var(--bg)' }}>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Alerts */}
        {(overdue.length > 0 || dueToday.length > 0) && (
          <div className="px-6 py-3 flex gap-3 shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
            {overdue.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#FEF3F2', border: '1px solid #FECDCA' }}>
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color: '#F04438' }} />
                <p className="text-xs font-semibold" style={{ color: '#B42318' }}>{overdue.length} vencida{overdue.length !== 1 ? 's' : ''}</p>
                <button onClick={() => setTab('vencidas')} className="text-xs underline" style={{ color: '#B42318' }}>Ver</button>
              </div>
            )}
            {dueToday.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#FFFAEB', border: '1px solid #FEF0C7' }}>
                <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: '#F79009' }} />
                <p className="text-xs font-semibold" style={{ color: '#B54708' }}>{dueToday.length} para hoy</p>
                <button onClick={() => setTab('hoy')} className="text-xs underline" style={{ color: '#B54708' }}>Ver</button>
              </div>
            )}
          </div>
        )}

        {/* Toolbar */}
        <div className="px-6 py-3 flex items-center gap-3 flex-wrap shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
            {[{ k: 'todas', l: 'Todas' }, { k: 'mis_tareas', l: 'Mis tareas' }, { k: 'hoy', l: 'Hoy' }, { k: 'vencidas', l: 'Vencidas' }].map(t => (
              <button key={t.k} onClick={() => setTab(t.k as any)} className="px-3 py-1.5 rounded-md text-xs font-medium transition"
                style={tab === t.k ? { background: '#1570EF', color: '#fff' } : { color: 'var(--text-tertiary)' }}>
                {t.l}
              </button>
            ))}
          </div>
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
            {[{ k: 'todos', l: 'Todos' }, { k: 'pendiente', l: 'Pendiente' }, { k: 'en_proceso', l: 'En proceso' }, { k: 'completada', l: 'Completadas' }].map(s => (
              <button key={s.k} onClick={() => setStatus(s.k as any)} className="px-3 py-1.5 rounded-md text-xs font-medium transition"
                style={statusFilter === s.k ? { background: 'var(--surface)', color: 'var(--text)', boxShadow: '0 1px 2px rgba(16,24,40,0.08)' } : { color: 'var(--text-tertiary)' }}>
                {s.l}
              </button>
            ))}
          </div>
          <button onClick={() => setFormOpen(true)} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white" style={{ background: '#1570EF' }}>
            <Plus className="w-3.5 h-3.5" /> Nueva tarea
          </button>
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4 space-y-2">
          {filtered.length === 0 ? (
            <EmptyState icon={CheckSquare} title="Sin tareas" description="Crea la primera tarea del equipo." compact action={<button onClick={() => setFormOpen(true)} className="px-3 py-1.5 rounded-lg text-sm font-medium text-white" style={{ background: '#1570EF' }}>Nueva tarea</button>} />
          ) : filtered.map(task => {
            const assignee = (task as any).assignee
            const isOverdue = task.due_date && task.due_date.split('T')[0] < today && !['completada','cancelada'].includes(task.status)
            const p = PRIORITY[task.priority]
            const isSelected = selected?.id === task.id
            return (
              <div key={task.id}
                onClick={() => setSelected(isSelected ? null : task)}
                className="rounded-xl px-4 py-3.5 flex items-center gap-3 cursor-pointer transition-all"
                style={{
                  background: isSelected ? 'var(--blue-bg)' : isOverdue ? '#FFF9F9' : 'var(--surface)',
                  border: `1px solid ${isSelected ? 'var(--blue)' : isOverdue ? '#FECDCA' : 'var(--border)'}`,
                  opacity: task.status === 'completada' ? 0.55 : 1,
                }}
              >
                {/* Complete toggle */}
                <button onClick={e => { e.stopPropagation(); toggleComplete(task) }}
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition"
                  style={{ borderColor: task.status === 'completada' ? '#12B76A' : 'var(--border)', background: task.status === 'completada' ? '#12B76A' : 'transparent' }}>
                  {saving === task.id ? <Loader2 className="w-3 h-3 animate-spin" style={{ color: '#12B76A' }} />
                    : task.status === 'completada' ? <CheckCircle2 className="w-3 h-3 text-white" /> : null}
                </button>

                {/* Priority dot */}
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: p.dot }} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text)', textDecoration: task.status === 'completada' ? 'line-through' : 'none' }}>{task.title}</p>
                  {task.description && <p className="text-xs truncate mt-px" style={{ color: 'var(--text-tertiary)' }}>{task.description}</p>}
                </div>

                {/* Meta */}
                <div className="flex items-center gap-3 shrink-0" onClick={e => e.stopPropagation()}>
                  {task.due_date && (
                    <span className="text-xs flex items-center gap-1" style={{ color: isOverdue ? '#B42318' : 'var(--text-tertiary)' }}>
                      <Calendar className="w-3 h-3" /> {formatDate(task.due_date.split('T')[0])}
                    </span>
                  )}
                  {assignee && (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#EFF8FF', color: '#175CD3' }}>
                      {initials(assignee.full_name)}
                    </div>
                  )}
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: p.bg, color: p.text }}>{task.priority}</span>
                  <button onClick={() => { setEditTarget(task); setFormOpen(false) }} className="p-1 rounded transition" style={{ color: 'var(--text-tertiary)' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-subtle)')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button onClick={() => deleteTask(task.id)} className="p-1 rounded transition" style={{ color: 'var(--text-tertiary)' }} onMouseEnter={e => (e.currentTarget.style.color = '#F04438')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-72 border-l overflow-y-auto scrollbar-thin shrink-0 animate-slide-in" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Detalle</p>
            <button onClick={() => setSelected(null)}><X className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} /></button>
          </div>
          <div className="px-4 py-4 space-y-3">
            <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{selected.title}</p>
            {selected.description && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{selected.description}</p>}
            <div className="space-y-1.5">
              {[
                { l: 'Prioridad', v: selected.priority },
                { l: 'Estado',   v: selected.status.replace('_', ' ') },
                { l: 'Vence',    v: selected.due_date ? formatDate(selected.due_date.split('T')[0]) : '—' },
                { l: 'Asignado', v: (selected as any).assignee?.full_name ?? 'Sin asignar' },
              ].map(r => (
                <div key={r.l} className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{r.l}</span>
                  <span className="text-xs font-medium capitalize" style={{ color: 'var(--text)' }}>{r.v}</span>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>COMENTARIO</p>
              <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} placeholder="Añadir nota sobre esta tarea..." className="w-full px-3 py-2 rounded-lg text-xs resize-none border" style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }} />
              <button onClick={addComment} disabled={!comment.trim()} className="mt-2 w-full py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50" style={{ background: '#1570EF' }}>
                Guardar comentario
              </button>
            </div>
            <button onClick={() => setEditTarget(selected)} className="w-full py-1.5 rounded-lg text-xs font-medium border transition" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
              <Pencil className="w-3 h-3 inline mr-1" /> Editar tarea
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {formOpen && <TaskForm open onClose={() => setFormOpen(false)} teamUsers={teamUsers} />}
      {editTarget && <TaskForm open onClose={() => setEditTarget(null)} teamUsers={teamUsers} defaultValues={editTarget} taskId={editTarget.id} />}
    </div>
  )
}
