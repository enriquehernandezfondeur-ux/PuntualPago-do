'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { formatCurrency, formatDate, getDaysUntil } from '@/lib/utils/format'
import { RiskBadge, PaymentStatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatCard } from '@/components/shared/StatCard'
import type { Guarantee, GuaranteeClaim, Payment } from '@/types/database'
import {
  Shield, AlertTriangle, DollarSign, TrendingDown, CheckCircle,
  Clock, Building2, User, CreditCard, X, Loader2, ChevronRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { logAudit } from '@/lib/utils/audit'
import { useRouter } from 'next/navigation'

type Tab = 'garantias' | 'reclamaciones' | 'riesgo'

interface Props {
  guarantees: Guarantee[]
  openClaims: GuaranteeClaim[]
  atRiskPayments: Payment[]
  totalExposure: number
  totalRecovered: number
  openClaimsAmount: number
}

export function GarantiaContent({ guarantees, openClaims, atRiskPayments, totalExposure, totalRecovered, openClaimsAmount }: Props) {
  const [tab, setTab] = useState<Tab>('garantias')
  const [selectedClaim, setSelectedClaim]   = useState<GuaranteeClaim | null>(null)
  const [showPayModal, setShowPayModal]     = useState(false)
  const [showRecoveryModal, setShowRecoveryModal] = useState(false)
  const [activatingPaymentId, setActivatingPaymentId] = useState<string | null>(null)
  const router  = useRouter()
  const supabase = createClient()

  async function activateGuarantee(payment: Payment) {
    setActivatingPaymentId(payment.id)
    try {
      // 1. Find the guarantee for this lease
      const { data: guarantee } = await supabase.from('guarantees')
        .select('id, guaranteed_amount, currency, total_exposure')
        .eq('lease_id', payment.lease_id).eq('status', 'activa').single()
      if (!guarantee) { alert('No se encontró una garantía activa para este contrato'); return }

      // 2. Create claim
      const { error } = await supabase.from('guarantee_claims').insert({
        guarantee_id: guarantee.id,
        payment_id:   payment.id,
        claim_date:   new Date().toISOString().split('T')[0],
        amount_claimed: payment.balance_due,
        currency:       payment.currency,
        owner_paid:     false,
        recovery_amount: 0,
        fully_recovered: false,
        status: 'abierta',
      })
      if (error) throw error

      // 3. Update payment status
      await supabase.from('payments').update({ status: 'cubierto_garantia', covered_by_guarantee: true, guarantee_id: guarantee.id }).eq('id', payment.id)

      // 4. Update guarantee exposure
      await supabase.from('guarantees').update({ total_exposure: (guarantee.total_exposure ?? 0) + payment.balance_due }).eq('id', guarantee.id)

      await logAudit({ action: 'guarantee_claim_created', entityType: 'guarantee_claims', entityId: guarantee.id, newValues: { payment_id: payment.id, amount: payment.balance_due } })
      router.refresh()
    } finally { setActivatingPaymentId(null) }
  }

  const activeGuarantees = guarantees.filter(g => g.status === 'activa')
  const netExposure = totalExposure - totalRecovered

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Exposure KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Garantías activas"
          value={activeGuarantees.length}
          subtitle="Propiedades garantizadas"
          icon={Shield}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          title="Exposición total"
          value={formatCurrency(netExposure)}
          subtitle="Riesgo neto de PuntualPago"
          icon={DollarSign}
          iconColor="text-red-600"
          iconBg="bg-red-50"
          alert={netExposure > 0}
        />
        <StatCard
          title="Reclamaciones abiertas"
          value={openClaims.length}
          subtitle={`${formatCurrency(openClaimsAmount)} pendiente`}
          icon={AlertTriangle}
          iconColor="text-orange-600"
          iconBg="bg-orange-50"
          alert={openClaims.length > 0}
        />
        <StatCard
          title="Total recuperado"
          value={formatCurrency(totalRecovered)}
          subtitle="De inquilinos deudores"
          icon={TrendingDown}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([
          { key: 'garantias',     label: 'Garantías activas',    count: activeGuarantees.length },
          { key: 'reclamaciones', label: 'Reclamaciones',        count: openClaims.length },
          { key: 'riesgo',        label: 'Alertas tempranas',    count: atRiskPayments.length },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
              tab === t.key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {t.label}
            {t.count > 0 && (
              <span className={cn('text-xs font-bold px-1.5 py-0.5 rounded-full',
                t.key === 'reclamaciones' ? 'bg-red-100 text-red-700' :
                t.key === 'riesgo' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
              )}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'garantias' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {activeGuarantees.length === 0 ? (
            <EmptyState icon={Shield} title="Sin garantías activas" description="Las propiedades con garantía aparecerán aquí." />
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Propiedad</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Inquilino</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Propietario</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Garantizado</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Exposición</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Recuperado</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Riesgo</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeGuarantees.map(g => {
                  const tenant = (g as any).tenant
                  const prop   = (g as any).property
                  const owner  = (g as any).owner
                  const netExp = g.total_exposure - g.total_recovered
                  return (
                    <tr key={g.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                          <div>
                            <p className="font-medium text-slate-800">{prop?.name}</p>
                            <p className="text-slate-500 text-xs">{prop?.sector}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-slate-700">{tenant?.full_name}</p>
                        {tenant?.pending_balance > 0 && (
                          <p className="text-red-600 text-xs">{formatCurrency(tenant.pending_balance)} deuda</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-slate-700">{owner?.full_name}</p>
                        <p className="text-slate-500 text-xs">{owner?.bank_name}</p>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <p className="font-medium text-slate-800">{formatCurrency(g.guaranteed_amount, g.currency)}</p>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {netExp > 0
                          ? <p className="font-bold text-red-700">{formatCurrency(netExp, g.currency)}</p>
                          : <p className="text-emerald-600">—</p>
                        }
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {g.total_recovered > 0
                          ? <p className="text-emerald-600 font-medium">{formatCurrency(g.total_recovered, g.currency)}</p>
                          : <p className="text-slate-400">—</p>
                        }
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <RiskBadge level={tenant?.risk_level ?? 'bajo'} />
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          {g.status === 'activa' ? 'Activa' : g.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'reclamaciones' && (
        <div className="space-y-4">
          {openClaims.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl">
              <EmptyState icon={CheckCircle} title="Sin reclamaciones pendientes" description="Cuando se active una garantía aparecerá aquí." />
            </div>
          ) : (
            openClaims.map(claim => {
              const g   = (claim as any).guarantee
              const prop = g?.property
              const tenant = g?.tenant
              const owner  = g?.owner
              return (
                <div key={claim.id} className={cn(
                  'bg-white border rounded-xl p-5',
                  !claim.owner_paid ? 'border-red-300 bg-red-50/20' : 'border-slate-200'
                )}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3">
                        {!claim.owner_paid && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            PROPIETARIO SIN PAGAR
                          </span>
                        )}
                        {claim.owner_paid && !claim.fully_recovered && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold">
                            <Clock className="w-3.5 h-3.5" />
                            RECUPERANDO DE INQUILINO
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-slate-500 mb-0.5">Propiedad</p>
                          <p className="font-medium text-slate-800 text-sm">{prop?.name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-0.5">Inquilino</p>
                          <p className="font-medium text-slate-800 text-sm">{tenant?.full_name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-0.5">Propietario</p>
                          <p className="font-medium text-slate-800 text-sm">{owner?.full_name}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-slate-500 mb-0.5">Monto reclamado</p>
                          <p className="font-bold text-red-700 text-sm">{formatCurrency(claim.amount_claimed, claim.currency)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-0.5">Pago a propietario</p>
                          <p className={cn('font-medium text-sm', claim.owner_paid ? 'text-emerald-700' : 'text-red-600')}>
                            {claim.owner_paid ? `${formatCurrency(claim.payout_amount ?? 0)} pagado` : 'Pendiente'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-0.5">Recuperado</p>
                          <p className="font-medium text-emerald-700 text-sm">{formatCurrency(claim.recovery_amount, claim.currency)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-0.5">Fecha reclamación</p>
                          <p className="text-slate-700 text-sm">{formatDate(claim.claim_date)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      {!claim.owner_paid && (
                        <button
                          onClick={() => { setSelectedClaim(claim); setShowPayModal(true) }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition"
                        >
                          Registrar pago a propietario
                        </button>
                      )}
                      {claim.owner_paid && !claim.fully_recovered && (
                        <button
                          onClick={() => { setSelectedClaim(claim); setShowRecoveryModal(true) }}
                          className="px-4 py-2 text-white text-sm font-semibold rounded-xl transition"
                          style={{ background: '#12B76A' }}
                        >
                          Registrar recuperación
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {tab === 'riesgo' && (
        <div className="space-y-3">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800 text-sm">Alertas tempranas</p>
              <p className="text-amber-700 text-sm">Estos pagos están vencidos y tienen garantía activa. Actúa antes de que escalen.</p>
            </div>
          </div>

          {atRiskPayments.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl">
              <EmptyState icon={CheckCircle} title="Sin alertas tempranas" description="No hay pagos en riesgo de activar la garantía." />
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Inquilino</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Propiedad</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Adeudado</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Días mora</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Riesgo</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Tiene garantía</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {atRiskPayments.map(p => {
                    const t = (p as any).tenant
                    const prop = (p as any).property
                    const hasG = (p as any).lease?.has_guarantee
                    return (
                      <tr key={p.id} className={cn('hover:bg-slate-50 transition', hasG && 'bg-amber-50/30')}>
                        <td className="px-4 py-3.5">
                          <p className="font-medium text-slate-800">{t?.full_name}</p>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">{prop?.name}</td>
                        <td className="px-4 py-3.5 text-right font-bold text-red-700">{formatCurrency(p.balance_due, p.currency)}</td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={cn('font-bold text-sm', p.days_overdue >= 10 ? 'text-red-700' : 'text-amber-600')}>
                            {p.days_overdue}d
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <PaymentStatusBadge status={p.status} />
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <RiskBadge level={t?.risk_level ?? 'medio'} />
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {hasG ? (
                            <button onClick={() => activateGuarantee(p)} disabled={activatingPaymentId === p.id}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white mx-auto disabled:opacity-60"
                              style={{ background: '#1570EF' }}>
                              {activatingPaymentId === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Shield className="w-3 h-3" />}
                              Activar garantía
                            </button>
                          ) : (
                            <span className="text-slate-400 text-xs">Sin garantía</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showPayModal && selectedClaim && (
        <PayOwnerModal claim={selectedClaim} onClose={() => { setShowPayModal(false); setSelectedClaim(null) }} />
      )}
      {showRecoveryModal && selectedClaim && (
        <RecoveryModal claim={selectedClaim} onClose={() => { setShowRecoveryModal(false); setSelectedClaim(null) }} />
      )}
    </div>
  )
}

function RecoveryModal({ claim, onClose }: { claim: GuaranteeClaim; onClose: () => void }) {
  const router   = useRouter()
  const supabase = createClient()
  const [amount, setAmount] = useState('')
  const [date, setDate]     = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes]   = useState('')
  const [loading, setLoading] = useState(false)
  const g = (claim as any).guarantee

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const newRecovery = claim.recovery_amount + Number(amount)
    const fullyRecovered = newRecovery >= claim.amount_claimed
    await supabase.from('guarantee_claims').update({
      recovery_amount: newRecovery,
      recovery_date: date,
      fully_recovered: fullyRecovered,
      status: fullyRecovered ? 'recuperada' : 'parcial',
      notes: notes || claim.notes,
      updated_at: new Date().toISOString(),
    }).eq('id', claim.id)
    if (g?.id) {
      await supabase.from('guarantees').update({
        total_recovered: (g.total_recovered ?? 0) + newRecovery,
        status: fullyRecovered ? 'recuperada' : g.status,
      }).eq('id', g.id)
    }
    await logAudit({ action: 'guarantee_recovery', entityType: 'guarantee_claims', entityId: claim.id, newValues: { recovery: newRecovery } })
    router.refresh(); onClose()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-fade-in" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Registrar recuperación</p>
          <button onClick={onClose}><X className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="rounded-xl p-3" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Monto reclamado: {formatCurrency(claim.amount_claimed, claim.currency)}</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Recuperado hasta ahora: {formatCurrency(claim.recovery_amount, claim.currency)}</p>
            <p className="text-xs font-semibold" style={{ color: '#B42318' }}>Pendiente: {formatCurrency(claim.amount_claimed - claim.recovery_amount, claim.currency)}</p>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Monto recuperado</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required step="0.01" className="w-full px-3 py-2 rounded-lg text-sm border" style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Fecha de recuperación</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full px-3 py-2 rounded-lg text-sm border" style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Notas</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg text-xs resize-none border" style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }} placeholder="Método de recuperación..." />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg text-sm font-medium border" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60 flex items-center justify-center gap-2" style={{ background: '#12B76A' }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Confirmar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PayOwnerModal({ claim, onClose }: { claim: GuaranteeClaim; onClose: () => void }) {
  const router = useRouter()
  const supabase = createClient()
  const [amount, setAmount]       = useState(claim.amount_claimed.toString())
  const [reference, setReference] = useState('')
  const [date, setDate]           = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading]     = useState(false)

  const g = (claim as any).guarantee
  const owner = g?.owner

  async function handlePay(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    await supabase.from('guarantee_claims').update({
      owner_paid: true,
      payout_amount: parseFloat(amount),
      payout_date: date,
      payout_reference: reference,
      updated_at: new Date().toISOString(),
    }).eq('id', claim.id)

    await logAudit({
      action: 'guarantee_owner_paid',
      entityType: 'guarantee_claims',
      entityId: claim.id,
      newValues: { owner_paid: true, payout_amount: parseFloat(amount), payout_date: date },
    })

    router.refresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="font-bold text-slate-900">Pagar propietario</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handlePay} className="p-5 space-y-4">
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-500">Propietario</p>
            <p className="font-semibold text-slate-800">{owner?.full_name}</p>
            {owner?.bank_name && <p className="text-slate-600 text-xs">{owner.bank_name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Monto pagado</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required step="0.01"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Referencia</label>
            <input type="text" value={reference} onChange={e => setReference(e.target.value)}
              placeholder="Número de transferencia..."
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Fecha</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-slate-300 text-slate-700 font-medium text-sm rounded-xl hover:bg-slate-50 transition">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Confirmar pago
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
