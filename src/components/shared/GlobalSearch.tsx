'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { formatCurrency } from '@/lib/utils/format'
import { PaymentStatusBadge, TenantStatusBadge } from './StatusBadge'
import {
  Search, X, UserCheck, Users, Building2, CreditCard, FileText,
  ArrowRight, Loader2, Command,
} from 'lucide-react'

interface SearchResults {
  tenants:    any[]
  owners:     any[]
  properties: any[]
  payments:   any[]
  leases:     any[]
}

export function GlobalSearch() {
  const [open, setOpen]       = useState(false)
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router   = useRouter()

  // Listen for Cmd+K / Ctrl+K and custom event from Header
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    function onCustom() { setOpen(true) }
    window.addEventListener('keydown', onKey)
    window.addEventListener('open-global-search', onCustom)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('open-global-search', onCustom)
    }
  }, [])

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 50) }
    else { setQuery(''); setResults(null); setSelected(0) }
  }, [open])

  // Debounced search
  useEffect(() => {
    if (query.length < 2) { setResults(null); return }
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const res  = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data.results)
        setSelected(0)
      } finally {
        setLoading(false)
      }
    }, 200)
    return () => clearTimeout(t)
  }, [query])

  // Flatten results for keyboard nav
  const flat = results ? [
    ...results.tenants.map(r    => ({ ...r, _type: 'tenant' })),
    ...results.owners.map(r     => ({ ...r, _type: 'owner' })),
    ...results.properties.map(r => ({ ...r, _type: 'property' })),
    ...results.payments.map(r   => ({ ...r, _type: 'payment' })),
    ...results.leases.map(r     => ({ ...r, _type: 'lease' })),
  ] : []

  function navigate(item: any) {
    setOpen(false)
    if (item._type === 'tenant')   router.push(`/inquilinos/${item.id}`)
    if (item._type === 'owner')    router.push(`/propietarios/${item.id}`)
    if (item._type === 'property') router.push(`/propiedades`)
    if (item._type === 'payment')  router.push(`/cobros`)
    if (item._type === 'lease')    router.push(`/contratos`)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, flat.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
    if (e.key === 'Enter' && flat[selected]) navigate(flat[selected])
  }

  if (!open) return null

  const hasResults = results && flat.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}>
      <div
        className="w-full max-w-xl mx-4 rounded-2xl overflow-hidden shadow-2xl animate-fade-in"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
          {loading
            ? <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: 'var(--text-tertiary)' }} />
            : <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--text-tertiary)' }} />
          }
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Buscar inquilino, propiedad, pago, contrato..."
            className="flex-1 text-sm bg-transparent outline-none"
            style={{ color: 'var(--text)' }}
          />
          <button onClick={() => setOpen(false)} className="p-1 rounded-md transition hover-surface">
            <X className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
          </button>
        </div>

        {/* Results */}
        {query.length >= 2 && (
          <div className="max-h-[420px] overflow-y-auto py-2">
            {!hasResults && !loading && (
              <p className="text-sm px-4 py-6 text-center" style={{ color: 'var(--text-tertiary)' }}>
                Sin resultados para "{query}"
              </p>
            )}

            {results && (
              <>
                <ResultGroup
                  label="Inquilinos" icon={UserCheck}
                  items={results.tenants} flat={flat} selected={selected}
                  renderItem={item => (
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar name={item.full_name} bg="#EFF8FF" text="#175CD3" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{item.full_name}</p>
                        <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{item.phone ?? item.id_number ?? ''}</p>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        {item.pending_balance > 0 && (
                          <span className="text-xs font-semibold" style={{ color: '#B42318' }}>
                            {formatCurrency(item.pending_balance)}
                          </span>
                        )}
                        <TenantStatusBadge status={item.status} size="xs" />
                      </div>
                    </div>
                  )}
                  onNavigate={navigate}
                />
                <ResultGroup
                  label="Propietarios" icon={Users}
                  items={results.owners} flat={flat} selected={selected}
                  renderItem={item => (
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar name={item.full_name} bg="#F9F5FF" text="#6941C6" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{item.full_name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{item.city ?? ''}</p>
                      </div>
                    </div>
                  )}
                  onNavigate={navigate}
                />
                <ResultGroup
                  label="Propiedades" icon={Building2}
                  items={results.properties} flat={flat} selected={selected}
                  renderItem={item => (
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#ECFDF3' }}>
                        <Building2 className="w-3.5 h-3.5" style={{ color: '#027A48' }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{item.name}</p>
                        <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{item.address ?? ''}</p>
                      </div>
                      <span className="text-xs font-semibold shrink-0" style={{ color: 'var(--text-secondary)' }}>
                        {formatCurrency(item.rent_amount, item.currency)}
                      </span>
                    </div>
                  )}
                  onNavigate={navigate}
                />
                <ResultGroup
                  label="Pagos" icon={CreditCard}
                  items={results.payments} flat={flat} selected={selected}
                  renderItem={item => (
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#FEF3F2' }}>
                        <CreditCard className="w-3.5 h-3.5" style={{ color: '#B42318' }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{item.tenant?.full_name ?? '—'}</p>
                        <p className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>{item.payment_number}</p>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <span className="text-xs font-semibold" style={{ color: '#B42318' }}>{formatCurrency(item.balance_due, item.currency)}</span>
                        <PaymentStatusBadge status={item.status} size="xs" />
                      </div>
                    </div>
                  )}
                  onNavigate={navigate}
                />
                <ResultGroup
                  label="Contratos" icon={FileText}
                  items={results.leases} flat={flat} selected={selected}
                  renderItem={item => (
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#EFF8FF' }}>
                        <FileText className="w-3.5 h-3.5" style={{ color: '#175CD3' }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{item.tenant?.full_name ?? '—'}</p>
                        <p className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>{item.contract_number}</p>
                      </div>
                    </div>
                  )}
                  onNavigate={navigate}
                />
              </>
            )}
          </div>
        )}

        {/* Empty state / hint */}
        {query.length < 2 && (
          <div className="px-4 py-5">
            <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Búsquedas recientes</p>
            <div className="flex flex-wrap gap-2">
              {['Inquilinos activos', 'Pagos en mora', 'Contratos por vencer'].map(hint => (
                <button
                  key={hint}
                  onClick={() => setQuery(hint.split(' ')[0].toLowerCase())}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition"
                  style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                >
                  <Search className="w-3 h-3" />
                  {hint}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-2"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-subtle)' }}
        >
          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            <span className="flex items-center gap-1"><kbd className="font-mono px-1 py-0.5 rounded" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>↑↓</kbd> navegar</span>
            <span className="flex items-center gap-1"><kbd className="font-mono px-1 py-0.5 rounded" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>↵</kbd> abrir</span>
          </div>
          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            <kbd className="font-mono px-1 py-0.5 rounded" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>Esc</kbd> cerrar
          </span>
        </div>
      </div>
    </div>
  )
}

function ResultGroup({ label, icon: Icon, items, flat, selected, renderItem, onNavigate }: {
  label: string; icon: any; items: any[]; flat: any[]; selected: number;
  renderItem: (item: any) => React.ReactNode; onNavigate: (item: any) => void
}) {
  if (!items.length) return null
  return (
    <div className="mb-1">
      <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-tertiary)' }}>
        <Icon className="w-3 h-3" /> {label}
      </p>
      {items.map((item) => {
        const idx = flat.findIndex(f => f.id === item.id && f._type === item._type)
        const isSelected = idx === selected
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item)}
            className="w-full flex items-center gap-2 px-4 py-2.5 transition-colors text-left"
            style={{ background: isSelected ? 'var(--surface-subtle)' : '' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-subtle)')}
            onMouseLeave={e => (e.currentTarget.style.background = isSelected ? 'var(--surface-subtle)' : '')}
          >
            {renderItem(item)}
            {isSelected && <ArrowRight className="w-3 h-3 shrink-0 ml-auto" style={{ color: 'var(--text-tertiary)' }} />}
          </button>
        )
      })}
    </div>
  )
}

function Avatar({ name, bg, text }: { name: string; bg: string; text: string }) {
  return (
    <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold shrink-0" style={{ background: bg, color: text, fontSize: '11px' }}>
      {name.split(' ').map(n => n[0]).slice(0, 2).join('')}
    </div>
  )
}
