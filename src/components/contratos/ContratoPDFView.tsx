'use client'
import { formatCurrency, formatDate, formatMonth } from '@/lib/utils/format'
import { ArrowLeft, Printer } from 'lucide-react'
import Link from 'next/link'
import type { Lease } from '@/types/database'

interface Props {
  lease: Lease & { property?: any; tenant?: any; owner?: any }
  companyName: string; companyAddress: string; companyPhone: string; companyEmail: string
}

export function ContratoPDFView({ lease, companyName, companyAddress, companyPhone, companyEmail }: Props) {
  const t = lease.tenant
  const o = lease.owner
  const p = lease.property
  const contractNo = lease.contract_number ?? `CON-${lease.id.slice(0, 8).toUpperCase()}`

  const periodMonths = lease.start_date && lease.end_date
    ? Math.round((new Date(lease.end_date + 'T12:00:00').getTime() - new Date(lease.start_date + 'T12:00:00').getTime()) / (1000 * 60 * 60 * 24 * 30))
    : 12

  const numbersToWords = (n: number) => {
    const ones = ['','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve','diez','once','doce']
    return ones[n] ?? String(n)
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Toolbar */}
      <div className="print:hidden flex items-center justify-between px-6 py-3 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <Link href="/contratos" className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-tertiary)' }}>
          <ArrowLeft className="w-3.5 h-3.5" /> Contratos
        </Link>
        <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold text-white" style={{ background: '#1570EF' }}>
          <Printer className="w-3.5 h-3.5" /> Imprimir / PDF
        </button>
      </div>

      {/* Document */}
      <div className="max-w-3xl mx-auto px-8 py-10 print:px-2 print:py-0 print:max-w-none">
        <div className="bg-white rounded-2xl p-12 print:rounded-none print:shadow-none print:p-8" style={{ border: '1px solid #E4E7EC' }}>

          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-2xl font-bold uppercase tracking-wide" style={{ color: '#0B3C5D' }}>Contrato de Arrendamiento</h1>
            <p className="text-sm mt-2" style={{ color: '#475467' }}>{companyName}{companyAddress ? ` · ${companyAddress}` : ''}</p>
            <p className="text-xs mt-1 font-mono" style={{ color: '#98A2B3' }}>No. {contractNo}</p>
          </div>

          <div className="text-sm leading-relaxed space-y-5" style={{ color: '#101828', lineHeight: '1.8' }}>

            {/* Parties */}
            <p>
              En la ciudad de <strong>{p?.city ?? 'Santo Domingo'}</strong>, República Dominicana, el día{' '}
              <strong>{formatDate(lease.signed_date ?? lease.start_date, "d 'de' MMMM 'del' yyyy")}</strong>, comparecen:{' '}
              como <strong>ARRENDADOR</strong>,{' '}
              <strong>{o?.full_name ?? '—'}</strong>{o?.cedula ? `, titular de la cédula de identidad No. ${o.cedula}` : o?.rnc ? `, con RNC No. ${o.rnc}` : ''};{' '}
              y como <strong>ARRENDATARIO</strong>,{' '}
              <strong>{t?.full_name ?? '—'}</strong>{t?.id_number ? `, titular de la ${t.id_type === 'cedula' ? 'cédula de identidad' : 'pasaporte'} No. ${t.id_number}` : ''},{' '}
              de nacionalidad {t?.nationality ?? 'dominicana'}.
            </p>

            <p>
              Ambas partes, de mutuo acuerdo y en plena capacidad legal, celebran el presente{' '}
              <strong>CONTRATO DE ARRENDAMIENTO</strong>, mediante las siguientes cláusulas:
            </p>

            <Clause n={1} title="OBJETO DEL CONTRATO">
              El ARRENDADOR da en arrendamiento al ARRENDATARIO el inmueble ubicado en{' '}
              <strong>{p?.address ?? '—'}</strong>, {p?.city ?? ''}, República Dominicana,{' '}
              identificado como <strong>{p?.name ?? '—'}</strong>{' '}
              (en adelante, «el Inmueble»), destinado exclusivamente para uso {p?.type === 'local_comercial' ? 'comercial' : 'residencial'}.
            </Clause>

            <Clause n={2} title="DURACIÓN">
              El presente contrato tendrá una duración de{' '}
              <strong>{periodMonths} ({numbersToWords(periodMonths)}) meses</strong>,{' '}
              iniciando el <strong>{formatDate(lease.start_date, "d 'de' MMMM 'de' yyyy")}</strong>{' '}
              y venciendo el <strong>{formatDate(lease.end_date, "d 'de' MMMM 'de' yyyy")}</strong>.{' '}
              Al vencimiento, el contrato podrá ser renovado de mutuo acuerdo entre las partes.
            </Clause>

            <Clause n={3} title="CANON DE ARRENDAMIENTO">
              El ARRENDATARIO pagará al ARRENDADOR, en concepto de renta mensual, la cantidad de{' '}
              <strong>{formatCurrency(lease.rent_amount, lease.currency)}</strong>{' '}
              ({lease.currency}), pagaderos los primeros <strong>{lease.payment_day}</strong> días de cada mes.{' '}
              El pago se realizará mediante transferencia bancaria o el método acordado entre las partes.
            </Clause>

            <Clause n={4} title="DEPÓSITO EN GARANTÍA">
              {lease.deposit_amount && lease.deposit_amount > 0 ? (
                <>
                  A la firma del presente contrato, el ARRENDATARIO entregará al ARRENDADOR la suma de{' '}
                  <strong>{formatCurrency(lease.deposit_amount, lease.currency)}</strong> como depósito en garantía,{' '}
                  equivalente a {Math.round(lease.deposit_amount / lease.rent_amount)} mes(es) de renta.{' '}
                  Dicha suma será devuelta al vencimiento del contrato, previa inspección del Inmueble y deducción de daños, si los hubiere.
                </>
              ) : (
                'Las partes acuerdan no requerir depósito en garantía para el presente contrato.'
              )}
            </Clause>

            <Clause n={5} title="MORA Y PENALIDADES">
              En caso de que el ARRENDATARIO no efectuare el pago en la fecha convenida, se aplicará un cargo por mora del{' '}
              <strong>{lease.late_fee_percentage}% mensual</strong>{' '}
              sobre el monto adeudado, pasados {lease.late_fee_grace_days} días de gracia.
            </Clause>

            <Clause n={6} title="OBLIGACIONES DEL ARRENDATARIO">
              El ARRENDATARIO se compromete a: (1) Usar el Inmueble exclusivamente para el fin convenido;{' '}
              (2) Mantener el Inmueble en buen estado de conservación y limpieza;{' '}
              (3) No ceder ni subarrendar el Inmueble sin autorización escrita del ARRENDADOR;{' '}
              (4) No realizar obras ni modificaciones sin autorización previa;{' '}
              (5) Respetar el reglamento del edificio o comunidad, si lo hubiere.
            </Clause>

            <Clause n={7} title="TERMINACIÓN ANTICIPADA">
              Cualquiera de las partes podrá dar por terminado el presente contrato con un preaviso por escrito de{' '}
              <strong>treinta (30) días</strong>. La terminación anticipada sin preaviso implicará la pérdida del depósito en garantía{' '}
              (para el arrendatario) o la devolución del depósito más un mes de renta (para el arrendador).
            </Clause>

            {lease.special_conditions && (
              <Clause n={8} title="CONDICIONES ESPECIALES">
                {lease.special_conditions}
              </Clause>
            )}

            <Clause n={lease.special_conditions ? 9 : 8} title="JURISDICCIÓN">
              Para todos los efectos del presente contrato, las partes se someten a la jurisdicción de los Tribunales{' '}
              de la República Dominicana, con renuncia expresa a cualquier otro fuero.
            </Clause>

            {/* Signatures */}
            <div className="mt-12 pt-8" style={{ borderTop: '1px solid #E4E7EC' }}>
              <p className="text-xs text-center mb-10" style={{ color: '#475467' }}>
                Leído y aceptado por las partes, se firma el presente contrato en la ciudad de{' '}
                {p?.city ?? 'Santo Domingo'}, el día{' '}
                {formatDate(lease.signed_date ?? lease.start_date, "d 'de' MMMM 'de' yyyy")}.
              </p>
              <div className="grid grid-cols-2 gap-16">
                <div className="text-center">
                  <div className="mt-12 pt-2" style={{ borderTop: '1px solid #D0D5DD' }}>
                    <p className="text-sm font-semibold" style={{ color: '#101828' }}>{o?.full_name ?? 'ARRENDADOR'}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#98A2B3' }}>Arrendador{o?.cedula ? ` · C.I. ${o.cedula}` : ''}</p>
                  </div>
                </div>
                <div className="text-center">
                  <div className="mt-12 pt-2" style={{ borderTop: '1px solid #D0D5DD' }}>
                    <p className="text-sm font-semibold" style={{ color: '#101828' }}>{t?.full_name ?? 'ARRENDATARIO'}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#98A2B3' }}>Arrendatario{t?.id_number ? ` · C.I. ${t.id_number}` : ''}</p>
                  </div>
                </div>
              </div>
              <div className="text-center mt-10">
                <div className="mt-12 pt-2 mx-auto" style={{ borderTop: '1px solid #D0D5DD', maxWidth: '220px' }}>
                  <p className="text-sm font-semibold" style={{ color: '#101828' }}>{companyName}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#98A2B3' }}>Administrador · Firma y sello</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page { margin: 2cm; size: letter; }
          body { background: white !important; font-size: 12px; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  )
}

function Clause({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-bold text-sm mb-1" style={{ color: '#0B3C5D' }}>
        CLÁUSULA {n < 10 ? ['PRIMERA','SEGUNDA','TERCERA','CUARTA','QUINTA','SEXTA','SÉPTIMA','OCTAVA','NOVENA','DÉCIMA'][n-1] ?? `${n}ª` : `${n}ª`}: {title}
      </p>
      <p style={{ textAlign: 'justify' }}>{children}</p>
    </div>
  )
}
