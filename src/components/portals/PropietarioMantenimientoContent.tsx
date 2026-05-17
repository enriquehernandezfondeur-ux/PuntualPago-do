'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { formatDate, formatCurrency } from '@/lib/utils/format'
import { Wrench, CheckCircle2, Clock, Search, Building2, AlertTriangle } from 'lucide-react'
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

const PRIORITY_MAP: Record<TaskPriority, { label: string; dot: string }> = {
  baja:    { label: 'Baja',    dot: 'bg-slate-400' },
  media:   { label: 'Media',   dot: 'bg-amber-400' },
  alta:    { label: 'Alta',    dot: 'bg-orange-500' },
  urgente: { label: 'Urgente', dot: 'bg-red-500' },
}

interface TicketWithProp extends MaintenanceRequest {
  property?: { name: string; address: string }
}

interface Props {
  ownerName: string
  tickets: TicketWithProp[]
}

export function PropietarioMantenimientoContent({ ownerName, tickets }: Props) {
  const [search, setSearch]     = useState('')
  const [statusFilter, setStatus] = useState<string>('activo')

  const open   = tickets.filter(t => t.status !== 'completado' && t.status !== 'rechazado')
  const closed = tickets.filter(t => t.status === 'completado' || t.status === 'rechazado')

  const filtered = (statusFilter === 'activo' ? open : statusFilter === 'completado' ? closed : tickets)
    .filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()) || (t.property?.name ?? '').toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

      <div>
        <h1 className="text-xl font-bold text-slate-900">Mantenimiento</h1>
        <p className="text-slate-500 text-sm mt-0.5">Solicitudes de mantenimiento de tus propiedades</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4">
        <StatMini label="Total" value={tickets.length} />
        <StatMini label="En progreso" value={open.length} alert={open.length > 0} />
        <StatMini label="Cerrados" value={closed.length} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por título o propiedad..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {[{ v: 'activo', l: 'En progreso' }, { v: 'completado', l: 'Cerrados' }, { v: 'todos', l: 'Todos' }].map(opt => (
            <button
              key={opt.v}
              onClick={() => setStatus(opt.v)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition',
                statusFilter === opt.v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {opt.l}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl py-16 flex flex-col items-center gap-3">
          <Wrench className="w-10 h-10 text-slate-300" />
          <p className="text-slate-500 font-medium text-sm">
            {tickets.length === 0 ? 'Sin solicitudes de mantenimiento' : 'Sin resultados'}
          </p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
          {filtered.map(t => {
            const st = STATUS_MAP[t.status] ?? { label: t.status, color: 'bg-slate-100 text-slate-700' }
            const pr = PRIORITY_MAP[t.priority] ?? { label: t.priority, dot: 'bg-slate-400' }
            return (
              <div key={t.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <div className={cn('w-2 h-2 rounded-full shrink-0', pr.dot)} title={`Prioridad: ${pr.label}`} />
                      <p className="text-slate-800 font-semibold text-sm">{t.title}</p>
                      <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', st.color)}>{st.label}</span>
                    </div>
                    {t.property && (
                      <div className="flex items-center gap-1.5 mb-1">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span className="text-slate-500 text-xs">{t.property.name}</span>
                      </div>
                    )}
                    {t.description && (
                      <p className="text-slate-500 text-xs leading-relaxed mb-2">{t.description}</p>
                    )}
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs text-slate-400">Reportado: {formatDate(t.reported_date)}</span>
                      {t.ticket_number && (
                        <span className="text-xs text-slate-400 font-mono">{t.ticket_number}</span>
                      )}
                    </div>
                  </div>
                  {/* Cost info if quoted */}
                  {(t.estimated_cost || t.actual_cost) && (
                    <div className="shrink-0 text-right">
                      {t.actual_cost ? (
                        <div>
                          <p className="text-xs text-slate-400">Costo real</p>
                          <p className="font-semibold text-slate-800 text-sm">{formatCurrency(t.actual_cost, t.currency)}</p>
                          {t.paid_by && (
                            <p className="text-[11px] text-slate-400 capitalize">Pagado por: {t.paid_by}</p>
                          )}
                        </div>
                      ) : t.estimated_cost ? (
                        <div>
                          <p className="text-xs text-slate-400">Estimado</p>
                          <p className="font-semibold text-amber-700 text-sm">~{formatCurrency(t.estimated_cost, t.currency)}</p>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
                {/* Timeline dots */}
                <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                  {t.scheduled_date && t.status !== 'completado' && (
                    <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1">
                      <Clock className="w-3 h-3 text-blue-500" />
                      <span className="text-xs text-blue-700 font-medium">Programado: {formatDate(t.scheduled_date)}</span>
                    </div>
                  )}
                  {t.completed_date && (
                    <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span className="text-xs text-emerald-700 font-medium">Completado: {formatDate(t.completed_date)}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
        <p className="text-slate-500 text-xs">
          El equipo de PuntualPago gestiona directamente todas las solicitudes de mantenimiento.
          Recibirás notificaciones cuando haya actualizaciones en el estado de cada ticket.
        </p>
      </div>
    </div>
  )
}

function StatMini({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className={cn('bg-white border rounded-2xl p-4 text-center', alert && value > 0 ? 'border-amber-200' : 'border-slate-200')}>
      <p className={cn('text-2xl font-bold', alert && value > 0 ? 'text-amber-600' : 'text-slate-900')}>{value}</p>
      <p className="text-slate-500 text-xs mt-0.5">{label}</p>
    </div>
  )
}
