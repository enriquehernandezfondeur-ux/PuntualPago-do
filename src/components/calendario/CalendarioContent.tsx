'use client'
import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils/cn'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import Link from 'next/link'
import {
  ChevronLeft, ChevronRight, Home, Calendar,
  Building2, User, Phone, CheckCircle2, FileText,
  AlertCircle, Clock, TrendingUp,
} from 'lucide-react'

interface Prop    { id: string; name: string; address?: string; status: string; rent_amount: number; currency: string; type?: string }
interface Lease   { id: string; start_date: string; end_date: string; contract_number?: string; status: string; rent_amount: number; currency: string; tenant: { id: string; full_name: string; phone?: string } | null; property: { id: string; name: string } | null }
interface Payment { id: string; due_date: string; status: string; balance_due: number; currency: string; tenant: { full_name: string } | null; property: { name: string; id: string } | null }
interface Task    { id: string; title: string; due_date: string; priority: string; status: string; assignee: { full_name: string } | null }

interface Props { payments: Payment[]; leases: Lease[]; tasks: Task[]; properties: Prop[] }

type ViewMode  = 'ocupacion' | 'eventos'
type EventType = 'payment' | 'lease' | 'task'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

export function CalendarioContent({ payments, leases, tasks, properties }: Props) {
  const today    = new Date()
  const [view, setView]         = useState<ViewMode>('ocupacion')
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))

  const prevMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  const nextMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  const gotoToday = () => setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin" style={{ background: 'var(--bg)' }}>
      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-4">

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {([
              { key: 'ocupacion', icon: Building2, label: 'Ocupación' },
              { key: 'eventos',   icon: Calendar,  label: 'Eventos' },
            ] as const).map(v => (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition"
                style={view === v.key
                  ? { background: 'var(--bg)', color: 'var(--text)', boxShadow: '0 1px 2px rgba(16,24,40,0.08)' }
                  : { color: 'var(--text-tertiary)' }
                }
              >
                <v.icon className="w-3.5 h-3.5" /> {v.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <NavBtn onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></NavBtn>
            <span className="font-semibold text-sm min-w-[150px] text-center" style={{ color: 'var(--text)' }}>
              {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
            </span>
            <NavBtn onClick={nextMonth}><ChevronRight className="w-4 h-4" /></NavBtn>
            <button
              onClick={gotoToday}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition"
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-subtle)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              Hoy
            </button>
          </div>
        </div>

        {view === 'ocupacion'
          ? <OcupacionView properties={properties} leases={leases} viewDate={viewDate} today={today} />
          : <EventosView payments={payments} leases={leases} tasks={tasks} viewDate={viewDate} today={today} />
        }
      </div>
    </div>
  )
}

// ─── Vista de Ocupación ───────────────────────────────────────────────────────

function OcupacionView({ properties, leases, viewDate, today }: {
  properties: Prop[]; leases: Lease[]; viewDate: Date; today: Date
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const year  = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const occupied  = properties.filter(p => p.status === 'ocupada').length
  const available = properties.filter(p => p.status !== 'ocupada').length

  const activeLeasePerId: Record<string, Lease | undefined> = {}
  for (const l of leases) {
    if (l.property?.id) activeLeasePerId[l.property.id] = l
  }

  // Contratos próximos a vencer (≤ 90 días)
  const expiringLeases = leases
    .map(l => ({ ...l, daysLeft: Math.ceil((new Date(l.end_date + 'T12:00').getTime() - today.getTime()) / 86400000) }))
    .filter(l => l.daysLeft >= 0 && l.daysLeft <= 90)
    .sort((a, b) => a.daysLeft - b.daysLeft)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

      {/* Property list — 2 cols */}
      <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {/* Header */}
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Estado de propiedades</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              <span style={{ color: '#027A48', fontWeight: 600 }}>{available} disponibles</span>
              {' · '}
              <span style={{ color: '#175CD3', fontWeight: 600 }}>{occupied} ocupadas</span>
              {' · '}
              {properties.length} en total
            </p>
          </div>
          {available > 0 && (
            <Link href="/inquilinos/nuevo"
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition"
              style={{ background: '#1570EF' }}>
              <User className="w-3 h-3" /> Agregar inquilino
            </Link>
          )}
        </div>

        {properties.length === 0 ? (
          <div className="py-16 text-center">
            <Home className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: 'var(--text-tertiary)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Sin propiedades</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Agrega tu primera propiedad</p>
            <Link href="/propiedades" className="inline-flex items-center gap-1 mt-3 text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: '#1570EF' }}>
              + Agregar propiedad
            </Link>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {properties.map(prop => {
              const lease      = activeLeasePerId[prop.id]
              const isOccupied = prop.status === 'ocupada' && !!lease
              const isSelected = selected === prop.id
              const daysLeft   = lease?.end_date
                ? Math.ceil((new Date(lease.end_date + 'T12:00').getTime() - today.getTime()) / 86400000)
                : null
              const isExpiring = daysLeft !== null && daysLeft <= 60

              return (
                <div key={prop.id}>
                  <div
                    className="flex items-center gap-4 px-5 py-3.5 cursor-pointer transition"
                    onClick={() => setSelected(isSelected ? null : prop.id)}
                    style={{ background: isSelected ? 'var(--blue-bg)' : '' }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--surface-subtle)' }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = '' }}
                  >
                    {/* Status dot */}
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: isOccupied ? '#1570EF' : '#12B76A' }} />

                    {/* Name + address */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{prop.name}</p>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                          style={isOccupied
                            ? { background: 'var(--blue-bg)', color: 'var(--blue-text)' }
                            : { background: '#ECFDF3', color: '#027A48' }
                          }
                        >
                          {isOccupied ? 'Ocupado' : 'Disponible'}
                        </span>
                        {isExpiring && (
                          <span className="text-xs font-medium px-1.5 py-0.5 rounded-full shrink-0"
                            style={{ background: daysLeft! <= 30 ? '#FEF3F2' : '#FFFAEB', color: daysLeft! <= 30 ? '#B42318' : '#B54708' }}>
                            Vence en {daysLeft}d
                          </span>
                        )}
                      </div>
                      {prop.address && (
                        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-tertiary)' }}>{prop.address}</p>
                      )}
                    </div>

                    {/* Right info */}
                    {isOccupied && lease?.tenant ? (
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{lease.tenant.full_name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          {formatCurrency(lease.rent_amount, lease.currency as any)}/mes
                        </p>
                      </div>
                    ) : (
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold" style={{ color: '#027A48' }}>
                          {formatCurrency(prop.rent_amount, prop.currency as any)}/mes
                        </p>
                        <Link href="/inquilinos/nuevo" className="text-xs underline" style={{ color: 'var(--blue)' }} onClick={e => e.stopPropagation()}>
                          Asignar inquilino
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Expanded detail */}
                  {isSelected && (
                    <div className="px-5 pb-4 pt-3" style={{ background: 'var(--blue-bg)', borderTop: '1px solid var(--border)' }}>
                      {isOccupied && lease ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <InfoCard label="Inquilino">
                            <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{lease.tenant?.full_name}</p>
                            {lease.tenant?.phone && (
                              <a href={`tel:${lease.tenant.phone}`} className="text-xs flex items-center gap-1 mt-1" style={{ color: 'var(--blue)' }}>
                                <Phone className="w-3 h-3" /> {lease.tenant.phone}
                              </a>
                            )}
                          </InfoCard>
                          <InfoCard label="Período del contrato">
                            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{formatDate(lease.start_date)}</p>
                            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>hasta {formatDate(lease.end_date)}</p>
                          </InfoCard>
                          <InfoCard label="Renta mensual">
                            <p className="font-bold text-base" style={{ color: 'var(--blue)' }}>{formatCurrency(lease.rent_amount, lease.currency as any)}</p>
                            <Link href="/contratos" className="text-xs flex items-center gap-1 mt-1" style={{ color: 'var(--blue)' }}>
                              <FileText className="w-3 h-3" /> Ver contrato
                            </Link>
                          </InfoCard>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-semibold text-sm" style={{ color: '#027A48' }}>Propiedad disponible</p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                              Renta estimada: {formatCurrency(prop.rent_amount, prop.currency as any)}/mes
                            </p>
                          </div>
                          <Link href="/inquilinos/nuevo"
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white transition"
                            style={{ background: '#1570EF' }}>
                            <User className="w-3.5 h-3.5" /> Asignar inquilino
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Right column */}
      <div className="space-y-4">

        {/* Resumen rápido */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Resumen del mes</p>
          </div>
          <div className="p-5 space-y-4">
            {/* Ocupación donut */}
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 shrink-0">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="14" fill="none" strokeWidth="4" style={{ stroke: 'var(--border)' }} />
                  <circle cx="18" cy="18" r="14" fill="none" strokeWidth="4" strokeLinecap="round"
                    style={{
                      stroke: '#1570EF',
                      strokeDasharray: `${properties.length > 0 ? Math.round((occupied / properties.length) * 100) : 0} 100`,
                      transition: 'stroke-dasharray 0.6s ease'
                    }}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center font-bold text-xs" style={{ color: 'var(--text)' }}>
                  {properties.length > 0 ? Math.round((occupied / properties.length) * 100) : 0}%
                </span>
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: 'var(--text)', letterSpacing: '-0.03em' }}>{occupied}<span className="text-sm font-normal text-slate-400">/{properties.length}</span></p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>propiedades ocupadas</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl p-3 text-center" style={{ background: '#ECFDF3', border: '1px solid #A9EFC5' }}>
                <p className="text-xl font-bold" style={{ color: '#027A48' }}>{available}</p>
                <p className="text-[11px] font-medium" style={{ color: '#027A48' }}>Disponibles</p>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: 'var(--blue-bg)', border: '1px solid #B2DDFF' }}>
                <p className="text-xl font-bold" style={{ color: '#175CD3' }}>{occupied}</p>
                <p className="text-[11px] font-medium" style={{ color: '#175CD3' }}>Ocupadas</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contratos próximos a vencer */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Contratos por vencer</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Próximos 90 días</p>
          </div>
          {expiringLeases.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="w-6 h-6 mx-auto mb-2 opacity-30" style={{ color: 'var(--text-tertiary)' }} />
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Sin contratos próximos a vencer</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {expiringLeases.slice(0, 6).map((l, i) => (
                <div key={l.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{l.property?.name ?? '—'}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{l.tenant?.full_name}</p>
                  </div>
                  <span className="text-xs font-bold shrink-0 px-2 py-1 rounded-lg"
                    style={{
                      background: l.daysLeft <= 30 ? '#FEF3F2' : '#FFFAEB',
                      color: l.daysLeft <= 30 ? '#B42318' : '#B54708',
                    }}>
                    {l.daysLeft}d
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Vista de Eventos (calendario mensual) ────────────────────────────────────

function EventosView({ payments, leases, tasks, viewDate, today }: {
  payments: Payment[]; leases: Lease[]; tasks: Task[]; viewDate: Date; today: Date
}) {
  const year  = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay    = new Date(year, month, 1).getDay()
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) => i < firstDay ? null : i - firstDay + 1)
  const todayDay = today.getFullYear() === year && today.getMonth() === month ? today.getDate() : null

  type Ev = { date: string; type: EventType; label: string; sub?: string; href?: string; amount?: number; currency?: string; days?: number }

  const eventsByDate = useMemo(() => {
    const map: Record<string, Ev[]> = {}
    const add = (date: string, ev: Ev) => { if (date) { if (!map[date]) map[date] = []; map[date].push(ev) } }
    payments.forEach(p => add(p.due_date?.split('T')[0], { date: p.due_date, type: 'payment', label: p.tenant?.full_name ?? 'Pago', sub: p.property?.name, amount: p.balance_due, currency: p.currency, href: '/cobros' }))
    leases.forEach(l => add(l.end_date?.split('T')[0], { date: l.end_date, type: 'lease', label: l.property?.name ?? 'Contrato', sub: l.tenant?.full_name, href: '/contratos' }))
    tasks.forEach(t => add(t.due_date?.split('T')[0], { date: t.due_date, type: 'task', label: t.title, sub: t.assignee?.full_name, href: '/tareas' }))
    return map
  }, [payments, leases, tasks])

  const TYPE_CONFIG: Record<EventType, { dot: string; bg: string; text: string; label: string }> = {
    payment: { dot: '#F04438', bg: '#FEF3F2', text: '#B42318', label: 'Pago' },
    lease:   { dot: '#F79009', bg: '#FFFAEB', text: '#B54708', label: 'Contrato' },
    task:    { dot: '#1570EF', bg: '#EFF8FF', text: '#175CD3', label: 'Tarea' },
  }

  const upcoming = useMemo(() => {
    const all: (Ev & { days: number })[] = []
    Object.entries(eventsByDate).forEach(([date, evs]) => {
      const days = Math.ceil((new Date(date + 'T12:00').getTime() - today.getTime()) / 86400000)
      if (days >= -3) evs.forEach(e => all.push({ ...e, days }))
    })
    return all.sort((a, b) => a.days - b.days).slice(0, 15)
  }, [eventsByDate, today])

  const selDayStr = selectedDay ? `${year}-${String(month+1).padStart(2,'0')}-${String(selectedDay).padStart(2,'0')}` : null
  const selEvents = selDayStr ? (eventsByDate[selDayStr] ?? []) : []

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

      {/* Calendar — 2 cols */}
      <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

        {/* Day headers */}
        <div className="grid grid-cols-7" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
          {DAYS.map(d => (
            <div key={d} className="py-2.5 text-center" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>{d}</div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            if (!day) return (
              <div key={i} style={{ minHeight: '110px', borderBottom: '1px solid var(--border-subtle)', borderRight: '1px solid var(--border-subtle)', background: 'var(--surface-subtle)', opacity: 0.4 }} />
            )
            const dayStr   = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
            const evs      = eventsByDate[dayStr] ?? []
            const isToday  = todayDay === day
            const isSelected = selectedDay === day
            const hasCritical = evs.some(e => e.type === 'payment')

            return (
              <div
                key={day}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className="cursor-pointer transition-colors"
                style={{
                  minHeight: '110px',
                  padding: '8px',
                  borderBottom: '1px solid var(--border-subtle)',
                  borderRight:  '1px solid var(--border-subtle)',
                  background: isSelected ? 'var(--blue-bg)' : isToday ? '#F0F9FF' : '',
                }}
                onMouseEnter={e => { if (!isSelected && !isToday) (e.currentTarget as HTMLElement).style.background = 'var(--surface-subtle)' }}
                onMouseLeave={e => { if (!isSelected && !isToday) (e.currentTarget as HTMLElement).style.background = '' }}
              >
                {/* Day number */}
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      background: isToday ? '#1570EF' : 'transparent',
                      color: isToday ? '#fff' : hasCritical && !isToday ? '#B42318' : 'var(--text)',
                      fontWeight: isToday || hasCritical ? 700 : 500,
                    }}>
                    {day}
                  </span>
                  {evs.length > 0 && (
                    <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
                      style={{ background: 'var(--surface-subtle)', color: 'var(--text-tertiary)', fontSize: '10px' }}>
                      {evs.length}
                    </span>
                  )}
                </div>

                {/* Events */}
                <div className="space-y-0.5">
                  {evs.slice(0, 3).map((ev, ei) => {
                    const col = TYPE_CONFIG[ev.type]
                    return (
                      <div key={ei} className="flex items-center gap-1 rounded px-1.5 py-0.5 truncate"
                        style={{ background: col.bg }}>
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: col.dot }} />
                        <span className="truncate" style={{ fontSize: '11px', color: col.text, fontWeight: 500 }}>{ev.label}</span>
                      </div>
                    )
                  })}
                  {evs.length > 3 && (
                    <p className="px-1.5" style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                      +{evs.length - 3} más
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="px-5 py-2.5 flex items-center gap-5" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
          {Object.entries(TYPE_CONFIG).map(([, cfg]) => (
            <div key={cfg.label} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.dot }} />
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{cfg.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Side panel */}
      <div className="space-y-4">

        {/* Selected day events */}
        {selectedDay && (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{selectedDay} de {MONTHS[month]}</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {selEvents.length === 0 ? 'Sin eventos' : `${selEvents.length} evento${selEvents.length !== 1 ? 's' : ''}`}
                </p>
              </div>
              <button onClick={() => setSelectedDay(null)} className="p-1 rounded-md transition"
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
              </button>
            </div>
            {selEvents.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="w-5 h-5 mx-auto mb-1 opacity-30" style={{ color: 'var(--text-tertiary)' }} />
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Día libre</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {selEvents.map((ev, i) => {
                  const col = TYPE_CONFIG[ev.type]
                  return (
                    <div key={i} className="px-4 py-3 flex items-start gap-3">
                      <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: col.dot }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: col.bg, color: col.text }}>{col.label}</span>
                        </div>
                        <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text)' }}>{ev.label}</p>
                        {ev.sub && <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{ev.sub}</p>}
                        {ev.amount && ev.amount > 0 && (
                          <p className="text-xs font-semibold mt-0.5" style={{ color: '#B42318' }}>
                            {formatCurrency(ev.amount, (ev.currency ?? 'DOP') as any)}
                          </p>
                        )}
                      </div>
                      {ev.href && (
                        <Link href={ev.href} className="text-xs shrink-0 px-2 py-1 rounded-lg transition"
                          style={{ color: 'var(--blue)', background: 'var(--blue-bg)' }}>
                          Ver →
                        </Link>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Upcoming events */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
            <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Próximos eventos</p>
          </div>
          {upcoming.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Sin eventos próximos</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {upcoming.map((ev, i) => {
                const col = TYPE_CONFIG[ev.type]
                return (
                  <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: col.dot }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--text)' }}>{ev.label}</p>
                      {ev.sub && <p style={{ fontSize: '11px', color: 'var(--text-tertiary)' }} className="truncate">{ev.sub}</p>}
                    </div>
                    <span className="text-xs font-semibold shrink-0 px-2 py-0.5 rounded-lg"
                      style={{
                        background: ev.days! < 0 ? '#FEF3F2' : ev.days === 0 ? '#FFFAEB' : 'var(--surface-subtle)',
                        color: ev.days! < 0 ? '#B42318' : ev.days === 0 ? '#B54708' : 'var(--text-tertiary)',
                      }}>
                      {ev.days! < 0 ? `${Math.abs(ev.days!)}d atrás` : ev.days === 0 ? 'Hoy' : `en ${ev.days}d`}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function NavBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="p-1.5 rounded-lg transition"
      style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-subtle)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
      {children}
    </button>
  )
}

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
      {children}
    </div>
  )
}
