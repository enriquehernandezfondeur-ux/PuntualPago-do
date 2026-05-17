'use client'
import { cn } from '@/lib/utils/cn'
import { formatDate } from '@/lib/utils/format'
import { PaymentStatusBadge } from '@/components/shared/StatusBadge'
import {
  CreditCard, MessageCircle, Mail, Phone, FileText,
  Wrench, Scale, Upload, StickyNote, CheckCircle2, AlertTriangle,
} from 'lucide-react'

export interface TimelineEvent {
  id: string
  date: string
  type: 'payment' | 'communication' | 'document' | 'legal' | 'maintenance' | 'note' | 'contract'
  title: string
  description?: string
  meta?: string
  status?: string
  amount?: number
  currency?: string
  channel?: string
}

const TYPE_CONFIG = {
  payment:       { icon: CreditCard,    bg: '#EFF8FF', color: '#175CD3', label: 'Pago' },
  communication: { icon: MessageCircle, bg: '#F9F5FF', color: '#6941C6', label: 'Comunicación' },
  document:      { icon: Upload,        bg: '#ECFDF3', color: '#027A48', label: 'Documento' },
  legal:         { icon: Scale,         bg: '#FEF3F2', color: '#B42318', label: 'Legal' },
  maintenance:   { icon: Wrench,        bg: '#FFFAEB', color: '#B54708', label: 'Mantenimiento' },
  note:          { icon: StickyNote,    bg: '#F9FAFB', color: '#344054', label: 'Nota' },
  contract:      { icon: FileText,      bg: '#EFF8FF', color: '#175CD3', label: 'Contrato' },
}

const CHANNEL_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  whatsapp: MessageCircle,
  email:    Mail,
  llamada:  Phone,
  sms:      Phone,
}

interface Props { events: TimelineEvent[] }

export function ActivityTimeline({ events }: Props) {
  if (!events.length) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Sin actividad registrada</p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-px" style={{ background: 'var(--border)' }} />

      <div className="space-y-1">
        {events.map((event, i) => {
          const cfg  = TYPE_CONFIG[event.type]
          const Icon = event.channel && CHANNEL_ICON[event.channel] ? CHANNEL_ICON[event.channel] : cfg.icon

          return (
            <div key={event.id} className="relative flex gap-4 pl-10 py-2.5 group rounded-xl transition-colors"
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-subtle)')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              {/* Icon bubble */}
              <div
                className="absolute left-0 w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 z-10"
                style={{ background: cfg.bg, borderColor: 'var(--bg)' }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{event.title}</p>
                    {event.description && (
                      <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-tertiary)' }}>
                        {event.description}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{formatDate(event.date)}</p>
                    {event.amount !== undefined && event.amount > 0 && (
                      <p className="text-xs font-semibold mt-0.5" style={{ color: event.type === 'payment' && event.status !== 'pagado' ? '#B42318' : '#027A48' }}>
                        {new Intl.NumberFormat('es-DO', { style: 'currency', currency: event.currency ?? 'DOP', minimumFractionDigits: 0 }).format(event.amount)}
                      </p>
                    )}
                    {event.status && event.type === 'payment' && (
                      <div className="mt-1">
                        <PaymentStatusBadge status={event.status as any} size="xs" />
                      </div>
                    )}
                  </div>
                </div>
                {event.meta && (
                  <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>{event.meta}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
