'use client'
import { cn } from '@/lib/utils/cn'
import { formatDate } from '@/lib/utils/format'
import {
  DollarSign, FileText, Wrench, MessageSquare,
  Home, RefreshCw, AlertTriangle, CheckCircle2, Clock,
} from 'lucide-react'
import type { PropertyEvent } from '@/types/database'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  pago:          DollarSign,
  documento:     FileText,
  mantenimiento: Wrench,
  nota:          MessageSquare,
  contrato:      FileText,
  estado:        Home,
  renovacion:    RefreshCw,
  alerta:        AlertTriangle,
  completado:    CheckCircle2,
  default:       Clock,
}

const COLOR_MAP: Record<string, { dot: string; ring: string; icon: string }> = {
  green:  { dot: 'bg-emerald-500', ring: 'ring-emerald-100', icon: 'text-emerald-600' },
  blue:   { dot: 'bg-blue-500',    ring: 'ring-blue-100',    icon: 'text-blue-600' },
  red:    { dot: 'bg-red-500',     ring: 'ring-red-100',     icon: 'text-red-600' },
  amber:  { dot: 'bg-amber-500',   ring: 'ring-amber-100',   icon: 'text-amber-600' },
  purple: { dot: 'bg-purple-500',  ring: 'ring-purple-100',  icon: 'text-purple-600' },
  slate:  { dot: 'bg-slate-400',   ring: 'ring-slate-100',   icon: 'text-slate-500' },
}

interface Props {
  events: PropertyEvent[]
  emptyMessage?: string
}

export function PortalTimeline({ events, emptyMessage = 'Sin actividad reciente' }: Props) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-slate-400">
        <Clock className="w-8 h-8 mb-2 opacity-40" />
        <p className="text-sm">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <ol className="relative border-l border-slate-200 ml-3 space-y-0">
      {events.map((ev, i) => {
        const Icon  = ICON_MAP[ev.event_type] ?? ICON_MAP.default
        const color = COLOR_MAP[ev.color ?? 'slate'] ?? COLOR_MAP.slate
        const isLast = i === events.length - 1
        return (
          <li key={ev.id} className={cn('ml-6', isLast ? 'pb-0' : 'pb-6')}>
            {/* Dot */}
            <span className={cn(
              'absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full ring-4 ring-white',
              color.dot, color.ring
            )}>
              <Icon className="w-3 h-3 text-white" />
            </span>
            {/* Content */}
            <div className="ml-2">
              <p className="text-slate-800 font-semibold text-sm leading-tight">{ev.title}</p>
              {ev.description && (
                <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{ev.description}</p>
              )}
              <time className="text-slate-400 text-[11px] mt-1 block">
                {formatDate(ev.created_at)}
              </time>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
