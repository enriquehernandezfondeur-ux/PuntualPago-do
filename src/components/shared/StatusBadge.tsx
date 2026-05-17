import { cn } from '@/lib/utils/cn'
import type { PaymentStatus, RiskLevel, TenantStatus, PropertyStatus, LeaseStatus } from '@/types/database'

// ─── Shared badge primitive ──────────────────────────────────────────────────

interface BadgeConfig {
  label: string
  bg: string
  text: string
  dot?: string
  pulse?: boolean
  tooltip?: string
}

function Badge({ cfg, size = 'sm', className }: {
  cfg: BadgeConfig
  size?: 'xs' | 'sm' | 'md'
  className?: string
}) {
  return (
    <span
      title={cfg.tooltip}
      aria-label={cfg.tooltip ?? cfg.label}
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full border',
        size === 'xs' && 'px-1.5 py-px text-[10px] leading-4',
        size === 'sm' && 'px-2 py-0.5 text-[11px] leading-4',
        size === 'md' && 'px-2.5 py-1 text-xs leading-4',
        cfg.tooltip && 'cursor-help',
        className
      )}
      style={{
        backgroundColor: cfg.bg,
        color: cfg.text,
        borderColor: cfg.bg === 'transparent' ? 'currentColor' : cfg.bg,
      }}
    >
      {cfg.dot && (
        <span
          className={cn('w-1.5 h-1.5 rounded-full shrink-0', cfg.pulse && 'animate-pulse-dot')}
          style={{ backgroundColor: cfg.text }}
        />
      )}
      {cfg.label}
    </span>
  )
}

// ─── Payment Status ───────────────────────────────────────────────────────────

const PAYMENT_STATUS: Record<PaymentStatus, BadgeConfig> = {
  al_dia:            { label: 'Al día',       bg: '#ECFDF3', text: '#027A48', dot: '#12B76A', tooltip: 'Pago al corriente, no ha vencido' },
  vence_pronto:      { label: 'Vence pronto', bg: '#FFFAEB', text: '#B54708', dot: '#F79009', tooltip: 'Vence en los próximos 5 días' },
  vencido:           { label: 'Vencido',      bg: '#FFF6ED', text: '#B93815', dot: '#EF6820', pulse: true, tooltip: 'Pasó la fecha de pago (hasta 30 días)' },
  en_mora:           { label: 'En mora',      bg: '#FEF3F2', text: '#B42318', dot: '#F04438', pulse: true, tooltip: 'Más de 30 días sin pagar — cargo de mora aplicado' },
  en_legal:          { label: 'Legal',        bg: '#F9F5FF', text: '#6941C6', dot: '#7F56D9', pulse: true, tooltip: 'Escalado a proceso legal' },
  cubierto_garantia: { label: 'Garantía',     bg: '#EFF8FF', text: '#175CD3', dot: '#1570EF', tooltip: 'PuntualPago cubrió este pago al propietario' },
  pagado:            { label: 'Pagado',       bg: '#ECFDF3', text: '#027A48', dot: '#12B76A', tooltip: 'Pago registrado y confirmado' },
}

export function PaymentStatusBadge({ status, size, className }: {
  status: PaymentStatus; size?: 'xs' | 'sm' | 'md'; className?: string
}) {
  return <Badge cfg={PAYMENT_STATUS[status]} size={size} className={className} />
}

// ─── Risk Level ───────────────────────────────────────────────────────────────

const RISK_LEVEL: Record<RiskLevel, BadgeConfig> = {
  bajo:    { label: 'Bajo',    bg: '#ECFDF3', text: '#027A48', dot: '#12B76A' },
  medio:   { label: 'Medio',   bg: '#FFFAEB', text: '#B54708', dot: '#F79009' },
  alto:    { label: 'Alto',    bg: '#FFF6ED', text: '#B93815', dot: '#EF6820', pulse: true },
  critico: { label: 'Crítico', bg: '#FEF3F2', text: '#B42318', dot: '#F04438', pulse: true },
}

export function RiskBadge({ level, size, className }: {
  level: RiskLevel; size?: 'xs' | 'sm' | 'md'; className?: string
}) {
  return <Badge cfg={RISK_LEVEL[level]} size={size} className={className} />
}

// ─── Tenant Status ────────────────────────────────────────────────────────────

const TENANT_STATUS: Record<TenantStatus, BadgeConfig> = {
  activo:         { label: 'Activo',       bg: '#ECFDF3', text: '#027A48', dot: '#12B76A' },
  en_observacion: { label: 'Observación',  bg: '#FFFAEB', text: '#B54708', dot: '#F79009' },
  moroso:         { label: 'Moroso',       bg: '#FFF6ED', text: '#B93815', dot: '#EF6820', pulse: true },
  en_legal:       { label: 'Legal',        bg: '#F9F5FF', text: '#6941C6', dot: '#7F56D9', pulse: true },
  desalojado:     { label: 'Desalojado',   bg: '#F9FAFB', text: '#344054', dot: '#667085' },
  historico:      { label: 'Histórico',    bg: '#F9FAFB', text: '#98A2B3', dot: '#D0D5DD' },
}

export function TenantStatusBadge({ status, size, className }: {
  status: TenantStatus; size?: 'xs' | 'sm' | 'md'; className?: string
}) {
  return <Badge cfg={TENANT_STATUS[status]} size={size} className={className} />
}

// ─── Property Status ──────────────────────────────────────────────────────────

const PROPERTY_STATUS: Record<PropertyStatus, BadgeConfig> = {
  disponible:       { label: 'Disponible',   bg: '#EFF8FF', text: '#175CD3', dot: '#1570EF' },
  ocupada:          { label: 'Ocupada',      bg: '#ECFDF3', text: '#027A48', dot: '#12B76A' },
  en_mantenimiento: { label: 'Mantenimiento',bg: '#FFFAEB', text: '#B54708', dot: '#F79009' },
  proceso_legal:    { label: 'Legal',        bg: '#F9F5FF', text: '#6941C6', dot: '#7F56D9', pulse: true },
  inactiva:         { label: 'Inactiva',     bg: '#F9FAFB', text: '#98A2B3', dot: '#D0D5DD' },
}

export function PropertyStatusBadge({ status, size, className }: {
  status: PropertyStatus; size?: 'xs' | 'sm' | 'md'; className?: string
}) {
  return <Badge cfg={PROPERTY_STATUS[status]} size={size} className={className} />
}

// ─── Lease Status ─────────────────────────────────────────────────────────────

const LEASE_STATUS: Record<LeaseStatus, BadgeConfig> = {
  activo:     { label: 'Activo',     bg: '#ECFDF3', text: '#027A48', dot: '#12B76A' },
  por_vencer: { label: 'Por vencer', bg: '#FFFAEB', text: '#B54708', dot: '#F79009', pulse: true },
  vencido:    { label: 'Vencido',    bg: '#FEF3F2', text: '#B42318', dot: '#F04438' },
  renovado:   { label: 'Renovado',   bg: '#EFF8FF', text: '#175CD3', dot: '#1570EF' },
  terminado:  { label: 'Terminado',  bg: '#F9FAFB', text: '#344054', dot: '#667085' },
  cancelado:  { label: 'Cancelado',  bg: '#F9FAFB', text: '#98A2B3', dot: '#D0D5DD' },
}

export function LeaseStatusBadge({ status, size, className }: {
  status: LeaseStatus; size?: 'xs' | 'sm' | 'md'; className?: string
}) {
  return <Badge cfg={LEASE_STATUS[status]} size={size} className={className} />
}

// ─── Generic dot indicator ────────────────────────────────────────────────────

export function StatusDot({ color, pulse }: { color: string; pulse?: boolean }) {
  return (
    <span
      className={cn('inline-block w-2 h-2 rounded-full shrink-0', pulse && 'animate-pulse-dot')}
      style={{ backgroundColor: color }}
    />
  )
}
