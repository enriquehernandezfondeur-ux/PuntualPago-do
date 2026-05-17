'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { EmptyState } from '@/components/shared/EmptyState'
import { MantenimientoForm } from './MantenimientoForm'
import type { MaintenanceRequest, MaintenanceStatus, TaskPriority } from '@/types/database'
import { Wrench, Clock, CheckCircle2, AlertTriangle, DollarSign, Plus, Pencil, CheckCheck, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { logAudit } from '@/lib/utils/audit'
import { useRouter } from 'next/navigation'

const STATUS_CFG: Record<MaintenanceStatus, { label: string; bg: string; text: string }> = {
  pendiente:  { label: 'Pendiente',  bg: '#F9FAFB', text: '#344054' },
  revisando:  { label: 'Revisando',  bg: '#EFF8FF', text: '#175CD3' },
  cotizado:   { label: 'Cotizado',   bg: '#FFFAEB', text: '#B54708' },
  aprobado:   { label: 'Aprobado',   bg: '#F0F9FF', text: '#026AA2' },
  en_proceso: { label: 'En proceso', bg: '#F9F5FF', text: '#6941C6' },
  completado: { label: 'Completado', bg: '#ECFDF3', text: '#027A48' },
  rechazado:  { label: 'Rechazado',  bg: '#FEF3F2', text: '#B42318' },
}
const PRIORITY_DOT: Record<TaskPriority, string> = { urgente: '#F04438', alta: '#EF6820', media: '#F79009', baja: '#98A2B3' }

interface Props {
  requests: MaintenanceRequest[]
  properties: { id: string; name: string }[]
}

export function MantenimientoContent({ requests, properties }: Props) {
  const [filter, setFilter]     = useState<MaintenanceStatus | 'todos' | 'activos'>('activos')
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<MaintenanceRequest | null>(null)
  const router  = useRouter()
  const supabase = createClient()

  const open     = requests.filter(r => !['completado','rechazado'].includes(r.status))
  const filtered = filter === 'todos' ? requests : filter === 'activos' ? open : requests.filter(r => r.status === filter)
  const totalCost = requests.filter(r => r.status === 'completado' && r.actual_cost).reduce((s, r) => s + (r.actual_cost ?? 0), 0)
  const counts: Record<string, number> = { todos: requests.length, activos: open.length }
  for (const r of requests) counts[r.status] = (counts[r.status] ?? 0) + 1

  async function advanceStatus(r: MaintenanceRequest) {
    const flow: MaintenanceStatus[] = ['pendiente','revisando','cotizado','aprobado','en_proceso','completado']
    const idx  = flow.indexOf(r.status)
    if (idx === -1 || idx >= flow.length - 1) return
    const next = flow[idx + 1]
    await supabase.from('maintenance_requests').update({
      status: next,
      completed_date: next === 'completado' ? new Date().toISOString().split('T')[0] : null,
      updated_at: new Date().toISOString(),
    }).eq('id', r.id)
    await logAudit({ action: 'maintenance_status_changed', entityType: 'maintenance_requests', entityId: r.id, newValues: { status: next } })
    router.refresh()
  }

  const NEXT_LABEL: Partial<Record<MaintenanceStatus, string>> = {
    pendiente: 'Revisar', revisando: 'Cotizar', cotizado: 'Aprobar',
    aprobado: 'Iniciar', en_proceso: 'Completar',
  }

  return (
    <div className="flex-1 p-6 space-y-5" style={{ background: 'var(--bg)' }}>
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { l: 'Abiertos',    v: open.length,                                              color: 'var(--text)', alert: open.length > 0 },
          { l: 'Urgentes',    v: requests.filter(r => r.priority === 'urgente' && !['completado','rechazado'].includes(r.status)).length, color: 'var(--error)', alert: true },
          { l: 'En proceso',  v: counts['en_proceso'] ?? 0,                               color: 'var(--blue)' },
          { l: 'Costo total', v: formatCurrency(totalCost),                               color: 'var(--text)' },
        ].map((k, i) => (
          <div key={i} className="rounded-xl p-4" style={{ background: 'var(--surface)', border: k.alert && (k.v as number) > 0 ? '1px solid var(--error-border)' : '1px solid var(--border)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>{k.l}</p>
            <p className="font-bold text-xl" style={{ color: k.color, letterSpacing: '-0.02em' }}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 p-1 rounded-lg overflow-x-auto" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {[{ k: 'activos', l: `Activos (${open.length})` }, { k: 'todos', l: 'Todos' }, ...Object.entries(STATUS_CFG).map(([k, v]) => ({ k, l: `${v.label} (${counts[k] ?? 0})` }))].map(f => (
            <button key={f.k} onClick={() => setFilter(f.k as any)} className="px-2.5 py-1.5 rounded-md text-xs font-medium transition whitespace-nowrap"
              style={filter === f.k ? { background: 'var(--blue)', color: '#fff' } : { color: 'var(--text-tertiary)' }}>
              {f.l}
            </button>
          ))}
        </div>
        <button onClick={() => setFormOpen(true)} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition">
          <Plus className="w-3.5 h-3.5" /> Nuevo ticket
        </button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="Sin incidencias" description="No hay tickets en esta categoría." compact action={<button onClick={() => setFormOpen(true)} className="px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition">Nuevo ticket</button>} />
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const prop   = (r as any).property
            const tenant = (r as any).tenant
            const cfg    = STATUS_CFG[r.status]
            const nextLabel = NEXT_LABEL[r.status]
            return (
              <div key={r.id} className="rounded-xl p-4 flex items-start gap-4 group" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="w-1.5 h-full min-h-[56px] rounded-full shrink-0" style={{ background: PRIORITY_DOT[r.priority] }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{r.title}</p>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {prop?.name ?? '—'}{tenant ? ` · ${tenant.full_name}` : ''}
                      </p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0" style={{ background: cfg.bg, color: cfg.text }}>{cfg.label}</span>
                  </div>
                  {r.description && <p className="text-xs mb-2 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{r.description}</p>}
                  <div className="flex items-center gap-3 flex-wrap" style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                    <span>Reportado: {formatDate(r.reported_date)}</span>
                    {r.estimated_cost && <span>Estimado: {formatCurrency(r.estimated_cost, r.currency)}</span>}
                    {r.actual_cost && <span style={{ color: '#027A48', fontWeight: 600 }}>Real: {formatCurrency(r.actual_cost, r.currency)}</span>}
                    {r.provider_name && <span>Proveedor: {r.provider_name}</span>}
                    {r.paid_by && <span>Paga: <span className="capitalize font-medium">{r.paid_by}</span></span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {nextLabel && (
                    <button onClick={() => advanceStatus(r)} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white transition ${r.status === 'en_proceso' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
                      {r.status === 'en_proceso' ? <CheckCheck className="w-3 h-3" /> : null}
                      {nextLabel}
                    </button>
                  )}
                  <button onClick={() => setEditTarget(r)} className="p-1.5 rounded-md transition" style={{ color: 'var(--text-tertiary)' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-subtle)')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {formOpen && <MantenimientoForm open onClose={() => setFormOpen(false)} properties={properties} />}
      {editTarget && <MantenimientoForm open onClose={() => setEditTarget(null)} properties={properties} defaultValues={editTarget} requestId={editTarget.id} />}
    </div>
  )
}
