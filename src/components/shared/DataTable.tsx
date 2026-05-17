'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, ChevronLeft, ChevronRight, X } from 'lucide-react'

export interface Column<T> {
  key: string
  header: string
  render?: (row: T) => React.ReactNode
  sortable?: boolean
  className?: string
  headerClassName?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  searchable?: boolean
  searchPlaceholder?: string
  searchKeys?: (keyof T)[]
  pageSize?: number
  loading?: boolean
  emptyState?: React.ReactNode
  onRowClick?: (row: T) => void
  rowKey: keyof T
}

export function DataTable<T extends Record<string, unknown>>({
  data, columns, searchable = true, searchPlaceholder = 'Buscar...',
  searchKeys, pageSize = 20, loading, emptyState, onRowClick, rowKey,
}: DataTableProps<T>) {
  const [search, setSearch]   = useState('')
  const [page, setPage]       = useState(1)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  function handleSort(key: string) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = search && searchKeys
    ? data.filter(row => searchKeys.some(k => String(row[k] ?? '').toLowerCase().includes(search.toLowerCase())))
    : data

  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        const cmp = String(a[sortKey] ?? '').localeCompare(String(b[sortKey] ?? ''), 'es')
        return sortDir === 'asc' ? cmp : -cmp
      })
    : filtered

  const totalPages = Math.ceil(sorted.length / pageSize)
  const paginated  = sorted.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="flex flex-col gap-3">
      {searchable && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            type="search"
            className="w-full pl-9 pr-8 py-2 rounded-lg text-sm border transition focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
              color: 'var(--text)',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              aria-label="Limpiar búsqueda"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded transition hover:bg-slate-100"
            >
              <X className="w-3 h-3" style={{ color: 'var(--text-tertiary)' }} />
            </button>
          )}
        </div>
      )}

      <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
                {columns.map(col => (
                  <th
                    key={col.key}
                    onClick={col.sortable ? () => handleSort(col.key) : undefined}
                    className={cn(
                      'px-4 py-3 text-left font-medium whitespace-nowrap select-none',
                      col.sortable && 'cursor-pointer',
                      col.headerClassName
                    )}
                    style={{ fontSize: '11px', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}
                  >
                    <div className="flex items-center gap-1.5">
                      {col.header}
                      {col.sortable && (
                        sortKey === col.key
                          ? sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                          : <ChevronsUpDown className="w-3 h-3 opacity-40" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    {columns.map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="skeleton h-3.5 rounded" style={{ width: `${60 + Math.random() * 30}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    {emptyState ?? 'Sin resultados'}
                  </td>
                </tr>
              ) : (
                paginated.map((row, i) => (
                  <tr
                    key={String(row[rowKey])}
                    onClick={() => onRowClick?.(row)}
                    className={cn('transition-colors', onRowClick && 'cursor-pointer')}
                    style={{
                      borderBottom: i < paginated.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface-subtle)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '' }}
                  >
                    {columns.map(col => (
                      <td key={col.key} className={cn('px-4 py-3.5', col.className)} style={{ color: 'var(--text)' }}>
                        {col.render ? col.render(row) : String(row[col.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div
            className="flex items-center justify-between px-4 py-2.5"
            style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-subtle)' }}
          >
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {sorted.length} resultado{sorted.length !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-md transition disabled:opacity-30"
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-subtle)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <ChevronLeft className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
              </button>
              <span className="text-xs font-medium px-2" style={{ color: 'var(--text-secondary)' }}>
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-md transition disabled:opacity-30"
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-subtle)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
