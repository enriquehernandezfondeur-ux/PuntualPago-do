'use client'
import { cn } from '@/lib/utils/cn'
import { formatCurrency, formatDate, formatMonth } from '@/lib/utils/format'
import { Wallet, CheckCircle2, Clock, Printer } from 'lucide-react'
import type { OwnerPayout } from '@/types/database'

interface Props { payouts: (OwnerPayout & { property?: { name: string; address: string } })[]; ownerName: string }

export function PropietarioLiquidacionesContent({ payouts, ownerName }: Props) {
  const paid    = payouts.filter(p => p.paid)
  const pending = payouts.filter(p => !p.paid)
  const totalReceived = paid.reduce((s, p) => s + p.net_payout, 0)

  return (
    <>
      {/* ── Print styles ── */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #liquidaciones-print-area,
          #liquidaciones-print-area * { visibility: visible !important; }
          #liquidaciones-print-area { position: absolute; top: 0; left: 0; width: 100%; }
          .no-print { display: none !important; }
          @page { margin: 20mm 15mm; }
        }
      `}</style>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Liquidaciones</h1>
            <p className="text-slate-500 text-sm mt-0.5">{ownerName}</p>
          </div>
          <button
            onClick={() => window.print()}
            className="no-print flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold rounded-xl transition"
          >
            <Printer className="w-4 h-4" />
            Imprimir / PDF
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 no-print">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="p-2.5 bg-purple-50 rounded-xl"><Wallet className="w-4 h-4 text-purple-600" /></div>
            <div>
              <p className="font-bold text-slate-900">{formatCurrency(totalReceived)}</p>
              <p className="text-slate-500 text-xs">Total recibido</p>
            </div>
          </div>
          <div className="bg-white border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 rounded-xl"><CheckCircle2 className="w-4 h-4 text-emerald-600" /></div>
            <div>
              <p className="font-bold text-slate-900">{paid.length}</p>
              <p className="text-slate-500 text-xs">Liquidaciones pagadas</p>
            </div>
          </div>
          <div className={cn('bg-white border rounded-2xl p-4 flex items-center gap-3', pending.length > 0 ? 'border-amber-200' : 'border-slate-200')}>
            <div className={cn('p-2.5 rounded-xl', pending.length > 0 ? 'bg-amber-50' : 'bg-slate-50')}>
              <Clock className={cn('w-4 h-4', pending.length > 0 ? 'text-amber-600' : 'text-slate-400')} />
            </div>
            <div>
              <p className="font-bold text-slate-900">{pending.length}</p>
              <p className="text-slate-500 text-xs">Pendientes de pago</p>
            </div>
          </div>
        </div>

        {/* Pending payouts */}
        {pending.length > 0 && (
          <div className="no-print">
            <h3 className="text-sm font-semibold text-amber-700 mb-3">Pendientes de transferencia</h3>
            <div className="bg-white border border-amber-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
              {pending.map(p => <PayoutRow key={p.id} payout={p} />)}
            </div>
          </div>
        )}

        {/* All payouts table — printable area */}
        <div id="liquidaciones-print-area">
          {/* Print-only header */}
          <div className="hidden print:block mb-6">
            <div className="flex items-center justify-between border-b-2 border-slate-800 pb-3 mb-4">
              <div>
                <p className="text-2xl font-black text-slate-900">
                  Puntual<span style={{ color: '#4A90E2' }}>Pago</span>
                </p>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Gestión de Alquileres</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-700">Estado de Liquidaciones</p>
                <p className="text-xs text-slate-500">{ownerName}</p>
                <p className="text-xs text-slate-400">Generado: {new Date().toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>
          </div>

          <h3 className="text-sm font-semibold text-slate-700 mb-3">Historial completo</h3>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {payouts.map(p => (
                <div key={p.id} className="px-4 py-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-800 capitalize text-sm">{formatMonth(p.period_year, p.period_month)}</p>
                      <p className="text-slate-500 text-xs">{p.property?.name ?? '—'}</p>
                    </div>
                    {p.paid
                      ? <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full shrink-0">Pagado</span>
                      : <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full shrink-0">Pendiente</span>
                    }
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[10px] text-slate-400 mb-0.5">Renta</p>
                      <p className="text-xs font-semibold text-slate-700">{formatCurrency(p.rent_collected, p.currency)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 mb-0.5">Comisión</p>
                      <p className="text-xs font-semibold text-red-500">−{formatCurrency(p.management_fee, p.currency)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 mb-0.5">Neto</p>
                      <p className={`text-xs font-bold ${p.paid ? 'text-emerald-600' : 'text-slate-800'}`}>{formatCurrency(p.net_payout, p.currency)}</p>
                    </div>
                  </div>
                  {p.paid_date && <p className="text-slate-400 text-xs text-right">Pagado el {formatDate(p.paid_date)}</p>}
                </div>
              ))}
              {payouts.length === 0 && <div className="py-8 text-center text-slate-400 text-sm">Sin liquidaciones registradas</div>}
            </div>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Período</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Propiedad</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Renta cobrada</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Comisión</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Neto a recibir</th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Fecha pago</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payouts.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-800 capitalize">{formatMonth(p.period_year, p.period_month)}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-slate-600 text-sm">{p.property?.name ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <p className="text-slate-800 font-medium">{formatCurrency(p.rent_collected, p.currency)}</p>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <p className="text-red-500">−{formatCurrency(p.management_fee, p.currency)}</p>
                      {p.maintenance_deductions > 0 && (
                        <p className="text-red-400 text-xs">Mtto: −{formatCurrency(p.maintenance_deductions, p.currency)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <p className={cn('font-bold', p.paid ? 'text-emerald-600' : 'text-slate-900')}>
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
              {payouts.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-50 border-t-2 border-slate-200">
                    <td colSpan={2} className="px-5 py-3 text-sm font-bold text-slate-700">Total</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800 text-sm">
                      {formatCurrency(payouts.reduce((s, p) => s + p.rent_collected, 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-red-500 text-sm">
                      −{formatCurrency(payouts.reduce((s, p) => s + p.management_fee + (p.maintenance_deductions ?? 0), 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600 text-sm">
                      {formatCurrency(payouts.reduce((s, p) => s + p.net_payout, 0))}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
            {payouts.length === 0 && (
              <div className="py-10 text-center text-slate-400 text-sm">Sin liquidaciones registradas</div>
            )}
            </div>
          </div>

          {/* Print-only footer */}
          <div className="hidden print:block mt-6 pt-3 border-t border-slate-200 text-center">
            <p className="text-xs text-slate-400">
              PuntualPago OS — Gestión de Alquileres · contacto@puntualpago.do
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

function PayoutRow({ payout }: { payout: OwnerPayout & { property?: { name: string; address: string } } }) {
  const maint = payout.maintenance_deductions ?? 0
  return (
    <div className="px-5 py-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-800">{payout.property?.name ?? '—'}</p>
          <p className="text-slate-500 text-sm capitalize">{formatMonth(payout.period_year, payout.period_month)}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold text-slate-900 text-lg">{formatCurrency(payout.net_payout, payout.currency)}</p>
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
          <span className="font-semibold text-slate-700">= Neto a recibir</span>
          <span className="font-bold text-emerald-600">{formatCurrency(payout.net_payout, payout.currency)}</span>
        </div>
      </div>
    </div>
  )
}
