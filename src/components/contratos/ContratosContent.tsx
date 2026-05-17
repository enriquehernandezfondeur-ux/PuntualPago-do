'use client'
import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { LeaseStatusBadge, RiskBadge } from '@/components/shared/StatusBadge'
import { formatCurrency, formatDate, getDaysUntil } from '@/lib/utils/format'
import type { Lease, LeaseStatus } from '@/types/database'
import { FileText, Shield, AlertTriangle, ChevronRight, RefreshCw } from 'lucide-react'
import { RenovarContratoModal } from './RenovarContratoModal'

const STATUS_FILTERS: { label: string; value: LeaseStatus | 'todos' | 'por_vencer_30' | 'por_vencer_90' }[] = [
  { label: 'Todos',          value: 'todos' },
  { label: 'Activos',        value: 'activo' },
  { label: 'Por vencer 30d', value: 'por_vencer_30' },
  { label: 'Por vencer 90d', value: 'por_vencer_90' },
  { label: 'Vencidos',       value: 'vencido' },
  { label: 'Terminados',     value: 'terminado' },
]

interface Props { leases: Lease[] }

export function ContratosContent({ leases }: Props) {
  const [filter, setFilter]   = useState<string>('todos')
  const [renovarTarget, setRenovarTarget] = useState<Lease | null>(null)

  const filtered = leases.filter(l => {
    if (filter === 'todos') return true
    if (filter === 'por_vencer_30') {
      const days = getDaysUntil(l.end_date)
      return days >= 0 && days <= 30 && l.status === 'activo'
    }
    if (filter === 'por_vencer_90') {
      const days = getDaysUntil(l.end_date)
      return days >= 0 && days <= 90 && l.status === 'activo'
    }
    return l.status === filter
  })

  if (leases.length === 0) {
    return (
      <div className="flex-1 p-6">
        <EmptyState icon={FileText} title="Sin contratos" description="Los contratos de arrendamiento aparecerán aquí." action={
          <Link href="/contratos/nuevo" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition">
            Nuevo contrato
          </Link>
        } />
      </div>
    )
  }

  // Alert counts
  const expiring30 = leases.filter(l => { const d = getDaysUntil(l.end_date); return d >= 0 && d <= 30 && l.status === 'activo' }).length

  return (
    <div className="flex-1 p-6 space-y-4 overflow-x-auto">
      {/* Alert banners */}
      {expiring30 > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-red-800 text-sm font-medium">
            {expiring30} contrato{expiring30 > 1 ? 's' : ''} vence{expiring30 === 1 ? '' : 'n'} en los próximos 30 días.
            <button onClick={() => setFilter('por_vencer_30')} className="ml-2 underline font-semibold">Ver ahora</button>
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-1 bg-surface border border-border rounded-xl p-1.5 flex-wrap">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5',
              filter === f.value ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'
            )}
          >
            {f.label}
            {f.value === 'por_vencer_30' && expiring30 > 0 && (
              <span className={cn('text-xs font-bold px-1.5 py-0.5 rounded-full', filter === f.value ? 'bg-white text-blue-600' : 'bg-red-100 text-red-700')}>
                {expiring30}
              </span>
            )}
          </button>
        ))}
      </div>

      <DataTable
        data={filtered as unknown as Record<string, unknown>[]}
        rowKey="id"
        searchKeys={['contract_number'] as never[]}
        searchPlaceholder="Buscar por número de contrato..."
        columns={[
          {
            key: 'contract_number', header: 'Contrato', sortable: true,
            render: (row) => {
              const l = row as unknown as Lease
              return (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{l.contract_number ?? 'Sin número'}</p>
                    {l.has_guarantee && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Shield className="w-3 h-3 text-cyan-500" />
                        <span className="text-cyan-600 text-xs">Con garantía</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            },
          },
          {
            key: 'property_id', header: 'Propiedad',
            render: (row) => {
              const l = row as unknown as Lease
              const prop = (l as any).property
              return (
                <div>
                  <p className="font-medium text-slate-800">{prop?.name ?? '—'}</p>
                  <p className="text-slate-500 text-xs">{prop?.sector}</p>
                </div>
              )
            },
          },
          {
            key: 'tenant_id', header: 'Inquilino',
            render: (row) => {
              const l = row as unknown as Lease
              const t = (l as any).tenant
              return (
                <div>
                  <p className="font-medium text-slate-800">{t?.full_name ?? '—'}</p>
                  <RiskBadge level={t?.risk_level ?? 'bajo'} className="mt-0.5" />
                </div>
              )
            },
          },
          {
            key: 'rent_amount', header: 'Renta', sortable: true, className: 'text-right',
            render: (row) => {
              const l = row as unknown as Lease
              return (
                <div className="text-right">
                  <p className="font-bold text-slate-800">{formatCurrency(l.rent_amount, l.currency)}</p>
                  <p className="text-slate-400 text-xs">Día {l.payment_day}</p>
                </div>
              )
            },
          },
          {
            key: 'start_date', header: 'Inicio', sortable: true,
            render: (row) => {
              const l = row as unknown as Lease
              return <p className="text-slate-700 text-sm">{formatDate(l.start_date)}</p>
            },
          },
          {
            key: 'end_date', header: 'Vencimiento', sortable: true,
            render: (row) => {
              const l = row as unknown as Lease
              const days = getDaysUntil(l.end_date)
              const isClose = days >= 0 && days <= 90 && l.status === 'activo'
              return (
                <div>
                  <p className={cn('text-sm font-medium', isClose && days <= 30 ? 'text-red-700' : isClose ? 'text-amber-700' : 'text-slate-700')}>
                    {formatDate(l.end_date)}
                  </p>
                  {isClose && (
                    <p className={cn('text-xs', days <= 30 ? 'text-red-500' : 'text-amber-500')}>
                      {days}d restantes
                    </p>
                  )}
                </div>
              )
            },
          },
          {
            key: 'status', header: 'Estado', headerClassName: 'text-center',
            render: (row) => {
              const l = row as unknown as Lease
              return <div className="flex justify-center"><LeaseStatusBadge status={l.status} /></div>
            },
          },
          {
            key: 'id', header: '', className: 'text-right',
            render: (row) => {
              const l = row as unknown as Lease
              const days = getDaysUntil(l.end_date)
              const canRenew = l.status === 'activo' && days <= 90
              return (
                <div className="flex items-center justify-end gap-2">
                  {canRenew && (
                    <button
                      onClick={e => { e.stopPropagation(); setRenovarTarget(l) }}
                      className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition"
                      style={{ background: '#ECFDF3', color: '#027A48', border: '1px solid #A6F4C5' }}
                    >
                      <RefreshCw className="w-3 h-3" /> Renovar
                    </button>
                  )}
                  <Link href={`/contratos/${l.id}`} target="_blank" className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition" style={{ background: 'var(--surface-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                    PDF <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              )
            },
          },
        ]}
      />

      {renovarTarget && (
        <RenovarContratoModal
          lease={renovarTarget as any}
          onClose={() => setRenovarTarget(null)}
        />
      )}
    </div>
  )
}
