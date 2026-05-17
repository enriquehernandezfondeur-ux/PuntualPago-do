export function PageSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="flex-1 p-6 space-y-5 animate-pulse" style={{ background: 'var(--bg)' }}>
      {/* KPI row */}
      <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="skeleton h-3 w-16 rounded mb-4" />
            <div className="skeleton h-7 w-24 rounded mb-1" />
            <div className="skeleton h-2.5 w-20 rounded" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {/* Header */}
        <div className="flex gap-8 px-5 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-2.5 rounded" style={{ width: `${60 + i * 20}px` }} />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-6 px-5 py-4" style={{ borderBottom: i < rows - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
            <div className="skeleton w-8 h-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3 rounded" style={{ width: `${40 + Math.random() * 30}%` }} />
              <div className="skeleton h-2.5 rounded" style={{ width: `${20 + Math.random() * 20}%` }} />
            </div>
            <div className="skeleton h-3 rounded w-20 shrink-0" />
            <div className="skeleton h-5 rounded-full w-16 shrink-0" />
            <div className="skeleton h-3 rounded w-12 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex-1 p-6 animate-pulse" style={{ background: 'var(--bg)' }}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="skeleton w-9 h-9 rounded-xl mb-4" />
            <div className="skeleton h-7 w-20 rounded mb-2" />
            <div className="skeleton h-2.5 w-24 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
