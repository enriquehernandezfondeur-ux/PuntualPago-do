'use client'
import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils/cn'
import { PaymentStatusBadge } from '@/components/shared/StatusBadge'
import { formatCurrency, formatDate, formatDualCurrency, toDOP, DEFAULT_USD_TO_DOP, initials } from '@/lib/utils/format'
import type { Payment, PaymentStatus, Currency } from '@/types/database'
import {
  CreditCard, Phone, MessageCircle, CheckCircle2, AlertTriangle,
  X, Eye, DollarSign, Shield, Clock, Search, Loader2, Send, Scale,
  ListChecks, Square, SquareCheck, UserCheck,
} from 'lucide-react'
import { RegisterPaymentModal } from './RegisterPaymentModal'
import { EscalarLegalModal } from './EscalarLegalModal'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/hooks/useUser'

const today        = new Date()
const dayOfMonth   = today.getDate()
const GRACE_END    = 5
const IN_GRACE     = dayOfMonth >= 1 && dayOfMonth <= GRACE_END
const GRACE_DAYS_LEFT = Math.max(0, GRACE_END - dayOfMonth)

const STATUS_FILTERS: { label: string; value: PaymentStatus | 'todos'; dot: string }[] = [
  { label: 'Todos',         value: 'todos',             dot: '#94A3B8' },
  { label: 'Al día',        value: 'al_dia',            dot: '#12B76A' },
  { label: IN_GRACE ? `Gracia (${GRACE_DAYS_LEFT}d)` : 'Vence pronto',
                            value: 'vence_pronto',      dot: '#F79009' },
  { label: 'Vencido',       value: 'vencido',           dot: '#EF6820' },
  { label: 'En mora',       value: 'en_mora',           dot: '#F04438' },
  { label: 'Legal',         value: 'en_legal',          dot: '#7F56D9' },
  { label: 'Garantía',      value: 'cubierto_garantia', dot: '#1570EF' },
]

interface CobrosUser { id: string; full_name: string; email: string; role: string }

interface Props { payments: Payment[]; cobrosUsers: CobrosUser[] }

export function CobrosContent({ payments, cobrosUsers }: Props) {
  const router = useRouter()
  const { user: currentUser } = useUser()

  // Local assignment map: paymentId -> userId (optimistic, no DB field yet)
  const [assignmentMap, setAssignmentMap] = useState<Record<string, string>>({})
  const [activeFilter, setActiveFilter]           = useState<PaymentStatus | 'todos'>('todos')
  const [selectedPayment, setSelectedPayment]     = useState<Payment | null>(null)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [registerTarget, setRegisterTarget]       = useState<Payment | null>(null)
  const [search, setSearch]                       = useState('')
  const [whatsappLoading, setWhatsappLoading]     = useState<string | null>(null)
  const [whatsappStatus, setWhatsappStatus]       = useState<Record<string, 'sent' | 'error'>>({})
  const [legalTarget, setLegalTarget]             = useState<Payment | null>(null)
  // Bulk selection
  const [selectedIds, setSelectedIds]             = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading]             = useState(false)
  const [bulkResult, setBulkResult]               = useState<{ ok: number; fail: number } | null>(null)

  const filtered = useMemo(() => {
    let r = payments
    if (activeFilter !== 'todos') r = r.filter(p => p.status === activeFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(p => {
        const t    = (p as any).tenant
        const prop = (p as any).property
        return (
          t?.full_name?.toLowerCase().includes(q) ||
          prop?.name?.toLowerCase().includes(q) ||
          (p.payment_number ?? '').toLowerCase().includes(q)
        )
      })
    }
    return r
  }, [payments, activeFilter, search])

  const counts = useMemo(() => {
    const c: Record<string, number> = { todos: payments.length }
    for (const p of payments) c[p.status] = (c[p.status] ?? 0) + 1
    return c
  }, [payments])

  const totalArrearsDOP = payments
    .filter(p => ['vencido','en_mora','en_legal'].includes(p.status))
    .reduce((s, p) => s + toDOP(p.balance_due, (p.currency ?? 'DOP') as Currency, DEFAULT_USD_TO_DOP), 0)
  const totalArrears = totalArrearsDOP
  const moraDual = formatDualCurrency(totalArrearsDOP, 'DOP', DEFAULT_USD_TO_DOP)
  const criticalCount = (counts['vencido'] ?? 0) + (counts['en_mora'] ?? 0) + (counts['en_legal'] ?? 0)
  const paidCount = counts['pagado'] ?? 0
  const totalCount = payments.length
  const paidPct = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0

  function openRegister(p: Payment) {
    setRegisterTarget(p)
    setShowRegisterModal(true)
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(p => p.id)))
    }
  }

  async function bulkRegisterPaid() {
    if (selectedIds.size === 0 || bulkLoading) return
    setBulkLoading(true)
    setBulkResult(null)
    let ok = 0, fail = 0
    // Usa la API server-side para validación, auditoría y recálculo de risk score
    for (const id of Array.from(selectedIds)) {
      const p = payments.find(x => x.id === id)
      if (!p) continue
      const res = await fetch('/api/payments/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId:  id,
          amountPaid: p.balance_due.toString(),
          method:     'Transferencia bancaria',
          paidDate:   new Date().toISOString().split('T')[0],
          sendEmail:  false,
        }),
      })
      if (res.ok) ok++; else fail++
    }
    setBulkResult({ ok, fail })
    setSelectedIds(new Set())
    setBulkLoading(false)
    router.refresh()
  }

  async function sendWhatsApp(p: Payment, e: React.MouseEvent) {
    e.stopPropagation()
    if (whatsappLoading) return
    setWhatsappLoading(p.id)
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: p.id }),
      })
      setWhatsappStatus(prev => ({ ...prev, [p.id]: res.ok ? 'sent' : 'error' }))
    } catch {
      setWhatsappStatus(prev => ({ ...prev, [p.id]: 'error' }))
    } finally {
      setWhatsappLoading(null)
    }
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* ── Main panel ──────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Grace period notice */}
        {IN_GRACE && (counts['vence_pronto'] ?? 0) > 0 && (
          <div
            className="px-6 py-2.5 flex items-center gap-2.5 text-sm shrink-0"
            style={{ background: '#FFFAEB', borderBottom: '1px solid #FEF0C7', color: '#B54708' }}
          >
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <p>
              <strong>Período de pago activo</strong> — Inquilinos tienen hasta el día 5.
              {GRACE_DAYS_LEFT > 0
                ? ` ${GRACE_DAYS_LEFT} día${GRACE_DAYS_LEFT !== 1 ? 's' : ''} restante${GRACE_DAYS_LEFT !== 1 ? 's' : ''}.`
                : ' Hoy es el último día.'
              }
              {' '}<strong>{counts['vence_pronto'] ?? 0} pendientes</strong> en este período.
            </p>
          </div>
        )}

        {/* Summary bar */}
        <div
          className="px-6 py-3 shrink-0 flex items-center gap-4"
          style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
        >
          {/* Pills izquierda */}
          <div className="flex flex-wrap items-center gap-4 flex-1 min-w-0">
            <SummaryPill label="En cartera" value={payments.length} icon={CreditCard} color="default" />
            <Sep />
            <SummaryPill label="Críticos" value={criticalCount} icon={AlertTriangle} color={criticalCount > 0 ? 'red' : 'default'} />
            <Sep />
            <SummaryPill label="Monto en mora" value={`${moraDual.primary} · ${moraDual.secondary}`} icon={DollarSign} color={totalArrears > 0 ? 'red' : 'default'} />
            <Sep />
            <SummaryPill label="Garantía activa" value={counts['cubierto_garantia'] ?? 0} icon={Shield} color="blue" />
            {currentUser?.role === 'equipo_cobros' && (
              <>
                <Sep />
                <SummaryPill label="Asignados a mí" value={Object.values(assignmentMap).filter(uid => uid === currentUser.id).length} icon={UserCheck} color="default" />
              </>
            )}
          </div>

          {/* Progreso pagados — derecha */}
          <div className="shrink-0 flex items-center gap-3 pl-4" style={{ borderLeft: '1px solid var(--border)' }}>
            <div className="text-right">
              <p className="font-semibold text-sm leading-tight" style={{ color: paidPct >= 80 ? '#027A48' : paidPct >= 50 ? '#B54708' : 'var(--text)' }}>
                {paidCount} / {totalCount}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Pagados este mes</p>
            </div>
            <div className="relative w-10 h-10">
              <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" style={{ stroke: 'var(--border)' }} />
                <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" strokeLinecap="round"
                  style={{ stroke: paidPct >= 80 ? '#12B76A' : paidPct >= 50 ? '#F79009' : '#F04438', strokeDasharray: `${paidPct} 100`, transition: 'stroke-dasharray 0.6s ease' }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center font-bold" style={{ fontSize: '9px', color: 'var(--text)' }}>{paidPct}%</span>
            </div>
          </div>
        </div>

        {/* Filter + search */}
        <div
          className="px-6 py-2 flex items-center gap-3 shrink-0"
          style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
        >
          <div
            className="flex items-center gap-px p-1 rounded-lg"
            style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}
          >
            {STATUS_FILTERS.map(f => {
              const active = activeFilter === f.value
              const count  = counts[f.value] ?? 0
              return (
                <button
                  key={f.value}
                  onClick={() => setActiveFilter(f.value)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all"
                  style={active
                    ? { background: 'var(--surface)', color: 'var(--text)', boxShadow: '0 1px 2px rgba(16,24,40,0.08)' }
                    : { color: 'var(--text-tertiary)' }
                  }
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: f.dot }} />
                  {f.label}
                  {count > 0 && (
                    <span style={{ color: active ? 'var(--text-secondary)' : 'var(--text-tertiary)', fontSize: '11px' }}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar inquilino, propiedad o número de pago..."
              className="w-full pl-8 pr-7 py-1.5 rounded-lg text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <X className="w-3 h-3" style={{ color: 'var(--text-tertiary)' }} />
              </button>
            )}
          </div>

          <p className="text-xs shrink-0 font-medium" style={{ color: 'var(--text-tertiary)' }}>
            {filtered.length}<span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}> / {payments.length}</span>
          </p>
        </div>

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div
            className="px-6 py-2.5 flex items-center gap-3 shrink-0"
            style={{ background: '#EFF8FF', borderBottom: '1px solid #B2DDFF' }}
          >
            <ListChecks className="w-4 h-4" style={{ color: '#1570EF' }} />
            <p className="text-sm font-medium" style={{ color: '#175CD3' }}>
              {selectedIds.size} pago{selectedIds.size !== 1 ? 's' : ''} seleccionado{selectedIds.size !== 1 ? 's' : ''}
            </p>
            <button
              onClick={bulkRegisterPaid}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition ml-auto disabled:opacity-60"
              style={{ background: '#12B76A' }}
            >
              {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              {bulkLoading ? 'Registrando...' : 'Marcar todos como pagados'}
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="p-1 rounded-md"
              style={{ color: '#175CD3' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {bulkResult && (
          <div
            className="px-6 py-2 text-xs shrink-0 flex items-center gap-2"
            style={{ background: bulkResult.fail > 0 ? '#FFF6ED' : '#ECFDF3', color: bulkResult.fail > 0 ? '#B54708' : '#027A48' }}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {bulkResult.ok} registrado{bulkResult.ok !== 1 ? 's' : ''} correctamente{bulkResult.fail > 0 ? `, ${bulkResult.fail} con error` : ''}.
            <button onClick={() => setBulkResult(null)} className="ml-auto"><X className="w-3 h-3" /></button>
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <CreditCard className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} />
              </div>
              <p className="font-medium text-sm" style={{ color: 'var(--text)' }}>Sin pagos en esta categoría</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Ajusta los filtros para ver otros registros</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="sticky top-0 z-10"
                  style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
                >
                  <th className="pl-4 pr-2 py-2.5 w-8">
                    <button onClick={toggleSelectAll} className="flex items-center" title={selectedIds.size === filtered.length ? 'Deseleccionar todos' : 'Seleccionar todos'}>
                      {selectedIds.size === filtered.length && filtered.length > 0
                        ? <SquareCheck className="w-4 h-4" style={{ color: '#1570EF' }} />
                        : <Square className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                      }
                    </button>
                  </th>
                  {['Inquilino / Propiedad', 'Período', 'Renta', 'Mora', 'Adeudado', 'Estado', 'Vence', 'Asignado a', ''].map(h => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-left font-medium whitespace-nowrap"
                      style={{ fontSize: '11px', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const tenant    = (p as any).tenant
                  const prop      = (p as any).property
                  const isOverdue = ['vencido','en_mora','en_legal'].includes(p.status)
                  const isSelected = selectedPayment?.id === p.id

                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedPayment(isSelected ? null : p)}
                      className="group cursor-pointer transition-colors"
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        background: selectedIds.has(p.id) ? '#F0F9FF' : isSelected ? '#EFF8FF' : '',
                      }}
                      onMouseEnter={e => { if (!isSelected && !selectedIds.has(p.id)) (e.currentTarget as HTMLElement).style.background = 'var(--surface-subtle)' }}
                      onMouseLeave={e => { if (!isSelected && !selectedIds.has(p.id)) (e.currentTarget as HTMLElement).style.background = '' }}
                    >
                      {/* Checkbox bulk */}
                      <td className="pl-4 pr-2 py-3 w-8" onClick={e => { e.stopPropagation(); toggleSelect(p.id) }}>
                        {selectedIds.has(p.id)
                          ? <SquareCheck className="w-4 h-4" style={{ color: '#1570EF' }} />
                          : <Square className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-tertiary)' }} />
                        }
                      </td>
                      {/* Inquilino */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center font-bold shrink-0"
                            style={{
                              fontSize: '11px',
                              background: isOverdue ? '#FEF3F2' : '#EFF8FF',
                              color: isOverdue ? '#B42318' : '#175CD3',
                            }}
                          >
                            {tenant?.full_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('') ?? '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate" style={{ fontSize: '13px', color: 'var(--text)' }}>
                              {tenant?.full_name ?? '—'}
                            </p>
                            <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                              {prop?.name ?? '—'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Período */}
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium capitalize" style={{ color: 'var(--text)' }}>
                          {new Date(p.period_year, p.period_month - 1).toLocaleDateString('es-DO', { month: 'short', year: 'numeric' })}
                        </p>
                        {p.payment_number && (
                          <p className="font-mono" style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                            {p.payment_number}
                          </p>
                        )}
                      </td>

                      {/* Renta */}
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>
                          {formatCurrency(p.rent_amount, p.currency)}
                        </p>
                      </td>

                      {/* Mora */}
                      <td className="px-4 py-3">
                        {p.late_fee > 0
                          ? <p className="text-xs font-medium" style={{ color: '#B42318' }}>{formatCurrency(p.late_fee, p.currency)}</p>
                          : <p style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>—</p>
                        }
                      </td>

                      {/* Adeudado */}
                      <td className="px-4 py-3">
                        <p className="font-semibold text-sm" style={{ color: p.balance_due > 0 ? '#B42318' : '#027A48' }}>
                          {p.balance_due > 0 ? formatCurrency(p.balance_due, p.currency) : 'Pagado'}
                        </p>
                        {p.days_overdue > 0 && (
                          <p style={{ fontSize: '11px', color: '#B42318' }}>{p.days_overdue}d mora</p>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3">
                        <PaymentStatusBadge status={p.status} size="xs" />
                      </td>

                      {/* Vence */}
                      <td className="px-4 py-3">
                        {p.status === 'vence_pronto' && IN_GRACE ? (
                          <div>
                            <p className="text-xs font-semibold" style={{ color: '#B54708' }}>Período 1–5</p>
                            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{GRACE_DAYS_LEFT}d restantes</p>
                          </div>
                        ) : (
                          <p className="text-xs font-medium" style={{ color: isOverdue ? '#B42318' : 'var(--text-secondary)' }}>
                            {formatDate(p.due_date)}
                          </p>
                        )}
                      </td>

                      {/* Asignado a */}
                      <td className="px-4 py-3">
                        {assignmentMap[p.id] ? (() => {
                          const assignee = cobrosUsers.find(u => u.id === assignmentMap[p.id])
                          return assignee ? (
                            <span
                              className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
                              title={assignee.full_name}
                              style={{ background: '#EFF8FF', color: '#175CD3' }}
                            >
                              {initials(assignee.full_name)}
                            </span>
                          ) : null
                        })() : (
                          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ActionBtn title="Llamar"          icon={Phone}         onClick={(e) => { e.stopPropagation(); const t = (p as any).tenant; if (t?.phone) window.open(`tel:${t.phone}`) }} />
                          <ActionBtn
                            title={whatsappStatus[p.id] === 'sent' ? 'Enviado' : 'WhatsApp'}
                            icon={whatsappLoading === p.id ? Loader2 : MessageCircle}
                            onClick={(e) => sendWhatsApp(p, e)}
                            activeColor={whatsappStatus[p.id] === 'sent' ? '#027A48' : whatsappStatus[p.id] === 'error' ? '#B42318' : undefined}
                          />
                          <ActionBtn title="Registrar pago"  icon={CheckCircle2}  onClick={(e) => { e.stopPropagation(); openRegister(p) }} activeColor="#1570EF" />
                          {['vencido','en_mora'].includes(p.status) && (
                            <ActionBtn title="Escalar a legal" icon={Scale} onClick={(e) => { e.stopPropagation(); setLegalTarget(p) }} activeColor="#6941C6" />
                          )}
                          <ActionBtn title="Ver detalle"     icon={Eye}           onClick={(e) => { e.stopPropagation(); setSelectedPayment(isSelected ? null : p) }} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Detail panel ──────────────────────────── */}
      {selectedPayment && (
        <PaymentDetailPanel
          payment={selectedPayment}
          onClose={() => setSelectedPayment(null)}
          onRegister={() => openRegister(selectedPayment)}
          cobrosUsers={cobrosUsers}
          assignedTo={assignmentMap[selectedPayment.id] ?? null}
          onAssign={(userId) => setAssignmentMap(prev => ({ ...prev, [selectedPayment.id]: userId }))}
        />
      )}

      {/* Register modal */}
      {showRegisterModal && registerTarget && (
        <RegisterPaymentModal
          payment={registerTarget}
          onClose={() => { setShowRegisterModal(false); setRegisterTarget(null) }}
        />
      )}
      {legalTarget && (
        <EscalarLegalModal payment={legalTarget} onClose={() => setLegalTarget(null)} />
      )}
    </div>
  )
}

function Sep() {
  return <div className="w-px h-6 shrink-0" style={{ background: 'var(--border)' }} />
}

function SummaryPill({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: React.ComponentType<{ className?: string }>;
  color: 'default' | 'red' | 'blue'
}) {
  const c = { default: { icon: 'var(--text-tertiary)', val: 'var(--text)' }, red: { icon: '#F04438', val: '#B42318' }, blue: { icon: '#1570EF', val: '#175CD3' } }[color]
  return (
    <div className="flex items-center gap-2">
      <span style={{ color: c.icon, display: 'flex' }}><Icon className="w-3.5 h-3.5 shrink-0" /></span>
      <div>
        <p className="font-semibold text-sm leading-tight" style={{ color: c.val }}>{value}</p>
        <p className="leading-tight" style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{label}</p>
      </div>
    </div>
  )
}

function ActionBtn({ title, icon: Icon, onClick, activeColor }: {
  title: string; icon: React.ComponentType<{ className?: string }>;
  onClick: (e: React.MouseEvent) => void; activeColor?: string
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="p-1.5 rounded-md transition"
      style={{ color: activeColor ?? 'var(--text-tertiary)' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-subtle)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  )
}

function PaymentDetailPanel({ payment, onClose, onRegister, cobrosUsers, assignedTo, onAssign }: {
  payment: Payment
  onClose: () => void
  onRegister: () => void
  cobrosUsers: CobrosUser[]
  assignedTo: string | null
  onAssign: (userId: string) => void
}) {
  const tenant    = (payment as any).tenant
  const prop      = (payment as any).property
  const isOverdue = ['vencido','en_mora','en_legal'].includes(payment.status)

  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailStatus, setEmailStatus]   = useState<'idle' | 'sent' | 'error'>('idle')
  const [assigning, setAssigning]       = useState(false)

  async function handleAssign(userId: string) {
    if (!userId) return
    setAssigning(true)
    try {
      const supabase = createClient()
      // Attempt DB update — field may not exist yet, so we ignore errors silently
      await supabase
        .from('payments')
        .update({ assigned_to: userId, updated_at: new Date().toISOString() } as any)
        .eq('id', payment.id)
    } catch {
      // Field may not exist in DB yet — proceed optimistically
    } finally {
      onAssign(userId)
      setAssigning(false)
    }
  }

  async function handleSendReminder() {
    if (sendingEmail) return
    setSendingEmail(true)
    setEmailStatus('idle')
    try {
      const res = await fetch('/api/emails/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: payment.id }),
      })
      setEmailStatus(res.ok ? 'sent' : 'error')
    } catch {
      setEmailStatus('error')
    } finally {
      setSendingEmail(false)
    }
  }

  return (
    <div
      className="w-72 flex flex-col border-l overflow-y-auto scrollbar-thin animate-slide-in shrink-0"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Detalle</p>
        <button
          onClick={onClose}
          className="p-1 rounded-md transition"
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-subtle)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <X className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
        </button>
      </div>

      {/* Tenant */}
      <div className="px-4 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 mb-2.5">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-bold shrink-0"
            style={{ fontSize: '12px', background: isOverdue ? '#FEF3F2' : '#EFF8FF', color: isOverdue ? '#B42318' : '#175CD3' }}
          >
            {tenant?.full_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('') ?? '?'}
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{tenant?.full_name ?? '—'}</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{prop?.name ?? '—'}</p>
          </div>
        </div>
        <PaymentStatusBadge status={payment.status} size="sm" />
      </div>

      {/* Breakdown */}
      <div className="px-4 py-3.5 space-y-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <DR label="Período" value={new Date(payment.period_year, payment.period_month - 1).toLocaleDateString('es-DO', { month: 'long', year: 'numeric' })} />
        <DR label="Renta"   value={formatCurrency(payment.rent_amount, payment.currency)} />
        {payment.late_fee > 0 && <DR label="Mora"      value={formatCurrency(payment.late_fee, payment.currency)}  vc="#B42318" />}
        {payment.discount > 0 && <DR label="Descuento" value={`−${formatCurrency(payment.discount, payment.currency)}`} vc="#027A48" />}
        <div className="pt-1.5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <DR label="Adeudado" value={formatCurrency(payment.balance_due, payment.currency)} bold vc={payment.balance_due > 0 ? '#B42318' : '#027A48'} />
        </div>
        <DR label="Vence"  value={formatDate(payment.due_date)} />
        {payment.days_overdue > 0 && <DR label="Días mora" value={`${payment.days_overdue}d`} vc="#B42318" />}
        {payment.payment_number && <DR label="Ref." value={payment.payment_number} mono />}
      </div>

      {/* Asignar cobrador */}
      {cobrosUsers.length > 0 && (
        <div className="px-4 py-3.5 space-y-2" style={{ borderBottom: '1px solid var(--border)' }}>
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            Asignar cobrador
          </p>
          <div className="flex items-center gap-2">
            <select
              value={assignedTo ?? ''}
              onChange={e => handleAssign(e.target.value)}
              disabled={assigning}
              className="flex-1 px-2.5 py-1.5 rounded-lg text-xs transition focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              style={{
                background: 'var(--surface-subtle)',
                border: '1px solid var(--border)',
                color: assignedTo ? 'var(--text)' : 'var(--text-tertiary)',
              }}
            >
              <option value="">Sin asignar</option>
              {cobrosUsers.map(u => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
              ))}
            </select>
            {assigning && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" style={{ color: 'var(--text-tertiary)' }} />}
          </div>
          {assignedTo && (() => {
            const assignee = cobrosUsers.find(u => u.id === assignedTo)
            return assignee ? (
              <p className="text-xs" style={{ color: '#175CD3' }}>
                Asignado a <strong>{assignee.full_name}</strong>
              </p>
            ) : null
          })()}
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-4 space-y-2">
        {payment.status === 'pagado' && (
          <a
            href={`/cobros/recibo/${payment.id}`}
            target="_blank"
            rel="noreferrer"
            className="w-full py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition"
            style={{ background: '#ECFDF3', color: '#027A48', border: '1px solid #A6F4C5' }}
          >
            Ver recibo de pago
          </a>
        )}
        <button
          onClick={onRegister}
          className="w-full py-2 rounded-lg text-sm font-semibold text-white transition"
          style={{ background: '#1570EF' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#175CD3')}
          onMouseLeave={e => (e.currentTarget.style.background = '#1570EF')}
        >
          Registrar pago
        </button>
        <button
          onClick={handleSendReminder}
          disabled={sendingEmail || emailStatus === 'sent'}
          className="w-full py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
          style={{
            background: emailStatus === 'sent' ? '#ECFDF3' : 'var(--surface-subtle)',
            color: emailStatus === 'sent' ? '#027A48' : emailStatus === 'error' ? '#B42318' : 'var(--text-secondary)',
            border: '1px solid var(--border)',
          }}
        >
          {sendingEmail ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Enviando...</>
            : emailStatus === 'sent' ? <><CheckCircle2 className="w-3.5 h-3.5" /> Email enviado</>
            : emailStatus === 'error' ? 'Error al enviar'
            : <><Send className="w-3.5 h-3.5" /> Enviar recordatorio</>
          }
        </button>
        {tenant?.phone && (
          <a
            href={`tel:${tenant.phone}`}
            className="w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition"
            style={{ background: 'var(--surface-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F3F4F6')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-subtle)')}
          >
            <Phone className="w-3.5 h-3.5" /> {tenant.phone}
          </a>
        )}
      </div>
    </div>
  )
}

function DR({ label, value, bold, vc, mono }: { label: string; value: string; bold?: boolean; vc?: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      <span className={cn('text-xs', bold && 'font-semibold', mono && 'font-mono')} style={{ color: vc ?? 'var(--text)' }}>
        {value}
      </span>
    </div>
  )
}
