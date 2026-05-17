'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { formatCurrency, formatDate, DEFAULT_USD_TO_DOP } from '@/lib/utils/format'
import { PaymentStatusBadge } from '@/components/shared/StatusBadge'
import { PortalTimeline } from '@/components/portals/PortalTimeline'
import type { Payment, Lease, Tenant, Property, PropertyEvent } from '@/types/database'
import {
  CheckCircle2, AlertCircle, Clock, Home, CreditCard,
  Calendar, DollarSign, Shield, Phone, MessageCircle,
  FileText, Send, Loader2, FileDown, Bell,
} from 'lucide-react'

interface Props {
  tenant: Tenant
  activeLease: (Lease & { property: Property }) | null
  payments: Payment[]
  pendingBalance: number
  companyPhone?: string
  companyWhatsapp?: string
  contractDocumentUrl?: string | null
  usdRate?: number
  recentEvents?: PropertyEvent[]
  adminNotes?: Array<{ id: string; content: string; created_at: string }>
}

export function InquilinoPortalContent({
  tenant,
  activeLease,
  payments,
  pendingBalance,
  companyPhone,
  companyWhatsapp,
  contractDocumentUrl,
  usdRate = DEFAULT_USD_TO_DOP,
  recentEvents = [],
  adminNotes = [],
}: Props) {
  const property = activeLease?.property
  const nextDue  = payments.find(p => ['vence_pronto', 'al_dia'].includes(p.status))
  const overdue  = payments.filter(p => ['vencido', 'en_mora', 'en_legal'].includes(p.status))
  const paid     = payments.filter(p => p.status === 'pagado')
  const isOk     = overdue.length === 0 && pendingBalance === 0

  // Debt breakdown — sum balance_due across overdue payments, split by currency
  const overdueByDOP = overdue.filter(p => p.currency === 'DOP').reduce((s, p) => s + (p.balance_due ?? 0), 0)
  const overdueByUSD = overdue.filter(p => p.currency === 'USD').reduce((s, p) => s + (p.balance_due ?? 0), 0)
  // Total in DOP for display
  const totalOwedDOP = overdueByDOP + overdueByUSD * usdRate
  const totalOwedUSD = overdueByDOP / usdRate + overdueByUSD

  // Message form state
  const [msgOpen, setMsgOpen]       = useState(false)
  const [msgSubject, setMsgSubject] = useState('')
  const [msgContent, setMsgContent] = useState('')
  const [msgSending, setMsgSending] = useState(false)
  const [msgSent, setMsgSent]       = useState(false)
  const [msgError, setMsgError]     = useState<string | null>(null)

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!msgContent.trim()) return
    setMsgSending(true)
    setMsgError(null)
    try {
      const res = await fetch('/api/portal/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: msgSubject, content: msgContent }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error desconocido')
      setMsgSent(true)
      setMsgContent('')
      setMsgSubject('')
    } catch (err: unknown) {
      setMsgError(err instanceof Error ? err.message : 'Error al enviar el mensaje')
    } finally {
      setMsgSending(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

      {/* ── CTA urgente si hay deuda ── */}
      {!isOk && (
        <a
          href="/portal/inquilino/comprobante"
          className="flex items-center gap-4 rounded-2xl p-5 transition-all"
          style={{ background: 'linear-gradient(135deg,#DC2626,#B91C1C)', boxShadow: '0 4px 24px rgba(220,38,38,0.35)' }}
        >
          <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-base">
              {overdue.length === 1 ? '1 pago vencido' : `${overdue.length} pagos vencidos`} — {overdueByDOP > 0 ? formatCurrency(overdueByDOP, 'DOP') : formatCurrency(overdueByUSD, 'USD')}
            </p>
            <p className="text-red-200 text-sm mt-0.5">¿Ya pagaste? Sube tu comprobante para regularizar tu cuenta</p>
          </div>
          <div className="shrink-0 bg-white text-red-700 rounded-xl px-4 py-2 font-bold text-sm">
            Subir comprobante
          </div>
        </a>
      )}

      {/* Welcome banner */}
      <div className={cn(
        'rounded-2xl p-5 flex items-start gap-4',
        isOk ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
      )}>
        <div className={cn('p-3 rounded-xl shrink-0', isOk ? 'bg-emerald-100' : 'bg-red-100')}>
          {isOk
            ? <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            : <AlertCircle className="w-6 h-6 text-red-600" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-slate-900 text-lg">
            Hola, {tenant.full_name.split(' ')[0]}
          </h2>
          {isOk ? (
            <p className="text-sm mt-0.5 text-emerald-700">
              Estás al día con todos tus pagos. ¡Excelente!
            </p>
          ) : (
            <div className="mt-1 space-y-1">
              <p className="text-sm text-red-700 font-medium">
                Tienes {overdue.length} pago{overdue.length !== 1 ? 's' : ''} vencido{overdue.length !== 1 ? 's' : ''}
              </p>
              {/* Debt breakdown */}
              <div className="flex flex-wrap gap-3 mt-1">
                {overdueByDOP > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 border border-red-200 rounded-lg text-xs font-semibold text-red-800">
                    <DollarSign className="w-3 h-3" />
                    {formatCurrency(overdueByDOP, 'DOP')}
                  </span>
                )}
                {overdueByUSD > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 border border-red-200 rounded-lg text-xs font-semibold text-red-800">
                    <DollarSign className="w-3 h-3" />
                    {formatCurrency(overdueByUSD, 'USD')}
                  </span>
                )}
                {overdueByDOP > 0 && overdueByUSD > 0 && (
                  <span className="text-xs text-red-600 self-center">
                    Total aprox: {formatCurrency(totalOwedDOP, 'DOP')} / {formatCurrency(totalOwedUSD, 'USD')}
                  </span>
                )}
                {overdueByDOP > 0 && overdueByUSD === 0 && (
                  <span className="text-xs text-red-500 self-center">
                    ≈ {formatCurrency(totalOwedUSD, 'USD')}
                  </span>
                )}
                {overdueByUSD > 0 && overdueByDOP === 0 && (
                  <span className="text-xs text-red-500 self-center">
                    ≈ {formatCurrency(totalOwedDOP, 'DOP')}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard
          label="Balance pendiente"
          value={pendingBalance > 0 ? formatCurrency(pendingBalance) : 'Al día'}
          icon={DollarSign}
          alert={pendingBalance > 0}
          color="red"
        />
        <KpiCard
          label="Pagos al día"
          value={paid.length}
          icon={CheckCircle2}
          color="emerald"
        />
        <KpiCard
          label="Día de pago"
          value={activeLease ? `Día ${activeLease.payment_day}` : '—'}
          icon={Calendar}
          color="blue"
        />
        <KpiCard
          label="Renta mensual"
          value={activeLease ? formatCurrency(activeLease.rent_amount, activeLease.currency) : '—'}
          icon={CreditCard}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Property info */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Home className="w-4 h-4 text-slate-500" />
            <h3 className="font-semibold text-slate-800 text-sm">Mi propiedad</h3>
          </div>
          {property ? (
            <div className="space-y-2">
              <div>
                <p className="font-bold text-slate-900">{property.name}</p>
                <p className="text-slate-500 text-sm">{property.address}</p>
                {property.sector && <p className="text-slate-400 text-xs">{property.sector}, {property.city}</p>}
              </div>
              {activeLease && (
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <InfoRow label="Contrato" value={activeLease.contract_number ?? '—'} />
                  <InfoRow label="Inicio"   value={formatDate(activeLease.start_date)} />
                  <InfoRow label="Vence"    value={formatDate(activeLease.end_date)} />
                  <InfoRow label="Recargo"  value={`${activeLease.late_fee_percentage}% si pagas después del día ${activeLease.payment_day + activeLease.late_fee_grace_days}`} />
                </div>
              )}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">Sin propiedad activa</p>
          )}
        </div>

        {/* Next payment */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h3 className="font-semibold text-slate-800 text-sm">Próximo pago</h3>
          </div>
          {overdue.length > 0 ? (
            <div className="space-y-3">
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-red-700 font-semibold text-sm">Pagos vencidos</p>
                <p className="text-red-600 text-xs mt-0.5">Regulariza cuanto antes para evitar acciones legales</p>
              </div>
              {overdue.slice(0, 2).map(p => (
                <div key={p.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-700 text-sm font-medium capitalize">
                      {new Date(p.period_year, p.period_month - 1).toLocaleDateString('es-DO', { month: 'long', year: 'numeric' })}
                    </p>
                    <p className="text-red-500 text-xs">{p.days_overdue} días de mora</p>
                  </div>
                  <p className="text-red-700 font-bold">{formatCurrency(p.balance_due, p.currency)}</p>
                </div>
              ))}
            </div>
          ) : nextDue ? (
            <div className="space-y-3">
              <div>
                <p className="text-slate-500 text-xs">Período</p>
                <p className="text-slate-900 font-bold capitalize">
                  {new Date(nextDue.period_year, nextDue.period_month - 1).toLocaleDateString('es-DO', { month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 rounded-xl p-2.5">
                  <p className="text-slate-400 text-xs">Renta</p>
                  <p className="text-slate-900 font-semibold text-sm">{formatCurrency(nextDue.rent_amount, nextDue.currency)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-2.5">
                  <p className="text-slate-400 text-xs">Vence</p>
                  <p className="text-slate-900 font-semibold text-sm">{formatDate(nextDue.due_date)}</p>
                </div>
              </div>
              <PaymentStatusBadge status={nextDue.status} />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
              <p className="text-sm font-medium">Sin pagos pendientes</p>
            </div>
          )}
        </div>

        {/* Contact */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MessageCircle className="w-4 h-4 text-slate-500" />
              <h3 className="font-semibold text-slate-800 text-sm">Contacto</h3>
            </div>
            <p className="text-slate-500 text-xs">
              {isOk ? 'Para consultas o dudas, escríbenos.' : '¿Ya pagaste? WhatsApp es más rápido.'}
            </p>
          </div>
          <div className="space-y-2">
            {companyWhatsapp && (
              <a
                href={`https://wa.me/${companyWhatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 px-3.5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition w-full justify-center"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
                <span className="ml-auto text-emerald-200 text-xs font-normal">Resp. rápida</span>
              </a>
            )}
            {companyPhone && (
              <a
                href={`tel:${companyPhone.replace(/\s/g, '')}`}
                className="flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition w-full justify-center"
              >
                <Phone className="w-4 h-4" />
                Llamar
              </a>
            )}
          </div>
          <p className="text-slate-400 text-xs text-center">Lun–Vie 8am–6pm · Sáb 9am–1pm</p>
        </div>
      </div>

      {/* Active contract section */}
      {activeLease && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <h3 className="font-semibold text-slate-800 text-sm">Contrato activo</h3>
            </div>
            {contractDocumentUrl && (
              <a
                href={contractDocumentUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition"
              >
                <FileDown className="w-3.5 h-3.5" />
                Descargar contrato
              </a>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-slate-400 text-xs mb-0.5">Fecha inicio</p>
              <p className="text-slate-800 font-semibold text-sm">{formatDate(activeLease.start_date)}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-slate-400 text-xs mb-0.5">Fecha fin</p>
              <p className="text-slate-800 font-semibold text-sm">{formatDate(activeLease.end_date)}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-slate-400 text-xs mb-0.5">Monto mensual</p>
              <p className="text-slate-800 font-semibold text-sm">
                {formatCurrency(activeLease.rent_amount, activeLease.currency)}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-slate-400 text-xs mb-0.5">No. contrato</p>
              <p className="text-slate-800 font-semibold text-sm font-mono">{activeLease.contract_number ?? '—'}</p>
            </div>
          </div>
          {!contractDocumentUrl && (
            <p className="text-slate-400 text-xs mt-3">
              El documento de contrato no está disponible aún. Contacta a PuntualPago para solicitarlo.
            </p>
          )}
        </div>
      )}

      {/* Send message to admin */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <button
          onClick={() => setMsgOpen(o => !o)}
          className="w-full flex items-center justify-between gap-2 px-5 py-4 hover:bg-slate-50 transition"
        >
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-slate-500" />
            <span className="font-semibold text-slate-800 text-sm">Enviar mensaje al equipo</span>
          </div>
          <span className="text-xs text-slate-400">{msgOpen ? 'Cerrar ↑' : 'Abrir ↓'}</span>
        </button>
        {msgOpen && (
          <div className="px-5 pb-5 border-t border-slate-100 pt-4">
          {msgSent ? (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-emerald-800 font-semibold text-sm">Mensaje enviado</p>
              <p className="text-emerald-700 text-xs mt-0.5">Nuestro equipo lo revisará a la brevedad posible.</p>
            </div>
            <button
              onClick={() => setMsgSent(false)}
              className="ml-auto text-xs text-emerald-600 hover:underline font-medium"
            >
              Nuevo mensaje
            </button>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="space-y-3">
            <input
              type="text"
              placeholder="Asunto (opcional)"
              value={msgSubject}
              onChange={e => setMsgSubject(e.target.value)}
              maxLength={120}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
            />
            <textarea
              placeholder="Escribe tu mensaje aquí…"
              value={msgContent}
              onChange={e => setMsgContent(e.target.value)}
              required
              rows={4}
              maxLength={2000}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none placeholder:text-slate-400"
            />
            {msgError && (
              <p className="text-red-600 text-xs flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {msgError}
              </p>
            )}
            <div className="flex items-center justify-between">
              <p className="text-slate-400 text-xs">{msgContent.length}/2000 caracteres</p>
              <button
                type="submit"
                disabled={msgSending || !msgContent.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition"
              >
                {msgSending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando…</>
                  : <><Send className="w-4 h-4" /> Enviar mensaje</>
                }
              </button>
            </div>
          </form>
        )}
        <p className="text-slate-400 text-xs mt-3 text-center">Respuesta en 24–48 horas. Para urgencias usa WhatsApp.</p>
          </div>
        )}
      </div>

      {/* Admin announcements */}
      {adminNotes.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-500" />
            <h3 className="font-semibold text-slate-800 text-sm">Comunicados del equipo</h3>
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

      {/* Recent payments */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 text-sm">Historial reciente</h3>
          <a href="/portal/inquilino/pagos" className="text-blue-600 text-xs font-medium hover:underline">Ver todo</a>
        </div>
        {payments.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm">Sin historial de pagos</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {payments.slice(0, 5).map(p => (
              <div key={p.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-slate-700 font-medium text-sm capitalize">
                    {new Date(p.period_year, p.period_month - 1).toLocaleDateString('es-DO', { month: 'long', year: 'numeric' })}
                  </p>
                  {p.paid_date && <p className="text-slate-400 text-xs">Pagado el {formatDate(p.paid_date)}</p>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <p className={cn('font-semibold text-sm', p.status === 'pagado' ? 'text-emerald-600' : 'text-red-600')}>
                    {formatCurrency(p.status === 'pagado' ? p.amount_paid : p.balance_due, p.currency)}
                  </p>
                  <PaymentStatusBadge status={p.status} />
                  {p.status === 'pagado' && (
                    <a
                      href={`/portal/inquilino/recibo/${p.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition"
                    >
                      <FileText className="w-3 h-3" />
                      Recibo
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Property timeline */}
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
    </div>
  )
}

function KpiCard({ label, value, icon: Icon, alert, color }: {
  label: string; value: string | number; icon: React.ComponentType<{ className?: string }>;
  alert?: boolean; color: 'red' | 'emerald' | 'blue' | 'purple'
}) {
  const colors = {
    red:     { bg: 'bg-red-50',     icon: 'text-red-600'     },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600' },
    blue:    { bg: 'bg-blue-50',    icon: 'text-blue-600'    },
    purple:  { bg: 'bg-purple-50',  icon: 'text-purple-600'  },
  }
  const c = colors[color]
  return (
    <div className={cn('bg-white border rounded-2xl p-5 relative overflow-hidden', alert ? 'border-red-200' : 'border-slate-200')}>
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', c.bg)}>
        <Icon className={cn('w-5 h-5', c.icon)} />
      </div>
      <p className="font-bold text-slate-900 text-xl leading-tight truncate">{value}</p>
      <p className="text-slate-600 text-sm font-medium mt-1">{label}</p>
      {alert && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-300 rounded-b-2xl" />}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-slate-400 text-xs">{label}</span>
      <span className="text-slate-700 text-xs font-medium text-right">{value}</span>
    </div>
  )
}
