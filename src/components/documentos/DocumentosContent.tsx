'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { formatDate } from '@/lib/utils/format'
import { EmptyState } from '@/components/shared/EmptyState'
import type { Document, DocumentType, DocumentVisibility } from '@/types/database'
import {
  FolderOpen, FileText, Image, File, Download,
  Building2, User, Users, Lock, Plus,
} from 'lucide-react'
import { DocumentUploadModal } from './DocumentUploadModal'

const VISIBILITY_CONFIG: Record<DocumentVisibility, { label: string; bg: string; text: string }> = {
  admin_only:  { label: 'Solo staff',   bg: 'bg-slate-100',  text: 'text-slate-600' },
  propietario: { label: 'Propietario',  bg: 'bg-blue-100',   text: 'text-blue-700' },
  inquilino:   { label: 'Inquilino',    bg: 'bg-purple-100', text: 'text-purple-700' },
  ambos:       { label: 'Ambos',        bg: 'bg-emerald-100',text: 'text-emerald-700' },
}

function VisibilityBadge({ v }: { v?: DocumentVisibility }) {
  const cfg = VISIBILITY_CONFIG[v ?? 'admin_only']
  return (
    <span className={cn('inline-flex px-2 py-0.5 rounded-md text-xs font-medium', cfg.bg, cfg.text)}>
      {cfg.label}
    </span>
  )
}

const TYPE_CONFIG: Record<DocumentType, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  contrato:         { label: 'Contrato',       icon: FileText, color: 'text-blue-700',    bg: 'bg-blue-50' },
  cedula:           { label: 'Cédula',         icon: User,     color: 'text-slate-700',   bg: 'bg-slate-100' },
  pasaporte:        { label: 'Pasaporte',      icon: User,     color: 'text-slate-700',   bg: 'bg-slate-100' },
  comprobante_pago: { label: 'Comprobante',    icon: FileText, color: 'text-emerald-700', bg: 'bg-emerald-50' },
  inventario:       { label: 'Inventario',     icon: FileText, color: 'text-purple-700',  bg: 'bg-purple-50' },
  carta:            { label: 'Carta',          icon: FileText, color: 'text-slate-700',   bg: 'bg-slate-100' },
  acta:             { label: 'Acta',           icon: FileText, color: 'text-amber-700',   bg: 'bg-amber-50' },
  foto:             { label: 'Foto',           icon: Image,    color: 'text-cyan-700',    bg: 'bg-cyan-50' },
  factura:          { label: 'Factura',        icon: FileText, color: 'text-orange-700',  bg: 'bg-orange-50' },
  documento_legal:  { label: 'Doc. legal',     icon: FileText, color: 'text-red-700',     bg: 'bg-red-50' },
  cotizacion:       { label: 'Cotización',     icon: FileText, color: 'text-slate-600',   bg: 'bg-slate-50' },
  otro:             { label: 'Otro',           icon: File,     color: 'text-slate-500',   bg: 'bg-slate-50' },
}

interface Props {
  documents: Document[]
  properties?: { id: string; name: string }[]
  tenants?: { id: string; full_name: string }[]
  owners?: { id: string; full_name: string }[]
}

export function DocumentosContent({ documents, properties = [], tenants = [], owners = [] }: Props) {
  const [typeFilter, setTypeFilter] = useState<DocumentType | 'todos'>('todos')
  const [search, setSearch]         = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)

  const filtered = documents.filter(d => {
    const matchType = typeFilter === 'todos' || d.type === typeFilter
    const q = search.toLowerCase()
    const matchSearch = !q || d.file_name.toLowerCase().includes(q) ||
      (d.description ?? '').toLowerCase().includes(q)
    return matchType && matchSearch
  })

  const counts: Record<string, number> = { todos: documents.length }
  for (const d of documents) counts[d.type] = (counts[d.type] ?? 0) + 1

  function formatSize(bytes?: number): string {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`
  }

  return (
    <div className="flex-1 p-6 space-y-4" style={{ background: 'var(--bg)' }}>
      <div className="flex gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar documento..."
          className="flex-1 px-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
        />
        <button onClick={() => setUploadOpen(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: '#1570EF' }}>
          <Plus className="w-4 h-4" /> Subir documento
        </button>
      </div>
      {uploadOpen && <DocumentUploadModal open onClose={() => setUploadOpen(false)} properties={properties} tenants={tenants} owners={owners} />}

      {/* Type filters */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setTypeFilter('todos')}
          className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition border',
            typeFilter === 'todos' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
          )}
        >
          Todos ({counts.todos})
        </button>
        {(Object.entries(TYPE_CONFIG) as [DocumentType, typeof TYPE_CONFIG[DocumentType]][])
          .filter(([k]) => counts[k] > 0)
          .map(([k, v]) => (
            <button
              key={k}
              onClick={() => setTypeFilter(k)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition border',
                typeFilter === k ? `border-blue-500 bg-blue-50 text-blue-700` : `bg-white text-slate-600 border-slate-200 hover:border-slate-300`
              )}
            >
              {v.label} ({counts[k]})
            </button>
          ))
        }
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FolderOpen} title="Sin documentos" description="Sube el primer documento para este registro." />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Documento</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Asociado a</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Subido por</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Visibilidad</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Fecha</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(doc => {
                const cfg = TYPE_CONFIG[doc.type]
                const Icon = cfg.icon
                const entity = (doc as any).property?.name || (doc as any).tenant?.full_name || (doc as any).owner?.full_name || (doc as any).lease?.contract_number
                return (
                  <tr key={doc.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', cfg.bg)}>
                          <Icon className={cn('w-4 h-4', cfg.color)} />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{doc.file_name}</p>
                          {doc.description && <p className="text-slate-500 text-xs">{doc.description}</p>}
                          {doc.file_size && <p className="text-slate-400 text-xs">{formatSize(doc.file_size)}</p>}
                        </div>
                        {doc.visibility === 'admin_only' && <span title="Solo staff"><Lock className="w-3.5 h-3.5 text-slate-400" /></span>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={cn('inline-flex px-2 py-0.5 rounded-md text-xs font-medium', cfg.bg, cfg.color)}>{cfg.label}</span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 text-sm">{entity ?? '—'}</td>
                    <td className="px-4 py-3.5 text-slate-600 text-sm">{(doc as any).uploader?.full_name ?? '—'}</td>
                    <td className="px-4 py-3.5">
                      <VisibilityBadge v={doc.visibility} />
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 text-sm">{formatDate(doc.created_at)}</td>
                    <td className="px-4 py-3.5 text-center">
                      <button className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                        <Download className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
