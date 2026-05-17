'use client'
import { formatCurrency, formatDate, formatMonth } from '@/lib/utils/format'
import type { Tenant, Payment, Lease } from '@/types/database'
import { ArrowLeft, Printer } from 'lucide-react'
import Link from 'next/link'

interface Props {
  tenant: Tenant
  payments: (Payment & { property?: any })[]
  lease: (Lease & { property?: any }) | null
  companyName: string
  companyPhone: string
  companyEmail: string
}

export function EstadoCuentaView({ tenant, payments, lease, companyName, companyPhone, companyEmail }: Props) {
  const today    = new Date()
  const property = lease?.property
  const paid     = payments.filter(p => p.status === 'pagado')
  const pending  = payments.filter(p => p.status !== 'pagado' && p.balance_due > 0)
  const totalPaid = paid.reduce((s, p) => s + p.amount_paid, 0)
  const totalPending = pending.reduce((s, p) => s + p.balance_due, 0)

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Screen-only toolbar */}
      <div className="print:hidden flex items-center justify-between px-6 py-3 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <Link href={`/inquilinos/${tenant.id}`} className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-tertiary)' }}>
          <ArrowLeft className="w-3.5 h-3.5" /> Volver al perfil
        </Link>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold text-white"
          style={{ background: '#1570EF' }}
        >
          <Printer className="w-3.5 h-3.5" /> Imprimir / Guardar PDF
        </button>
      </div>

      {/* Printable document */}
      <div className="max-w-2xl mx-auto px-8 py-10 print:px-0 print:py-0 print:max-w-none">
        <div className="bg-white rounded-2xl p-10 shadow-sm print:shadow-none print:rounded-none" style={{ border: '1px solid #E4E7EC' }}>

          {/* Header */}
          <div className="flex items-start justify-between mb-8 pb-6" style={{ borderBottom: '2px solid #0B3C5D' }}>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#0B3C5D', letterSpacing: '-0.02em' }}>{companyName}</h1>
              {companyPhone && <p className="text-sm mt-1" style={{ color: '#475467' }}>{companyPhone}</p>}
              {companyEmail && <p className="text-sm" style={{ color: '#475467' }}>{companyEmail}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#98A2B3' }}>Estado de Cuenta</p>
              <p className="text-lg font-bold mt-1" style={{ color: '#101828' }}>
                {today.toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Client info */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#98A2B3' }}>Inquilino</p>
              <p className="font-bold text-base" style={{ color: '#101828' }}>{tenant.full_name}</p>
              {tenant.id_number && <p className="text-sm mt-0.5" style={{ color: '#475467' }}>Cédula: {tenant.id_number}</p>}
              {tenant.phone && <p className="text-sm" style={{ color: '#475467' }}>{tenant.phone}</p>}
              {tenant.email && <p className="text-sm" style={{ color: '#475467' }}>{tenant.email}</p>}
            </div>
            {property && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#98A2B3' }}>Propiedad</p>
                <p className="font-bold text-base" style={{ color: '#101828' }}>{property.name}</p>
                <p className="text-sm mt-0.5" style={{ color: '#475467' }}>{property.address}</p>
                {property.city && <p className="text-sm" style={{ color: '#475467' }}>{property.city}</p>}
                {lease && (
                  <>
                    <p className="text-sm mt-1" style={{ color: '#475467' }}>Renta: <strong>{formatCurrency(lease.rent_amount, lease.currency)}/mes</strong></p>
                    <p className="text-sm" style={{ color: '#475467' }}>Contrato: {formatDate(lease.start_date)} — {formatDate(lease.end_date)}</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Summary boxes */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: 'Total pagado', value: formatCurrency(totalPaid), bg: '#ECFDF3', text: '#027A48' },
              { label: 'Balance pendiente', value: formatCurrency(totalPending), bg: totalPending > 0 ? '#FEF3F2' : '#ECFDF3', text: totalPending > 0 ? '#B42318' : '#027A48' },
              { label: 'Pagos registrados', value: payments.length, bg: '#EFF8FF', text: '#175CD3' },
            ].map(box => (
              <div key={box.label} className="rounded-xl p-4 text-center" style={{ background: box.bg }}>
                <p className="text-2xl font-bold" style={{ color: box.text, letterSpacing: '-0.03em' }}>{box.value}</p>
                <p className="text-xs mt-1" style={{ color: box.text, opacity: 0.75 }}>{box.label}</p>
              </div>
            ))}
          </div>

          {/* Payments table */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#98A2B3' }}>Historial de pagos</p>
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E4E7EC' }}>
                  {['Período', 'Renta', 'Mora', 'Pagado', 'Adeudado', 'Estado', 'Fecha pago', 'Referencia'].map(h => (
                    <th key={h} className="pb-2 text-left" style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#98A2B3', paddingRight: '12px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map((p, i) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #F2F4F7' }}>
                    <td className="py-2.5 text-xs capitalize font-medium pr-3" style={{ color: '#101828' }}>{formatMonth(p.period_year, p.period_month)}</td>
                    <td className="py-2.5 text-xs pr-3" style={{ color: '#475467' }}>{formatCurrency(p.rent_amount, p.currency)}</td>
                    <td className="py-2.5 text-xs pr-3" style={{ color: p.late_fee > 0 ? '#B42318' : '#D0D5DD' }}>{p.late_fee > 0 ? formatCurrency(p.late_fee, p.currency) : '—'}</td>
                    <td className="py-2.5 text-xs pr-3" style={{ color: '#027A48', fontWeight: 600 }}>{p.amount_paid > 0 ? formatCurrency(p.amount_paid, p.currency) : '—'}</td>
                    <td className="py-2.5 text-xs pr-3" style={{ color: p.balance_due > 0 ? '#B42318' : '#027A48', fontWeight: 600 }}>{p.balance_due > 0 ? formatCurrency(p.balance_due, p.currency) : '✓'}</td>
                    <td className="py-2.5 text-xs pr-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: p.status === 'pagado' ? '#ECFDF3' : '#FEF3F2', color: p.status === 'pagado' ? '#027A48' : '#B42318' }}>
                        {p.status === 'pagado' ? 'Pagado' : p.status === 'en_mora' ? 'Mora' : p.status === 'vencido' ? 'Vencido' : p.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-xs pr-3" style={{ color: '#475467' }}>{p.paid_date ? formatDate(p.paid_date) : '—'}</td>
                    <td className="py-2.5 text-xs font-mono" style={{ color: '#98A2B3', fontSize: '10px' }}>{p.payment_reference ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
              {totalPending > 0 && (
                <tfoot>
                  <tr style={{ borderTop: '2px solid #0B3C5D' }}>
                    <td colSpan={4} className="pt-3 text-sm font-bold" style={{ color: '#101828' }}>Total pendiente</td>
                    <td className="pt-3 text-sm font-bold" style={{ color: '#B42318' }}>{formatCurrency(totalPending)}</td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Footer */}
          <div className="mt-10 pt-6 flex items-end justify-between" style={{ borderTop: '1px solid #E4E7EC' }}>
            <div>
              <p className="text-xs" style={{ color: '#98A2B3' }}>Documento generado el {today.toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p className="text-xs mt-0.5" style={{ color: '#98A2B3' }}>Este documento es válido como comprobante de estado de cuenta.</p>
            </div>
            <div className="text-right">
              <div className="mt-8 pt-2" style={{ borderTop: '1px solid #D0D5DD', minWidth: '160px' }}>
                <p className="text-xs" style={{ color: '#475467' }}>{companyName}</p>
                <p className="text-xs" style={{ color: '#98A2B3' }}>Firma autorizada</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print styles */}
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
