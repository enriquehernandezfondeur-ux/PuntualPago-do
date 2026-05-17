'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { createClient } from '@/lib/supabase/client'
import { ROLE_LABELS, STAFF_ROLES } from '@/lib/hooks/useUser'
import { formatDate, initials } from '@/lib/utils/format'
import { inputCls, inputStyle, Field, Separator } from '@/components/forms/FormModal'
import type { User } from '@/types/database'
import { Settings, Users, Building2, CreditCard, Save, Loader2, CheckCircle2, Trash2, Plus, Phone, Mail, MessageCircle, Star, ExternalLink } from 'lucide-react'

type Tab = 'empresa' | 'cobros' | 'equipo' | 'plan'

interface Props { settings: any[]; users: User[] }

export function ConfiguracionContent({ settings: initialSettings, users }: Props) {
  const [tab, setTab]     = useState<Tab>('empresa')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const router = useRouter()
  const supabase = createClient()

  function getSetting(key: string, fallback = '') {
    return initialSettings.find(s => s.key === key)?.value ?? fallback
  }

  const [empresa, setEmpresa] = useState({
    company_name:    getSetting('company_name', 'PuntualPago'),
    company_phone:   getSetting('company_phone', ''),
    company_email:   getSetting('company_email', 'cobros@puntualpago.com'),
    company_whatsapp:getSetting('company_whatsapp', ''),
    company_address: getSetting('company_address', ''),
    company_city:    getSetting('company_city', 'Santo Domingo'),
    site_url:        getSetting('site_url', ''),
    cobros_email:    getSetting('cobros_email', 'cobros@puntualpago.com'),
  })

  const [cobros, setCobros] = useState({
    management_fee_pct:  getSetting('management_fee_pct', '10'),
    grace_days:          getSetting('grace_days', '5'),
    late_fee_pct:        getSetting('late_fee_pct', '5'),
    payout_day:          getSetting('payout_day', '1'),
    usd_dop_rate:        getSetting('usd_dop_rate', '59.5'),
    legal_escalation_days: getSetting('legal_escalation_days', '45'),
    reminder_days_before:getSetting('reminder_days_before', '5,1'),
    reminder_days_after: getSetting('reminder_days_after', '1,3,7,15,30'),
    whatsapp_reminders:  getSetting('whatsapp_reminders', 'true'),
    email_reminders:     getSetting('email_reminders', 'true'),
  })

  async function saveSettings(data: Record<string, string>) {
    setSaving(true)
    try {
      for (const [key, value] of Object.entries(data)) {
        await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' })
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  const inp = (obj: any, setObj: any, k: string, type = 'text', placeholder = '') => (
    <input type={type} value={obj[k]} onChange={e => setObj((f: any) => ({ ...f, [k]: e.target.value }))} placeholder={placeholder} className={inputCls} style={inputStyle} />
  )

  const TABS = [
    { key: 'empresa' as const, label: 'Empresa',  icon: Building2 },
    { key: 'cobros'  as const, label: 'Cobros',   icon: CreditCard },
    { key: 'equipo'  as const, label: 'Equipo',   icon: Users },
    { key: 'plan'    as const, label: 'Plan',      icon: Star },
  ]

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-5" style={{ background: 'var(--bg)' }}>
      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition"
            style={tab === t.key ? { background: 'var(--bg)', color: 'var(--text)', boxShadow: '0 1px 2px rgba(16,24,40,0.08)' } : { color: 'var(--text-tertiary)' }}
          >
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* Empresa */}
      {tab === 'empresa' && (
        <div className="rounded-2xl p-6 space-y-4 max-w-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Información de la empresa</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Datos que aparecen en emails, reportes y portales</p>
          </div>
          <Separator />
          <div className="space-y-4">
            <Field label="Nombre de la empresa" required>{inp(empresa, setEmpresa, 'company_name', 'text', 'PuntualPago')}</Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Teléfono">{inp(empresa, setEmpresa, 'company_phone', 'tel', '809-000-0000')}</Field>
              <Field label="WhatsApp" hint="Número que aparece en los recordatorios">{inp(empresa, setEmpresa, 'company_whatsapp', 'tel', '809-000-0000')}</Field>
              <Field label="Email de cobros">{inp(empresa, setEmpresa, 'cobros_email', 'email', 'cobros@puntualpago.com')}</Field>
              <Field label="Email general">{inp(empresa, setEmpresa, 'company_email', 'email', 'info@puntualpago.com')}</Field>
            </div>
            <Field label="Dirección">{inp(empresa, setEmpresa, 'company_address', 'text', 'Av. Winston Churchill...')}</Field>
            <Field label="Ciudad">{inp(empresa, setEmpresa, 'company_city', 'text', 'Santo Domingo')}</Field>
            <Field label="URL del sitio" hint="Para links en emails (ej. https://puntualpago.com)">{inp(empresa, setEmpresa, 'site_url', 'url', 'https://puntualpago.com')}</Field>
          </div>
          <SaveBtn saving={saving} saved={saved} onClick={() => saveSettings(empresa)} />
        </div>
      )}

      {/* Cobros */}
      {tab === 'cobros' && (
        <div className="rounded-2xl p-6 space-y-4 max-w-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Parámetros de cobro</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Valores por defecto para nuevos contratos y automatizaciones</p>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Comisión de gestión (%)" hint="% que PuntualPago descuenta de la renta">{inp(cobros, setCobros, 'management_fee_pct', 'number', '10')}</Field>
            <Field label="Días de gracia" hint="Días antes de aplicar mora (usualmente 5)">{inp(cobros, setCobros, 'grace_days', 'number', '5')}</Field>
            <Field label="% mora mensual">{inp(cobros, setCobros, 'late_fee_pct', 'number', '5')}</Field>
            <Field label="Día de liquidación a propietarios">{inp(cobros, setCobros, 'payout_day', 'number', '1')}</Field>
            <Field label="Tasa USD → DOP" hint="Tasa de cambio para mostrar equivalencias (ej: 59.5)">{inp(cobros, setCobros, 'usd_dop_rate', 'number', '59.5')}</Field>
            <Field label="Días para escalar a legal" hint="Días de mora antes de crear caso legal automáticamente">{inp(cobros, setCobros, 'legal_escalation_days', 'number', '45')}</Field>
          </div>
          <Separator />
          <div>
            <h4 className="font-medium text-xs uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>Recordatorios automáticos</h4>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Días ANTES del vencimiento" hint="Separados por coma: 5,1">{inp(cobros, setCobros, 'reminder_days_before', 'text', '5,1')}</Field>
              <Field label="Días DESPUÉS del vencimiento" hint="Separados por coma: 1,3,7,15,30">{inp(cobros, setCobros, 'reminder_days_after', 'text', '1,3,7,15,30')}</Field>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
                <input type="checkbox" id="wa" checked={cobros.whatsapp_reminders === 'true'} onChange={e => setCobros(f => ({ ...f, whatsapp_reminders: e.target.checked ? 'true' : 'false' }))} className="rounded" />
                <label htmlFor="wa" className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                  <MessageCircle className="w-3.5 h-3.5" style={{ color: '#12B76A' }} /> Recordatorios WhatsApp
                </label>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
                <input type="checkbox" id="em" checked={cobros.email_reminders === 'true'} onChange={e => setCobros(f => ({ ...f, email_reminders: e.target.checked ? 'true' : 'false' }))} className="rounded" />
                <label htmlFor="em" className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                  <Mail className="w-3.5 h-3.5" style={{ color: '#1570EF' }} /> Recordatorios Email
                </label>
              </div>
            </div>
          </div>
          <SaveBtn saving={saving} saved={saved} onClick={() => saveSettings(cobros)} />
        </div>
      )}

      {/* Equipo */}
      {tab === 'equipo' && (
        <div className="space-y-4 max-w-2xl">
          <InviteUserForm />
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <h3 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Usuarios del sistema</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{users.length} usuarios registrados</p>
              </div>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {users.map(u => (
                <div key={u.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0 text-xs" style={{ background: STAFF_ROLES.includes(u.role) ? '#EFF8FF' : '#F9F5FF', color: STAFF_ROLES.includes(u.role) ? '#175CD3' : '#6941C6' }}>
                    {initials(u.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{u.full_name}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <RoleSelector userId={u.id} currentRole={u.role} />
                    <StatusToggle userId={u.id} isActive={u.is_active} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Plan */}
      {tab === 'plan' && (
        <PlanTab
          currentPlan={getSetting('plan', 'basico')}
          planExpiry={getSetting('plan_expiry', '')}
          whatsapp={empresa.company_whatsapp}
        />
      )}
    </div>
  )
}

function InviteUserForm() {
  const router = useRouter()
  const [email, setEmail]   = useState('')
  const [name, setName]     = useState('')
  const [role, setRole]     = useState<User['role']>('equipo_cobros')
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !name.trim()) return
    setSaving(true); setResult(null)
    try {
      const serviceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY // Only used client-side check
      const sb = createClient()
      // Create user via API
      const res = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, full_name: name, role }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al invitar')
      setResult({ ok: true, msg: `Invitación enviada a ${email}` })
      setEmail(''); setName('')
      router.refresh()
    } catch (err: any) {
      setResult({ ok: false, msg: err.message })
    } finally { setSaving(false) }
  }

  return (
    <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div>
        <h3 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Invitar nuevo usuario</h3>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>El usuario recibirá un email con acceso al sistema</p>
      </div>
      <form onSubmit={handleInvite} className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre completo" required className={inputCls + ' col-span-1'} style={inputStyle} />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@empresa.com" required className={inputCls} style={inputStyle} />
          <select value={role} onChange={e => setRole(e.target.value as any)} className={inputCls} style={inputStyle}>
            {Object.entries(ROLE_LABELS).filter(([k]) => STAFF_ROLES.includes(k as any)).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {result && <p className={cn('text-xs', result.ok ? 'text-emerald-600' : 'text-red-500')}>{result.msg}</p>}
        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60" style={{ background: '#1570EF' }}>
            {saving ? 'Invitando...' : 'Enviar invitación'}
          </button>
        </div>
      </form>
    </div>
  )
}

function SaveBtn({ saving, saved, onClick }: { saving: boolean; saved: boolean; onClick: () => void }) {
  return (
    <div className="flex items-center justify-end pt-2">
      <button onClick={onClick} disabled={saving}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition disabled:opacity-60"
        style={{ background: saved ? '#12B76A' : '#1570EF' }}
        onMouseEnter={e => !saving && !saved && ((e.currentTarget as HTMLElement).style.background = '#175CD3')}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = saved ? '#12B76A' : '#1570EF'}
      >
        {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando...</>
          : saved ? <><CheckCircle2 className="w-3.5 h-3.5" /> Guardado</>
          : <><Save className="w-3.5 h-3.5" /> Guardar cambios</>
        }
      </button>
    </div>
  )
}

function RoleSelector({ userId, currentRole }: { userId: string; currentRole: string }) {
  const [role, setRole] = useState(currentRole)
  const supabase = createClient()

  async function onChange(newRole: string) {
    setRole(newRole)
    await supabase.from('users').update({ role: newRole }).eq('id', userId)
  }

  return (
    <select value={role} onChange={e => onChange(e.target.value)}
      className="px-2 py-1 rounded-lg text-xs border transition" style={{ background: 'var(--surface-subtle)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
      {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
    </select>
  )
}

function StatusToggle({ userId, isActive }: { userId: string; isActive: boolean }) {
  const [active, setActive] = useState(isActive)
  const supabase = createClient()

  async function toggle() {
    const next = !active
    setActive(next)
    await supabase.from('users').update({ is_active: next }).eq('id', userId)
  }

  return (
    <button onClick={toggle} className="w-8 h-4.5 rounded-full transition-colors relative" style={{ background: active ? '#12B76A' : '#D0D5DD', padding: '2px' }}>
      <span className="block w-3.5 h-3.5 rounded-full bg-white shadow transition-transform" style={{ transform: active ? 'translateX(14px)' : 'translateX(0)' }} />
    </button>
  )
}

// ─── Plan Tab ────────────────────────────────────────────────────────────────

const PLANS = [
  {
    key:         'basico',
    name:        'Básico',
    price:       'RD$3,500/mes',
    properties:  '30',
    users:       '3',
    guarantee:   false,
    color:       '#667085',
    badge:       { bg: '#F2F4F7', color: '#344054' },
  },
  {
    key:         'profesional',
    name:        'Profesional',
    price:       'RD$7,500/mes',
    properties:  '100',
    users:       '10',
    guarantee:   true,
    color:       '#1570EF',
    badge:       { bg: '#EFF8FF', color: '#175CD3' },
    highlighted: true,
  },
  {
    key:         'empresarial',
    name:        'Empresarial',
    price:       'RD$15,000/mes',
    properties:  'Ilimitado',
    users:       'Ilimitado',
    guarantee:   true,
    color:       '#6941C6',
    badge:       { bg: '#F9F5FF', color: '#6941C6' },
  },
] as const

function PlanTab({ currentPlan, planExpiry, whatsapp }: {
  currentPlan: string
  planExpiry:  string
  whatsapp:    string
}) {
  const current = PLANS.find(p => p.key === currentPlan) ?? PLANS[0]
  const waLink  = whatsapp
    ? `https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Hola, me gustaría cambiar mi plan en PuntualPago.')}`
    : 'https://wa.me/'

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Current plan card */}
      <div className="rounded-2xl p-5 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div>
          <h3 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Plan actual</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Estado de tu suscripción</p>
        </div>
        <Separator />
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold"
            style={{ background: current.badge.bg, color: current.badge.color }}
          >
            <Star className="w-3.5 h-3.5" />
            Plan {current.name}
          </span>
          {planExpiry && (
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Vence el <strong style={{ color: 'var(--text-secondary)' }}>{planExpiry}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Comparison table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Planes disponibles</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Compara las opciones para tu organización</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--border)' }}>
                {['Plan', 'Precio', 'Propiedades', 'Usuarios', 'Garantía'].map(h => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left font-medium whitespace-nowrap"
                    style={{ fontSize: '11px', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PLANS.map(plan => {
                const isCurrent = plan.key === currentPlan
                return (
                  <tr
                    key={plan.key}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      background: isCurrent ? 'var(--surface-subtle)' : undefined,
                    }}
                  >
                    {/* Plan name */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ background: plan.badge.bg, color: plan.badge.color }}
                        >
                          {plan.name}
                        </span>
                        {isCurrent && (
                          <span className="text-xs font-medium" style={{ color: '#12B76A' }}>Actual</span>
                        )}
                      </div>
                    </td>
                    {/* Precio */}
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{plan.price}</span>
                    </td>
                    {/* Propiedades */}
                    <td className="px-5 py-3.5">
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{plan.properties}</span>
                    </td>
                    {/* Usuarios */}
                    <td className="px-5 py-3.5">
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{plan.users}</span>
                    </td>
                    {/* Garantía */}
                    <td className="px-5 py-3.5">
                      {plan.guarantee
                        ? <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: '#ECFDF3', color: '#027A48' }}>Si</span>
                        : <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No</span>
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upgrade CTA */}
      <div
        className="rounded-2xl p-5 flex items-start gap-4"
        style={{ background: '#EFF8FF', border: '1px solid #B2DDFF' }}
      >
        <MessageCircle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: '#1570EF' }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: '#175CD3' }}>¿Quieres cambiar de plan?</p>
          <p className="text-xs mt-0.5" style={{ color: '#1570EF' }}>
            Para cambiar de plan contacta a PuntualPago por WhatsApp. Nuestro equipo te atenderá de inmediato.
          </p>
        </div>
        <a
          href={waLink}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white shrink-0 transition"
          style={{ background: '#12B76A' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#027A48')}
          onMouseLeave={e => (e.currentTarget.style.background = '#12B76A')}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Contactar para upgrade
        </a>
      </div>
    </div>
  )
}
