'use client'
import { useState, useMemo } from 'react'
import { formatDate, initials } from '@/lib/utils/format'
import { Search, X } from 'lucide-react'
import type { AuditLog } from '@/types/database'

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  tenant_created:          { label: 'Inquilino creado',         color: '#027A48' },
  tenant_updated:          { label: 'Inquilino actualizado',    color: '#175CD3' },
  tenant_exit:             { label: 'Salida de inquilino',      color: '#B93815' },
  owner_created:           { label: 'Propietario creado',       color: '#027A48' },
  owner_updated:           { label: 'Propietario actualizado',  color: '#175CD3' },
  property_created:        { label: 'Propiedad creada',         color: '#027A48' },
  property_updated:        { label: 'Propiedad actualizada',    color: '#175CD3' },
  lease_created:           { label: 'Contrato creado',          color: '#027A48' },
  lease_renewed:           { label: 'Contrato renovado',        color: '#175CD3' },
  payment_registered:      { label: 'Pago registrado',          color: '#027A48' },
  payment_escalated_legal: { label: 'Escalado a legal',         color: '#B42318' },
  payment_plan_created:    { label: 'Acuerdo de pago',          color: '#B54708' },
  owner_payout_paid:       { label: 'Liquidación pagada',       color: '#027A48' },
  guarantee_claim_created: { label: 'Garantía activada',        color: '#6941C6' },
  guarantee_owner_paid:    { label: 'Garantía — pago a propietario', color: '#175CD3' },
  guarantee_recovery:      { label: 'Garantía — recuperación',  color: '#027A48' },
  legal_case_updated:      { label: 'Caso legal actualizado',   color: '#6941C6' },
  maintenance_created:     { label: 'Ticket creado',            color: '#027A48' },
  maintenance_updated:     { label: 'Ticket actualizado',       color: '#175CD3' },
  maintenance_status_changed: { label: 'Estado mantenimiento',  color: '#175CD3' },
  document_uploaded:       { label: 'Documento subido',         color: '#027A48' },
  task_created:            { label: 'Tarea creada',             color: '#027A48' },
  task_updated:            { label: 'Tarea actualizada',        color: '#175CD3' },
  task_status_changed:     { label: 'Estado tarea cambiado',    color: '#175CD3' },
}

interface Props { logs: (AuditLog & { user?: { full_name: string; role: string } })[] }

const PAGE_SIZE = 50

export function AuditoriaContent({ logs }: Props) {
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const filtered = useMemo(() => {
    setVisibleCount(PAGE_SIZE)
    return logs.filter(l => {
      const matchSearch = !search || l.user?.full_name?.toLowerCase().includes(search.toLowerCase()) || l.action.toLowerCase().includes(search.toLowerCase()) || l.entity_type?.toLowerCase().includes(search.toLowerCase())
      const matchAction = !actionFilter || l.action === actionFilter
      return matchSearch && matchAction
    })
  }, [logs, search, actionFilter])

  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  const uniqueActions = Array.from(new Set(logs.map(l => l.action))).sort()

  return (
    <div className="flex-1 p-6 space-y-4 overflow-y-auto scrollbar-thin" style={{ background: 'var(--bg)' }}>
      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por usuario, acción, entidad..."
            className="w-full pl-8 pr-8 py-2 rounded-lg text-sm border" style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }} />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-3 h-3" style={{ color: 'var(--text-tertiary)' }} /></button>}
        </div>
        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="px-3 py-2 rounded-lg text-sm border" style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}>
          <option value="">Todas las acciones</option>
          {uniqueActions.map(a => <option key={a} value={a}>{ACTION_LABELS[a]?.label ?? a}</option>)}
        </select>
        <p className="flex items-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Mostrando {Math.min(visibleCount, filtered.length)} de {filtered.length} registros
        </p>
      </div>

      {/* Log table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
              {['Fecha/hora', 'Usuario', 'Acción', 'Entidad', 'Detalles'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left font-medium" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-tertiary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((log, i) => {
              const cfg = ACTION_LABELS[log.action]
              const changedKeys = log.new_values ? Object.keys(log.new_values as object).slice(0, 3) : []
              return (
                <tr key={log.id} style={{ borderBottom: i < visible.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                  <td className="px-4 py-3">
                    <p className="text-xs" style={{ color: 'var(--text)' }}>{formatDate(log.created_at)}</p>
                    <p className="text-xs font-mono" style={{ color: 'var(--text-tertiary)', fontSize: '10px' }}>
                      {new Date(log.created_at).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {log.user ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: '#EFF8FF', color: '#175CD3' }}>
                          {initials(log.user.full_name)}
                        </div>
                        <div>
                          <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>{log.user.full_name}</p>
                          <p className="text-xs capitalize" style={{ color: 'var(--text-tertiary)', fontSize: '10px' }}>{log.user.role?.replace('_', ' ')}</p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Sistema</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: (cfg?.color ?? '#475467') + '18', color: cfg?.color ?? '#475467' }}>
                      {cfg?.label ?? log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs capitalize" style={{ color: 'var(--text-secondary)' }}>{log.entity_type?.replace(/_/g, ' ') ?? '—'}</p>
                    {log.entity_id && <p className="text-xs font-mono" style={{ color: 'var(--text-tertiary)', fontSize: '10px' }}>{log.entity_id.slice(0, 8)}…</p>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {changedKeys.map(k => (
                        <span key={k} className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-subtle)', color: 'var(--text-tertiary)', fontSize: '10px' }}>
                          {k}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              )
            })}
            {visible.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>Sin registros</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
            className="px-5 py-2 rounded-lg text-sm font-medium transition"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-subtle)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
          >
            Cargar más ({filtered.length - visibleCount} restantes)
          </button>
        </div>
      )}
    </div>
  )
}
