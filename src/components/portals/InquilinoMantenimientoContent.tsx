'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { formatDate } from '@/lib/utils/format'
import { createClient } from '@/lib/supabase/client'
import {
  Wrench, Plus, CheckCircle2, AlertCircle, Clock,
  Loader2, ChevronDown, Home,
} from 'lucide-react'
import type { MaintenanceRequest, MaintenanceStatus, TaskPriority } from '@/types/database'

const STATUS_MAP: Record<MaintenanceStatus, { label: string; color: string }> = {
  pendiente:   { label: 'Pendiente',     color: 'bg-amber-100 text-amber-700' },
  revisando:   { label: 'En revisión',   color: 'bg-blue-100 text-blue-700' },
  cotizado:    { label: 'Cotizado',      color: 'bg-purple-100 text-purple-700' },
  aprobado:    { label: 'Aprobado',      color: 'bg-indigo-100 text-indigo-700' },
  en_proceso:  { label: 'En proceso',    color: 'bg-sky-100 text-sky-700' },
  completado:  { label: 'Completado',    color: 'bg-emerald-100 text-emerald-700' },
  rechazado:   { label: 'Rechazado',     color: 'bg-red-100 text-red-700' },
}

const PRIORITY_MAP: Record<TaskPriority, { label: string; color: string }> = {
  baja:    { label: 'Baja',    color: 'text-slate-500' },
  media:   { label: 'Media',   color: 'text-amber-600' },
  alta:    { label: 'Alta',    color: 'text-orange-600' },
  urgente: { label: 'Urgente', color: 'text-red-600' },
}

interface ActiveLease {
  id: string
  property_id: string
  property?: { id: string; name: string; address: string }
}

interface Props {
  tenantId: string
  tenantName: string
  activeLease: ActiveLease | null
  tickets: (MaintenanceRequest & { property?: { name: string; address: string } })[]
}

export function InquilinoMantenimientoContent({ tenantId, tenantName, activeLease, tickets }: Props) {
  const [showForm, setShowForm]     = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [form, setForm] = useState({
    title:       '',
    description: '',
    priority:    'media' as TaskPriority,
  })

  const supabase = createClient()
  const property = activeLease?.property

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    if (!activeLease) { setError('No tienes una propiedad activa vinculada.'); return }

    setSubmitting(true); setError(null)
    try {
      const { error: dbErr } = await supabase.from('maintenance_requests').insert({
        property_id:   activeLease.property_id,
        tenant_id:     tenantId,
        title:         form.title.trim(),
        description:   form.description.trim() || null,
        priority:      form.priority,
        status:        'pendiente',
        reported_date: new Date().toISOString().split('T')[0],
        currency:      'DOP',
      })
      if (dbErr) throw new Error(dbErr.message)
      setSubmitted(true)
      setForm({ title: '', description: '', priority: 'media' })
      setShowForm(false)
      // Notify admin
      await fetch('/api/portal/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: `Mantenimiento: ${form.title}`,
          content: `${tenantName} reportó un ticket de mantenimiento: ${form.title}${form.description ? ' — ' + form.description : ''}`,
        }),
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al enviar el reporte')
    } finally {
      setSubmitting(false)
    }
  }

  const open   = tickets.filter(t => t.status !== 'completado' && t.status !== 'rechazado')
  const closed = tickets.filter(t => t.status === 'completado' || t.status === 'rechazado')

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Mantenimiento</h1>
          <p className="text-slate-500 text-sm mt-0.5">Reporta incidencias o consulta el estado de tus solicitudes</p>
        </div>
        {activeLease && (
          <button
            onClick={() => setShowForm(s => !s)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition"
          >
            {showForm ? <ChevronDown className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            Reportar incidencia
          </button>
        )}
      </div>

      {/* Property info */}
      {property && (
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-5 py-3.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <Home className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-slate-800 font-semibold text-sm">{property.name}</p>
            <p className="text-slate-400 text-xs">{property.address}</p>
          </div>
        </div>
      )}

      {!activeLease && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-amber-800 text-sm">No tienes una propiedad activa. Contacta a PuntualPago para vincular tu cuenta.</p>
        </div>
      )}

      {/* Success banner */}
      {submitted && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="flex-1">
            <p className="text-emerald-800 font-semibold text-sm">Reporte enviado</p>
            <p className="text-emerald-700 text-xs mt-0.5">El equipo de PuntualPago revisará tu solicitud pronto.</p>
          </div>
          <button onClick={() => setSubmitted(false)} className="text-xs text-emerald-600 hover:underline">Cerrar</button>
        </div>
      )}

      {/* Report form */}
      {showForm && activeLease && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Wrench className="w-4 h-4 text-slate-500" />
            <h3 className="font-semibold text-slate-800 text-sm">Nueva solicitud de mantenimiento</h3>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Título *</label>
              <input
                type="text"
                required
                placeholder="Ej: Fuga en el baño, Aire acondicionado no enfría..."
                value={form.title}
                onChange={e => set('title', e.target.value)}
                maxLength={120}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Descripción (opcional)</label>
              <textarea
                placeholder="Describe el problema con más detalle..."
                value={form.description}
                onChange={e => set('description', e.target.value)}
                rows={4}
                maxLength={1000}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Prioridad</label>
              <select
                value={form.priority}
                onChange={e => set('priority', e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="baja">Baja — No urgente</option>
                <option value="media">Media — Requiere atención</option>
                <option value="alta">Alta — Urgente</option>
                <option value="urgente">Urgente — Emergencia</option>
              </select>
            </div>
            {error && (
              <p className="text-red-600 text-xs flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {error}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={submitting || !form.title.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition"
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando…</> : 'Enviar reporte'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tickets open */}
      {open.length > 0 && (
        <TicketList title="Solicitudes activas" tickets={open} />
      )}

      {/* Tickets closed */}
      {closed.length > 0 && (
        <TicketList title="Solicitudes completadas" tickets={closed} muted />
      )}

      {tickets.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl py-14 flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Wrench className="w-6 h-6 text-slate-400" />
          </div>
          <div className="text-center">
            <p className="text-slate-700 font-semibold text-sm">Sin solicitudes de mantenimiento</p>
            <p className="text-slate-400 text-xs mt-1">¿Hay algo que reparar en tu apartamento?</p>
          </div>
          {activeLease && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition"
            >
              <Plus className="w-4 h-4" />
              Reportar incidencia
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function TicketList({
  title, tickets, muted = false,
}: {
  title: string
  tickets: (MaintenanceRequest & { property?: { name: string; address: string } })[]
  muted?: boolean
}) {
  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-slate-700 text-sm">{title}</h2>
      <div className={cn('bg-white border rounded-2xl overflow-hidden divide-y divide-slate-100', muted ? 'border-slate-200 opacity-75' : 'border-slate-200')}>
        {tickets.map(t => {
          const st = STATUS_MAP[t.status] ?? { label: t.status, color: 'bg-slate-100 text-slate-700' }
          const pr = PRIORITY_MAP[t.priority] ?? { label: t.priority, color: 'text-slate-500' }
          return (
            <div key={t.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-slate-800 font-semibold text-sm">{t.title}</p>
                    <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', st.color)}>{st.label}</span>
                  </div>
                  {t.description && (
                    <p className="text-slate-500 text-xs leading-relaxed">{t.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="text-xs text-slate-400">Reportado: {formatDate(t.reported_date)}</span>
                    <span className={cn('text-xs font-medium', pr.color)}>Prioridad: {pr.label}</span>
                    {t.ticket_number && (
                      <span className="text-xs text-slate-400 font-mono">{t.ticket_number}</span>
                    )}
                  </div>
                  {t.scheduled_date && t.status !== 'completado' && (
                    <div className="mt-2 inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1">
                      <Clock className="w-3 h-3 text-blue-500" />
                      <span className="text-xs text-blue-700 font-medium">Programado: {formatDate(t.scheduled_date)}</span>
                    </div>
                  )}
                  {t.completed_date && (
                    <div className="mt-2 inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span className="text-xs text-emerald-700 font-medium">Completado: {formatDate(t.completed_date)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
