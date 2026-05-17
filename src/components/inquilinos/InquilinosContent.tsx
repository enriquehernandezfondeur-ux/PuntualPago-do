'use client'
import Link from 'next/link'
import { useState } from 'react'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { TenantStatusBadge, RiskBadge } from '@/components/shared/StatusBadge'
import { TenantForm } from '@/components/forms/TenantForm'
import { formatCurrency, formatDate, initials } from '@/lib/utils/format'
import type { Tenant, TenantStatus } from '@/types/database'
import { UserCheck, Phone, Building2, ChevronRight, Pencil } from 'lucide-react'

const FILTERS: { label: string; value: TenantStatus | 'todos' }[] = [
  { label: 'Todos', value: 'todos' }, { label: 'Activos', value: 'activo' },
  { label: 'Observación', value: 'en_observacion' }, { label: 'Morosos', value: 'moroso' },
  { label: 'En legal', value: 'en_legal' }, { label: 'Histórico', value: 'historico' },
]

interface Props { tenants: Tenant[] }

export function InquilinosContent({ tenants }: Props) {
  const [filter, setFilter]         = useState<TenantStatus | 'todos'>('todos')
  const [editTarget, setEditTarget] = useState<Tenant | null>(null)

  const list   = filter === 'todos' ? tenants : tenants.filter(t => t.status === filter)
  const counts: Record<string, number> = { todos: tenants.length }
  for (const t of tenants) counts[t.status] = (counts[t.status] ?? 0) + 1

  if (!tenants.length) return <div className="p-6"><EmptyState icon={UserCheck} title="Sin inquilinos" description="Crea el primer inquilino." /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 p-1 rounded-lg overflow-x-auto" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {FILTERS.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)} className="px-3 py-1.5 rounded-md text-xs font-medium transition whitespace-nowrap"
            style={filter === f.value ? { background: '#1570EF', color: '#fff' } : { color: 'var(--text-tertiary)' }}>
            {f.label} <span className="opacity-60">({counts[f.value] ?? 0})</span>
          </button>
        ))}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {list.map(t => {
          const lease = ((t as any).leases ?? []).find((l: any) => l.status === 'activo')
          return (
            <div key={t.id} className="rounded-xl p-4 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold shrink-0 text-sm"
                    style={{ background: t.status === 'moroso' ? '#FEF3F2' : '#EFF8FF', color: t.status === 'moroso' ? '#B42318' : '#175CD3' }}>
                    {initials(t.full_name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>{t.full_name}</p>
                    {t.id_number && <p className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>{t.id_number}</p>}
                  </div>
                </div>
                <TenantStatusBadge status={t.status} size="xs" />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {t.phone && <div><p style={{ color: 'var(--text-tertiary)' }}>Teléfono</p><p style={{ color: 'var(--text-secondary)' }}>{t.phone}</p></div>}
                {lease && <div><p style={{ color: 'var(--text-tertiary)' }}>Propiedad</p><p style={{ color: 'var(--text-secondary)' }}>{lease.property?.name}</p></div>}
                <div>
                  <p style={{ color: 'var(--text-tertiary)' }}>Balance</p>
                  {t.pending_balance <= 0
                    ? <span style={{ color: '#027A48', fontWeight: 600 }}>Al día</span>
                    : <span style={{ color: '#B42318', fontWeight: 600 }}>{formatCurrency(t.pending_balance)}</span>
                  }
                </div>
                <div><p style={{ color: 'var(--text-tertiary)' }}>Riesgo</p><RiskBadge level={t.risk_level} size="xs" /></div>
              </div>
              <div className="flex items-center justify-between pt-1" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <button onClick={() => setEditTarget(t)} className="text-xs font-medium hover-surface px-2 py-1 rounded-lg" style={{ color: 'var(--text-secondary)' }}>Editar</button>
                <Link href={`/inquilinos/${t.id}`} className="text-xs font-semibold flex items-center gap-0.5" style={{ color: '#175CD3' }}>Ver perfil <ChevronRight className="w-3.5 h-3.5" /></Link>
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
      <DataTable
        data={list as unknown as Record<string, unknown>[]} rowKey="id"
        searchKeys={['full_name', 'phone', 'id_number'] as never[]} searchPlaceholder="Buscar inquilino..."
        columns={[
          { key: 'full_name', header: 'Inquilino', sortable: true, render: (row) => {
            const t = row as unknown as Tenant
            return (
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold shrink-0" style={{ fontSize: '11px', background: t.status === 'moroso' ? '#FEF3F2' : '#EFF8FF', color: t.status === 'moroso' ? '#B42318' : '#175CD3' }}>{initials(t.full_name)}</div>
                <div>
                  <p className="font-medium text-sm" style={{ color: 'var(--text)' }}>{t.full_name}</p>
                  {t.id_number && <p className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>{t.id_number}</p>}
                </div>
              </div>
            )
          }},
          { key: 'phone', header: 'Contacto', render: (row) => {
            const t = row as unknown as Tenant
            return <div>{t.phone && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t.phone}</p>}{t.occupation && <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t.occupation}</p>}</div>
          }},
          { key: 'leases', header: 'Propiedad', render: (row) => {
            const lease = ((row as any).leases ?? []).find((l: any) => l.status === 'activo')
            if (!lease) return <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Sin contrato</span>
            return <div><p className="text-sm" style={{ color: 'var(--text)' }}>{lease.property?.name}</p><p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{formatCurrency(lease.rent_amount, lease.currency)}/mes</p></div>
          }},
          { key: 'pending_balance', header: 'Balance', sortable: true, render: (row) => {
            const t = row as unknown as Tenant
            return t.pending_balance <= 0
              ? <span className="text-xs font-medium" style={{ color: '#027A48' }}>Al día</span>
              : <p className="font-semibold text-sm" style={{ color: '#B42318' }}>{formatCurrency(t.pending_balance)}</p>
          }},
          { key: 'risk_level', header: 'Riesgo', render: (row) => <RiskBadge level={(row as any).risk_level} size="xs" /> },
          { key: 'status', header: 'Estado', render: (row) => <TenantStatusBadge status={(row as any).status} size="xs" /> },
          { key: 'id', header: '', className: 'text-right', render: (row) => {
            const t = row as unknown as Tenant
            return (
              <div className="flex items-center justify-end gap-2">
                <button onClick={e => { e.stopPropagation(); setEditTarget(t) }} className="p-1.5 rounded-md transition" style={{ color: 'var(--text-tertiary)' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-subtle)')} onMouseLeave={e => (e.currentTarget.style.background = '')}><Pencil className="w-3.5 h-3.5" /></button>
                <Link href={`/inquilinos/${t.id}`} className="flex items-center gap-0.5 text-xs font-medium" style={{ color: '#175CD3' }}>Ver <ChevronRight className="w-3.5 h-3.5" /></Link>
              </div>
            )
          }},
        ]}
      />
      </div>

      {editTarget && <TenantForm open onClose={() => setEditTarget(null)} defaultValues={editTarget} tenantId={editTarget.id} />}
    </div>
  )
}
