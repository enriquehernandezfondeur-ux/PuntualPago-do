import { cn } from '@/lib/utils/cn'
import type { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  trend?: { value: number; label: string }
  alert?: boolean
  href?: string
  className?: string
  onClick?: () => void
  accent?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'gray'
  /** @deprecated use accent */
  iconColor?: string
  /** @deprecated use accent */
  iconBg?: string
}

const ACCENT = {
  blue:   { icon: '#1570EF', bg: 'rgba(21,112,239,0.08)'  },
  green:  { icon: '#059669', bg: 'rgba(5,150,105,0.08)'   },
  amber:  { icon: '#D97706', bg: 'rgba(217,119,6,0.08)'   },
  red:    { icon: '#DC2626', bg: 'rgba(220,38,38,0.08)'   },
  purple: { icon: '#7C3AED', bg: 'rgba(124,58,237,0.08)'  },
  gray:   { icon: '#6B7280', bg: 'rgba(107,114,128,0.08)' },
}

export function StatCard({
  title, value, subtitle, icon: Icon,
  trend, alert, className, onClick, accent = 'blue',
}: StatCardProps) {
  const a = ACCENT[accent]

  return (
    <div
      onClick={onClick}
      className={cn('rounded-xl border transition-all', onClick && 'cursor-pointer', className)}
      style={{
        background:  'var(--surface)',
        borderColor: alert ? '#FECDCA' : 'var(--border)',
        boxShadow:   alert ? '0 0 0 1px #FECDCA' : 'none',
      }}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)' }}
      onMouseLeave={e => { if (onClick) (e.currentTarget as HTMLElement).style.boxShadow = alert ? '0 0 0 1px #FECDCA' : 'none' }}
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          {Icon && (
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: a.bg }}>
              <Icon className="w-5 h-5" style={{ color: a.icon }} />
            </div>
          )}
          {trend && (
            <div className={cn('flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full',
              trend.value >= 0 ? 'text-emerald-700' : 'text-red-600')}
              style={{ background: trend.value >= 0 ? 'rgba(5,150,105,0.08)' : 'rgba(220,38,38,0.08)' }}>
              {trend.value >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(trend.value)}%
            </div>
          )}
          {!Icon && !trend && <span />}
        </div>

        <p className="font-bold leading-none mb-2 truncate"
          style={{ fontSize: 'clamp(1.25rem,2.5vw,1.875rem)', letterSpacing: '-0.03em', color: alert ? '#B42318' : 'var(--text)' }}>
          {value}
        </p>

        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{title}</p>

        {subtitle && (
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{subtitle}</p>
        )}
      </div>

      {alert && <div className="h-0.5 rounded-b-xl" style={{ background: '#FECDCA' }} />}
    </div>
  )
}

export function MetricPill({
  label, value, accent = 'gray',
}: { label: string; value: string | number; accent?: keyof typeof ACCENT }) {
  const a = ACCENT[accent]
  return (
    <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg transition"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: a.icon }} />
      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span className="text-xs font-semibold ml-auto" style={{ color: 'var(--text)' }}>{value}</span>
    </div>
  )
}
