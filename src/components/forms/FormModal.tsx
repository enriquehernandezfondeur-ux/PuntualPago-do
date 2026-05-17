'use client'
import { cn } from '@/lib/utils/cn'
import { X, Loader2 } from 'lucide-react'

interface Props {
  title: string
  subtitle?: string
  open: boolean
  onClose: () => void
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export function FormModal({ title, subtitle, open, onClose, children, size = 'md' }: Props) {
  if (!open) return null

  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className={cn('w-full rounded-2xl overflow-hidden shadow-2xl animate-fade-in', widths[size])}
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{title}</h2>
            {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md transition mt-0.5"
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-subtle)')}
            onMouseLeave={e => (e.currentTarget.style.background = '')}
          >
            <X className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 max-h-[80vh] overflow-y-auto scrollbar-thin">
          {children}
        </div>
      </div>
    </div>
  )
}

// ─── Reusable form field ──────────────────────────────────────────────────────

export function Field({
  label, required, error, children, hint, className,
}: { label: string; required?: boolean; error?: string; children: React.ReactNode; hint?: string; className?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{hint}</p>}
      {error && <p className="text-xs mt-1 text-red-500">{error}</p>}
    </div>
  )
}

export const inputCls = [
  'w-full px-3 py-2 rounded-lg text-sm transition',
  'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400',
  'placeholder:text-[--text-placeholder]',
].join(' ')

export const inputStyle = {
  background: 'var(--surface)',
  border:     '1px solid var(--border)',
  color:      'var(--text)',
} as React.CSSProperties

export function Separator() {
  return <div className="divider my-1" />
}

export function FormActions({ onCancel, submitLabel = 'Guardar', loading }: {
  onCancel: () => void; submitLabel?: string; loading?: boolean
}) {
  return (
    <div className="flex items-center justify-end gap-2 pt-2">
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 rounded-lg text-sm font-medium transition"
        style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-subtle)')}
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition disabled:opacity-60"
        style={{ background: '#1570EF' }}
        onMouseEnter={e => !loading && ((e.currentTarget as HTMLElement).style.background = '#175CD3')}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#1570EF'}
      >
        {loading ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando…</>
        ) : submitLabel}
      </button>
    </div>
  )
}
