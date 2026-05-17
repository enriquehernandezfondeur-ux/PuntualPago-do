'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { formatCurrency, formatDate, formatMonth } from '@/lib/utils/format'
import { PaymentStatusBadge } from '@/components/shared/StatusBadge'
import { PortalTimeline } from '@/components/portals/PortalTimeline'
import type { Property, Payment, OwnerPayout, Lease, PropertyEvent } from '@/types/database'
import {
  Building2, TrendingUp, Wallet, AlertCircle,
  MessageCircle, Phone, DollarSign, Home, ChevronRight, BarChart3, Bell, HelpCircle,
} from 'lucide-react'

interface Props {
  ownerName: string
  properties: (Property & { current_lease?: Lease & { tenant?: { full_name: string } } })[]
  monthPayments: Payment[]
  pendingPayouts: OwnerPayout[]
  yearPayouts: (OwnerPayout & { property?: { name: string; address: string } })[]
  totalCollected: number
  totalPending: number
  pendingPayoutsAmount: number
  recentEvents?: PropertyEvent[]
  adminNotes?: Array<{ id: string; content: string; created_at: string; property_id?: string }>
  companyPhone?: string
  companyWhatsapp?: string
}

type Tab = 'resumen' | 'historial'

export function PropietarioPortalContent({
  ownerName, properties, monthPayments, pendingPayouts, yearPayouts,
  totalCollected, totalPending, pendingPayoutsAmount,
  recentEvents = [],
  adminNotes = [],
  companyPhone,
  companyWhatsapp,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('resumen')
  const occupied   = properties.filter(p => p.status === 'ocupada').length
  const now        = new Date()
  const monthLabel = now.toLocaleDateString('es-DO', { month: 'long', year: 'numeric' })
  const currentYear = now.getFullYear()

  // ── Rentabilidad por propiedad (últimos 12 meses) ──────────────────────────
  // Group yearPayouts by property_id
  const rentabilidadMap = new Map<string, {
    rentaBruta: number; comision: number; neto: number; meses: number
  }>()
  for (const payout of yearPayouts) {
    const pid = payout.property_id
    const prev = rentabilidadMap.get(pid) ?? { rentaBruta: 0, comision: 0, neto: 0, meses: 0 }
    rentabilidadMap.set(pid, {
      rentaBruta: prev.rentaBruta + payout.rent_collected,
      comision:   prev.comision   + payout.management_fee,
      neto:       prev.neto       + payout.net_payout,
      // Solo meses con renta cobrada > 0 — porcentaje real de cobro
      meses:      prev.meses      + (payout.rent_collected > 0 ? 1 : 0),
    })
  }

  // Historial anual: filter yearPayouts to currentYear, sorted by date desc
  const historialAnual = [...yearPayouts].filter(p => p.period_year === currentYear)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

      {/* Welcome */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hola, {ownerName.split(' ')[0]}</h1>
          <p className="text-slate-500 text-sm mt-0.5 capitalize">
            {pendingPayoutsAmount > 0
              ? <>Tienes <span className="font-semibold text-purple-700">{formatCurrency(pendingPayoutsAmount)}</span> pendiente de liquidación</>
              : totalPending > 0
                ? <>{monthLabel} · <span className="font-semibold text-amber-700">{formatCurrency(totalPending)}</span> por cobrar</>
                : <>{monthLabel} · <span className="font-semibold text-emerald-700">Todo al día</span></>
            }
          </p>
        </div>
        {pendingPayoutsAmount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <Wallet className="w-3.5 h-3.5" />
            {pendingPayouts.length} liquidación{pendingPayouts.length !== 1 ? 'es' : ''} pendiente{pendingPayouts.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Propiedades" value={properties.length} sub={`${occupied} ocupadas`} icon={Building2} color="blue" />
        <KpiCard label="Cobrado este mes" value={formatCurrency(totalCollected)} sub="Renta recibida" icon={TrendingUp} color="emerald" />
        <KpiCard label="Por cobrar" value={formatCurrency(totalPending)} sub="Pagos pendientes" icon={AlertCircle} color="amber" alert={totalPending > 0} />
        <KpiCard label="Liquidaciones pend." value={formatCurrency(pendingPayoutsAmount)} sub={`${pendingPayouts.length} transferencias`} icon={Wallet} color="purple" alert={pendingPayoutsAmount > 0} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('resumen')}
          className={cn(
            'px-4 py-1.5 rounded-lg text-sm font-medium transition',
            activeTab === 'resumen' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          )}
        >
          Mis propiedades
        </button>
        <button
          onClick={() => setActiveTab('historial')}
          className={cn(
            'px-4 py-1.5 rounded-lg text-sm font-medium transition',
            activeTab === 'historial' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          )}
        >
          Historial {currentYear}
        </button>
      </div>

      {activeTab === 'resumen' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Properties list with rentabilidad */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-slate-500" />
                  <h3 className="font-semibold text-slate-800 text-sm">Mis propiedades</h3>
                </div>
                <a href="/portal/propietario/propiedades" className="text-blue-600 text-xs font-medium hover:underline flex items-center gap-0.5">
                  Ver todo <ChevronRight className="w-3.5 h-3.5" />
                </a>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                {properties.slice(0, 5).map(p => {
                  const tenant = (p.current_lease as any)?.tenant
                  const statusColor = p.status === 'ocupada' ? 'bg-emerald-100 text-emerald-700'
                    : p.status === 'disponible' ? 'bg-blue-100 text-blue-700'
                    : 'bg-amber-100 text-amber-700'
                  const rent = rentabilidadMap.get(p.id)
                  const ocupPct = rent ? Math.round((rent.meses / 12) * 100) : 0
                  return (
                    <div key={p.id} className="px-4 py-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 text-sm truncate">{p.name}</p>
                          <p className="text-slate-400 text-xs truncate">{p.address}</p>
                          {tenant && <p className="text-slate-500 text-xs mt-0.5">{tenant.full_name}</p>}
                        </div>
                        <div className="shrink-0 text-right space-y-1">
                          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full capitalize', statusColor)}>
                            {p.status.replace('_', ' ')}
                          </span>
                          <p className="text-slate-700 text-sm font-semibold">{formatCurrency(p.rent_amount, p.currency)}</p>
                        </div>
                      </div>
                      {rent && rent.rentaBruta > 0 && (
                        <div className="mt-2.5 pt-2.5 border-t border-slate-50 grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-[11px] text-slate-400">Renta bruta</p>
                            <p className="text-xs font-semibold text-slate-700">{formatCurrency(rent.rentaBruta, p.currency)}</p>
                          </div>
                          <div>
                            <p className="text-[11px] text-slate-400">Comisión (10%)</p>
                            <p className="text-xs font-semibold text-red-500">−{formatCurrency(rent.comision, p.currency)}</p>
                          </div>
                          <div>
                            <p className="text-[11px] text-slate-400">Neto propietario</p>
                            <p className="text-xs font-semibold text-emerald-600">{formatCurrency(rent.neto, p.currency)}</p>
                          </div>
                          <div className="col-span-3 flex items-center gap-1.5 justify-center mt-1">
                            <BarChart3 className="w-3 h-3 text-blue-400" />
                            <span className={cn(
                              'text-[11px] font-semibold px-2 py-0.5 rounded-full',
                              ocupPct >= 90 ? 'bg-emerald-100 text-emerald-700'
                                : ocupPct >= 60 ? 'bg-blue-100 text-blue-700'
                                : 'bg-amber-100 text-amber-700'
                            )}>
                              {ocupPct}% cobro efectivo
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
                {properties.length === 0 && (
                  <div className="py-8 text-center text-slate-400 text-sm">Sin propiedades registradas</div>
                )}
              </div>
            </div>

            {/* Payments this month */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-slate-500" />
                  <h3 className="font-semibold text-slate-800 text-sm">Cobros del mes</h3>
                </div>
                <span className="text-slate-400 text-xs capitalize">{monthLabel}</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                {monthPayments.slice(0, 5).map(p => {
                  const tenant = (p as any).tenant
                  const prop   = (p as any).property
                  return (
                    <div key={p.id} className="px-4 py-3.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 text-sm truncate">{tenant?.full_name ?? '—'}</p>
                        <p className="text-slate-400 text-xs truncate">{prop?.name ?? '—'}</p>
                      </div>
                      <div className="shrink-0 text-right space-y-1">
                        <PaymentStatusBadge status={p.status} />
                        <p className={cn('text-sm font-semibold', p.status === 'pagado' ? 'text-emerald-600' : 'text-red-600')}>
                          {formatCurrency(p.status === 'pagado' ? p.amount_paid : p.balance_due, p.currency)}
                        </p>
                      </div>
                    </div>
                  )
                })}
                {monthPayments.length === 0 && (
                  <div className="py-8 text-center text-slate-400 text-sm">Sin pagos registrados este mes</div>
                )}
              </div>
            </div>
          </div>

          {/* Pending payouts with desglose visible */}
          {pendingPayouts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-purple-500" />
                <h3 className="font-semibold text-slate-800 text-sm">Liquidaciones pendientes</h3>
              </div>
              <div className="bg-white border border-purple-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                {pendingPayouts.map(payout => {
                  const prop = (payout as any).property
                  const maint = payout.maintenance_deductions ?? 0
                  return (
                    <div key={payout.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 text-sm truncate">{prop?.name ?? '—'}</p>
                          <p className="text-slate-500 text-xs capitalize">
                            {formatMonth(payout.period_year, payout.period_month)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-purple-700 font-bold text-lg">{formatCurrency(payout.net_payout, payout.currency)}</p>
                          <p className="text-slate-400 text-xs">Neto a recibir</p>
                        </div>
                      </div>
                      {/* Desglose */}
                      <div className="bg-slate-50 rounded-xl px-4 py-3 space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Renta cobrada</span>
                          <span className="font-semibold text-slate-700">{formatCurrency(payout.rent_collected, payout.currency)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Comisión PuntualPago (10%)</span>
                          <span className="font-semibold text-red-500">−{formatCurrency(payout.management_fee, payout.currency)}</span>
                        </div>
                        {maint > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Mantenimiento</span>
                            <span className="font-semibold text-red-500">−{formatCurrency(maint, payout.currency)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-xs pt-1.5 border-t border-slate-200">
                          <span className="font-semibold text-slate-700">Neto a recibir</span>
                          <span className="font-bold text-emerald-600">{formatCurrency(payout.net_payout, payout.currency)}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="text-slate-400 text-xs text-center">
                Las liquidaciones se transfieren los primeros días de cada mes. Contacta si tienes dudas.
              </p>
            </div>
          )}
        </>
      )}

      {activeTab === 'historial' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 text-sm">
              Liquidaciones {currentYear}
              <span className="ml-2 text-slate-400 font-normal">({historialAnual.length} registros)</span>
            </h3>
            {historialAnual.length > 0 && (
              <div className="text-right">
                <p className="text-xs text-slate-500">
                  Neto total: <span className="font-bold text-emerald-600">
                    {formatCurrency(historialAnual.reduce((s, p) => s + p.net_payout, 0))}
                  </span>
                </p>
              </div>
            )}
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            {historialAnual.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Período</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Propiedad</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Renta cobrada</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Comisión</th>
                    {historialAnual.some(p => (p.maintenance_deductions ?? 0) > 0) && (
                      <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Mant.</th>
                    )}
                    <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Neto</th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Estado</th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Fecha pago</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historialAnual.map(p => (
                    <tr key={p.id} className={cn('transition', p.paid ? 'hover:bg-emerald-50/40' : 'bg-amber-50/30 hover:bg-amber-50/50')}>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-800 capitalize text-sm">{formatMonth(p.period_year, p.period_month)}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-slate-600 text-sm">{p.property?.name ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <p className="text-slate-800 font-medium text-sm">{formatCurrency(p.rent_collected, p.currency)}</p>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <p className="text-red-500 text-sm">−{formatCurrency(p.management_fee, p.currency)}</p>
                      </td>
                      {historialAnual.some(px => (px.maintenance_deductions ?? 0) > 0) && (
                        <td className="px-4 py-3.5 text-right">
                          {(p.maintenance_deductions ?? 0) > 0
                            ? <p className="text-red-400 text-sm">−{formatCurrency(p.maintenance_deductions, p.currency)}</p>
                            : <p className="text-slate-300 text-sm">—</p>}
                        </td>
                      )}
                      <td className="px-4 py-3.5 text-right">
                        <p className={cn('font-bold text-sm', p.paid ? 'text-emerald-600' : 'text-slate-900')}>
                          {formatCurrency(p.net_payout, p.currency)}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {p.paid
                          ? <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">Pagado</span>
                          : <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">Pendiente</span>
                        }
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <p className="text-slate-500 text-xs">{p.paid_date ? formatDate(p.paid_date) : '—'}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-10 text-center text-slate-400 text-sm">
                Sin liquidaciones registradas en {currentYear}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin notes */}
      {adminNotes.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-500" />
            <h3 className="font-semibold text-slate-800 text-sm">Comunicados</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {adminNotes.map(n => (
              <div key={n.id} className="px-5 py-4">
                <p className="text-slate-700 text-sm leading-relaxed">{n.content}</p>
                <p className="text-slate-400 text-xs mt-1">{formatDate(n.created_at)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      {recentEvents.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800 text-sm">Actividad reciente</h3>
          </div>
          <div className="px-5 py-4">
            <PortalTimeline events={recentEvents} />
          </div>
        </div>
      )}

      {/* Contact */}
      <div className="bg-slate-900 rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
            <HelpCircle className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">¿Tienes alguna pregunta?</p>
            <p className="text-slate-400 text-xs">Equipo disponible Lun–Vie 8am–6pm</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {companyWhatsapp && (
            <a
              href={`https://wa.me/${companyWhatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-xl transition"
            >
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </a>
          )}
          {companyPhone && (
            <a
              href={`tel:${companyPhone.replace(/\s/g, '')}`}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-xl transition"
            >
              <Phone className="w-3.5 h-3.5" /> Llamar
            </a>
          )}
          {!companyWhatsapp && !companyPhone && (
            <p className="text-slate-500 text-sm">Escríbenos desde el portal.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function KpiCard({ label, value, sub, icon: Icon, color, alert }: {
  label: string; value: string | number; sub: string;
  icon: React.ComponentType<{ className?: string }>; color: string; alert?: boolean
}) {
  const colors: Record<string, { bg: string; icon: string }> = {
    blue:    { bg: 'bg-blue-50',    icon: 'text-blue-600'    },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600' },
    amber:   { bg: 'bg-amber-50',   icon: 'text-amber-600'   },
    purple:  { bg: 'bg-purple-50',  icon: 'text-purple-600'  },
  }
  const c = colors[color] ?? colors.blue
  return (
    <div className={cn('bg-white border rounded-2xl p-5 relative overflow-hidden', alert ? 'border-red-200' : 'border-slate-200')}>
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-4', c.bg)}>
        <Icon className={cn('w-5 h-5', c.icon)} />
      </div>
      <p className="font-bold text-slate-900 text-xl leading-tight truncate">{value}</p>
      <p className="text-slate-600 text-sm font-medium mt-1">{label}</p>
      <p className="text-slate-400 text-xs mt-0.5">{sub}</p>
      {alert && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-300 rounded-b-2xl" />}
    </div>
  )
}
