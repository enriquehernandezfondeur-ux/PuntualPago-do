'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { logAudit } from '@/lib/utils/audit'
import { FormModal, Field, FormActions, inputCls, inputStyle } from '@/components/forms/FormModal'
import { Upload, FileText, X } from 'lucide-react'
import type { DocumentType, DocumentVisibility } from '@/types/database'

interface Props {
  open: boolean
  onClose: () => void
  properties?: { id: string; name: string }[]
  owners?: { id: string; full_name: string }[]
  tenants?: { id: string; full_name: string }[]
  defaultPropertyId?: string
  defaultTenantId?: string
  defaultOwnerId?: string
}

const DOC_TYPES: { v: DocumentType; l: string }[] = [
  { v: 'contrato', l: 'Contrato' }, { v: 'cedula', l: 'Cédula' },
  { v: 'pasaporte', l: 'Pasaporte' }, { v: 'comprobante_pago', l: 'Comprobante de pago' },
  { v: 'inventario', l: 'Inventario' }, { v: 'carta', l: 'Carta' },
  { v: 'acta', l: 'Acta' }, { v: 'foto', l: 'Foto' },
  { v: 'factura', l: 'Factura' }, { v: 'documento_legal', l: 'Documento legal' },
  { v: 'cotizacion', l: 'Cotización' }, { v: 'otro', l: 'Otro' },
]

export function DocumentUploadModal({
  open, onClose, properties = [], owners = [], tenants = [],
  defaultPropertyId, defaultTenantId, defaultOwnerId,
}: Props) {
  const router   = useRouter()
  const supabase = createClient()
  const fileRef  = useRef<HTMLInputElement>(null)
  const [file, setFile]     = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [form, setForm] = useState({
    type:        'otro' as DocumentType,
    description: '',
    property_id: defaultPropertyId ?? '',
    tenant_id:   defaultTenantId ?? '',
    owner_id:    defaultOwnerId ?? '',
    visibility:  'admin_only' as DocumentVisibility,
  })

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setError('Selecciona un archivo'); return }
    setLoading(true); setError('')
    try {
      const ext      = file.name.split('.').pop()
      const bucket   = 'documentos'
      const path     = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadErr } = await supabase.storage.from(bucket).upload(path, file, { cacheControl: '3600' })
      if (uploadErr) throw uploadErr

      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)

      const { data: doc, error: docErr } = await supabase.from('documents').insert({
        type:        form.type,
        description: form.description || null,
        property_id: form.property_id || null,
        tenant_id:   form.tenant_id   || null,
        owner_id:    form.owner_id    || null,
        file_name:   file.name,
        file_path:   publicUrl,
        file_size:   file.size,
        mime_type:   file.type,
        is_private:  form.visibility === 'admin_only',
        visibility:  form.visibility,
      }).select('id').single()
      if (docErr) throw docErr

      await logAudit({ action: 'document_uploaded', entityType: 'documents', entityId: doc.id, newValues: { type: form.type, file: file.name } })
      router.refresh(); onClose()
    } catch (err: any) {
      setError(err.message ?? 'Error al subir el archivo')
    } finally { setLoading(false) }
  }

  return (
    <FormModal open={open} onClose={onClose} title="Subir documento" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* File picker */}
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer transition"
          style={{ borderColor: file ? '#B2DDFF' : 'var(--border)', background: file ? '#EFF8FF' : 'var(--surface-subtle)' }}
        >
          {file ? (
            <>
              <FileText className="w-8 h-8" style={{ color: '#175CD3' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{file.name}</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{(file.size / 1024).toFixed(0)} KB</p>
              <button type="button" onClick={e => { e.stopPropagation(); setFile(null); if (fileRef.current) fileRef.current.value = '' }}
                className="text-xs" style={{ color: '#B42318' }}>Quitar</button>
            </>
          ) : (
            <>
              <Upload className="w-8 h-8" style={{ color: 'var(--text-tertiary)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Haz clic o arrastra el archivo</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>PDF, Word, Excel, imagen — máx. 20 MB</p>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp" onChange={e => setFile(e.target.files?.[0] ?? null)} className="hidden" />

        <div className="grid grid-cols-2 gap-4">
          <Field label="Tipo de documento">
            <select value={form.type} onChange={e => set('type', e.target.value)} className={inputCls} style={inputStyle}>
              {DOC_TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
            </select>
          </Field>
          <Field label="Visibilidad">
            <select value={form.visibility} onChange={e => set('visibility', e.target.value)} className={inputCls} style={inputStyle}>
              <option value="admin_only">Solo staff (privado)</option>
              <option value="propietario">Propietario</option>
              <option value="inquilino">Inquilino</option>
              <option value="ambos">Ambos (propietario e inquilino)</option>
            </select>
          </Field>
        </div>

        <Field label="Descripción">
          <input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Ej. Contrato firmado enero 2026..." className={inputCls} style={inputStyle} />
        </Field>

        {/* Entity links */}
        {(properties.length > 0 || tenants.length > 0 || owners.length > 0) && (
          <div className="grid grid-cols-3 gap-3">
            {properties.length > 0 && (
              <Field label="Propiedad">
                <select value={form.property_id} onChange={e => set('property_id', e.target.value)} className={inputCls} style={inputStyle}>
                  <option value="">—</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
            )}
            {tenants.length > 0 && (
              <Field label="Inquilino">
                <select value={form.tenant_id} onChange={e => set('tenant_id', e.target.value)} className={inputCls} style={inputStyle}>
                  <option value="">—</option>
                  {tenants.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </Field>
            )}
            {owners.length > 0 && (
              <Field label="Propietario">
                <select value={form.owner_id} onChange={e => set('owner_id', e.target.value)} className={inputCls} style={inputStyle}>
                  <option value="">—</option>
                  {owners.map(o => <option key={o.id} value={o.id}>{o.full_name}</option>)}
                </select>
              </Field>
            )}
          </div>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}
        <FormActions onCancel={onClose} loading={loading} submitLabel="Subir documento" />
      </form>
    </FormModal>
  )
}
