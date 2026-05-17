'use client'
import Link from 'next/link'
import { useState } from 'react'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatCurrency, initials } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import type { Owner } from '@/types/database'
import { Users, Building2, Phone, Mail, ChevronRight, Landmark, Search } from 'lucide-react'

interface Props { owners: Owner[] }

const REL_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  premium:  { bg: '#FFF7ED', text: '#B45309', border: '#FDE68A', label: 'Premium' },
  vip:      { bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE', label: 'VIP' },
  estandar: { bg: 'var(--surface-subtle)', text: 'var(--text-secondary)', border: 'var(--border)', label: 'Estándar' },
}

export function PropietariosContent({ owners }: Props) {
  const [search, setSearch] = useState('')

  if (owners.length === 0) {
    return (
      <div className="flex-1 p-6">
        <EmptyState icon={Users} title="Sin propietarios" description="Agrega el primer propietario para comenzar." action={
          <Link href="/propietarios/nuevo" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition">
            Nuevo propietario
          </Link>
        } />
      </div>
    )
  }

  const filtered = search.trim()
    ? owners.filter(o =>
        o.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (o.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (o.phone ?? '').includes(search)
      )
    : owners

  return (
    <div className="flex-1 p-6 space-y-4">

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {/* Mobile search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar propietario..."
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
        </div>

        {filtered.map(o => {
          const props = (o as any).properties ?? []
          const active = props.filter((p: any) => p.status === 'ocupada')
          const totalRent = active.reduce((s: number, p: any) => s + p.rent_amount, 0)
          const rel = REL_COLORS[o.relationship_level] ?? REL_COLORS.estandar

          return (
            <div key={o.id} className="rounded-xl p-4 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              {/* Header */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                    style={{ background: 'var(--blue-bg)', color: 'var(--blue-text)' }}>
                    {initials(o.full_name)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{o.full_name}</p>
                      {o.is_company && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-subtle)', color: 'var(--text-tertiary)' }}>
                          Empresa
                        </span>
                      )}
                    </div>
                    {o.legal_name && <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{o.legal_name}</p>}
                  </div>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md border shrink-0"
                  style={{ background: rel.bg, color: rel.text, borderColor: rel.border }}>
                  {rel.label}
                </span>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {o.phone && (
                  <div className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                    <Phone className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                    {o.phone}
                  </div>
                )}
                {o.email && (
                  <div className="flex items-center gap-1.5 truncate" style={{ color: 'var(--text-secondary)' }}>
                    <Mail className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                    <span className="truncate">{o.email}</span>
                  </div>
                )}
                {o.bank_name && (
                  <div className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                    <Landmark className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                    {o.bank_name}
                  </div>
                )}
                <div className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                  <Building2 className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                  {props.length} propiedad{props.length !== 1 ? 'es' : ''}
                  {totalRent > 0 && <span style={{ color: '#059669', fontWeight: 600 }}> · {formatCurrency(totalRent)}/mes</span>}
                </div>
              </div>

              {/* Action */}
              <div className="pt-1 flex justify-end" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <Link href={`/propietarios/${o.id}`} className="text-sm font-semibold flex items-center gap-0.5" style={{ color: 'var(--blue)' }}>
                  Ver perfil <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="text-center py-10" style={{ color: 'var(--text-tertiary)' }}>
            <p className="text-sm">Sin resultados para "{search}"</p>
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <DataTable
          data={owners as unknown as Record<string, unknown>[]}
          rowKey="id"
          searchKeys={['full_name', 'email', 'phone'] as never[]}
          searchPlaceholder="Buscar por nombre, email o teléfono..."
          columns={[
            {
              key: 'full_name', header: 'Propietario', sortable: true,
              render: (row) => {
                const o = row as unknown as Owner
                return (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                      style={{ background: 'var(--blue-bg)', color: 'var(--blue-text)' }}>
                      {initials(o.full_name)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{o.full_name}</p>
                      {o.legal_name && <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{o.legal_name}</p>}
                      {o.is_company && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-subtle)', color: 'var(--text-tertiary)' }}>Empresa</span>}
                    </div>
                  </div>
                )
              },
            },
            {
              key: 'phone', header: 'Contacto',
              render: (row) => {
                const o = row as unknown as Owner
                return (
                  <div className="space-y-0.5">
                    {o.phone && <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}><Phone className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />{o.phone}</div>}
                    {o.email && <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}><Mail className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />{o.email}</div>}
                  </div>
                )
              },
            },
            {
              key: 'bank_name', header: 'Banco / Pago',
              render: (row) => {
                const o = row as unknown as Owner
                return (
                  <div>
                    {o.bank_name
                      ? <div className="flex items-center gap-1.5"><Landmark className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} /><span className="text-sm" style={{ color: 'var(--text)' }}>{o.bank_name}</span></div>
                      : <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>—</span>
                    }
                    {o.payment_preference && <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{o.payment_preference}</p>}
                  </div>
                )
              },
            },
            {
              key: 'properties', header: 'Propiedades',
              render: (row) => {
                const o = row as unknown as Owner
                const props = (o as any).properties ?? []
                const active = props.filter((p: any) => p.status === 'ocupada')
                const totalRent = active.reduce((s: number, p: any) => s + p.rent_amount, 0)
                return (
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
                      <span className="text-sm" style={{ color: 'var(--text)' }}>{props.length} propiedad{props.length !== 1 ? 'es' : ''}</span>
                    </div>
                    {totalRent > 0 && <p className="text-xs font-medium mt-0.5" style={{ color: '#059669' }}>{formatCurrency(totalRent)}/mes</p>}
                  </div>
                )
              },
            },
            {
              key: 'relationship_level', header: 'Nivel relación', sortable: true,
              render: (row) => {
                const o = row as unknown as Owner
                const rel = REL_COLORS[o.relationship_level] ?? REL_COLORS.estandar
                return (
                  <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-semibold border capitalize"
                    style={{ background: rel.bg, color: rel.text, borderColor: rel.border }}>
                    {rel.label}
                  </span>
                )
              },
            },
            {
              key: 'id', header: '', className: 'text-right',
              render: (row) => {
                const o = row as unknown as Owner
                return (
                  <Link href={`/propietarios/${o.id}`} className="inline-flex items-center gap-1 text-sm font-medium transition" style={{ color: 'var(--blue)' }}>
                    Ver <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                )
              },
            },
          ]}
        />
      </div>
    </div>
  )
}
