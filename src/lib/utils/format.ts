import { format, formatDistanceToNow, isAfter, isBefore, addDays } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Currency, PaymentStatus, RiskLevel, TenantStatus, PropertyStatus, LeaseStatus } from '@/types/database'

// Tasa de referencia USD → DOP. Sobreescribible desde settings (clave: usd_dop_rate)
export const DEFAULT_USD_TO_DOP = 59.5

export function formatCurrency(amount: number, currency: Currency = 'DOP'): string {
  if (currency === 'DOP') {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 2,
    }).format(amount)
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

/**
 * Muestra el monto en su moneda original y el equivalente en la otra.
 * Ej: primary="RD$45,000.00"  secondary="≈ US$757"
 */
export function formatDualCurrency(
  amount: number,
  currency: Currency = 'DOP',
  rate: number = DEFAULT_USD_TO_DOP,
): { primary: string; secondary: string } {
  if (currency === 'DOP') {
    const usd = amount / rate
    return {
      primary:   formatCurrency(amount, 'DOP'),
      secondary: '≈ ' + new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(usd),
    }
  }
  const dop = amount * rate
  return {
    primary:   formatCurrency(amount, 'USD'),
    secondary: '≈ ' + new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', maximumFractionDigits: 0 }).format(dop),
  }
}

/**
 * Convierte cualquier monto a DOP. Útil para sumar DOP + USD en gráficas.
 */
export function toDOP(amount: number, currency: Currency, rate: number = DEFAULT_USD_TO_DOP): number {
  return currency === 'USD' ? amount * rate : amount
}

export function formatDate(date: string | Date, fmt = 'dd/MM/yyyy'): string {
  if (!date) return '—'
  return format(new Date(date), fmt, { locale: es })
}

export function formatDateLong(date: string | Date | null | undefined): string {
  if (!date) return '—'
  return format(new Date(date), "d 'de' MMMM, yyyy", { locale: es })
}

export function formatRelative(date: string | Date | null | undefined): string {
  if (!date) return '—'
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es })
}

export function formatMonth(year: number, month: number): string {
  const d = new Date(year, month - 1, 1)
  return format(d, "MMMM yyyy", { locale: es })
}

export function getDaysOverdue(dueDate: string): number {
  const due = new Date(dueDate)
  const today = new Date()
  if (isBefore(due, today)) {
    return Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
  }
  return 0
}

export function getDaysUntil(date: string): number {
  const target = new Date(date)
  const today = new Date()
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function isExpiringSoon(endDate: string, days = 30): boolean {
  const end = new Date(endDate)
  const threshold = addDays(new Date(), days)
  return isBefore(end, threshold) && isAfter(end, new Date())
}

// Status labels and colors
export const paymentStatusConfig: Record<PaymentStatus, { label: string; color: string; bg: string }> = {
  al_dia:           { label: 'Al día',            color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  vence_pronto:     { label: 'Vence pronto',       color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200' },
  vencido:          { label: 'Vencido',            color: 'text-red-700',     bg: 'bg-red-50 border-red-200' },
  en_mora:          { label: 'En mora',            color: 'text-red-800',     bg: 'bg-red-100 border-red-300' },
  en_legal:         { label: 'En legal',           color: 'text-purple-700',  bg: 'bg-purple-50 border-purple-200' },
  cubierto_garantia:{ label: 'Cub. garantía',      color: 'text-cyan-700',    bg: 'bg-cyan-50 border-cyan-200' },
  pagado:           { label: 'Pagado',             color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
}

export const riskLevelConfig: Record<RiskLevel, { label: string; color: string; bg: string; dot: string }> = {
  bajo:    { label: 'Bajo',    color: 'text-emerald-700', bg: 'bg-emerald-50',  dot: 'bg-emerald-500' },
  medio:   { label: 'Medio',   color: 'text-amber-700',   bg: 'bg-amber-50',    dot: 'bg-amber-500' },
  alto:    { label: 'Alto',    color: 'text-orange-700',  bg: 'bg-orange-50',   dot: 'bg-orange-500' },
  critico: { label: 'Crítico', color: 'text-red-700',     bg: 'bg-red-50',      dot: 'bg-red-500' },
}

export const tenantStatusConfig: Record<TenantStatus, { label: string; color: string; bg: string }> = {
  activo:          { label: 'Activo',          color: 'text-emerald-700', bg: 'bg-emerald-50' },
  en_observacion:  { label: 'Observación',     color: 'text-amber-700',   bg: 'bg-amber-50' },
  moroso:          { label: 'Moroso',          color: 'text-red-700',     bg: 'bg-red-50' },
  en_legal:        { label: 'En legal',        color: 'text-purple-700',  bg: 'bg-purple-50' },
  desalojado:      { label: 'Desalojado',      color: 'text-slate-700',   bg: 'bg-slate-100' },
  historico:       { label: 'Histórico',       color: 'text-slate-500',   bg: 'bg-slate-50' },
}

export const propertyStatusConfig: Record<PropertyStatus, { label: string; color: string; bg: string }> = {
  disponible:       { label: 'Disponible',      color: 'text-emerald-700', bg: 'bg-emerald-50' },
  ocupada:          { label: 'Ocupada',          color: 'text-blue-700',    bg: 'bg-blue-50' },
  en_mantenimiento: { label: 'Mantenimiento',    color: 'text-amber-700',   bg: 'bg-amber-50' },
  proceso_legal:    { label: 'Proceso legal',    color: 'text-purple-700',  bg: 'bg-purple-50' },
  inactiva:         { label: 'Inactiva',         color: 'text-slate-500',   bg: 'bg-slate-50' },
}

export const leaseStatusConfig: Record<LeaseStatus, { label: string; color: string; bg: string }> = {
  activo:     { label: 'Activo',     color: 'text-emerald-700', bg: 'bg-emerald-50' },
  por_vencer: { label: 'Por vencer', color: 'text-amber-700',   bg: 'bg-amber-50' },
  vencido:    { label: 'Vencido',    color: 'text-red-700',     bg: 'bg-red-50' },
  renovado:   { label: 'Renovado',   color: 'text-blue-700',    bg: 'bg-blue-50' },
  terminado:  { label: 'Terminado',  color: 'text-slate-700',   bg: 'bg-slate-100' },
  cancelado:  { label: 'Cancelado',  color: 'text-slate-500',   bg: 'bg-slate-50' },
}

export function truncate(str: string, length = 40): string {
  return str.length > length ? str.slice(0, length) + '…' : str
}

export function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase()
}
