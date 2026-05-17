'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { formatCurrency, formatDate, formatMonth, initials } from '@/lib/utils/format'
import { TenantStatusBadge, RiskBadge, PaymentStatusBadge, LeaseStatusBadge } from '@/components/shared/StatusBadge'
import { TenantForm } from '@/components/forms/TenantForm'
import { RegisterPaymentModal } from '@/components/cobros/RegisterPaymentModal'
import { PaymentPlanModal } from './PaymentPlanModal'
import { SalidaInquilinoModal } from './SalidaInquilinoModal'
import { ActivityTimeline } from './ActivityTimeline'
import { QuickNote } from './QuickNote'
import type { Tenant, Payment, Lease, Communication, Document, LegalCase, MaintenanceRequest, RiskScore } from '@/types/database'
import {
  Phone, Mail, MessageCircle, Building2, FileText,
  CreditCard, Shield, Pencil, ArrowLeft, Calendar,
  DollarSign, Scale, Wrench, UserCheck, Send, FileSpreadsheet,
} from 'lucide-react'
import Link from 'next/link'

type Tab = 'overview' | 'pagos' | 'timeline' | 'documentos'

interface Props {
  tenant: Tenant
  leases: (Lease & { property: any })[]
  payments: Payment[]
  communications: Communication[]
  documents: Document[]
  legalCases: LegalCase[]
  maintenance: MaintenanceRequest[]
  riskScore?: RiskScore
  onPortalInvite: () => void
  portalActive: boolean
}

export function TenantProfile({
  tenant, leases, payments, communications, documents, legalCases, maintenance, riskScore, onPortalInvite, portalActive,
}: Props) {
  const [tab, setTab]           = useState<Tab>('overview')
  const [editOpen, setEditOpen] = useState(false)
  const [planOpen, setPlanOpen] = useState(false)
  const [exitOpen, setExitOpen] = useState(false)

  const activeLease  = leases.find(l => l.status === 'activo')
  const totalPaid    = payments.filter(p => p.status === 'pagado').reduce((s, p) => s + p.amount_paid, 0)
  const overdue      = payments.filter(p => ['vencido','en_mora','en_legal'].includes(p.status))

  // Build timeline
  const events = [
    ...payments.map(p => ({
      id: p.id, date: p.paid_date ?? p.due_date, type: 'payment' as const,
      title: `Pago ${formatMonth(p.period_year, p.period_month)}`,
      description: p.status === 'pagado' ? `Pagado el ${formatDate(p.paid_date!)}` : `Pendiente desde ${formatDate(p.due_date)}`,
      amount: p.status === 'pagado' ? p.amount_paid : p.balance_due,
      currency: p.currency, status: p.status,
      meta: p.payment_number ?? undefined,
    })),
    ...communications.map(c => ({
      id: c.id, date: c.sent_at ?? c.created_at, type: 'communication' as const,
      title: c.subject ?? `${c.channel === 'whatsapp' ? 'WhatsApp' : c.channel === 'email' ? 'Email' : c.channel === 'llamada' ? 'Llamada' : 'Mensaje'}`,
      description: c.content.slice(0, 100),
      channel: c.channel,
    })),
    ...documents.map(d => ({
      id: d.id, date: d.created_at, type: 'document' as const,
      title: `Documento subido: ${d.file_name}`,
      description: d.description ?? undefined,
    })),
    ...legalCases.map(l => ({
      id: l.id, date: l.opened_date, type: 'legal' as const,
      title: `Caso legal abierto — ${l.reason}`,
      description: `Monto: ${formatCurrency(l.amount_owed, l.currency)}`,
      amount: l.amount_owed, currency: l.currency,
    })),
    ...maintenance.map(m => ({
      id: m.id, date: m.reported_date, type: 'maintenance' as const,
      title: m.title,
      description: m.description ?? undefined,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: 'overview',   label: 'Resumen' },
    { key: 'pagos',      label: 'Pagos', count: payments.length },
    { key: 'timeline',   label: 'Historial', count: events.length },
    { key: 'documentos', label: 'Documentos', count: documents.length },
  ]

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin" style={{ background: 'var(--bg)' }}>
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">

        {/* Back */}
        <Link href="/inquilinos" className="flex items-center gap-1.5 text-sm transition hover:underline" style={{ color: 'var(--text-tertiary)' }}>
          <ArrowLeft className="w-3.5 h-3.5" /> Inquilinos
        </Link>

        {/* Profile header */}
        <div className="rounded-2xl p-5 flex items-start gap-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-xl shrink-0"
            style={{
              background: tenant.status === 'moroso' ? 'var(--error-bg)' : tenant.status === 'en_legal' ? '#F9F5FF' : 'var(--blue-bg)',
              color: tenant.status === 'moroso' ? 'var(--error)' : tenant.status === 'en_legal' ? '#6941C6' : 'var(--blue-text)',
            }}>
            {initials(tenant.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>{tenant.full_name}</h1>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <TenantStatusBadge status={tenant.status} size="sm" />
                  <RiskBadge level={tenant.risk_level} size="sm" />
                  {tenant.nationality && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-subtle)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}>{tenant.nationality}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!portalActive && (
                  <button onClick={onPortalInvite} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition" style={{ background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success-border)' }}>
                    <Send className="w-3.5 h-3.5" /> Activar portal
                  </button>
                )}
                {portalActive && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
                    <UserCheck className="w-3.5 h-3.5" /> Portal activo
                  </span>
                )}
                {tenant.pending_balance > 0 && (
                  <button onClick={() => setPlanOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition" style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', color: 'var(--warning)' }}>
                    Acuerdo de pago
                  </button>
                )}
                <Link href={`/inquilinos/${tenant.id}/estado-cuenta`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Estado de cuenta
                </Link>
                {activeLease && tenant.status === 'activo' && (
                  <button onClick={() => setExitOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition" style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', color: 'var(--error)' }}>
                    Procesar salida
                  </button>
                )}
                <button onClick={() => setEditOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </button>
              </div>
            </div>

            {/* Contact grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {tenant.phone && (
                <a href={`tel:${tenant.phone}`} className="flex items-center gap-2 text-sm transition" style={{ color: 'var(--text-secondary)' }}>
                  <Phone className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-tertiary)' }} /> {tenant.phone}
                </a>
              )}
              {tenant.whatsapp && (
                <a href={`https://wa.me/${tenant.whatsapp?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm transition" style={{ color: '#027A48' }}>
                  <MessageCircle className="w-3.5 h-3.5 shrink-0" /> {tenant.whatsapp}
                </a>
              )}
              {tenant.email && (
                <a href={`mailto:${tenant.email}`} className="flex items-center gap-2 text-sm truncate transition" style={{ color: 'var(--text-secondary)' }}>
                  <Mail className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-tertiary)' }} /> {tenant.email}
                </a>
              )}
              {activeLease?.property && (
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <Building2 className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                  <span className="truncate">{activeLease.property.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Balance pendiente', value: tenant.pending_balance > 0 ? formatCurrency(tenant.pending_balance) : 'Al día', alert: tenant.pending_balance > 0, icon: DollarSign },
            { label: 'Total pagado', value: formatCurrency(totalPaid), icon: CreditCard },
            { label: 'Pagos vencidos', value: overdue.length, alert: overdue.length > 0, icon: Calendar },
            { label: riskScore ? `Score: ${riskScore.score}/100` : 'Sin score', value: riskScore ? riskScore.level : '—', icon: Shield },
          ].map((kpi, i) => (
            <div key={i} className="rounded-xl p-4" style={{ background: 'var(--surface)', border: kpi.alert ? '1px solid #FECDCA' : '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 mb-2">
                <kpi.icon className="w-3.5 h-3.5" style={{ color: kpi.alert ? '#F04438' : 'var(--text-tertiary)' }} />
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{kpi.label}</p>
              </div>
              <p className="font-bold text-base leading-tight capitalize" style={{ color: kpi.alert ? '#B42318' : 'var(--text)' }}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition"
              style={tab === t.key ? { background: 'var(--bg)', color: 'var(--text)', boxShadow: '0 1px 2px rgba(16,24,40,0.08)' } : { color: 'var(--text-tertiary)' }}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="text-xs px-1.5 py-px rounded-full" style={{ background: tab === t.key ? '#EFF8FF' : 'var(--surface-subtle)', color: tab === t.key ? '#175CD3' : 'var(--text-tertiary)' }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {tab === 'overview' && <OverviewTab tenant={tenant} activeLease={activeLease} riskScore={riskScore} />}
          {tab === 'pagos' && <PagosTab payments={payments} tenantName={tenant.full_name} propertyName={activeLease?.property?.name} />}
          {tab === 'timeline' && <div className="px-5 py-5"><ActivityTimeline events={events} /></div>}
          {tab === 'documentos' && <DocumentosTab documents={documents} tenantId={tenant.id} />}
        </div>
      </div>

      {editOpen && <TenantForm open onClose={() => setEditOpen(false)} defaultValues={tenant} tenantId={tenant.id} />}
      {planOpen && <PaymentPlanModal open onClose={() => setPlanOpen(false)} tenantId={tenant.id} tenantName={tenant.full_name} totalDebt={tenant.pending_balance} currency={activeLease?.currency ?? 'DOP'} />}
      {exitOpen && <SalidaInquilinoModal tenant={tenant} activeLease={activeLease as any} onClose={() => setExitOpen(false)} />}
    </div>
  )
}

function OverviewTab({ tenant, activeLease, riskScore }: { tenant: Tenant; activeLease: any; riskScore?: RiskScore }) {
  return (
    <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
      <section>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>Información personal</p>
        <div className="space-y-2">
          {[
            { label: 'Tipo ID', value: tenant.id_type },
            { label: 'Número ID', value: tenant.id_number },
            { label: 'Ocupación', value: tenant.occupation },
            { label: 'Empleador', value: tenant.employer },
            { label: 'Ingresos est.', value: tenant.estimated_income ? formatCurrency(tenant.estimated_income, tenant.income_currency) : null },
          ].map(row => row.value && (
            <div key={row.label} className="flex items-center justify-between gap-3">
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{row.label}</span>
              <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>{row.value}</span>
            </div>
          ))}
        </div>
      </section>

      {activeLease && (
        <section>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>Contrato activo</p>
          <div className="space-y-2">
            {[
              { label: 'Propiedad',     value: activeLease.property?.name },
              { label: 'Contrato',      value: activeLease.contract_number },
              { label: 'Renta',         value: formatCurrency(activeLease.rent_amount, activeLease.currency) },
              { label: 'Inicio',        value: formatDate(activeLease.start_date) },
              { label: 'Vencimiento',   value: formatDate(activeLease.end_date) },
              { label: 'Día de pago',   value: `Día ${activeLease.payment_day}` },
            ].map(row => row.value && (
              <div key={row.label} className="flex items-center justify-between gap-3">
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{row.label}</span>
                <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>{row.value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Estado</span>
              <LeaseStatusBadge status={activeLease.status} size="xs" />
            </div>
          </div>
        </section>
      )}

      {(tenant.reference_1_name || tenant.reference_2_name) && (
        <section className="col-span-full">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>Referencias</p>
          <div className="grid grid-cols-2 gap-4">
            {tenant.reference_1_name && (
              <div className="rounded-xl p-3" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
                <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{tenant.reference_1_name}</p>
                {tenant.reference_1_phone && <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{tenant.reference_1_phone}</p>}
              </div>
            )}
            {tenant.reference_2_name && (
              <div className="rounded-xl p-3" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
                <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{tenant.reference_2_name}</p>
                {tenant.reference_2_phone && <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{tenant.reference_2_phone}</p>}
              </div>
            )}
          </div>
        </section>
      )}

      {tenant.notes && (
        <section className="col-span-full">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>Notas internas</p>
          <p className="text-sm rounded-xl p-3" style={{ color: 'var(--text-secondary)', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>{tenant.notes}</p>
        </section>
      )}

      <section className="col-span-full">
        <QuickNote tenantId={tenant.id} propertyId={activeLease?.property_id} />
      </section>

      {riskScore && (
        <section className="col-span-full">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>Score de riesgo</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { label: 'Historial',   value: riskScore.payment_history_score, max: 30 },
              { label: 'Mora actual', value: riskScore.days_overdue_score,    max: 25 },
              { label: 'Recurrencia', value: riskScore.recurrence_score,      max: 20 },
              { label: 'Ingresos',    value: riskScore.income_score,          max: 10 },
              { label: 'Documentos',  value: riskScore.documents_score,       max: 10 },
              { label: 'Referencias', value: riskScore.references_score,      max: 5 },
            ].map(s => {
              const pct = Math.round((s.value / s.max) * 100)
              return (
                <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
                  <p className="font-bold text-base" style={{ color: pct >= 80 ? '#027A48' : pct >= 50 ? '#B54708' : '#B42318' }}>{s.value}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{s.label}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>/{s.max}</p>
                </div>
              )
            })}
          </div>
          {riskScore.recommended_action && (
            <p className="text-xs mt-2 px-3 py-2 rounded-lg" style={{ background: '#FFFAEB', color: '#B54708', border: '1px solid #FEF0C7' }}>
              Acción recomendada: {riskScore.recommended_action}
            </p>
          )}
        </section>
      )}
    </div>
  )
}

function PagosTab({ payments, tenantName, propertyName }: {
  payments: Payment[]; tenantName: string; propertyName?: string
}) {
  const [registerTarget, setRegisterTarget] = useState<Payment | null>(null)

  if (!payments.length) return <div className="py-10 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>Sin pagos registrados</div>

  const pending = payments.filter(p => p.status !== 'pagado')
  const paid    = payments.filter(p => p.status === 'pagado')

  return (
    <>
      {pending.length > 0 && (
        <div className="px-5 py-3 flex items-center gap-2" style={{ background: '#FEF3F2', borderBottom: '1px solid #FECDCA' }}>
          <span className="text-xs font-semibold" style={{ color: '#B42318' }}>
            {pending.length} pago{pending.length !== 1 ? 's' : ''} pendiente{pending.length !== 1 ? 's' : ''} ·
          </span>
          <span className="text-xs" style={{ color: '#B42318' }}>
            {formatCurrency(pending.reduce((s, p) => s + p.balance_due, 0), pending[0]?.currency)} adeudado
          </span>
        </div>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
            {['Período', 'Renta', 'Mora', 'Adeudado', 'Estado', 'Fecha pago', ''].map(h => (
              <th key={h} className="px-4 py-2.5 text-left font-medium" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-tertiary)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {payments.map((p, i) => {
            const isPending = p.status !== 'pagado' && p.balance_due > 0
            // Enrich with names for the modal
            const enriched = { ...p, tenant: { full_name: tenantName, email: null }, property: { name: propertyName ?? '' } }
            return (
              <tr key={p.id} style={{ borderBottom: i < payments.length - 1 ? '1px solid var(--border-subtle)' : 'none', background: isPending ? '#FFFBF9' : '' }}>
                <td className="px-4 py-3 text-xs font-medium capitalize" style={{ color: 'var(--text)' }}>{formatMonth(p.period_year, p.period_month)}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--text)' }}>{formatCurrency(p.rent_amount, p.currency)}</td>
                <td className="px-4 py-3 text-xs" style={{ color: p.late_fee > 0 ? '#B42318' : 'var(--text-tertiary)' }}>{p.late_fee > 0 ? formatCurrency(p.late_fee, p.currency) : '—'}</td>
                <td className="px-4 py-3 text-xs font-semibold" style={{ color: p.balance_due > 0 ? '#B42318' : '#027A48' }}>
                  {p.balance_due > 0 ? formatCurrency(p.balance_due, p.currency) : 'Pagado'}
                </td>
                <td className="px-4 py-3"><PaymentStatusBadge status={p.status} size="xs" /></td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>{p.paid_date ? formatDate(p.paid_date) : '—'}</td>
                <td className="px-4 py-3 text-right">
                  {isPending && (
                    <button
                      onClick={() => setRegisterTarget(enriched as any)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition bg-blue-600 hover:bg-blue-700"
                    >
                      Registrar pago
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {registerTarget && (
        <RegisterPaymentModal payment={registerTarget} onClose={() => setRegisterTarget(null)} />
      )}
    </>
  )
}

function DocumentosTab({ documents, tenantId }: { documents: Document[]; tenantId: string }) {
  if (!documents.length) return <div className="py-10 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>Sin documentos</div>
  return (
    <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
      {documents.map(d => (
        <div key={d.id} className="flex items-center justify-between gap-3 px-5 py-3">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{d.file_name}</p>
            {d.description && <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{d.description}</p>}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ background: 'var(--surface-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>{d.type.replace('_', ' ')}</span>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{formatDate(d.created_at)}</p>
            {d.file_path && <a href={d.file_path} target="_blank" rel="noreferrer" className="text-xs font-medium" style={{ color: '#175CD3' }}>Ver</a>}
          </div>
        </div>
      ))}
    </div>
  )
}
