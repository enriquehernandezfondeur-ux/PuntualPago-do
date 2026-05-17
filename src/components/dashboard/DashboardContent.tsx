'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { StatCard } from '@/components/shared/StatCard'
import { PaymentStatusBadge } from '@/components/shared/StatusBadge'
import { formatCurrency, formatDate, getDaysUntil, formatDualCurrency, DEFAULT_USD_TO_DOP } from '@/lib/utils/format'
import { MonthlyCollectionChart } from './DashboardCharts'
import {
  ArrowRight, TrendingUp, AlertTriangle, CheckCircle2,
  Clock, Scale, Wrench, FileText, Shield,
  DollarSign, CreditCard, Wallet, Building2, BarChart3,
  Plus, ChevronRight, X,
} from 'lucide-react'
import type { DashboardStats, Payment, Lease, LegalCase, Task, GuaranteeClaim } from '@/types/database'

interface Props {
  stats: DashboardStats | null
  overduePayments: Payment[]
  expiringLeases: Lease[]
  openLegalCases: LegalCase[]
  overdueTasks: Task[]
  guaranteeClaims: GuaranteeClaim[]
  monthlyData: { mes: string; cobrado: number; pendiente: number; mora: number }[]
  statusData:  { name: string; value: number; color: string }[]
  propData:    { name: string; value: number; color: string }[]
  usdToDOP?: number
}

export function DashboardContent({
  stats, overduePayments, expiringLeases, openLegalCases, overdueTasks,
  guaranteeClaims, monthlyData, usdToDOP = DEFAULT_USD_TO_DOP,
  // statusData y propData reservados para futuros gráficos de pie
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  statusData: _statusData, propData: _propData,
}: Props) {
  const s = stats
  const urgentCount = (s?.overdue_count ?? 0) + (s?.open_legal_cases ?? 0) + (s?.pending_owner_payouts ?? 0)
  const rentaDual  = formatDualCurrency(s?.monthly_rent_managed ?? 0, 'DOP', usdToDOP)
  const moraDual   = formatDualCurrency(s?.total_arrears ?? 0, 'DOP', usdToDOP)

  const [onboardingDismissed, setOnboardingDismissed] = useState(false)
  useEffect(() => {
    setOnboardingDismissed(localStorage.getItem('pp-onboarding-dismissed') === 'true')
  }, [])
  function dismissOnboarding() {
    localStorage.setItem('pp-onboarding-dismissed', 'true')
    setOnboardingDismissed(true)
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin" style={{ background: 'var(--bg)' }}>
      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-6 animate-page-enter">

        {/* ── Onboarding — solo cuando no hay propiedades aún ── */}
        {(s?.total_properties ?? 0) === 0 && !onboardingDismissed && (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '2px solid #1570EF' }}>
            <div className="px-6 py-5 border-b flex items-center justify-between" style={{ borderColor: '#DBEAFE', background: '#EFF8FF' }}>
              <div>
                <p className="font-bold text-base" style={{ color: '#175CD3' }}>Bienvenido a PuntualPago</p>
                <p className="text-sm mt-0.5" style={{ color: '#3B82F6' }}>Sigue estos pasos para configurar tu primera propiedad</p>
              </div>
              <button
                onClick={dismissOnboarding}
                className="p-1.5 rounded-lg transition hover-surface shrink-0"
                title="Cerrar"
                style={{ color: '#93C5FD' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {[
                { step: 1, label: 'Agrega un propietario',   sub: 'Registra al dueño de la propiedad',          href: '/propietarios',  done: false },
                { step: 2, label: 'Crea una propiedad',      sub: 'Ingresa la dirección y datos del alquiler',  href: '/propiedades',   done: false },
                { step: 3, label: 'Agrega un inquilino',     sub: 'Registro completo con documentos',           href: '/inquilinos/nuevo', done: false },
                { step: 4, label: 'Crea el primer contrato', sub: 'Vincula propiedad, propietario e inquilino',  href: '/contratos',     done: false },
              ].map(item => (
                <Link
                  key={item.step}
                  href={item.href}
                  className="flex items-center gap-4 px-6 py-4 transition-colors group"
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-subtle)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: '#DBEAFE', color: '#1570EF' }}
                  >
                    {item.step}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{item.label}</p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{item.sub}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" style={{ color: '#1570EF' }} />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Alert bar — only shows when there are urgent issues ── */}
        {urgentCount > 0 && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
            style={{ background: '#FFF7ED', border: '1px solid #FDDCAB', color: '#B93815' }}
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <p className="font-medium">
              {urgentCount} asunto{urgentCount !== 1 ? 's' : ''} requieren atención hoy
            </p>
            <Link href="/cobros" className="ml-auto flex items-center gap-1 text-xs font-semibold hover:underline">
              Ver cobros <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}

        {/* ── KPI row ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Renta administrada"
            value={rentaDual.primary}
            subtitle={`${rentaDual.secondary} · Cartera activa / mes`}
            icon={TrendingUp}
            accent="blue"
          />
          <StatCard
            title="Cobrado este mes"
            value={s?.paid_this_month ?? 0}
            subtitle="Pagos confirmados"
            icon={CheckCircle2}
            accent="green"
          />
          <StatCard
            title="Pagos vencidos"
            value={s?.overdue_count ?? 0}
            subtitle="Requieren seguimiento"
            icon={CreditCard}
            accent={(s?.overdue_count ?? 0) > 0 ? 'red' : 'gray'}
            alert={(s?.overdue_count ?? 0) > 0}
          />
          <StatCard
            title="Total en mora"
            value={moraDual.primary}
            subtitle={`${moraDual.secondary} · Acumulado pendiente`}
            icon={DollarSign}
            accent={(s?.total_arrears ?? 0) > 0 ? 'red' : 'gray'}
            alert={(s?.total_arrears ?? 0) > 0}
          />
        </div>

        {/* ── Second row ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Propiedades activas"
            value={s?.active_properties ?? 0}
            subtitle={`de ${s?.total_properties ?? 0} en cartera`}
            icon={Building2}
            accent="blue"
          />
          <StatCard
            title="Cubiertos por garantía"
            value={s?.covered_by_guarantee ?? 0}
            subtitle="PuntualPago cubrió"
            icon={Shield}
            accent="purple"
          />
          <StatCard
            title="Liquidaciones pend."
            value={s?.pending_owner_payouts ?? 0}
            subtitle="A propietarios"
            icon={Wallet}
            accent={(s?.pending_owner_payouts ?? 0) > 0 ? 'amber' : 'gray'}
            alert={(s?.pending_owner_payouts ?? 0) > 0}
          />
          <StatCard
            title="Casos legales"
            value={s?.open_legal_cases ?? 0}
            subtitle="En proceso"
            icon={Scale}
            accent={(s?.open_legal_cases ?? 0) > 0 ? 'red' : 'gray'}
            alert={(s?.open_legal_cases ?? 0) > 0}
          />
        </div>

        {/* ── Main content ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Chart — 2 cols */}
          <div className="lg:col-span-2 rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="px-5 pt-5 pb-4 flex items-start justify-between">
              <div>
                <p className="font-semibold text-base" style={{ color: 'var(--text)' }}>Cobros — últimos 6 meses</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Cobrado · Pendiente · Mora</p>
              </div>
              <Link
                href="/finanzas"
                className="flex items-center gap-1 text-sm font-medium transition hover:opacity-75"
                style={{ color: 'var(--blue-text)' }}
              >
                Ver finanzas <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="px-5 pb-5">
              <MonthlyCollectionChart data={monthlyData} />
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">

            {/* Garantía urgente */}
            <SectionCard
              title="Garantía urgente"
              subtitle={`${guaranteeClaims.length} reclamaciones`}
              href="/garantia"
              icon={Shield}
              empty={guaranteeClaims.length === 0}
              emptyLabel="Sin reclamaciones pendientes"
            >
              {guaranteeClaims.slice(0, 3).map(claim => (
                <div key={claim.id} className="flex items-center justify-between gap-3 py-3 px-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                      {(claim as any).guarantee?.property?.name ?? 'Propiedad'}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                      {(claim as any).guarantee?.tenant?.full_name}
                    </p>
                  </div>
                  <p className="text-sm font-semibold shrink-0" style={{ color: '#B42318' }}>
                    {formatCurrency(claim.amount_claimed)}
                  </p>
                </div>
              ))}
            </SectionCard>

            {/* Contratos por vencer */}
            <SectionCard
              title="Contratos por vencer"
              subtitle="Próximos 90 días"
              href="/contratos"
              icon={FileText}
              empty={expiringLeases.length === 0}
              emptyLabel="Sin contratos por vencer"
            >
              {expiringLeases.slice(0, 3).map(lease => {
                const days = getDaysUntil(lease.end_date)
                return (
                  <div key={lease.id} className="flex items-center justify-between gap-3 py-3 px-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                        {(lease as any).property?.name}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                        {(lease as any).tenant?.full_name}
                      </p>
                    </div>
                    <DaysBadge days={days} />
                  </div>
                )
              })}
            </SectionCard>
          </div>
        </div>

        {/* ── Bottom row ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Cobros críticos — 2 cols */}
          <div className="lg:col-span-2">
            <SectionCard
              title="Cobros críticos"
              subtitle={`${overduePayments.length} pagos vencidos y en mora`}
              href="/cobros"
              icon={CreditCard}
              empty={overduePayments.length === 0}
              emptyLabel="Sin cobros críticos — todo al día"
            >
              {overduePayments.slice(0, 6).map((p, i) => {
                const tenant = (p as any).tenant
                const prop   = (p as any).property
                return (
                  <Link
                    key={p.id}
                    href="/cobros"
                    className="flex items-center gap-4 px-4 py-3 transition-colors"
                    style={{
                      borderBottom: i < Math.min(overduePayments.length, 6) - 1 ? '1px solid var(--border-subtle)' : 'none',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-subtle)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    {/* Avatar */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: '#FEF3F2', color: '#B42318' }}
                    >
                      {tenant?.full_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('') ?? '?'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                        {tenant?.full_name ?? '—'}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                        {prop?.name ?? '—'}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold" style={{ color: '#B42318' }}>
                        {formatCurrency(p.balance_due, p.currency)}
                      </p>
                      {p.days_overdue > 0 && (
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          {p.days_overdue}d mora
                        </p>
                      )}
                    </div>

                    <PaymentStatusBadge status={p.status} size="xs" />
                  </Link>
                )
              })}
            </SectionCard>
          </div>

          {/* Right: Legal + Tareas */}
          <div className="space-y-3">
            {/* Legal */}
            <SectionCard
              title="Casos legales"
              subtitle=""
              href="/legal"
              icon={Scale}
              empty={openLegalCases.length === 0}
              emptyLabel="Sin casos activos"
              compact
            >
              {openLegalCases.slice(0, 3).map(c => (
                <div key={c.id} className="flex items-center gap-3 px-4 py-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <div className="w-1 h-8 rounded-full shrink-0" style={{ background: '#7F56D9' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                      {(c as any).tenant?.full_name}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                      {(c as any).property?.name}
                    </p>
                  </div>
                  <p className="text-xs font-semibold shrink-0" style={{ color: '#B42318' }}>
                    {formatCurrency(c.amount_owed)}
                  </p>
                </div>
              ))}
            </SectionCard>

            {/* Tareas vencidas */}
            <SectionCard
              title="Tareas vencidas"
              subtitle=""
              href="/tareas"
              icon={Clock}
              empty={overdueTasks.length === 0}
              emptyLabel="Sin tareas vencidas"
              compact
            >
              {overdueTasks.slice(0, 3).map(task => {
                const priorityColor = task.priority === 'urgente' ? '#B42318' : task.priority === 'alta' ? '#B93815' : '#B54708'
                return (
                  <div key={task.id} className="flex items-center gap-3 px-4 py-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <div className="w-1 h-8 rounded-full shrink-0" style={{ background: priorityColor }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{task.title}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                        {(task as any).assignee?.full_name ?? 'Sin asignar'}
                      </p>
                    </div>
                    <p className="text-xs font-medium shrink-0" style={{ color: priorityColor }}>
                      {formatDate(task.due_date!)}
                    </p>
                  </div>
                )
              })}
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({
  title, subtitle, href, icon: Icon, empty, emptyLabel, children, compact,
}: {
  title: string; subtitle: string; href: string; icon: React.ComponentType<{ className?: string }>;
  empty: boolean; emptyLabel: string; children?: React.ReactNode; compact?: boolean
}) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--text-tertiary)', display: 'flex' }}><Icon className="w-4 h-4" /></span>
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{title}</p>
          {subtitle && <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>· {subtitle}</p>}
        </div>
        <Link
          href={href}
          className="text-sm font-medium flex items-center gap-0.5 transition hover:opacity-75"
          style={{ color: 'var(--blue-text)' }}
        >
          Ver todo <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Body */}
      {empty ? (
        <div className={cn('flex items-center justify-center gap-2 rounded-lg mx-4', compact ? 'py-5 my-3' : 'py-7 my-4')}
          style={{ background: 'rgba(18,183,106,0.05)' }}>
          <CheckCircle2 className="w-4 h-4" style={{ color: '#12B76A' }} />
          <p className="text-sm font-medium" style={{ color: '#059669' }}>{emptyLabel}</p>
        </div>
      ) : children}
    </div>
  )
}

// ─── Days badge ───────────────────────────────────────────────────────────────

function DaysBadge({ days }: { days: number }) {
  const bg   = days <= 15 ? '#FEF3F2' : days <= 30 ? '#FFF6ED' : '#FFFAEB'
  const text = days <= 15 ? '#B42318' : days <= 30 ? '#B93815' : '#B54708'
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
      style={{ background: bg, color: text }}
    >
      {days}d
    </span>
  )
}
