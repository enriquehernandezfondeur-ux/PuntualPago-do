'use client'
import { cn } from '@/lib/utils/cn'
import { formatDate } from '@/lib/utils/format'
import { FileText, Download, FileImage, File, Shield } from 'lucide-react'
import type { Document, DocumentType } from '@/types/database'

const TYPE_LABELS: Record<DocumentType, string> = {
  contrato:         'Contrato',
  cedula:           'Cédula',
  pasaporte:        'Pasaporte',
  comprobante_pago: 'Comprobante de pago',
  inventario:       'Inventario',
  carta:            'Carta',
  acta:             'Acta',
  foto:             'Foto',
  factura:          'Factura',
  documento_legal:  'Documento legal',
  cotizacion:       'Cotización',
  otro:             'Otro',
}

const TYPE_COLORS: Partial<Record<DocumentType, { bg: string; text: string }>> = {
  contrato:         { bg: 'bg-blue-100',    text: 'text-blue-700' },
  comprobante_pago: { bg: 'bg-green-100',   text: 'text-green-700' },
  factura:          { bg: 'bg-amber-100',   text: 'text-amber-700' },
  documento_legal:  { bg: 'bg-red-100',     text: 'text-red-700' },
  cedula:           { bg: 'bg-purple-100',  text: 'text-purple-700' },
  otro:             { bg: 'bg-slate-100',   text: 'text-slate-700' },
}

function DocIcon({ mime }: { mime?: string }) {
  if (!mime) return <File className="w-5 h-5 text-slate-400" />
  if (mime.startsWith('image/')) return <FileImage className="w-5 h-5 text-blue-400" />
  return <FileText className="w-5 h-5 text-slate-500" />
}

function formatSize(bytes?: number) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

interface Props {
  tenantName: string
  documents: Document[]
}

export function InquilinoDocumentosContent({ tenantName, documents }: Props) {
  const contracts  = documents.filter(d => d.type === 'contrato')
  const receipts   = documents.filter(d => d.type === 'comprobante_pago')
  const others     = documents.filter(d => !['contrato', 'comprobante_pago'].includes(d.type))

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

      <div>
        <h1 className="text-xl font-bold text-slate-900">Mis documentos</h1>
        <p className="text-slate-500 text-sm mt-0.5">Documentos compartidos por PuntualPago para {tenantName}</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-blue-800 font-semibold text-sm">Solo tus documentos</p>
          <p className="text-blue-700 text-xs mt-0.5">
            Solo puedes ver los documentos que PuntualPago ha compartido contigo. Tus datos son privados y seguros.
          </p>
        </div>
      </div>

      {documents.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl py-16 flex flex-col items-center justify-center gap-3">
          <FileText className="w-12 h-12 text-slate-300" />
          <p className="text-slate-500 font-medium text-sm">Sin documentos compartidos aún</p>
          <p className="text-slate-400 text-xs">El equipo de PuntualPago compartirá tus documentos aquí.</p>
        </div>
      )}

      {contracts.length > 0 && (
        <DocumentSection title="Contratos" docs={contracts} />
      )}
      {receipts.length > 0 && (
        <DocumentSection title="Comprobantes y recibos" docs={receipts} />
      )}
      {others.length > 0 && (
        <DocumentSection title="Otros documentos" docs={others} />
      )}
    </div>
  )
}

function DocumentSection({ title, docs }: { title: string; docs: Document[] }) {
  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-slate-700 text-sm">{title}</h2>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
        {docs.map(doc => {
          const color = TYPE_COLORS[doc.type] ?? { bg: 'bg-slate-100', text: 'text-slate-700' }
          return (
            <div key={doc.id} className="px-5 py-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                <DocIcon mime={doc.mime_type} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-800 font-semibold text-sm truncate">{doc.file_name}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', color.bg, color.text)}>
                    {TYPE_LABELS[doc.type]}
                  </span>
                  {doc.description && (
                    <span className="text-slate-400 text-xs truncate">{doc.description}</span>
                  )}
                </div>
                <p className="text-slate-400 text-xs mt-0.5">
                  {formatDate(doc.created_at)}{doc.file_size ? ` · ${formatSize(doc.file_size)}` : ''}
                </p>
              </div>
              {doc.file_path && (
                <a
                  href={doc.file_path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-semibold rounded-xl transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar
                </a>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
