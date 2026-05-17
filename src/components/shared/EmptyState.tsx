import { cn } from '@/lib/utils/cn'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  compact?: boolean
}

export function EmptyState({ icon: Icon, title, description, action, className, compact }: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center',
      compact ? 'py-10 px-4' : 'py-16 px-6',
      className
    )}>
      {Icon && (
        <div className={cn(
          'rounded-xl flex items-center justify-center mb-4 border',
          compact ? 'w-10 h-10' : 'w-12 h-12'
        )}
          style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
          <Icon className={cn(compact ? 'w-4 h-4' : 'w-5 h-5')} style={{ color: 'var(--text-tertiary)' }} />
        </div>
      )}
      <p className={cn('font-semibold', compact ? 'text-sm' : 'text-sm')} style={{ color: 'var(--text)' }}>
        {title}
      </p>
      {description && (
        <p className={cn('mt-1 max-w-xs', compact ? 'text-xs' : 'text-sm')} style={{ color: 'var(--text-tertiary)' }}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
