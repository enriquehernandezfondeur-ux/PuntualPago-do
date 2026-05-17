'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { formatCurrency } from '@/lib/utils/format'
import type { Building, Property } from '@/types/database'
import {
  Landmark, Building2, Users, Wrench, DollarSign,
  ChevronDown, ChevronUp, MapPin, X, Plus,
  CheckCircle2, AlertCircle, Calculator,
} from 'lucide-react'

interface Props { buildings: Building[] }

export function EdificiosContent({ buildings }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(buildings[0]?.id ?? null)
  const [showNewModal, setShowNewModal] = useState(false)

  const totalMaintenanceMonthly = buildings.reduce((s, b) => s + b.monthly_maintenance_amount, 0)
  const totalOccupied = buildings.reduce((s, b) => s + (b.occupied_units ?? 0), 0)
  const totalUnits = buildings.reduce((s, b) => s + b.total_units, 0)

  return (
    <div className="flex-1 p-6 space-y-4 overflow-y-auto">

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Edificios activos',      value: buildings.length,             icon: Landmark,   color: 'bg-blue-50',    iconColor: 'text-blue-600' },
          { label: 'Unidades totales',        value: `${totalOccupied}/${totalUnits}`, icon: Building2,  color: 'bg-slate-50',   iconColor: 'text-slate-600', sub: 'ocupadas / total' },
          { label: 'Mantenimiento mensual',   value: formatCurrency(totalMaintenanceMonthly), icon: Wrench, color: 'bg-amber-50', iconColor: 'text-amber-600' },
          { label: 'Promedio por edificio',   value: buildings.length > 0 ? formatCurrency(totalMaintenanceMonthly / buildings.length) : '—', icon: DollarSign, color: 'bg-emerald-50', iconColor: 'text-emerald-600' },
        ].map((item, i) => (
          <div key={i} className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
            <div className={cn('p-2.5 rounded-xl shrink-0', item.color)}>
              <item.icon className={cn('w-4 h-4', item.iconColor)} />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-lg leading-tight">{item.value}</p>
              <p className="text-slate-500 text-xs">{'sub' in item ? item.sub : item.label}</p>
              {'sub' in item && <p className="text-slate-400 text-[10px]">{item.label}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-700 text-sm">Edificios registrados ({buildings.length})</h2>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition"
        >
          <Plus className="w-3.5 h-3.5" /> Nuevo edificio
        </button>
      </div>

      {/* Buildings list */}
      {buildings.length === 0 ? (
        <EmptyBuildings onNew={() => setShowNewModal(true)} />
      ) : (
        <div className="space-y-3">
          {buildings.map(b => (
            <BuildingCard
              key={b.id}
              building={b}
              expanded={expandedId === b.id}
              onToggle={() => setExpandedId(expandedId === b.id ? null : b.id)}
            />
          ))}
        </div>
      )}

      {/* New building modal */}
      {showNewModal && <NewBuildingModal onClose={() => setShowNewModal(false)} />}
    </div>
  )
}

// ─── Building Card ────────────────────────────────────────────────────────────

function BuildingCard({ building: b, expanded, onToggle }: {
  building: Building; expanded: boolean; onToggle: () => void
}) {
  const properties = (b.properties ?? []) as unknown as (Property & { owner?: { id: string; full_name: string } })[]
  const occupied = properties.filter(p => p.status === 'ocupada').length
  const occupancyPct = b.total_units > 0 ? Math.round((occupied / b.total_units) * 100) : 0
  const perUnit = b.maintenance_per_unit ?? (
    occupied > 0 ? b.monthly_maintenance_amount / occupied : b.monthly_maintenance_amount / Math.max(b.total_units, 1)
  )
  const totalMaintenanceFees = properties.reduce((s, p) => s + (p.maintenance_fee ?? 0), 0)

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-slate-50 transition"
      >
        {/* Icon */}
        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
          <Landmark className="w-5 h-5 text-blue-600" />
        </div>

        {/* Name + location */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-slate-800">{b.name}</p>
            {b.code && <span className="text-[11px] font-mono text-slate-400">{b.code}</span>}
          </div>
          {b.address && (
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
              <p className="text-slate-500 text-xs truncate">{b.address}{b.sector ? `, ${b.sector}` : ''}</p>
            </div>
          )}
        </div>

        {/* Occupancy pill */}
        <div className="shrink-0 text-center">
          <div className="flex items-center gap-1.5 mb-1">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-sm font-bold text-slate-800">{occupied}/{b.total_units}</span>
          </div>
          <OccupancyBar pct={occupancyPct} />
          <p className="text-[10px] text-slate-400 mt-0.5">{occupancyPct}% ocupado</p>
        </div>

        {/* Maintenance amounts */}
        <div className="shrink-0 text-right">
          <p className="font-bold text-slate-900">{formatCurrency(b.monthly_maintenance_amount, b.currency)}</p>
          <p className="text-slate-400 text-xs">total edificio / mes</p>
          <p className="text-amber-600 text-xs font-semibold mt-0.5">
            {formatCurrency(perUnit, b.currency)} / unidad
          </p>
        </div>

        {/* Expand chevron */}
        <div className="shrink-0 text-slate-400">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded: units list */}
      {expanded && (
        <div className="border-t border-slate-100">
          {/* Fund summary */}
          <div className="px-5 py-3 bg-amber-50/60 border-b border-amber-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-amber-600" />
              <p className="text-sm font-semibold text-amber-800">Fondo de mantenimiento</p>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div className="text-right">
                <p className="font-bold text-amber-900">{formatCurrency(b.monthly_maintenance_amount, b.currency)}</p>
                <p className="text-amber-600 text-xs">presupuesto mensual</p>
              </div>
              <div className="text-right">
                <p className={cn('font-bold', totalMaintenanceFees >= b.monthly_maintenance_amount ? 'text-emerald-700' : 'text-red-600')}>
                  {formatCurrency(totalMaintenanceFees, b.currency)}
                </p>
                <p className="text-amber-600 text-xs">cuotas asignadas</p>
              </div>
              <div className="flex items-center gap-1">
                {totalMaintenanceFees >= b.monthly_maintenance_amount
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  : <AlertCircle className="w-4 h-4 text-amber-500" />
                }
                <span className={cn('text-xs font-semibold',
                  totalMaintenanceFees >= b.monthly_maintenance_amount ? 'text-emerald-600' : 'text-amber-600'
                )}>
                  {totalMaintenanceFees >= b.monthly_maintenance_amount ? 'Cubierto' : 'Parcial'}
                </span>
              </div>
            </div>
          </div>

          {/* Units table */}
          {properties.length === 0 ? (
            <div className="px-5 py-6 text-center text-slate-400 text-sm">
              No hay propiedades asignadas a este edificio.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Unidad</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Propietario</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Renta</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Cuota mant.</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Neto propietario</th>
                  <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody>
                {properties.map(p => {
                  const netToOwner = p.rent_amount - (p.maintenance_fee ?? 0)
                  return (
                    <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                      <td className="px-5 py-3">
                        <div>
                          <p className="font-medium text-slate-800">{p.name}</p>
                          {p.code && <p className="text-slate-400 text-xs font-mono">{p.code}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-600 text-sm">{p.owner?.full_name ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-semibold text-slate-800">{formatCurrency(p.rent_amount, p.currency)}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-semibold text-amber-700">{formatCurrency(p.maintenance_fee ?? 0, p.currency)}</p>
                        {p.maintenance_fee_override && (
                          <p className="text-[10px] text-slate-400">manual</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-bold text-emerald-700">{formatCurrency(netToOwner, p.currency)}</p>
                        {p.maintenance_fee > 0 && (
                          <p className="text-[10px] text-slate-400">
                            {((p.maintenance_fee / p.rent_amount) * 100).toFixed(1)}% de la renta
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusDot status={p.status} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function OccupancyBar({ pct }: { pct: number }) {
  return (
    <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div
        className={cn('h-full rounded-full', pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400')}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function StatusDot({ status }: { status: string }) {
  const map: Record<string, { dot: string; label: string }> = {
    ocupada:           { dot: 'bg-emerald-500', label: 'Ocupada' },
    disponible:        { dot: 'bg-blue-400',    label: 'Disponible' },
    en_mantenimiento:  { dot: 'bg-amber-500',   label: 'Mant.' },
    proceso_legal:     { dot: 'bg-purple-500',  label: 'Legal' },
    inactiva:          { dot: 'bg-slate-300',   label: 'Inactiva' },
  }
  const cfg = map[status] ?? { dot: 'bg-slate-300', label: status }
  return (
    <div className="flex items-center justify-center gap-1.5">
      <span className={cn('w-2 h-2 rounded-full shrink-0', cfg.dot)} />
      <span className="text-xs text-slate-600">{cfg.label}</span>
    </div>
  )
}

// ─── New Building Modal ───────────────────────────────────────────────────────

function NewBuildingModal({ onClose }: { onClose: () => void }) {
  const [name, setName]         = useState('')
  const [code, setCode]         = useState('')
  const [address, setAddress]   = useState('')
  const [sector, setSector]     = useState('')
  const [city, setCity]         = useState('Santo Domingo')
  const [units, setUnits]       = useState('1')
  const [amount, setAmount]     = useState('')
  const [notes, setNotes]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !amount) { setError('Nombre y monto de mantenimiento son requeridos'); return }
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/buildings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, code: code || null, address: address || null, sector: sector || null,
          city, total_units: parseInt(units),
          monthly_maintenance_amount: parseFloat(amount), currency: 'DOP',
          notes: notes || null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      window.location.reload()
    } catch (err: any) {
      setError(err.message ?? 'Error al crear el edificio')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <h2 className="font-bold text-slate-900 text-lg">Nuevo edificio</h2>
            <p className="text-slate-500 text-sm">Registra un edificio y su fondo de mantenimiento</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre del edificio *</label>
              <input value={name} onChange={e => setName(e.target.value)} required
                placeholder="Torre Piantini, Edificio Bella Vista..."
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Código (opcional)</label>
              <input value={code} onChange={e => setCode(e.target.value)}
                placeholder="ED-001"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Total de unidades *</label>
              <input type="number" value={units} onChange={e => setUnits(e.target.value)} min="1" required
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Dirección</label>
              <input value={address} onChange={e => setAddress(e.target.value)}
                placeholder="Av. Abraham Lincoln #105"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Sector</label>
              <input value={sector} onChange={e => setSector(e.target.value)} placeholder="Piantini"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Ciudad</label>
              <input value={city} onChange={e => setCity(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* Maintenance section */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-600" />
              <p className="font-semibold text-amber-800 text-sm">Fondo de mantenimiento mensual</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-amber-700 mb-1.5">Monto total mensual (RD$) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">RD$</span>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} min="0" step="100" required
                  placeholder="48000"
                  className="w-full pl-10 pr-4 py-2.5 border border-amber-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white" />
              </div>
              {amount && units && parseFloat(amount) > 0 && parseInt(units) > 0 && (
                <p className="text-amber-700 text-xs mt-1.5 flex items-center gap-1">
                  <Calculator className="w-3 h-3" />
                  Cuota por unidad: <strong>{formatCurrency(parseFloat(amount) / parseInt(units))}</strong>
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Notas</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Qué incluye el mantenimiento: elevadores, jardines, seguridad..."
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3.5 py-2.5">{error}</div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-slate-300 text-slate-700 font-medium text-sm rounded-xl hover:bg-slate-50 transition">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? 'Guardando...' : 'Crear edificio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EmptyBuildings({ onNew }: { onNew: () => void }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-12 flex flex-col items-center gap-4">
      <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center">
        <Landmark className="w-8 h-8 text-blue-300" />
      </div>
      <div className="text-center">
        <p className="font-semibold text-slate-700 mb-1">Sin edificios registrados</p>
        <p className="text-slate-400 text-sm max-w-sm">
          Registra los edificios para agrupar propiedades y gestionar los fondos de mantenimiento por edificio.
        </p>
      </div>
      <button onClick={onNew}
        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition">
        <Plus className="w-4 h-4" /> Registrar primer edificio
      </button>
    </div>
  )
}
