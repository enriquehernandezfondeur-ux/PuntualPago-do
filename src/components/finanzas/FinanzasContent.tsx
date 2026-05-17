'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { formatCurrency, formatDate, formatMonth } from '@/lib/utils/format'
import { StatCard } from '@/components/shared/StatCard'
import { PaymentStatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { CashFlowChart } from './FinanzasCharts'
import { createClient } from '@/lib/supabase/client'
import { logAudit } from '@/lib/utils/audit'
import { useRouter } from 'next/navigation'
import { Wallet, TrendingUp, TrendingDown, Shield, CheckCircle, Loader2, BarChart3, AlertTriangle } from 'lucide-react'

interface Props {
  monthPayments: any[]
  pendingPayouts: any[]
  totalCollected: number
  totalPending: number
  pendingPayoutsTotal: number
  guaranteeExposure: number
  currentMonth: number
  currentYear: number
  cashFlowData: { mes: string; cobrado: number; comisiones: number; neto: number }[]
  overduePayments?: any[]
}

export function FinanzasContent({
  monthPayments, pendingPayouts, totalCollected, totalPending,
  pendingPayoutsTotal, guaranteeExposure, currentMonth, currentYear, cashFlowData, overduePayments = [],
}: Props) {
  const [tab, setTab] = useState<'mes' | 'liquidaciones' | 'mora' | 'garantia'>('mes')
  const [payingPayout, setPayingPayout] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function markPayoutPaid(payoutId: string, amount: number) {
    setLoading(true)
    await supabase.from('owner_payouts').update({
      paid: true,
      paid_date: new Date().toISOString().split('T')[0],
    }).eq('id', payoutId)
    await logAudit({ action: 'owner_payout_paid', entityType: 'owner_payouts', entityId: payoutId, newValues: { paid: true } })
    setPayingPayout(null)
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Cobrado este mes" value={formatCurrency(totalCollected)} subtitle={formatMonth(currentYear, currentMonth)} icon={TrendingUp} accent="green" />
        <StatCard title="Por cobrar" value={formatCurrency(totalPending)} subtitle="Pendiente del mes" icon={TrendingDown} accent="amber" />
        <StatCard title="Liquidaciones pendientes" value={formatCurrency(pendingPayoutsTotal)} subtitle={`${pendingPayouts.length} propietario${pendingPayouts.length !== 1 ? 's' : ''}`} icon={Wallet} accent="purple" alert={pendingPayoutsTotal > 0} />
        <StatCard title="Exposición garantía" value={formatCurrency(guaranteeExposure)} subtitle="Riesgo neto activo" icon={Shield} accent="red" alert={guaranteeExposure > 0} />
      </div>

      {/* Cash flow chart */}
      <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Flujo de caja — Últimos 6 meses</h3>
            <p className="text-slate-400 text-xs">Renta cobrada · Comisiones PuntualPago · Neto a propietarios</p>
          </div>
          <div className="p-2 bg-blue-50 rounded-xl">
            <BarChart3 className="w-4 h-4 text-blue-600" />
          </div>
        </div>
        <CashFlowChart data={cashFlowData} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
        {[
          { key: 'mes',          label: `Cobros ${formatMonth(currentYear, currentMonth)}` },
          { key: 'liquidaciones',label: `Liquidaciones (${pendingPayouts.length})` },
          { key: 'mora',         label: `Morosidad (${overduePayments.length})` },
          { key: 'garantia',     label: 'Garantía' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
            className="px-3.5 py-1.5 rounded-lg text-sm font-medium transition"
            style={tab === t.key
              ? { background: 'var(--surface)', color: 'var(--text)', boxShadow: '0 1px 2px rgba(16,24,40,0.08)' }
              : { color: 'var(--text-tertiary)' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Month payments */}
      {tab === 'mes' && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {monthPayments.length === 0 ? (
            <EmptyState icon={Wallet} title="Sin pagos este mes" description="No hay registros de cobros para este período." />
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Inquilino / Propiedad</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Propietario</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Renta</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Cobrado</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Saldo</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Pagado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthPayments.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-slate-800">{p.tenant?.full_name}</p>
                      <p className="text-slate-500 text-xs">{p.property?.name}</p>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{p.owner?.full_name}</td>
                    <td className="px-4 py-3.5 text-right font-medium text-slate-800">{formatCurrency(p.rent_amount, p.currency)}</td>
                    <td className="px-4 py-3.5 text-right text-emerald-600 font-medium">{formatCurrency(p.amount_paid, p.currency)}</td>
                    <td className="px-4 py-3.5 text-right">
                      {p.balance_due > 0
                        ? <span className="text-red-700 font-bold">{formatCurrency(p.balance_due, p.currency)}</span>
                        : <span className="text-emerald-600">—</span>
                      }
                    </td>
                    <td className="px-4 py-3.5 text-center"><PaymentStatusBadge status={p.status} /></td>
                    <td className="px-4 py-3.5 text-slate-500 text-sm">{p.paid_date ? formatDate(p.paid_date) : '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Totales del mes</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-700">{formatCurrency(totalCollected)}</td>
                  <td className="px-4 py-3 text-right font-bold text-red-700">{formatCurrency(totalPending)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {/* Pending payouts */}
      {tab === 'liquidaciones' && (
        <div className="space-y-3">
          {pendingPayouts.length === 0 ? (
            <div className="rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <EmptyState icon={CheckCircle} title="Sin liquidaciones pendientes" description="Todos los propietarios están al día." />
            </div>
          ) : (
            pendingPayouts.map((payout: any) => (
              <div key={payout.id} className="bg-white border border-amber-200 rounded-xl p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Propietario</p>
                      <p className="font-semibold text-slate-800">{payout.owner?.full_name}</p>
                      <p className="text-slate-500 text-xs">{payout.owner?.bank_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Propiedad</p>
                      <p className="font-medium text-slate-800">{payout.property?.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Período</p>
                      <p className="font-medium text-slate-800">{formatMonth(payout.period_year, payout.period_month)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Monto neto</p>
                      <p className="font-bold text-slate-900 text-lg">{formatCurrency(payout.net_payout, payout.currency)}</p>
                      {payout.management_fee > 0 && (
                        <p className="text-slate-500 text-xs">Comisión: {formatCurrency(payout.management_fee, payout.currency)}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => markPayoutPaid(payout.id, payout.net_payout)}
                    disabled={loading}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition flex items-center gap-2 disabled:opacity-60 shrink-0"
                  >
                    {loading && payingPayout === payout.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Marcar pagado
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'mora' && (
        <MorosidadTab payments={overduePayments} />
      )}

      {tab === 'garantia' && (
        <div className="rounded-xl p-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="text-center">
            <Shield className="w-12 h-12 text-blue-300 mx-auto mb-4" />
            <h3 className="font-semibold text-slate-800 mb-2">Módulo de exposición de garantía</h3>
            <p className="text-slate-500 text-sm">Vista detallada de pérdidas, recuperaciones y exposición neta por período.</p>
            <p className="text-slate-400 text-xs mt-2">Disponible en Fase 3 · Finanzas Avanzadas</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Morosidad tab ────────────────────────────────────────────────────────────

function MorosidadTab({ payments }: { payments: any[] }) {
  if (!payments.length) {
    return (
      <div className="rounded-2xl py-12 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <CheckCircle className="w-10 h-10 mx-auto mb-3" style={{ color: '#12B76A' }} />
        <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Sin morosidad activa</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Todos los pagos están al corriente</p>
      </div>
    )
  }

  const totalMora       = payments.reduce((s: number, p: any) => s + p.balance_due, 0)
  const avgDays         = payments.length > 0 ? Math.round(payments.reduce((s: number, p: any) => s + (p.days_overdue ?? 0), 0) / payments.length) : 0
  const byStatus        = payments.reduce((acc: Record<string, number>, p: any) => { acc[p.status] = (acc[p.status] ?? 0) + 1; return acc }, {})

  // Group by days overdue
  const buckets = [
    { label: '1–15 días',  min: 1,   max: 15,  color: '#F79009' },
    { label: '16–30 días', min: 16,  max: 30,  color: '#EF6820' },
    { label: '31–60 días', min: 31,  max: 60,  color: '#F04438' },
    { label: '60+ días',   min: 61,  max: 9999,color: '#912018' },
  ]

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total en mora', value: formatCurrency(totalMora), color: '#B42318', alert: true },
          { label: 'Casos activos', value: payments.length, color: '#B42318' },
          { label: 'Promedio días mora', value: `${avgDays} días`, color: 'var(--text)' },
        ].map((k, i) => (
          <div key={i} className="rounded-xl p-4" style={{ background: 'var(--surface)', border: k.alert ? '1px solid #FECDCA' : '1px solid var(--border)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>{k.label}</p>
            <p className="font-bold text-xl" style={{ color: k.color, letterSpacing: '-0.02em' }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Aging buckets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {buckets.map(b => {
          const items = payments.filter((p: any) => p.days_overdue >= b.min && p.days_overdue <= b.max)
          const amount = items.reduce((s: number, p: any) => s + p.balance_due, 0)
          const pct    = payments.length > 0 ? Math.round((items.length / payments.length) * 100) : 0
          return (
            <div key={b.label} className="rounded-xl p-4 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2" style={{ background: b.color + '20' }}>
                <AlertTriangle className="w-4 h-4" style={{ color: b.color }} />
              </div>
              <p className="font-bold text-lg" style={{ color: b.color, letterSpacing: '-0.02em' }}>{items.length}</p>
              <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>{b.label}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{formatCurrency(amount)}</p>
              <div className="mt-2 h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
                <div className="h-full rounded-full" style={{ background: b.color, width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Detailed list */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Detalle de morosidad — ordenado por días</p>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Inquilino', 'Propiedad', 'Balance', 'Días mora', 'Estado', 'Vencía'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left font-medium" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-tertiary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payments.map((p: any, i: number) => {
              const color = p.days_overdue > 60 ? '#912018' : p.days_overdue > 30 ? '#F04438' : p.days_overdue > 15 ? '#EF6820' : '#F79009'
              return (
                <tr key={p.id} style={{ borderBottom: i < payments.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text)' }}>{p.tenant?.full_name ?? '—'}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{p.property?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-sm font-bold" style={{ color: '#B42318' }}>{formatCurrency(p.balance_due, p.currency)}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: color + '20', color }}>{p.days_overdue}d</span>
                  </td>
                  <td className="px-4 py-3"><PaymentStatusBadge status={p.status} size="xs" /></td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>{formatDate(p.due_date)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
