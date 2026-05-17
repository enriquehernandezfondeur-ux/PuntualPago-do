'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { EmptyState } from '@/components/shared/EmptyState'
import type { LegalCase, LegalStatus } from '@/types/database'
import { Scale, AlertTriangle, DollarSign, Clock, Pencil, CheckCircle2, X, Plus, Loader2 } from 'lucide-react'
import { StatCard } from '@/components/shared/StatCard'
import { FormModal, Field, FormActions, inputCls, inputStyle, Separator } from '@/components/forms/FormModal'
import { createClient } from '@/lib/supabase/client'
import { logAudit } from '@/lib/utils/audit'
import { useRouter } from 'next/navigation'

const STATUS_CFG: Record<LegalStatus, { label: string; bar: string; bg: string; text: string }> = {
  prelegal:   { label: 'Pre-legal',  bar: '#F79009', bg: '#FFFAEB', text: '#B54708' },
  en_legal:   { label: 'En legal',   bar: '#7F56D9', bg: '#F9F5FF', text: '#6941C6' },
  desalojo:   { label: 'Desalojo',   bar: '#F04438', bg: '#FEF3F2', text: '#B42318' },
  cerrado:    { label: 'Cerrado',    bar: '#98A2B3', bg: '#F9FAFB', text: '#344054' },
  recuperado: { label: 'Recuperado', bar: '#12B76A', bg: '#ECFDF3', text: '#027A48' },
}

interface Props { cases: LegalCase[]; totalOwed: number }

export function LegalContent({ cases, totalOwed }: Props) {
  const [filter, setFilter]         = useState<LegalStatus | 'todos'>('todos')
  const [selected, setSelected]     = useState<LegalCase | null>(null)
  const [editOpen, setEditOpen]     = useState(false)
  const router  = useRouter()
  const supabase = createClient()

  const open     = cases.filter(c => !['cerrado','recuperado'].includes(c.status))
  const filtered = filter === 'todos' ? cases : cases.filter(c => c.status === filter)
  const counts: Record<string, number> = { todos: cases.length }
  for (const c of cases) counts[c.status] = (counts[c.status] ?? 0) + 1

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden" style={{ background: 'var(--bg)' }}>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 space-y-5 overflow-y-auto scrollbar-thin">
          {/* KPIs */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard title="Casos activos"       value={open.length}                             subtitle="Sin resolver" icon={Scale}         alert={open.length > 0} />
            <StatCard title="Pre-legal"           value={counts['prelegal'] ?? 0}                 subtitle="En seguimiento" icon={AlertTriangle} />
            <StatCard title="En legal / desalojo" value={(counts['en_legal'] ?? 0) + (counts['desalojo'] ?? 0)} subtitle="Proceso formal" icon={Scale} alert />
            <StatCard title="Monto adeudado"      value={formatCurrency(totalOwed)}               subtitle="Total en disputa" icon={DollarSign} alert={totalOwed > 0} />
          </div>

          {/* Filters */}
          <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {['todos', 'prelegal', 'en_legal', 'desalojo', 'cerrado', 'recuperado'].map(f => (
              <button key={f} onClick={() => setFilter(f as any)} className="px-3 py-1.5 rounded-md text-xs font-medium transition capitalize"
                style={filter === f ? { background: '#1570EF', color: '#fff' } : { color: 'var(--text-tertiary)' }}>
                {f === 'todos' ? 'Todos' : STATUS_CFG[f as LegalStatus]?.label} ({counts[f] ?? 0})
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={Scale} title="Sin casos legales" description="No hay casos en esta categoría." compact />
          ) : (
            <div className="space-y-3">
              {filtered.map(c => {
                const tenant = (c as any).tenant
                const prop   = (c as any).property
                const cfg    = STATUS_CFG[c.status]
                const isSelected = selected?.id === c.id
                return (
                  <div key={c.id} onClick={() => setSelected(isSelected ? null : c)}
                    className="rounded-xl p-4 flex items-start gap-4 cursor-pointer transition-all group"
                    style={{ background: isSelected ? 'var(--blue-bg)' : 'var(--surface)', border: `1px solid ${isSelected ? 'var(--blue)' : 'var(--border)'}` }}
                  >
                    <div className="w-1 h-full min-h-[56px] rounded-full shrink-0" style={{ background: cfg.bar }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div>
                          <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{tenant?.full_name ?? '—'}</p>
                          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{prop?.name ?? '—'}</p>
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0" style={{ background: cfg.bg, color: cfg.text }}>{cfg.label}</span>
                      </div>
                      <p className="text-xs font-medium" style={{ color: '#B42318' }}>{formatCurrency(c.amount_owed, c.currency)}</p>
                      <div className="flex items-center gap-4 mt-1.5 flex-wrap" style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                        <span>Abierto: {formatDate(c.opened_date)}</span>
                        {c.lawyer_assigned && <span>Abogado: {c.lawyer_assigned}</span>}
                        {c.next_action_date && <span className="font-medium" style={{ color: '#B54708' }}>Próxima acción: {formatDate(c.next_action_date)}</span>}
                        {c.days_in_arrears && <span>{c.days_in_arrears}d de mora</span>}
                      </div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); setSelected(c); setEditOpen(true) }}
                      className="p-1.5 rounded-md transition opacity-0 group-hover:opacity-100" style={{ color: 'var(--text-tertiary)' }}
                      onMouseEnter={ex => (ex.currentTarget.style.background = 'var(--surface-subtle)')}
                      onMouseLeave={ex => (ex.currentTarget.style.background = '')}>
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected && !editOpen && (
        <LegalDetailPanel case_={selected} onClose={() => setSelected(null)} onEdit={() => setEditOpen(true)} />
      )}

      {editOpen && selected && (
        <UpdateCaseModal case_={selected} onClose={() => { setEditOpen(false) }} />
      )}
    </div>
  )
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

function LegalDetailPanel({ case_, onClose, onEdit }: { case_: LegalCase; onClose: () => void; onEdit: () => void }) {
  const tenant = (case_ as any).tenant
  const prop   = (case_ as any).property
  return (
    <div className="w-72 border-l overflow-y-auto scrollbar-thin shrink-0 animate-slide-in" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Caso legal</p>
        <button onClick={onClose}><X className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} /></button>
      </div>
      <div className="px-4 py-4 space-y-3">
        <div>
          <p className="font-semibold" style={{ color: 'var(--text)' }}>{tenant?.full_name ?? '—'}</p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{prop?.name ?? '—'}</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full inline-block"
          style={{ background: STATUS_CFG[case_.status].bg, color: STATUS_CFG[case_.status].text }}>
          {STATUS_CFG[case_.status].label}
        </span>
        <div className="space-y-2 pt-1" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {[
            { l: 'Monto adeudado', v: formatCurrency(case_.amount_owed, case_.currency) },
            { l: 'Días en mora',   v: case_.days_in_arrears ? `${case_.days_in_arrears}d` : '—' },
            { l: 'Abierto',        v: formatDate(case_.opened_date) },
            { l: 'Abogado',        v: case_.lawyer_assigned ?? '—' },
            { l: 'No. caso',       v: case_.case_number ?? '—' },
            { l: 'Próxima acción', v: case_.next_action ?? '—' },
            { l: 'Fecha acción',   v: case_.next_action_date ? formatDate(case_.next_action_date) : '—' },
          ].map(r => (
            <div key={r.l} className="flex items-start justify-between gap-2">
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{r.l}</span>
              <span className="text-xs font-medium text-right max-w-[150px]" style={{ color: 'var(--text)' }}>{r.v}</span>
            </div>
          ))}
        </div>
        {case_.notes && (
          <div className="rounded-lg p-3" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{case_.notes}</p>
          </div>
        )}
        <button onClick={onEdit} className="w-full py-2 rounded-lg text-xs font-semibold text-white" style={{ background: '#1570EF' }}>
          Actualizar caso
        </button>
      </div>
    </div>
  )
}

// ─── Update case modal ────────────────────────────────────────────────────────

function UpdateCaseModal({ case_, onClose }: { case_: LegalCase; onClose: () => void }) {
  const router   = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    status:          case_.status,
    amount_owed:     String(case_.amount_owed),
    lawyer_assigned: case_.lawyer_assigned ?? '',
    next_action:     case_.next_action ?? '',
    next_action_date:case_.next_action_date ?? '',
    case_number:     case_.case_number ?? '',
    closed_date:     case_.closed_date ?? '',
    notes:           case_.notes ?? '',
  })

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        ...form,
        amount_owed: Number(form.amount_owed),
        next_action_date: form.next_action_date || null,
        closed_date: form.closed_date || null,
        lawyer_assigned: form.lawyer_assigned || null,
        case_number: form.case_number || null,
        updated_at: new Date().toISOString(),
      }
      await supabase.from('legal_cases').update(payload).eq('id', case_.id)
      // If closing, update tenant status back to activo
      if (['cerrado','recuperado'].includes(form.status)) {
        await supabase.from('tenants').update({ status: form.status === 'recuperado' ? 'activo' : 'historico' }).eq('id', case_.tenant_id)
      }
      await logAudit({ action: 'legal_case_updated', entityType: 'legal_cases', entityId: case_.id, newValues: payload })
      // Notify
      fetch('/api/notifications/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roles: ['admin', 'super_admin', 'gerente_operativo'],
          title: `Caso legal actualizado — ${(case_ as any).tenant?.full_name ?? ''}`,
          message: `Estado: ${STATUS_CFG[form.status as LegalStatus]?.label}`,
          entityType: 'legal_cases', entityId: case_.id, type: 'legal',
        }),
      }).catch(() => {})
      router.refresh(); onClose()
    } finally { setLoading(false) }
  }

  return (
    <FormModal open onClose={onClose} title="Actualizar caso legal" subtitle={(case_ as any).tenant?.full_name} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Estado del caso">
            <select value={form.status} onChange={e => set('status', e.target.value)} className={inputCls} style={inputStyle}>
              {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </Field>
          <Field label="Monto adeudado">
            <input type="number" value={form.amount_owed} onChange={e => set('amount_owed', e.target.value)} className={inputCls} style={inputStyle} />
          </Field>
          <Field label="Número de expediente">
            <input value={form.case_number} onChange={e => set('case_number', e.target.value)} className={inputCls} style={inputStyle} placeholder="Ej. 2026-001" />
          </Field>
          <Field label="Abogado asignado">
            <input value={form.lawyer_assigned} onChange={e => set('lawyer_assigned', e.target.value)} className={inputCls} style={inputStyle} placeholder="Lic. García..." />
          </Field>
          <Field label="Próxima acción">
            <input value={form.next_action} onChange={e => set('next_action', e.target.value)} className={inputCls} style={inputStyle} placeholder="Enviar carta notarial..." />
          </Field>
          <Field label="Fecha próxima acción">
            <input type="date" value={form.next_action_date} onChange={e => set('next_action_date', e.target.value)} className={inputCls} style={inputStyle} />
          </Field>
          {['cerrado','recuperado'].includes(form.status) && (
            <Field label="Fecha de cierre">
              <input type="date" value={form.closed_date} onChange={e => set('closed_date', e.target.value)} className={inputCls} style={inputStyle} />
            </Field>
          )}
        </div>
        <Field label="Notas del caso">
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} className={inputCls + ' resize-none'} style={inputStyle} />
        </Field>
        <FormActions onCancel={onClose} loading={loading} submitLabel="Guardar cambios" />
      </form>
    </FormModal>
  )
}
