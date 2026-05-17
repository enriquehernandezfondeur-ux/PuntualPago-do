'use client'
import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'
import { createClient } from '@/lib/supabase/client'
import { logAudit } from '@/lib/utils/audit'
import { formatCurrency, formatDate, formatMonth, initials } from '@/lib/utils/format'
import { PropertyStatusBadge, TenantStatusBadge } from '@/components/shared/StatusBadge'
import { OwnerForm } from '@/components/forms/OwnerForm'
import { ActivityTimeline } from './ActivityTimeline'
import { QuickNote } from './QuickNote'
import type { Owner, OwnerPayout, Communication, Document } from '@/types/database'
import {
  Phone, Mail, MessageCircle, Building2, Wallet,
  Pencil, ArrowLeft, DollarSign, TrendingUp, Send, UserCheck,
  CheckCircle2, Clock, Loader2,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

type Tab = 'overview' | 'propiedades' | 'liquidaciones' | 'timeline'

interface Props {
  owner: Owner
  properties: any[]
  payouts: (OwnerPayout & { property: any })[]
  communications: Communication[]
  documents: Document[]
  onPortalInvite: () => void
  portalActive: boolean
}

export function OwnerProfile({ owner, properties, payouts, communications, documents, onPortalInvite, portalActive }: Props) {
  const [tab, setTab]           = useState<Tab>('overview')
  const [editOpen, setEditOpen] = useState(false)

  const totalReceived    = payouts.filter(p => p.paid).reduce((s, p) => s + p.net_payout, 0)
  const pendingPayouts   = payouts.filter(p => !p.paid)
  const pendingAmount    = pendingPayouts.reduce((s, p) => s + p.net_payout, 0)
  const occupiedProps    = properties.filter(p => p.status === 'ocupada').length

  const timelineEvents = [
    ...payouts.map(p => ({
      id: p.id, date: p.paid_date ?? `${p.period_year}-${String(p.period_month).padStart(2,'0')}-01`,
      type: 'payment' as const,
      title: `Liquidación ${formatMonth(p.period_year, p.period_month)}${p.property ? ` — ${p.property.name}` : ''}`,
      description: `Renta: ${formatCurrency(p.rent_collected, p.currency)} · Comisión: -${formatCurrency(p.management_fee, p.currency)}`,
      amount: p.net_payout, currency: p.currency,
      status: p.paid ? 'pagado' : 'vencido',
    })),
    ...communications.map(c => ({
      id: c.id, date: c.sent_at ?? c.created_at, type: 'communication' as const,
      title: c.subject ?? 'Comunicación',
      description: c.content.slice(0, 100),
      channel: c.channel,
    })),
    ...documents.map(d => ({
      id: d.id, date: d.created_at, type: 'document' as const,
      title: d.file_name,
      description: d.description ?? undefined,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: 'overview',      label: 'Resumen' },
    { key: 'propiedades',   label: 'Propiedades', count: properties.length },
    { key: 'liquidaciones', label: 'Liquidaciones', count: payouts.length },
    { key: 'timeline',      label: 'Historial', count: timelineEvents.length },
  ]

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin" style={{ background: 'var(--bg)' }}>
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">

        <Link href="/propietarios" className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-tertiary)' }}>
          <ArrowLeft className="w-3.5 h-3.5" /> Propietarios
        </Link>

        {/* Header */}
        <div className="rounded-2xl p-5 flex items-start gap-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-xl shrink-0" style={{ background: 'var(--blue-bg)', color: 'var(--blue-text)' }}>
            {initials(owner.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>{owner.full_name}</h1>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {owner.is_company && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--blue-bg)', color: 'var(--blue-text)', border: '1px solid var(--border)' }}>Empresa</span>}
                  <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ background: 'var(--surface-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>{owner.relationship_level}</span>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{owner.city}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!portalActive && (
                  <button onClick={onPortalInvite} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success-border)' }}>
                    <Send className="w-3.5 h-3.5" /> Activar portal
                  </button>
                )}
                {portalActive && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
                    <UserCheck className="w-3.5 h-3.5" /> Portal activo
                  </span>
                )}
                <button onClick={() => setEditOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {owner.phone && <a href={`tel:${owner.phone}`} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}><Phone className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-tertiary)' }} />{owner.phone}</a>}
              {owner.whatsapp && <a href={`https://wa.me/${owner.whatsapp?.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm" style={{ color: 'var(--success)' }}><MessageCircle className="w-3.5 h-3.5 shrink-0" />{owner.whatsapp}</a>}
              {owner.email && <a href={`mailto:${owner.email}`} className="flex items-center gap-2 text-sm truncate" style={{ color: 'var(--text-secondary)' }}><Mail className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-tertiary)' }} /><span className="truncate">{owner.email}</span></a>}
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}><Building2 className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-tertiary)' }} />{occupiedProps}/{properties.length} propiedades</div>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Propiedades', value: properties.length, sub: `${occupiedProps} ocupadas`, icon: Building2 },
            { label: 'Total recibido', value: formatCurrency(totalReceived), sub: 'Liquidaciones pagadas', icon: TrendingUp },
            { label: 'Por liquidar', value: formatCurrency(pendingAmount), sub: `${pendingPayouts.length} pendientes`, alert: pendingAmount > 0, icon: Wallet },
            { label: 'Banco', value: owner.bank_name ?? '—', sub: owner.bank_account ? `****${owner.bank_account.slice(-4)}` : '', icon: DollarSign },
          ].map((kpi, i) => (
            <div key={i} className="rounded-xl p-4" style={{ background: 'var(--surface)', border: kpi.alert ? '1px solid #FEDDCA' : '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 mb-2"><kpi.icon className="w-3.5 h-3.5" style={{ color: kpi.alert ? '#EF6820' : 'var(--text-tertiary)' }} /><p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{kpi.label}</p></div>
              <p className="font-bold text-base leading-tight" style={{ color: kpi.alert ? '#B93815' : 'var(--text)' }}>{kpi.value}</p>
              {kpi.sub && <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{kpi.sub}</p>}
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
              {t.count !== undefined && t.count > 0 && <span className="text-xs px-1.5 py-px rounded-full" style={{ background: 'var(--surface-subtle)', color: 'var(--text-tertiary)' }}>{t.count}</span>}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {tab === 'overview' && (
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <section>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>Información</p>
                <div className="space-y-2">
                  {[
                    { label: 'Cédula / RNC', value: owner.cedula ?? owner.rnc },
                    { label: 'Dirección', value: owner.address },
                    { label: 'Sector', value: owner.sector },
                    { label: 'Ciudad', value: owner.city },
                  ].map(row => row.value && (
                    <div key={row.label} className="flex items-center justify-between gap-3">
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{row.label}</span>
                      <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </section>
              <section>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>Datos bancarios</p>
                <div className="space-y-2">
                  {[
                    { label: 'Banco', value: owner.bank_name },
                    { label: 'Cuenta', value: owner.bank_account },
                    { label: 'Tipo', value: owner.bank_account_type },
                    { label: 'Método pago', value: owner.payment_preference },
                  ].map(row => row.value && (
                    <div key={row.label} className="flex items-center justify-between gap-3">
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{row.label}</span>
                      <span className="text-xs font-medium capitalize" style={{ color: 'var(--text)' }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </section>
              {owner.sensitivity_notes && (
                <section className="col-span-full">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>Notas de sensibilidad</p>
                  <p className="text-sm rounded-xl p-3" style={{ color: 'var(--text-secondary)', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)' }}>{owner.sensitivity_notes}</p>
                </section>
              )}
              <section className="col-span-full">
                <QuickNote ownerId={owner.id} />
              </section>
            </div>
          )}

          {tab === 'propiedades' && (
            <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {properties.map(prop => {
                const lease = (prop.current_lease ?? []).find((l: any) => l.status === 'activo')
                const tenant = lease?.tenant
                return (
                  <div key={prop.id} className="flex items-center justify-between gap-4 px-5 py-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--blue-bg)' }}>
                        <Building2 className="w-4 h-4" style={{ color: 'var(--blue-text)' }} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate" style={{ color: 'var(--text)' }}>{prop.name}</p>
                        <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{prop.address}</p>
                        {tenant && <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{tenant.full_name} · {formatCurrency(lease.rent_amount, lease.currency)}/mes</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {tenant && <TenantStatusBadge status={tenant.status} size="xs" />}
                      <PropertyStatusBadge status={prop.status} size="xs" />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {tab === 'liquidaciones' && <LiquidacionesTab payouts={payouts} ownerId={owner.id} ownerName={owner.full_name} />}

          {tab === 'timeline' && <div className="px-5 py-5"><ActivityTimeline events={timelineEvents} /></div>}
        </div>
      </div>
      {editOpen && <OwnerForm open onClose={() => setEditOpen(false)} defaultValues={owner} ownerId={owner.id} />}
    </div>
  )
}

// ─── Liquidaciones tab con "Marcar pagado" ────────────────────────────────────

const PAYMENT_METHODS = ['Transferencia', 'Cheque', 'Efectivo', 'Otro']

function LiquidacionesTab({ payouts, ownerId, ownerName }: {
  payouts: (OwnerPayout & { property?: any })[]; ownerId: string; ownerName: string
}) {
  const [markTarget, setMarkTarget] = useState<OwnerPayout | null>(null)
  const [method, setMethod]         = useState('')
  const [reference, setReference]   = useState('')
  const [paidDate, setPaidDate]     = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving]         = useState(false)
  const [localPaid, setLocalPaid]   = useState<Set<string>>(new Set())
  const router = useRouter()
  const supabase = createClient()

  const pending = payouts.filter(p => !p.paid && !localPaid.has(p.id))
  const pendingTotal = pending.reduce((s, p) => s + p.net_payout, 0)

  async function confirmPayment() {
    if (!markTarget || !method) return
    setSaving(true)
    try {
      const { error } = await supabase.from('owner_payouts').update({
        paid: true,
        paid_date: paidDate,
        payment_method: method,
        payment_reference: reference || null,
      }).eq('id', markTarget.id)
      if (error) throw error
      await logAudit({ action: 'owner_payout_paid', entityType: 'owner_payouts', entityId: markTarget.id, newValues: { paid: true, payment_method: method, paid_date: paidDate } })
      setLocalPaid(prev => { const next = new Set(prev); next.add(markTarget.id); return next })
      setMarkTarget(null)
      setMethod('')
      setReference('')
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  if (!payouts.length) return <div className="py-10 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>Sin liquidaciones registradas</div>

  return (
    <>
      {pending.length > 0 && (
        <div className="px-5 py-3 flex items-center gap-2" style={{ background: 'var(--warning-bg)', borderBottom: '1px solid var(--warning-border)' }}>
          <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--warning)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--warning)' }}>
            {pending.length} liquidación{pending.length !== 1 ? 'es' : ''} pendiente{pending.length !== 1 ? 's' : ''} ·
          </span>
          <span className="text-xs" style={{ color: 'var(--warning)' }}>
            {formatCurrency(pendingTotal, pending[0]?.currency)} por transferir a {ownerName.split(' ')[0]}
          </span>
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
            {['Período', 'Propiedad', 'Renta cobrada', 'Comisión', 'Neto a pagar', 'Estado', 'Acción'].map(h => (
              <th key={h} className="px-4 py-2.5 text-left font-medium" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-tertiary)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {payouts.map((p, i) => {
            const isPaid = p.paid || localPaid.has(p.id)
            return (
              <tr key={p.id} style={{ borderBottom: i < payouts.length - 1 ? '1px solid var(--border-subtle)' : 'none', background: !isPaid ? '#FFFDF5' : '' }}>
                <td className="px-4 py-3 text-xs font-medium capitalize" style={{ color: 'var(--text)' }}>{formatMonth(p.period_year, p.period_month)}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{(p as any).property?.name ?? '—'}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--text)' }}>{formatCurrency(p.rent_collected, p.currency)}</td>
                <td className="px-4 py-3 text-xs" style={{ color: '#B42318' }}>−{formatCurrency(p.management_fee, p.currency)}</td>
                <td className="px-4 py-3 text-sm font-bold" style={{ color: isPaid ? 'var(--success)' : 'var(--text)' }}>
                  {formatCurrency(p.net_payout, p.currency)}
                </td>
                <td className="px-4 py-3">
                  {isPaid
                    ? <span className="text-xs flex items-center gap-1 font-medium" style={{ color: '#027A48' }}><CheckCircle2 className="w-3 h-3" /> Pagado {p.paid_date ? formatDate(p.paid_date) : ''}</span>
                    : <span className="text-xs flex items-center gap-1 font-medium" style={{ color: '#B54708' }}><Clock className="w-3 h-3" /> Pendiente</span>
                  }
                </td>
                <td className="px-4 py-3">
                  {!isPaid && (
                    <button
                      onClick={() => setMarkTarget(p)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white transition bg-emerald-500 hover:bg-emerald-600"
                    >
                      Marcar pagado
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Confirm modal */}
      {markTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-fade-in" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Confirmar pago a {ownerName.split(' ')[0]}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                {formatMonth(markTarget.period_year, markTarget.period_month)} · {formatCurrency(markTarget.net_payout, markTarget.currency)}
              </p>
            </div>
            <div className="px-5 py-5 space-y-4">
              {/* Method */}
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Método de pago</p>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_METHODS.map(m => (
                    <button key={m} type="button" onClick={() => setMethod(m)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition border"
                      style={method === m
                        ? { background: 'var(--blue-bg)', color: 'var(--blue-text)', borderColor: 'var(--border)' }
                        : { background: 'var(--surface-subtle)', color: 'var(--text-secondary)', borderColor: 'var(--border)' }
                      }
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              {/* Reference */}
              <div>
                <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Referencia</p>
                <input
                  value={reference} onChange={e => setReference(e.target.value)}
                  placeholder="No. de transferencia, cheque, etc."
                  className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </div>
              {/* Date */}
              <div>
                <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Fecha de pago</p>
                <input type="date" value={paidDate} onChange={e => setPaidDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setMarkTarget(null)} className="flex-1 py-2 rounded-lg text-sm font-medium border transition" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                  Cancelar
                </button>
                <button onClick={confirmPayment} disabled={saving || !method}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2 transition disabled:opacity-50 bg-emerald-500 hover:bg-emerald-600"
                >
                  {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando...</> : <><CheckCircle2 className="w-3.5 h-3.5" /> Confirmar</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
