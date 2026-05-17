'use client'
import { formatCurrency, formatDate, formatMonth } from '@/lib/utils/format'
import { ArrowLeft, Printer, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

interface Props {
  payment: any
  companyName: string
  companyPhone: string
  companyEmail: string
  companyAddress: string
}

export function ReciboView({ payment, companyName, companyPhone, companyEmail, companyAddress }: Props) {
  const tenant   = payment.tenant
  const property = payment.property
  const receiptNo = payment.payment_number ?? `REC-${payment.id.slice(0, 8).toUpperCase()}`

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Toolbar */}
      <div className="print:hidden flex items-center justify-between px-6 py-3 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <Link href="/cobros" className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-tertiary)' }}>
          <ArrowLeft className="w-3.5 h-3.5" /> Volver a Cobros
        </Link>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold text-white"
          style={{ background: '#1570EF' }}
        >
          <Printer className="w-3.5 h-3.5" /> Imprimir recibo
        </button>
      </div>

      {/* Receipt document */}
      <div className="max-w-xl mx-auto px-6 py-10 print:px-0 print:py-0 print:max-w-none">
        <div className="bg-white rounded-2xl p-10 print:rounded-none print:shadow-none" style={{ border: '1px solid #E4E7EC' }}>

          {/* Header */}
          <div className="text-center mb-8 pb-6" style={{ borderBottom: '2px solid #0B3C5D' }}>
            <h1 className="text-2xl font-bold" style={{ color: '#0B3C5D', letterSpacing: '-0.02em' }}>{companyName}</h1>
            <p className="text-sm mt-1" style={{ color: '#475467' }}>Recibo Oficial de Pago</p>
            {companyAddress && <p className="text-xs mt-0.5" style={{ color: '#98A2B3' }}>{companyAddress}</p>}
          </div>

          {/* Receipt number + date */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#98A2B3' }}>Número de recibo</p>
              <p className="text-xl font-bold mt-1 font-mono" style={{ color: '#101828' }}>{receiptNo}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#98A2B3' }}>Fecha de pago</p>
              <p className="text-base font-semibold mt-1" style={{ color: '#101828' }}>{formatDate(payment.paid_date!)}</p>
            </div>
          </div>

          {/* Payment confirmation banner */}
          <div className="flex items-center gap-3 rounded-xl p-4 mb-6" style={{ background: '#ECFDF3', border: '1px solid #A6F4C5' }}>
            <CheckCircle2 className="w-6 h-6 shrink-0" style={{ color: '#12B76A' }} />
            <div>
              <p className="font-semibold text-sm" style={{ color: '#027A48' }}>Pago recibido y confirmado</p>
              <p className="text-xs" style={{ color: '#039855' }}>
                {formatMonth(payment.period_year, payment.period_month)} · {property?.name}
              </p>
            </div>
          </div>

          {/* Parties */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#98A2B3' }}>Recibido de</p>
              <p className="font-semibold" style={{ color: '#101828' }}>{tenant?.full_name ?? '—'}</p>
              {tenant?.id_number && <p className="text-sm" style={{ color: '#475467' }}>Cédula: {tenant.id_number}</p>}
              {tenant?.phone && <p className="text-sm" style={{ color: '#475467' }}>{tenant.phone}</p>}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#98A2B3' }}>Por concepto de</p>
              <p className="font-semibold" style={{ color: '#101828' }}>Renta mensual</p>
              <p className="text-sm" style={{ color: '#475467' }}>{property?.name}</p>
              <p className="text-sm" style={{ color: '#475467' }}>Período: {formatMonth(payment.period_year, payment.period_month)}</p>
            </div>
          </div>

          {/* Amount breakdown */}
          <div className="rounded-xl overflow-hidden mb-6" style={{ border: '1px solid #E4E7EC' }}>
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E4E7EC' }}>
                  <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wider" style={{ color: '#98A2B3' }}>Concepto</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-xs uppercase tracking-wider" style={{ color: '#98A2B3' }}>Monto</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #F2F4F7' }}>
                  <td className="px-4 py-3 text-sm" style={{ color: '#475467' }}>Renta mensual — {formatMonth(payment.period_year, payment.period_month)}</td>
                  <td className="px-4 py-3 text-sm text-right" style={{ color: '#101828' }}>{formatCurrency(payment.rent_amount, payment.currency)}</td>
                </tr>
                {payment.late_fee > 0 && (
                  <tr style={{ borderBottom: '1px solid #F2F4F7' }}>
                    <td className="px-4 py-3 text-sm" style={{ color: '#475467' }}>Recargo por mora</td>
                    <td className="px-4 py-3 text-sm text-right" style={{ color: '#B42318' }}>{formatCurrency(payment.late_fee, payment.currency)}</td>
                  </tr>
                )}
                {payment.discount > 0 && (
                  <tr style={{ borderBottom: '1px solid #F2F4F7' }}>
                    <td className="px-4 py-3 text-sm" style={{ color: '#475467' }}>Descuento aplicado</td>
                    <td className="px-4 py-3 text-sm text-right" style={{ color: '#027A48' }}>−{formatCurrency(payment.discount, payment.currency)}</td>
                  </tr>
                )}
                <tr style={{ background: '#F9FAFB', borderTop: '2px solid #0B3C5D' }}>
                  <td className="px-4 py-3 font-bold text-sm" style={{ color: '#101828' }}>Total pagado</td>
                  <td className="px-4 py-3 font-bold text-lg text-right" style={{ color: '#027A48' }}>{formatCurrency(payment.amount_paid, payment.currency)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Payment method */}
          {(payment.payment_method || payment.payment_reference) && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              {payment.payment_method && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#98A2B3' }}>Método de pago</p>
                  <p className="text-sm font-medium mt-1" style={{ color: '#101828' }}>{payment.payment_method}</p>
                </div>
              )}
              {payment.payment_reference && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#98A2B3' }}>Referencia</p>
                  <p className="text-sm font-mono mt-1" style={{ color: '#101828' }}>{payment.payment_reference}</p>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 flex items-end justify-between" style={{ borderTop: '1px solid #E4E7EC' }}>
            <div>
              <p className="text-xs" style={{ color: '#98A2B3' }}>Este documento es válido como comprobante de pago.</p>
              <p className="text-xs mt-0.5" style={{ color: '#98A2B3' }}>Generado el {new Date().toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              {companyPhone && <p className="text-xs mt-0.5" style={{ color: '#98A2B3' }}>{companyPhone} · {companyEmail}</p>}
            </div>
            <div className="text-right">
              <div className="mt-8 pt-2" style={{ borderTop: '1px solid #D0D5DD', minWidth: '140px' }}>
                <p className="text-xs" style={{ color: '#475467' }}>{companyName}</p>
                <p className="text-xs" style={{ color: '#98A2B3' }}>Firma autorizada</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page { margin: 1.5cm; size: letter; }
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  )
}
