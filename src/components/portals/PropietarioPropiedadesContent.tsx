'use client'
import { cn } from '@/lib/utils/cn'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { Building2, User, Calendar, Phone } from 'lucide-react'

interface Props { properties: any[]; ownerName: string }

const STATUS_COLOR: Record<string, string> = {
  ocupada:          'bg-emerald-100 text-emerald-700',
  disponible:       'bg-blue-100 text-blue-700',
  en_mantenimiento: 'bg-amber-100 text-amber-700',
  proceso_legal:    'bg-red-100 text-red-700',
  inactiva:         'bg-slate-100 text-slate-500',
}

export function PropietarioPropiedadesContent({ properties, ownerName }: Props) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Mis propiedades</h1>
        <p className="text-slate-500 text-sm mt-0.5">{ownerName} · {properties.length} propiedad{properties.length !== 1 ? 'es' : ''}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {properties.map(p => {
          const activeLease = p.leases?.find((l: any) => l.status === 'activo')
          const tenant      = activeLease?.tenant
          return (
            <div key={p.id} className="rounded-2xl p-5 space-y-4 transition" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{p.name}</p>
                    <p className="text-slate-500 text-xs truncate">{p.address}</p>
                    {p.building && <p className="text-slate-400 text-xs">{p.building.name}</p>}
                  </div>
                </div>
                <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full capitalize shrink-0', STATUS_COLOR[p.status] ?? 'bg-slate-100 text-slate-500')}>
                  {p.status.replace('_', ' ')}
                </span>
              </div>

              {/* Rent */}
              <div className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: 'var(--surface-subtle)' }}>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Renta mensual</p>
                <p className="font-bold" style={{ color: 'var(--text)' }}>{formatCurrency(p.rent_amount, p.currency)}</p>
              </div>

              {/* Active lease info */}
              {activeLease ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <p className="text-slate-700 text-sm font-medium">{tenant?.full_name ?? 'Inquilino'}</p>
                    {tenant?.phone && (
                      <a href={`tel:${tenant.phone}`} className="ml-auto text-blue-600 hover:underline flex items-center gap-1 text-xs">
                        <Phone className="w-3 h-3" />{tenant.phone}
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {formatDate(activeLease.start_date)} → {formatDate(activeLease.end_date)}
                    </span>
                  </div>
                  {activeLease.contract_number && (
                    <p className="text-slate-400 text-xs font-mono">Contrato #{activeLease.contract_number}</p>
                  )}
                </div>
              ) : (
                <div className="text-center py-2 text-slate-400 text-xs">
                  {p.status === 'disponible' ? 'Disponible para arrendar' : 'Sin inquilino activo'}
                </div>
              )}
            </div>
          )
        })}
        {properties.length === 0 && (
          <div className="col-span-2 py-12 text-center text-slate-400">Sin propiedades registradas</div>
        )}
      </div>
    </div>
  )
}
