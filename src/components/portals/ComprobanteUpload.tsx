'use client'
import { useState, useRef } from 'react'
import { cn } from '@/lib/utils/cn'
import { formatCurrency } from '@/lib/utils/format'
import { createClient } from '@/lib/supabase/client'
import { Upload, FileText, CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react'
import type { DocumentVisibility } from '@/types/database'

interface PendingPayment {
  id: string
  payment_number: string | null
  period_month: number
  period_year: number
  balance_due: number
  currency: string
}

interface Props {
  tenantId: string
  tenantName: string
  leaseId: string | null
  propertyId: string | null
  propertyName: string | null
  pendingPayments: PendingPayment[]
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error'

export function ComprobanteUpload({ tenantId, tenantName, leaseId, propertyId, propertyName, pendingPayments }: Props) {
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>(pendingPayments[0]?.id ?? '')
  const [method, setMethod] = useState('')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [state, setState] = useState<UploadState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const maxSize = 8 * 1024 * 1024 // 8 MB

  const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
  const ALLOWED_EXTS  = ['pdf', 'jpg', 'jpeg', 'png', 'webp']

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    if (f && f.size > maxSize) {
      setErrorMsg('El archivo no puede superar 8 MB')
      setFile(null)
      return
    }
    if (f && !ALLOWED_TYPES.includes(f.type)) {
      setErrorMsg('Solo se permiten archivos PDF, JPG, PNG o WEBP')
      setFile(null)
      return
    }
    setErrorMsg('')
    setFile(f)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setErrorMsg('Selecciona un archivo'); return }
    if (!selectedPaymentId) { setErrorMsg('Selecciona el pago correspondiente'); return }
    if (!ALLOWED_TYPES.includes(file.type)) { setErrorMsg('Tipo de archivo no permitido'); return }
    if (!method) { setErrorMsg('Selecciona el método de pago'); return }

    setState('uploading')
    setErrorMsg('')

    try {
      // Upload to Supabase Storage bucket "comprobantes"
      const rawExt = file.name.split('.').pop()?.toLowerCase() ?? ''
      const ext    = ALLOWED_EXTS.includes(rawExt) ? rawExt : 'pdf'
      const filename = `${tenantId}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('comprobantes')
        .upload(filename, file, { cacheControl: '3600', upsert: false })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('comprobantes')
        .getPublicUrl(filename)

      // Insert document record
      await supabase.from('documents').insert({
        type: 'comprobante_pago',
        tenant_id: tenantId,
        lease_id: leaseId,
        property_id: propertyId,
        file_name: file.name,
        file_path: publicUrl,
        file_size: file.size,
        mime_type: file.type,
        is_private: false,
        visibility: 'admin_only' as DocumentVisibility,
        description: `Comprobante de pago — ${method} ${reference ? `Ref: ${reference}` : ''} ${notes ? `· ${notes}` : ''}`.trim(),
      })

      // Insert communication so staff can see it
      await supabase.from('communications').insert({
        channel: 'nota_interna',
        direction: 'inbound',
        subject: `Comprobante de pago recibido — ${tenantName}`,
        content: `El inquilino ${tenantName} subió un comprobante de pago.\nMétodo: ${method || 'No indicado'}\nReferencia: ${reference || 'No indicada'}\nNotas: ${notes || 'Ninguna'}\nArchivo: ${publicUrl}`,
        template_used: 'comprobante_portal',
        tenant_id: tenantId,
        property_id: propertyId ?? undefined,
        payment_id: selectedPaymentId,
        sent_at: new Date().toISOString(),
        delivered: true,
      })

      // Notify cobros team
      fetch('/api/notifications/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roles: ['equipo_cobros', 'admin', 'super_admin', 'gerente_operativo'],
          title: `Comprobante subido — ${tenantName}`,
          message: `Subió un comprobante de pago${method ? ` (${method})` : ''}${reference ? ` Ref: ${reference}` : ''}`,
          entityType: 'payments',
          entityId: selectedPaymentId,
          type: 'payment',
        }),
      }).catch(() => {})

      setState('success')
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Error al subir el archivo. Intenta de nuevo.')
      setState('error')
    }
  }

  if (state === 'success') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">¡Comprobante enviado!</h2>
        <p className="text-slate-500 text-sm max-w-sm mx-auto">
          Nuestro equipo revisará tu comprobante y actualizará el estado de tu pago en breve. Normalmente en menos de 24 horas.
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <a href="/portal/inquilino" className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition">
            Volver al inicio
          </a>
          <button
            onClick={() => { setState('idle'); setFile(null); setReference(''); setNotes('') }}
            className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition"
          >
            Subir otro
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Subir comprobante de pago</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Sube tu comprobante y lo revisaremos en menos de 24 horas hábiles.
        </p>
      </div>

      {pendingPayments.length === 0 ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-emerald-700 text-sm">No tienes pagos pendientes en este momento.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Payment selector */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <label className="block text-sm font-semibold text-slate-700">¿A cuál pago corresponde?</label>
            <div className="space-y-2">
              {pendingPayments.map(p => (
                <label
                  key={p.id}
                  className={cn(
                    'flex items-center justify-between p-3.5 border rounded-xl cursor-pointer transition',
                    selectedPaymentId === p.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment"
                      value={p.id}
                      checked={selectedPaymentId === p.id}
                      onChange={() => setSelectedPaymentId(p.id)}
                      className="text-blue-600"
                    />
                    <div>
                      <p className="text-slate-800 font-medium text-sm capitalize">
                        {new Date(p.period_year, p.period_month - 1).toLocaleDateString('es-DO', { month: 'long', year: 'numeric' })}
                      </p>
                      {p.payment_number && <p className="text-slate-400 text-xs font-mono">{p.payment_number}</p>}
                    </div>
                  </div>
                  <p className="text-red-700 font-bold text-sm">{formatCurrency(p.balance_due, p.currency as any)}</p>
                </label>
              ))}
            </div>
          </div>

          {/* Payment method + reference */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <label className="block text-sm font-semibold text-slate-700">Detalles del pago</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Método de pago</label>
                <select
                  value={method}
                  onChange={e => setMethod(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar...</option>
                  <option value="Transferencia bancaria">Transferencia bancaria</option>
                  <option value="Depósito en efectivo">Depósito en efectivo</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Número de referencia</label>
                <input
                  type="text"
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  placeholder="Ej. 123456789"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Notas adicionales (opcional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ej. Pagué la mora también, etc."
                rows={2}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* File upload */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <label className="block text-sm font-semibold text-slate-700">Comprobante</label>
            <div
              onClick={() => fileRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition',
                file ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              )}
            >
              {file ? (
                <>
                  <FileText className="w-8 h-8 text-blue-500" />
                  <div className="text-center">
                    <p className="text-slate-800 font-medium text-sm">{file.name}</p>
                    <p className="text-slate-400 text-xs">{(file.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setFile(null); if (fileRef.current) fileRef.current.value = '' }}
                    className="text-slate-400 hover:text-red-500 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-slate-300" />
                  <div className="text-center">
                    <p className="text-slate-600 text-sm font-medium">Haz clic para seleccionar</p>
                    <p className="text-slate-400 text-xs mt-0.5">PDF, JPG, PNG o WEBP · Máximo 8 MB</p>
                  </div>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Error */}
          {(errorMsg || state === 'error') && (
            <div className="flex items-center gap-2 p-3.5 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-red-700 text-sm">{errorMsg || 'Ocurrió un error. Intenta de nuevo.'}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={state === 'uploading' || !file}
            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition"
          >
            {state === 'uploading' ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
            ) : (
              <><Upload className="w-4 h-4" /> Enviar comprobante</>
            )}
          </button>
        </form>
      )}
    </div>
  )
}
