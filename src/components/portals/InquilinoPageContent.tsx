'use client'
import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils/cn'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { PaymentStatusBadge } from '@/components/shared/StatusBadge'
import type { Payment } from '@/types/database'
import { CreditCard, CheckCircle2, AlertCircle, FileText, ChevronLeft } from 'lucide-react'

interface Props { payments: Payment[]; tenantName: string }

export function InquilinoPageContent({ payments, tenantName }: Props) {
  // Derive available years from all payments
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(payments.map(p => p.period_year))).sort((a, b) => b - a)
    return years
  }, [payments])

  const currentYear = new Date().getFullYear()
  const defaultYear = availableYears.includes(currentYear) ? currentYear : (availableYears[0] ?? currentYear)
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(defaultYear)

  const filtered = useMemo(
    () => selectedYear === 'all' ? payments : payments.filter(p => p.period_year === selectedYear),
    [payments, selectedYear],
  )

  const paid    = filtered.filter(p => p.status === 'pagado').length
  const pending = filtered.filter(p => p.status !== 'pagado').length
  const total   = filtered.filter(p => p.status === 'pagado').reduce((s, p) => s + p.amount_paid, 0)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <a
          href="/portal/inquilino"
          className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
          aria-label="Volver al portal"
        >
          <ChevronLeft className="w-5 h-5" />
        </a>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Historial de pagos</h1>
          <p className="text-slate-500 text-sm mt-0.5">{tenantName}</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 rounded-xl"><CreditCard className="w-4 h-4 text-blue-600" /></div>
          <div>
            <p className="font-bold text-slate-900">{filtered.length}</p>
            <p className="text-slate-500 text-xs">Total registros</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 rounded-xl"><CheckCircle2 className="w-4 h-4 text-emerald-600" /></div>
          <div>
            <p className="font-bold text-slate-900">{paid}</p>
            <p className="text-slate-500 text-xs">Pagados</p>
          </div>
        </div>
        <div className={cn('bg-white border rounded-2xl p-4 flex items-center gap-3', pending > 0 ? 'border-red-200' : 'border-slate-200')}>
          <div className={cn('p-2.5 rounded-xl', pending > 0 ? 'bg-red-50' : 'bg-slate-50')}>
            <AlertCircle className={cn('w-4 h-4', pending > 0 ? 'text-red-600' : 'text-slate-400')} />
          </div>
          <div>
            <p className="font-bold text-slate-900">{formatCurrency(total)}</p>
            <p className="text-slate-500 text-xs">Total pagado</p>
          </div>
        </div>
      </div>

      {/* Year filter */}
      {availableYears.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-500 text-xs font-medium">Filtrar por año:</span>
          <button
            onClick={() => setSelectedYear('all')}
            className={cn(
              'px-3 py-1 text-xs font-semibold rounded-full border transition',
              selectedYear === 'all'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            )}
          >
            Todos
          </button>
          {availableYears.map(year => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={cn(
                'px-3 py-1 text-xs font-semibold rounded-full border transition',
                selectedYear === year
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              )}
            >
              {year}
            </button>
          ))}
        </div>
      )}

      {/* Mobile: payment cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 && (
          <p className="text-center text-slate-400 text-sm py-8">Sin pagos para este período</p>
        )}
        {filtered.map(p => {
          const isOverdue = ['vencido','en_mora','en_legal'].includes(p.status)
          return (
            <div key={p.id} className={cn('rounded-2xl p-4 border', isOverdue ? 'bg-red-50/30 border-red-200' : 'bg-white border-slate-200')}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-semibold text-slate-800 capitalize text-sm">
                    {new Date(p.period_year, p.period_month - 1).toLocaleDateString('es-DO', { month: 'long', year: 'numeric' })}
                  </p>
                  {p.payment_number && <p className="text-slate-400 text-xs font-mono">{p.payment_number}</p>}
                </div>
                <PaymentStatusBadge status={p.status} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                <div><p className="text-slate-400">Renta</p><p className="font-semibold text-slate-700">{formatCurrency(p.rent_amount, p.currency)}</p></div>
                {p.late_fee > 0 && <div><p className="text-slate-400">Mora</p><p className="font-semibold text-red-600">{formatCurrency(p.late_fee, p.currency)}</p></div>}
                {p.amount_paid > 0 && <div><p className="text-slate-400">Pagado</p><p className="font-semibold text-emerald-600">{formatCurrency(p.amount_paid, p.currency)}</p></div>}
                {p.paid_date && <div><p className="text-slate-400">Fecha pago</p><p className="font-medium text-slate-600">{formatDate(p.paid_date)}</p></div>}
              </div>
              {p.status === 'pagado' && (
                <a href={`/portal/inquilino/recibo/${p.id}`} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
                  <FileText className="w-3 h-3" /> Ver recibo
                </a>
              )}
            </div>
          )
        })}
      </div>

      {/* Desktop: Payments table */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Período</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Propiedad</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Renta</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Mora</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Pagado</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Fecha pago</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Recibo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(p => {
                const prop = (p as any).property
                return (
                  <tr key={p.id} className={cn('transition', p.status === 'pagado' ? 'hover:bg-emerald-50/40' : ['vencido','en_mora','en_legal'].includes(p.status) ? 'bg-red-50/30 hover:bg-red-50/50' : 'hover:bg-slate-50')}>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-800 capitalize">
                        {new Date(p.period_year, p.period_month - 1).toLocaleDateString('es-DO', { month: 'long', year: 'numeric' })}
                      </p>
                      {p.payment_number && <p className="text-slate-400 text-xs font-mono">{p.payment_number}</p>}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-slate-600 text-sm">{prop?.name ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <p className="text-slate-800 font-medium">{formatCurrency(p.rent_amount, p.currency)}</p>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {p.late_fee > 0
                        ? <p className="text-red-600 font-medium">{formatCurrency(p.late_fee, p.currency)}</p>
                        : <p className="text-slate-300">—</p>
                      }
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <p className={cn('font-semibold', p.amount_paid > 0 ? 'text-emerald-600' : 'text-slate-400')}>
                        {p.amount_paid > 0 ? formatCurrency(p.amount_paid, p.currency) : '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <PaymentStatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <p className="text-slate-500 text-xs">{p.paid_date ? formatDate(p.paid_date) : '—'}</p>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {p.status === 'pagado' ? (
                        <a
                          href={`/portal/inquilino/recibo/${p.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition"
                        >
                          <FileText className="w-3 h-3" />
                          Ver
                        </a>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-10 text-center text-slate-400 text-sm">
            {payments.length === 0 ? 'Sin historial de pagos' : `Sin pagos para ${selectedYear}`}
          </div>
        )}
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400">
            {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
            {selectedYear !== 'all' && ` en ${selectedYear}`}
            {payments.length !== filtered.length && ` · ${payments.length} total en todos los años`}
          </div>
        )}
      </div>

      {/* Also update summary grid for mobile */}
    </div>
  )
}
