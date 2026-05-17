'use client'
import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'
import { formatCurrency } from '@/lib/utils/format'
import { PropertyStatusBadge } from '@/components/shared/StatusBadge'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import type { Property, PropertyStatus, PropertyType } from '@/types/database'
import { Building2, MapPin, Shield, User, LayoutGrid, List, ChevronRight, Landmark, Wrench } from 'lucide-react'

const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  apartamento: 'Apartamento', casa: 'Casa', local_comercial: 'Local comercial',
  oficina: 'Oficina', villa: 'Villa', penthouse: 'Penthouse', estudio: 'Estudio', otro: 'Otro',
}

const STATUS_FILTERS: { label: string; value: PropertyStatus | 'todos' }[] = [
  { label: 'Todas',             value: 'todos' },
  { label: 'Disponibles',       value: 'disponible' },
  { label: 'Ocupadas',          value: 'ocupada' },
  { label: 'Mantenimiento',     value: 'en_mantenimiento' },
  { label: 'Proceso legal',     value: 'proceso_legal' },
  { label: 'Inactivas',         value: 'inactiva' },
]

interface Props { properties: Property[] }

export function PropiedadesContent({ properties }: Props) {
  const [statusFilter, setStatusFilter] = useState<PropertyStatus | 'todos'>('todos')
  const [view, setView] = useState<'grid' | 'list'>('list')
  const [search, setSearch] = useState('')

  const filtered = properties.filter(p => {
    const matchStatus = statusFilter === 'todos' || p.status === statusFilter
    const q = search.toLowerCase()
    const matchSearch = !q || p.name.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q) || (p.sector ?? '').toLowerCase().includes(q) ||
      ((p as any).owner?.full_name ?? '').toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  const totalRent        = filtered.filter(p => p.status === 'ocupada').reduce((s, p) => s + p.rent_amount, 0)
  const totalMaintenance = filtered.filter(p => p.status === 'ocupada').reduce((s, p) => s + (p.maintenance_fee ?? 0), 0)

  return (
    <div className="flex-1 p-6 space-y-4">
      {/* Stats bar */}
      <div className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl p-4">
        {[
          { label: 'Total',              value: properties.length,                                              color: 'text-slate-800' },
          { label: 'Ocupadas',           value: properties.filter(p => p.status === 'ocupada').length,          color: 'text-blue-600' },
          { label: 'Disponibles',        value: properties.filter(p => p.status === 'disponible').length,       color: 'text-emerald-600' },
          { label: 'Con garantía',       value: properties.filter(p => p.has_guarantee).length,                 color: 'text-cyan-600' },
          { label: 'Renta total',        value: formatCurrency(totalRent),                                      color: 'text-slate-800' },
          { label: 'Mant. mensual',      value: formatCurrency(totalMaintenance),                               color: 'text-amber-700' },
        ].map((s, i) => (
          <div key={i} className={cn('flex-1 text-center', i > 0 && 'border-l border-slate-200')}>
            <p className={cn('text-xl font-bold', s.color)}>{s.value}</p>
            <p className="text-slate-500 text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1.5">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition',
                statusFilter === f.value ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, dirección, sector, propietario..."
          className="flex-1 px-4 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
        />

        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1.5">
          <button onClick={() => setView('list')} className={cn('p-1.5 rounded-lg transition', view === 'list' ? 'bg-slate-200' : 'hover:bg-slate-100')}>
            <List className="w-4 h-4 text-slate-600" />
          </button>
          <button onClick={() => setView('grid')} className={cn('p-1.5 rounded-lg transition', view === 'grid' ? 'bg-slate-200' : 'hover:bg-slate-100')}>
            <LayoutGrid className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <EmptyState icon={Building2} title="Sin propiedades" description="No hay propiedades que coincidan con los filtros." />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(p => <PropertyCard key={p.id} property={p} />)}
        </div>
      ) : (
        <DataTable
          data={filtered as unknown as Record<string, unknown>[]}
          rowKey="id"
          searchable={false}
          columns={[
            {
              key: 'name', header: 'Propiedad', sortable: true,
              render: (row) => {
                const p = row as unknown as Property
                return (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{p.name}</p>
                      <p className="text-slate-500 text-xs">{p.code}</p>
                    </div>
                  </div>
                )
              },
            },
            {
              key: 'address', header: 'Dirección', sortable: true,
              render: (row) => {
                const p = row as unknown as Property
                return (
                  <div>
                    <p className="text-slate-700 text-sm">{p.address}</p>
                    {p.sector && <p className="text-slate-500 text-xs">{p.sector}</p>}
                  </div>
                )
              },
            },
            {
              key: 'type', header: 'Tipo', sortable: true,
              render: (row) => {
                const p = row as unknown as Property
                return <span className="text-slate-600 text-sm">{PROPERTY_TYPE_LABELS[p.type]}</span>
              },
            },
            {
              key: 'owner_id', header: 'Propietario',
              render: (row) => {
                const p = row as unknown as Property
                const owner = (p as any).owner
                return <p className="text-slate-700 text-sm">{owner?.full_name ?? '—'}</p>
              },
            },
            {
              key: 'building_id', header: 'Edificio',
              render: (row) => {
                const p = row as unknown as Property
                const b = (p as any).building
                return b
                  ? (
                    <div className="flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="text-slate-600 text-sm">{b.name}</span>
                    </div>
                  )
                  : <span className="text-slate-300 text-sm">—</span>
              },
            },
            {
              key: 'rent_amount', header: 'Renta', sortable: true, className: 'text-right',
              render: (row) => {
                const p = row as unknown as Property
                return (
                  <div className="text-right">
                    <p className="font-medium text-slate-800">{formatCurrency(p.rent_amount, p.currency)}</p>
                    <p className="text-slate-400 text-xs">Día {p.payment_day}</p>
                  </div>
                )
              },
            },
            {
              key: 'maintenance_fee', header: 'Mantenimiento', className: 'text-right',
              render: (row) => {
                const p = row as unknown as Property
                if (!p.maintenance_fee) return <span className="text-slate-300 text-sm text-right block">—</span>
                const netOwner = p.rent_amount - p.maintenance_fee
                return (
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Wrench className="w-3 h-3 text-amber-500" />
                      <p className="font-semibold text-amber-700">{formatCurrency(p.maintenance_fee, p.currency)}</p>
                    </div>
                    <p className="text-slate-400 text-xs">Neto: {formatCurrency(netOwner, p.currency)}</p>
                  </div>
                )
              },
            },
            {
              key: 'status', header: 'Estado', headerClassName: 'text-center',
              render: (row) => {
                const p = row as unknown as Property
                return (
                  <div className="flex items-center justify-center gap-2">
                    <PropertyStatusBadge status={p.status} />
                    {p.has_guarantee && <span title="Con garantía"><Shield className="w-3.5 h-3.5 text-cyan-500" /></span>}
                  </div>
                )
              },
            },
            {
              key: 'id', header: '', className: 'text-right',
              render: (row) => {
                const p = row as unknown as Property
                return (
                  <Link href={`/propiedades/${p.id}`} className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 text-sm font-medium">
                    Ver <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                )
              },
            },
          ]}
        />
      )}
    </div>
  )
}

function PropertyCard({ property: p }: { property: Property }) {
  const owner    = (p as any).owner
  const building = (p as any).building
  return (
    <Link href={`/propiedades/${p.id}`} className="block bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md hover:border-blue-200 transition-all group">
      {/* Image placeholder */}
      <div className="h-36 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center relative">
        <Building2 className="w-10 h-10 text-slate-300" />
        {building && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-white/90 px-2 py-0.5 rounded-lg shadow-sm">
            <Landmark className="w-3 h-3 text-blue-500" />
            <span className="text-[11px] font-medium text-blue-700 truncate max-w-24">{building.name}</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 truncate group-hover:text-blue-700 transition">{p.name}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-slate-400" />
              <p className="text-slate-500 text-xs truncate">{p.sector || p.city}</p>
            </div>
          </div>
          <PropertyStatusBadge status={p.status} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-slate-900">{formatCurrency(p.rent_amount, p.currency)}</p>
            {p.maintenance_fee > 0 && (
              <div className="flex items-center gap-1 mt-0.5">
                <Wrench className="w-3 h-3 text-amber-500" />
                <span className="text-xs text-amber-600 font-medium">Mant. {formatCurrency(p.maintenance_fee, p.currency)}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {p.has_guarantee && <Shield className="w-3.5 h-3.5 text-cyan-500" />}
            {owner && (
              <div className="flex items-center gap-1 text-slate-500">
                <User className="w-3 h-3" />
                <span className="text-xs truncate max-w-20">{owner.full_name}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
