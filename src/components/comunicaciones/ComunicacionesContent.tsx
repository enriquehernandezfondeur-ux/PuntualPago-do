'use client'
import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils/cn'
import type { Communication, CommunicationChannel } from '@/types/database'
import {
  MessageCircle, Mail, Phone, MessageSquare, FileText,
  Search, X, CheckCircle2, Clock, AlertCircle,
  ArrowUpRight, ArrowDownLeft, Building2,
} from 'lucide-react'

interface Stats { total: number; email: number; whatsapp: number; today: number }
interface Props { communications: Communication[]; stats: Stats }

const CHANNEL_CONFIG: Record<CommunicationChannel, { label: string; icon: React.ComponentType<{className?: string}>; color: string; bg: string; dot: string }> = {
  email:         { label: 'Email',           icon: Mail,          color: 'text-blue-600',    bg: 'bg-blue-50',    dot: 'bg-blue-500' },
  whatsapp:      { label: 'WhatsApp',        icon: MessageCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
  llamada:       { label: 'Llamada',         icon: Phone,         color: 'text-purple-600',  bg: 'bg-purple-50',  dot: 'bg-purple-500' },
  sms:           { label: 'SMS',             icon: MessageSquare, color: 'text-amber-600',   bg: 'bg-amber-50',   dot: 'bg-amber-500' },
  nota_interna:  { label: 'Nota interna',    icon: FileText,      color: 'text-slate-600',   bg: 'bg-slate-100',  dot: 'bg-slate-400' },
}

const TEMPLATE_LABELS: Record<string, string> = {
  recordatorio_pago:      'Recordatorio de pago',
  recordatorio_pago_auto: 'Recordatorio automático',
  confirmacion_pago:      'Confirmación de pago',
  vencimiento_contrato:   'Vencimiento de contrato',
}

type FilterChannel = CommunicationChannel | 'todos'

export function ComunicacionesContent({ communications, stats }: Props) {
  const [channelFilter, setChannelFilter] = useState<FilterChannel>('todos')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Communication | null>(null)

  const filtered = useMemo(() => {
    let result = communications
    if (channelFilter !== 'todos') result = result.filter(c => c.channel === channelFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(c => {
        const t = c.tenant as any
        const o = c.owner as any
        const p = c.property as any
        return (
          t?.full_name?.toLowerCase().includes(q) ||
          o?.full_name?.toLowerCase().includes(q) ||
          p?.name?.toLowerCase().includes(q) ||
          c.subject?.toLowerCase().includes(q) ||
          c.content?.toLowerCase().includes(q)
        )
      })
    }
    return result
  }, [communications, channelFilter, search])

  const channelCounts = useMemo(() => {
    const c: Record<string, number> = { todos: communications.length }
    for (const comm of communications) c[comm.channel] = (c[comm.channel] ?? 0) + 1
    return c
  }, [communications])

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">

      {/* ── Main panel ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Stats bar */}
        <div className="px-6 py-4 border-b border-slate-200 bg-white">
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total mensajes',  value: stats.total,    icon: MessageSquare, color: 'bg-blue-50',    iconColor: 'text-blue-600' },
              { label: 'Emails enviados', value: stats.email,    icon: Mail,          color: 'bg-indigo-50',  iconColor: 'text-indigo-600' },
              { label: 'WhatsApp',        value: stats.whatsapp, icon: MessageCircle, color: 'bg-emerald-50', iconColor: 'text-emerald-600' },
              { label: 'Hoy',             value: stats.today,    icon: Clock,         color: 'bg-amber-50',   iconColor: 'text-amber-600' },
            ].map((item, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 flex items-center gap-3">
                <div className={cn('p-2 rounded-lg shrink-0', item.color)}>
                  <item.icon className={cn('w-4 h-4', item.iconColor)} />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-lg leading-tight">{item.value}</p>
                  <p className="text-slate-500 text-xs">{item.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-slate-200 bg-white flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 shrink-0">
            {(['todos', 'email', 'whatsapp', 'llamada', 'sms', 'nota_interna'] as FilterChannel[]).map(ch => {
              const active = channelFilter === ch
              const count  = channelCounts[ch] ?? 0
              const cfg    = ch !== 'todos' ? CHANNEL_CONFIG[ch] : null
              return (
                <button
                  key={ch}
                  onClick={() => setChannelFilter(ch)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                    active ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  {cfg && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot)} />}
                  {ch === 'todos' ? 'Todos' : cfg!.label}
                  {(count > 0 || ch === 'todos') && (
                    <span className={cn('font-bold', active ? 'text-slate-700' : 'text-slate-400')}>{count}</span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, propiedad o asunto..."
              className="w-full pl-8 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <p className="text-slate-400 text-sm ml-auto shrink-0">
            {filtered.length} de {communications.length} mensajes
          </p>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50">
          {filtered.length === 0 ? (
            <EmptyState hasFilter={channelFilter !== 'todos' || search !== ''} />
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(comm => (
                <CommRow
                  key={comm.id}
                  comm={comm}
                  isSelected={selected?.id === comm.id}
                  onClick={() => setSelected(selected?.id === comm.id ? null : comm)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Detail panel ────────────────────────────────────────── */}
      {selected && (
        <CommDetailPanel comm={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function CommRow({ comm, isSelected, onClick }: { comm: Communication; isSelected: boolean; onClick: () => void }) {
  const cfg = CHANNEL_CONFIG[comm.channel]
  const Icon = cfg.icon
  const tenant = comm.tenant as any
  const owner  = comm.owner as any
  const contactName = tenant?.full_name ?? owner?.full_name ?? '—'
  const dateStr = comm.sent_at ?? comm.created_at
  const date = new Date(dateStr)
  const isToday = date.toDateString() === new Date().toDateString()
  const timeLabel = isToday
    ? date.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('es-DO', { day: 'numeric', month: 'short' })

  return (
    <div
      onClick={onClick}
      className={cn(
        'px-6 py-4 cursor-pointer transition-colors flex items-start gap-4',
        isSelected ? 'bg-blue-50' : 'bg-white hover:bg-slate-50'
      )}
    >
      {/* Channel icon */}
      <div className={cn('p-2.5 rounded-xl shrink-0 mt-0.5', cfg.bg)}>
        <Icon className={cn('w-4 h-4', cfg.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-semibold text-slate-800 text-sm truncate">{contactName}</span>
          <DirectionBadge direction={comm.direction} />
          {comm.template_used && (
            <span className="hidden sm:inline px-2 py-0.5 bg-slate-100 text-slate-500 text-[11px] font-medium rounded-full">
              {TEMPLATE_LABELS[comm.template_used] ?? comm.template_used}
            </span>
          )}
        </div>
        {comm.subject && (
          <p className="text-slate-700 text-sm font-medium truncate">{comm.subject}</p>
        )}
        <p className="text-slate-400 text-xs truncate mt-0.5">{comm.content}</p>
      </div>

      {/* Meta */}
      <div className="shrink-0 text-right">
        <p className="text-slate-400 text-xs">{timeLabel}</p>
        {comm.delivered != null && (
          <div className="flex items-center justify-end gap-1 mt-1">
            {comm.delivered
              ? <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              : <AlertCircle className="w-3 h-3 text-amber-500" />
            }
            <span className="text-[11px] text-slate-400">{comm.delivered ? 'Entregado' : 'Pendiente'}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function DirectionBadge({ direction }: { direction: string }) {
  return direction === 'outbound'
    ? <span className="flex items-center gap-0.5 text-[10px] font-semibold text-blue-600"><ArrowUpRight className="w-3 h-3" /> Saliente</span>
    : <span className="flex items-center gap-0.5 text-[10px] font-semibold text-slate-500"><ArrowDownLeft className="w-3 h-3" /> Entrante</span>
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

function CommDetailPanel({ comm, onClose }: { comm: Communication; onClose: () => void }) {
  const cfg    = CHANNEL_CONFIG[comm.channel]
  const Icon   = cfg.icon
  const tenant = comm.tenant as any
  const owner  = comm.owner as any
  const prop   = comm.property as any

  return (
    <aside className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn('p-1.5 rounded-lg', cfg.bg)}>
            <Icon className={cn('w-4 h-4', cfg.color)} />
          </div>
          <p className="font-semibold text-slate-800 text-sm">{cfg.label}</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition text-slate-400">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Subject / content */}
        {comm.subject && (
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Asunto</p>
            <p className="text-slate-800 text-sm font-medium">{comm.subject}</p>
          </div>
        )}

        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Contenido</p>
          <p className="text-slate-600 text-sm leading-relaxed">{comm.content}</p>
        </div>

        {/* Contact */}
        {(tenant || owner) && (
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              {tenant ? 'Inquilino' : 'Propietario'}
            </p>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                {(tenant ?? owner)?.full_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
              </div>
              <div>
                <p className="text-slate-800 text-sm font-semibold">{(tenant ?? owner)?.full_name}</p>
                {(tenant ?? owner)?.email && (
                  <p className="text-slate-400 text-xs">{(tenant ?? owner).email}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Property */}
        {prop && (
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Propiedad</p>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-slate-500" />
              </div>
              <p className="text-slate-800 text-sm font-medium">{prop.name}</p>
            </div>
          </div>
        )}

        {/* Meta */}
        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Detalles</p>
          <div className="space-y-1.5 text-sm">
            <MetaRow label="Dirección" value={comm.direction === 'outbound' ? 'Saliente' : 'Entrante'} />
            {comm.template_used && (
              <MetaRow label="Plantilla" value={TEMPLATE_LABELS[comm.template_used] ?? comm.template_used} />
            )}
            {comm.sent_at && (
              <MetaRow
                label="Enviado"
                value={new Date(comm.sent_at).toLocaleString('es-DO', { dateStyle: 'medium', timeStyle: 'short' })}
              />
            )}
            {comm.delivered != null && (
              <MetaRow label="Entregado" value={comm.delivered ? 'Sí' : 'No'} />
            )}
            {comm.read_at && (
              <MetaRow
                label="Leído"
                value={new Date(comm.read_at).toLocaleString('es-DO', { dateStyle: 'medium', timeStyle: 'short' })}
              />
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-700 font-medium text-right">{value}</span>
    </div>
  )
}

function EmptyState({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <div className="w-14 h-14 bg-white border border-slate-200 rounded-2xl flex items-center justify-center shadow-sm">
        <MessageSquare className="w-6 h-6 text-slate-300" />
      </div>
      <p className="font-semibold text-slate-700">
        {hasFilter ? 'Sin resultados' : 'Sin comunicaciones aún'}
      </p>
      <p className="text-slate-400 text-sm text-center max-w-xs">
        {hasFilter
          ? 'Ajusta los filtros para ver otros registros'
          : 'Los emails, WhatsApp y llamadas registradas aparecerán aquí'}
      </p>
    </div>
  )
}
