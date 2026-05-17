'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { logAudit } from '@/lib/utils/audit'
import { formatCurrency } from '@/lib/utils/format'
import { inputCls, inputStyle, Field } from '@/components/forms/FormModal'
import { CheckCircle2, ArrowRight, ArrowLeft, User, FileText, CreditCard, Loader2, Shield, Check } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const STEPS = [
  { n: 1, label: 'Inquilino',  icon: User,       desc: 'Datos personales y contacto' },
  { n: 2, label: 'Contrato',   icon: FileText,   desc: 'Propiedad y términos' },
  { n: 3, label: 'Confirmar',  icon: CreditCard, desc: 'Revisión y activación' },
]

interface Props {
  properties: any[]; owners: any[]; buildings: any[]
}

export function NewTenantWizard({ properties, owners, buildings }: Props) {
  const router   = useRouter()
  const supabase = createClient()
  const [step, setStep]     = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const [done, setDone]     = useState<{ tenantId: string; leaseId: string } | null>(null)
  const [invitePortal, setInvitePortal] = useState(true)

  // Step 1 — tenant
  const [tenant, setTenant] = useState({
    full_name: '', id_type: 'cedula', id_number: '', nationality: 'Dominicana',
    phone: '', whatsapp: '', email: '', occupation: '', employer: '',
    estimated_income: '', income_currency: 'DOP', notes: '',
  })

  // Step 2 — lease
  const [lease, setLease] = useState({
    property_id: '', owner_id: '', start_date: '', end_date: '',
    rent_amount: '', currency: 'DOP', deposit_amount: '', payment_day: '1',
    late_fee_percentage: '5', late_fee_grace_days: '5', has_guarantee: 'false',
    generate_payments: 'true',
  })

  function setT(k: string, v: string) { setTenant(f => ({ ...f, [k]: v })) }
  function setL(k: string, v: string) { setLease(f => ({ ...f, [k]: v })) }

  function onPropertyChange(propId: string) {
    const p = properties.find(p => p.id === propId)
    if (p) setLease(f => ({ ...f, property_id: propId, rent_amount: String(p.rent_amount), currency: p.currency, payment_day: String(p.payment_day) }))
    else setL('property_id', propId)
  }

  const selectedProp  = properties.find(p => p.id === lease.property_id)
  const selectedOwner = owners.find(o => o.id === lease.owner_id)

  async function handleSubmit() {
    if (!tenant.full_name.trim()) { setError('El nombre es obligatorio'); return }
    if (!lease.property_id || !lease.owner_id) { setError('Selecciona propiedad y propietario'); return }
    if (!lease.start_date || !lease.end_date) { setError('Las fechas del contrato son obligatorias'); return }
    if (invitePortal && !tenant.email.trim()) { setError('El email es obligatorio para enviar la invitación al portal'); return }
    if (invitePortal && tenant.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tenant.email)) { setError('El email no es válido'); return }

    setLoading(true); setError('')
    try {
      // 1. Create tenant
      const { data: newTenant, error: tErr } = await supabase.from('tenants').insert({
        ...tenant,
        estimated_income: tenant.estimated_income ? Number(tenant.estimated_income) : null,
        status: 'activo', pending_balance: 0, risk_level: 'bajo', is_active: true,
      }).select('id').single()
      if (tErr) throw tErr
      await logAudit({ action: 'tenant_created', entityType: 'tenants', entityId: newTenant.id, newValues: { full_name: tenant.full_name } })

      // 2. Auto-generar número de contrato: CNT-2026-001
      const year = new Date().getFullYear()
      const { count: leaseCount } = await supabase
        .from('leases')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', `${year}-01-01`)
      const contractNumber = `CNT-${year}-${String((leaseCount ?? 0) + 1).padStart(3, '0')}`

      // 3. Create lease
      const { data: newLease, error: lErr } = await supabase.from('leases').insert({
        property_id:     lease.property_id,
        tenant_id:       newTenant.id,
        owner_id:        lease.owner_id,
        start_date:      lease.start_date,
        end_date:        lease.end_date,
        rent_amount:     Number(lease.rent_amount),
        currency:        lease.currency,
        deposit_amount:  lease.deposit_amount ? Number(lease.deposit_amount) : null,
        payment_day:     Number(lease.payment_day),
        late_fee_percentage: Number(lease.late_fee_percentage),
        late_fee_grace_days: Number(lease.late_fee_grace_days),
        has_guarantee:   lease.has_guarantee === 'true',
        contract_number: contractNumber,
        status: 'activo', signing_status: 'pendiente', inventory_included: false,
      }).select('id').single()
      if (lErr) throw lErr
      await logAudit({ action: 'lease_created', entityType: 'leases', entityId: newLease.id, newValues: { tenant_id: newTenant.id } })

      // 3. Update property status
      await supabase.from('properties').update({ status: 'ocupada' }).eq('id', lease.property_id)

      // 4. Generate payments (API call)
      if (lease.generate_payments === 'true') {
        await fetch('/api/leases/generate-payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leaseId: newLease.id }),
        })
      }

      // 5. Invite to portal (optional)
      if (invitePortal && tenant.email) {
        await fetch('/api/portal/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entityType: 'tenant', entityId: newTenant.id, email: tenant.email }),
        }).catch(() => {})
      }

      setDone({ tenantId: newTenant.id, leaseId: newLease.id })
    } catch (err: any) {
      setError(err.message ?? 'Error al crear el inquilino')
    } finally {
      setLoading(false)
    }
  }

  const inp = (obj: any, setFn: any, k: string, type = 'text', ph = '') => (
    <input type={type} value={obj[k]} onChange={e => setFn(k, e.target.value)} placeholder={ph} className={inputCls} style={inputStyle} />
  )
  const sel = (obj: any, setFn: any, k: string, opts: { v: string; l: string }[]) => (
    <select value={obj[k]} onChange={e => setFn(k, e.target.value)} className={inputCls} style={inputStyle}>
      {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  )

  // ── Done state ──────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="flex-1 flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
        <div className="max-w-md w-full text-center space-y-5">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: '#ECFDF3' }}>
            <CheckCircle2 className="w-8 h-8" style={{ color: '#12B76A' }} />
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>¡{tenant.full_name.split(' ')[0]} registrado!</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
              Inquilino creado, contrato activado y pagos generados.
              {invitePortal && tenant.email ? ' Acceso al portal enviado por email.' : ''}
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={() => router.push(`/inquilinos/${done.tenantId}`)} className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: '#1570EF' }}>
              Ver perfil completo
            </button>
            <button onClick={() => router.push('/cobros')} className="px-4 py-2 rounded-lg text-sm font-medium border" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
              Ir a Cobros
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ background: 'var(--bg)' }}>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => {
            const active    = step === s.n
            const completed = step > s.n
            return (
              <div key={s.n} className="flex items-center gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                    style={completed ? { background: '#12B76A', color: '#fff' } : active ? { background: '#1570EF', color: '#fff' } : { background: 'var(--border)', color: 'var(--text-tertiary)' }}>
                    {completed ? <CheckCircle2 className="w-4 h-4" /> : s.n}
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-xs font-semibold" style={{ color: active ? 'var(--text)' : 'var(--text-tertiary)' }}>{s.label}</p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{s.desc}</p>
                  </div>
                </div>
                {i < STEPS.length - 1 && <div className="flex-1 h-px mx-2" style={{ background: completed ? '#12B76A' : 'var(--border)', minWidth: '24px' }} />}
              </div>
            )
          })}
        </div>

        {/* Step 1 — Inquilino */}
        {step === 1 && (
          <div className="rounded-2xl p-6 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Datos del inquilino</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nombre completo" required className="col-span-2">{inp(tenant, setT, 'full_name', 'text', 'Ej. María García')}</Field>
              <Field label="Tipo ID">{sel(tenant, setT, 'id_type', [{ v: 'cedula', l: 'Cédula' }, { v: 'pasaporte', l: 'Pasaporte' }])}</Field>
              <Field label="Número ID">{inp(tenant, setT, 'id_number', 'text', '001-0000000-0')}</Field>
              <Field label="Teléfono">{inp(tenant, setT, 'phone', 'tel', '809-000-0000')}</Field>
              <Field label="WhatsApp">{inp(tenant, setT, 'whatsapp', 'tel', '809-000-0000')}</Field>
              <Field label="Email" className="col-span-2">{inp(tenant, setT, 'email', 'email', 'correo@ejemplo.com')}</Field>
              <Field label="Ocupación">{inp(tenant, setT, 'occupation', 'text', 'Médico, Empresario...')}</Field>
              <Field label="Empleador">{inp(tenant, setT, 'employer')}</Field>
              <Field label="Ingreso mensual est.">{inp(tenant, setT, 'estimated_income', 'number')}</Field>
              <Field label="Moneda">{sel(tenant, setT, 'income_currency', [{ v: 'DOP', l: 'DOP' }, { v: 'USD', l: 'USD' }])}</Field>
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={() => { if (!tenant.full_name.trim()) { setError('El nombre es obligatorio'); return } setError(''); setStep(2) }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: '#1570EF' }}>
                Siguiente <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Contrato */}
        {step === 2 && (
          <div className="rounded-2xl p-6 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Contrato de arrendamiento</h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Propiedad con estado visual */}
              <Field label="Propiedad" required className="col-span-2">
                <select
                  value={lease.property_id}
                  onChange={e => {
                    const p = properties.find(x => x.id === e.target.value)
                    if (p && p.status === 'ocupada') {
                      setError('Esta propiedad ya tiene un inquilino activo. Selecciona una disponible.')
                      return
                    }
                    setError('')
                    onPropertyChange(e.target.value)
                  }}
                  className={inputCls}
                  style={inputStyle}
                >
                  <option value="">Seleccionar propiedad...</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id} disabled={p.status === 'ocupada'}>
                      {p.status === 'ocupada' ? '[Ocupada]' : '[Disponible]'} {p.name} — {formatCurrency(p.rent_amount, p.currency)}/mes
                    </option>
                  ))}
                </select>
                <p className="text-xs mt-1 flex items-center gap-3" style={{ color: 'var(--text-tertiary)' }}>
                  <span className="flex items-center gap-1"><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} /> Disponible</span>
                  <span className="flex items-center gap-1"><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', display: 'inline-block' }} /> Ocupada (no seleccionable)</span>
                </p>
              </Field>

              <Field label="Propietario" required>
                <select value={lease.owner_id} onChange={e => setL('owner_id', e.target.value)} className={inputCls} style={inputStyle}>
                  <option value="">Seleccionar propietario...</option>
                  {owners.map(o => <option key={o.id} value={o.id}>{o.full_name}</option>)}
                </select>
              </Field>
              <Field label="Día de pago" hint="Día del mes en que vence la renta">
                {inp(lease, setL, 'payment_day', 'number', '1')}
              </Field>
              <Field label="Inicio del contrato" required>{inp(lease, setL, 'start_date', 'date')}</Field>
              <Field label="Fin del contrato" required>{inp(lease, setL, 'end_date', 'date')}</Field>
              <Field label="Renta mensual" required>{inp(lease, setL, 'rent_amount', 'number', 'Ej. 25000')}</Field>
              <Field label="Moneda">{sel(lease, setL, 'currency', [{ v: 'DOP', l: 'Pesos (RD$)' }, { v: 'USD', l: 'Dólares (US$)' }])}</Field>
              <Field label="Depósito en garantía" hint="Monto que el inquilino paga al entrar">{inp(lease, setL, 'deposit_amount', 'number', '0')}</Field>
              <Field label="% mora mensual" hint="Cargo si paga tarde (ej: 5%)">{inp(lease, setL, 'late_fee_percentage', 'number', '5')}</Field>
            </div>

            {/* Garantía PP — explicación con ejemplo */}
            <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#EFF8FF' }}><Shield className="w-4 h-4" style={{ color: '#1570EF' }} /></div>
                <div className="flex-1">
                  <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>¿Incluir Garantía PuntualPago?</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    Con Garantía PP, <strong>tú cobras aunque el inquilino no pague</strong>.
                    Si Juan González no paga agosto, PuntualPago te paga igual y cobra a Juan.
                  </p>
                </div>
              </div>
              <div className="rounded-lg p-3" style={{ background: '#ECFDF3', border: '1px solid #A6F4C5' }}>
                <p className="text-xs font-semibold" style={{ color: '#027A48' }}>Ejemplo real:</p>
                <p className="text-xs mt-0.5" style={{ color: '#027A48' }}>
                  Renta: {lease.rent_amount ? formatCurrency(Number(lease.rent_amount), lease.currency as any) : 'RD$25,000'}/mes ·
                  Inquilino no paga agosto — PuntualPago te deposita {lease.rent_amount ? formatCurrency(Number(lease.rent_amount) * 0.9, lease.currency as any) : 'RD$22,500'} (neto tras comisión) · PP gestiona el cobro a Juan.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { v: 'false', l: 'No — cobro normal', sub: 'Si no paga, tú lo gestionas' },
                  { v: 'true',  l: 'Sí — con Garantía PP', sub: 'PuntualPago te cubre siempre' },
                ].map(opt => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setL('has_guarantee', opt.v)}
                    className="p-3 rounded-xl text-left transition"
                    style={{
                      border: lease.has_guarantee === opt.v
                        ? `2px solid ${opt.v === 'true' ? '#1570EF' : '#D0D5DD'}`
                        : '2px solid var(--border)',
                      background: lease.has_guarantee === opt.v
                        ? opt.v === 'true' ? '#EFF8FF' : 'var(--surface-subtle)'
                        : 'transparent',
                    }}
                  >
                    <p className="text-sm font-semibold" style={{ color: lease.has_guarantee === opt.v ? (opt.v === 'true' ? '#175CD3' : 'var(--text)') : 'var(--text-secondary)' }}>
                      {opt.l}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{opt.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl p-3" style={{ background: '#EFF8FF', border: '1px solid #BFDBFE' }}>
              <p className="text-xs" style={{ color: '#1570EF' }}>
                <strong>Los pagos se generan automáticamente</strong> para toda la duración del contrato.
                El número de contrato se genera solo — no tienes que escribir nada.
              </p>
            </div>
            <div className="flex justify-between pt-2">
              <button onClick={() => { setError(''); setStep(1) }} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                <ArrowLeft className="w-3.5 h-3.5" /> Atrás
              </button>
              <button onClick={() => { if (!lease.property_id || !lease.owner_id || !lease.start_date || !lease.end_date || !lease.rent_amount || Number(lease.rent_amount) <= 0) { setError('Completa todos los campos obligatorios, incluyendo la renta mensual'); return } setError(''); setStep(3) }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: '#1570EF' }}>
                Siguiente <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Confirm */}
        {step === 3 && (
          <div className="rounded-2xl p-6 space-y-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Resumen — Confirmar</h3>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Inquilino</p>
                <p className="font-semibold" style={{ color: 'var(--text)' }}>{tenant.full_name}</p>
                {tenant.phone && <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{tenant.phone}</p>}
                {tenant.email && <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{tenant.email}</p>}
              </div>
              <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Propiedad</p>
                <p className="font-semibold" style={{ color: 'var(--text)' }}>{selectedProp?.name ?? '—'}</p>
                {selectedOwner && <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Propietario: {selectedOwner.full_name}</p>}
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Renta: {formatCurrency(Number(lease.rent_amount), lease.currency as any)}/mes</p>
              </div>
            </div>

            <div className="rounded-xl p-4 space-y-1.5" style={{ background: '#EFF8FF', border: '1px solid #B2DDFF' }}>
              <p className="text-xs font-semibold" style={{ color: '#175CD3' }}>¿Qué pasará al confirmar?</p>
              {[
                { ok: true,  text: 'Se crea el inquilino en el sistema' },
                { ok: true,  text: 'Se activa el contrato de arrendamiento' },
                { ok: true,  text: 'La propiedad se marca como "Ocupada"' },
                { ok: lease.generate_payments === 'true', text: lease.generate_payments === 'true' ? 'Se generan todos los pagos mensuales del contrato' : 'Los pagos se crearán manualmente' },
                { ok: !!(invitePortal && tenant.email), text: invitePortal && tenant.email ? `Se envía invitación al portal a ${tenant.email}` : 'Sin acceso al portal por ahora' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs" style={{ color: item.ok ? '#175CD3' : '#6B7280' }}>
                  <Check className="w-3 h-3 shrink-0" style={{ color: item.ok ? '#1570EF' : '#9CA3AF' }} />
                  {item.text}
                </div>
              ))}
            </div>

            {/* Portal invite toggle */}
            {tenant.email && (
              <label className="flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
                <input type="checkbox" checked={invitePortal} onChange={e => setInvitePortal(e.target.checked)} className="rounded" />
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Enviar acceso al portal</p>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{tenant.email} recibirá un link para ver sus pagos</p>
                </div>
              </label>
            )}

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex justify-between pt-1">
              <button onClick={() => { setError(''); setStep(2) }} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                <ArrowLeft className="w-3.5 h-3.5" /> Atrás
              </button>
              <button onClick={handleSubmit} disabled={loading}
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: '#12B76A' }}>
                {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creando...</> : <><CheckCircle2 className="w-3.5 h-3.5" /> Confirmar y crear</>}
              </button>
            </div>
          </div>
        )}

        {error && step < 3 && <p className="text-xs text-red-500 text-center">{error}</p>}
      </div>
    </div>
  )
}
