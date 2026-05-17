'use client'
import { useState, useMemo } from 'react'
import { formatCurrency, formatDate, formatMonth } from '@/lib/utils/format'
import { PaymentStatusBadge, TenantStatusBadge, RiskBadge } from '@/components/shared/StatusBadge'
import { Download, Printer, BarChart3, Users, CreditCard, Wallet } from 'lucide-react'

type ReportType = 'cobros' | 'mora' | 'inquilinos' | 'propietarios' | 'liquidaciones'

interface Props {
  payments: any[]; tenants: any[]; owners: any[]; payouts: any[]
  currentYear: number; currentMonth: number
}

export function ReportesContent({ payments, tenants, owners, payouts, currentYear, currentMonth }: Props) {
  const [report, setReport]       = useState<ReportType>('cobros')
  const [filterYear, setFilterYear]   = useState(currentYear)
  const [filterMonth, setFilterMonth] = useState(currentMonth)

  const REPORTS = [
    { key: 'cobros' as const,        label: 'Cobros del mes',   icon: CreditCard },
    { key: 'mora' as const,          label: 'Mora y deuda',     icon: BarChart3 },
    { key: 'inquilinos' as const,    label: 'Inquilinos',       icon: Users },
    { key: 'propietarios' as const,  label: 'Propietarios',     icon: Users },
    { key: 'liquidaciones' as const, label: 'Liquidaciones',    icon: Wallet },
  ]

  const filteredPayments = useMemo(() => payments.filter(p => p.period_year === filterYear && p.period_month === filterMonth), [payments, filterYear, filterMonth])
  const overduePayments  = useMemo(() => payments.filter(p => ['vencido','en_mora','en_legal'].includes(p.status) && p.balance_due > 0), [payments])

  function downloadCSV(data: any[], filename: string) {
    if (!data.length) return
    const headers = Object.keys(data[0])
    const rows    = data.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))
    const csv     = [headers.join(','), ...rows].join('\n')
    const blob    = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url     = URL.createObjectURL(blob)
    const a       = document.createElement('a'); a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  function exportReport() {
    if (report === 'cobros') {
      downloadCSV(filteredPayments.map(p => ({ Inquilino: p.tenant?.full_name, Propiedad: p.property?.name, Renta: p.rent_amount, Mora: p.late_fee, Adeudado: p.balance_due, Estado: p.status, 'Fecha pago': p.paid_date ?? '' })), `cobros-${filterYear}-${filterMonth}.csv`)
    } else if (report === 'mora') {
      downloadCSV(overduePayments.map(p => ({ Inquilino: p.tenant?.full_name, Propiedad: p.property?.name, 'Días mora': p.days_overdue, Balance: p.balance_due, Estado: p.status })), 'mora.csv')
    } else if (report === 'inquilinos') {
      downloadCSV(tenants.map((t: any) => ({ Nombre: t.full_name, Estado: t.status, Riesgo: t.risk_level, Balance: t.pending_balance, Teléfono: t.phone, Email: t.email })), 'inquilinos.csv')
    } else if (report === 'propietarios') {
      downloadCSV(owners.map((o: any) => ({ Nombre: o.full_name, Ciudad: o.city, Teléfono: o.phone, Email: o.email })), 'propietarios.csv')
    } else if (report === 'liquidaciones') {
      downloadCSV(payouts.map((p: any) => ({ Propietario: p.owner?.full_name, Propiedad: p.property?.name, Período: formatMonth(p.period_year, p.period_month), 'Renta cobrada': p.rent_collected, Comisión: p.management_fee, Neto: p.net_payout, Pagado: p.paid ? 'Sí' : 'No', 'Fecha pago': p.paid_date ?? '' })), 'liquidaciones.csv')
    }
  }

  const totalCobrado   = filteredPayments.filter(p => p.status === 'pagado').reduce((s: number, p: any) => s + p.amount_paid, 0)
  const totalPendiente = filteredPayments.filter(p => p.status !== 'pagado').reduce((s: number, p: any) => s + p.balance_due, 0)
  const totalMora      = overduePayments.reduce((s: number, p: any) => s + p.balance_due, 0)

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-5" style={{ background: 'var(--bg)' }}>
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {REPORTS.map(r => (
            <button key={r.key} onClick={() => setReport(r.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition"
              style={report === r.key ? { background: '#1570EF', color: '#fff' } : { color: 'var(--text-tertiary)' }}>
              <r.icon className="w-3.5 h-3.5" /> {r.label}
            </button>
          ))}
        </div>
        {report === 'cobros' && (
          <div className="flex items-center gap-2">
            <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))} className="px-3 py-1.5 rounded-lg text-sm border" style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{new Date(2024, m - 1).toLocaleDateString('es-DO', { month: 'long' })}</option>)}
            </select>
            <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))} className="px-3 py-1.5 rounded-lg text-sm border" style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}>
              {[currentYear - 1, currentYear, currentYear + 1].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}><Printer className="w-3.5 h-3.5" /> Imprimir</button>
          <button onClick={exportReport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white transition" style={{ background: '#1570EF' }} onMouseEnter={e => (e.currentTarget.style.background = '#175CD3')} onMouseLeave={e => (e.currentTarget.style.background = '#1570EF')}><Download className="w-3.5 h-3.5" /> Exportar CSV</button>
        </div>
      </div>

      {report === 'cobros' && (
        <>
          <KpiRow items={[{ label: `Cobrado ${formatMonth(filterYear, filterMonth)}`, value: formatCurrency(totalCobrado), color: '#027A48' }, { label: 'Pendiente', value: formatCurrency(totalPendiente), color: '#B42318', alert: totalPendiente > 0 }, { label: 'Registros', value: filteredPayments.length, color: 'var(--text)' }]} />
          <RT headers={['Inquilino', 'Propiedad', 'Renta', 'Mora', 'Adeudado', 'Estado', 'Pagado']}
            rows={filteredPayments.map(p => [p.tenant?.full_name ?? '—', p.property?.name ?? '—', formatCurrency(p.rent_amount, p.currency), p.late_fee > 0 ? formatCurrency(p.late_fee, p.currency) : '—', <span style={{ color: p.balance_due > 0 ? '#B42318' : '#027A48', fontWeight: 600 }}>{p.balance_due > 0 ? formatCurrency(p.balance_due, p.currency) : 'Pagado'}</span>, <PaymentStatusBadge status={p.status} size="xs" />, p.paid_date ? formatDate(p.paid_date) : '—'])} />
        </>
      )}
      {report === 'mora' && (
        <>
          <KpiRow items={[{ label: 'Total mora', value: formatCurrency(totalMora), color: '#B42318', alert: true }, { label: 'Casos', value: overduePayments.length, color: '#B42318' }, { label: 'Promedio días', value: Math.round(overduePayments.reduce((s: number, p: any) => s + (p.days_overdue ?? 0), 0) / (overduePayments.length || 1)) + 'd', color: 'var(--text)' }]} />
          <RT headers={['Inquilino', 'Propiedad', 'Propietario', 'Balance', 'Días mora', 'Estado', 'Venció']}
            rows={overduePayments.map(p => [p.tenant?.full_name ?? '—', p.property?.name ?? '—', p.owner?.full_name ?? '—', <span style={{ color: '#B42318', fontWeight: 600 }}>{formatCurrency(p.balance_due, p.currency)}</span>, <span style={{ color: '#B42318' }}>{p.days_overdue}d</span>, <PaymentStatusBadge status={p.status} size="xs" />, formatDate(p.due_date)])} />
        </>
      )}
      {report === 'inquilinos' && (
        <>
          <KpiRow items={[{ label: 'Total', value: tenants.length, color: 'var(--text)' }, { label: 'Activos', value: tenants.filter((t: any) => t.status === 'activo').length, color: '#027A48' }, { label: 'Con deuda', value: tenants.filter((t: any) => t.pending_balance > 0).length, color: '#B42318', alert: true }]} />
          <RT headers={['Nombre', 'Estado', 'Riesgo', 'Balance', 'Teléfono', 'Email']}
            rows={tenants.map((t: any) => [t.full_name, <TenantStatusBadge status={t.status} size="xs" />, <RiskBadge level={t.risk_level} size="xs" />, t.pending_balance > 0 ? <span style={{ color: '#B42318', fontWeight: 600 }}>{formatCurrency(t.pending_balance)}</span> : <span style={{ color: '#027A48' }}>Al día</span>, t.phone ?? '—', t.email ?? '—'])} />
        </>
      )}
      {report === 'propietarios' && (
        <RT headers={['Nombre', 'Ciudad', 'Teléfono', 'Email']} rows={owners.map((o: any) => [o.full_name, o.city, o.phone ?? '—', o.email ?? '—'])} />
      )}
      {report === 'liquidaciones' && (
        <>
          <KpiRow items={[{ label: 'Total liquidado', value: formatCurrency(payouts.filter((p: any) => p.paid).reduce((s: number, p: any) => s + p.net_payout, 0)), color: '#027A48' }, { label: 'Por pagar', value: formatCurrency(payouts.filter((p: any) => !p.paid).reduce((s: number, p: any) => s + p.net_payout, 0)), color: '#B54708', alert: true }, { label: 'Registros', value: payouts.length, color: 'var(--text)' }]} />
          <RT headers={['Propietario', 'Propiedad', 'Período', 'Renta cobrada', 'Comisión', 'Neto', 'Estado', 'Fecha pago']}
            rows={payouts.map((p: any) => [p.owner?.full_name ?? '—', p.property?.name ?? '—', formatMonth(p.period_year, p.period_month), formatCurrency(p.rent_collected, p.currency), <span style={{ color: '#B42318' }}>−{formatCurrency(p.management_fee, p.currency)}</span>, <span style={{ fontWeight: 600, color: p.paid ? '#027A48' : 'var(--text)' }}>{formatCurrency(p.net_payout, p.currency)}</span>, p.paid ? <span style={{ color: '#027A48', fontWeight: 600 }}>Pagado</span> : <span style={{ color: '#B54708', fontWeight: 600 }}>Pendiente</span>, p.paid_date ? formatDate(p.paid_date) : '—'])} />
        </>
      )}
    </div>
  )
}

function KpiRow({ items }: { items: { label: string; value: string | number; color: string; alert?: boolean }[] }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {items.map((kpi, i) => (
        <div key={i} className="rounded-xl p-4" style={{ background: 'var(--surface)', border: kpi.alert ? '1px solid #FECDCA' : '1px solid var(--border)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>{kpi.label}</p>
          <p className="font-bold text-xl" style={{ color: kpi.color, letterSpacing: '-0.02em' }}>{kpi.value}</p>
        </div>
      ))}
    </div>
  )
}

function RT({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  if (!rows.length) return <div className="py-10 text-center text-sm rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-tertiary)' }}>Sin datos</div>
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>{headers.map(h => <th key={h} className="px-4 py-2.5 text-left font-medium whitespace-nowrap" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-tertiary)' }}>{h}</th>)}</tr></thead>
          <tbody>{rows.map((row, i) => <tr key={i} style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>{row.map((cell, j) => <td key={j} className="px-4 py-3 text-xs" style={{ color: 'var(--text)' }}>{cell}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </div>
  )
}
