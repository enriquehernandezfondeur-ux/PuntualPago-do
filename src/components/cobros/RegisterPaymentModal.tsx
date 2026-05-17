'use client'
import { useState } from 'react'
import { formatCurrency } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { X, CheckCircle, Loader2, Mail, ChevronDown } from 'lucide-react'
import type { Payment } from '@/types/database'
import { useRouter } from 'next/navigation'

interface Props {
  payment: Payment
  onClose: () => void
}

const PAYMENT_METHODS = ['Transferencia bancaria', 'Efectivo', 'Cheque', 'Otro']

export function RegisterPaymentModal({ payment, onClose }: Props) {
  const p = payment as any
  const router = useRouter()

  const [amountPaid, setAmountPaid]   = useState(payment.balance_due.toString())
  const [method, setMethod]           = useState('Transferencia bancaria')
  const [reference, setReference]     = useState('')
  const [paidDate, setPaidDate]       = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes]             = useState('')
  const [sendEmail, setSendEmail]     = useState(!!(p.tenant?.email))
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [success, setSuccess]         = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!method) { setError('Selecciona el método de pago'); return }
    setLoading(true)
    setError(null)

    // Toda la validación y actualización ocurre en el servidor
    const res = await fetch('/api/payments/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentId:  payment.id,
        amountPaid,
        method,
        reference:  reference || null,
        paidDate,
        notes:      notes || null,
        sendEmail:  sendEmail && !!(p.tenant?.email),
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Error al registrar el pago. Intenta de nuevo.')
      setLoading(false)
      return
    }

    setSuccess(true)
    router.refresh()
    setTimeout(() => { setLoading(false); onClose() }, 1200)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Registrar pago"
        className="rounded-2xl shadow-2xl w-full max-w-md"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 className="font-bold text-lg" style={{ color: 'var(--text)' }}>Registrar pago</h2>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{p.tenant?.full_name ?? ''} · {p.property?.name ?? ''}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1.5 rounded-lg transition"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-subtle)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary */}
        <div className="p-5" style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--border)' }}>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--text-tertiary)' }}>Renta</span>
            <span className="font-medium" style={{ color: 'var(--text)' }}>{formatCurrency(payment.rent_amount, payment.currency)}</span>
          </div>
          {payment.late_fee > 0 && (
            <div className="flex justify-between text-sm mt-1">
              <span style={{ color: 'var(--text-tertiary)' }}>Mora</span>
              <span className="font-medium" style={{ color: '#B42318' }}>{formatCurrency(payment.late_fee, payment.currency)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold mt-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Total adeudado</span>
            <span style={{ color: '#B42318' }}>{formatCurrency(payment.balance_due, payment.currency)}</span>
          </div>
        </div>

        {success && (
          <div className="mx-5 mb-0 mt-4 rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: '#ECFDF3', border: '1px solid #A6F4C5' }}>
            <CheckCircle className="w-5 h-5 shrink-0" style={{ color: '#027A48' }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: '#027A48' }}>¡Pago registrado!</p>
              <p className="text-xs" style={{ color: '#039855' }}>El registro se actualizó correctamente.</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          {/* ── Acción rápida: pago completo con un click ── */}
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-emerald-800">Confirmar pago completo</p>
                <p className="text-xs text-emerald-600 mt-0.5">{formatCurrency(payment.balance_due, payment.currency)} · {method} · hoy</p>
              </div>
              {sendEmail && p.tenant?.email && (
                <Mail className="w-4 h-4 text-emerald-500 shrink-0" />
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {loading ? 'Registrando...' : 'Pagado — confirmar'}
            </button>
          </div>

          {/* ── Toggle para detalles adicionales ── */}
          <button
            type="button"
            onClick={() => setShowDetails(v => !v)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition w-full"
          >
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showDetails && 'rotate-180')} />
            {showDetails ? 'Ocultar detalles' : 'Cambiar método, monto o agregar referencia'}
          </button>

          {/* ── Detalles colapsables ── */}
          {showDetails && (
            <div className="space-y-4 pt-1">
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Monto recibido</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>
                    {payment.currency === 'USD' ? 'US$' : 'RD$'}
                  </span>
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={e => setAmountPaid(e.target.value)}
                    step="0.01"
                    min="0.01"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  />
                </div>
              </div>

              {/* Method */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Método de pago</label>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethod(m)}
                      className="py-2 px-2 rounded-xl text-xs font-medium transition"
                      style={method === m
                        ? { border: '1px solid #1570EF', background: '#EFF8FF', color: '#175CD3' }
                        : { border: '1px solid var(--border)', color: 'var(--text-secondary)', background: 'var(--surface)' }
                      }
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reference */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Referencia</label>
                <input
                  type="text"
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  placeholder="Número de transacción..."
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Fecha de pago</label>
                <input
                  type="date"
                  value={paidDate}
                  onChange={e => setPaidDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Notas internas</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Observaciones..."
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
              </div>

              {/* Email toggle */}
              {p.tenant?.email && (
                <label
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition"
                  style={{ border: '1px solid var(--border)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-subtle)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} className="w-4 h-4 accent-blue-600 rounded" />
                  <Mail className="w-4 h-4 text-blue-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Enviar confirmación por email</p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{p.tenant.email}</p>
                  </div>
                </label>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3.5 py-2.5">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-300 text-slate-700 font-medium text-sm rounded-xl hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            {showDetails && (
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {loading ? 'Registrando...' : 'Confirmar pago'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
