'use client'
import './landing.css'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowRight, Check, Shield, TrendingUp, Clock, AlertTriangle,
  Building2, Users, Globe, BarChart3, FileText, Bell,
  ChevronDown, Star, Lock, Phone,
  LogIn, X, Eye, EyeOff, Loader2,
} from 'lucide-react'

/* ── config ── */
const WA_NUMBER = '18295481998'
const WA_MSG    = encodeURIComponent('Hola, me interesa que PuntualPago administre mi propiedad. ¿Cómo funciona?')
const WA_LINK   = `https://wa.me/${WA_NUMBER}?text=${WA_MSG}`

/* ── utils ── */
const pad = (n: number) => String(n).padStart(2, '0')

/* ── scroll reveal ── */
function useReveal() {
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('revealed'); obs.unobserve(e.target) } })
    }, { threshold: 0.08, rootMargin: '0px 0px -32px 0px' })
    document.querySelectorAll('.reveal,.reveal-up,.reveal-left,.reveal-right,.reveal-scale').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])
}

/* ── animated counter ── */

/* ── countdown ── */
function Countdown() {
  const [t, setT] = useState({ days: 0, hours: 0, mins: 0, secs: 0 })
  const [ok, setOk] = useState(false)
  useEffect(() => {
    setOk(true)
    const getNext1 = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth() + 1, 1) }
    const tick = () => {
      const diff = getNext1().getTime() - Date.now()
      if (diff <= 0) { setT({ days: 0, hours: 0, mins: 0, secs: 0 }); return }
      setT({ days: Math.floor(diff / 86400000), hours: Math.floor(diff / 3600000) % 24, mins: Math.floor(diff / 60000) % 60, secs: Math.floor(diff / 1000) % 60 })
    }
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [])
  const nextMonth = ok ? new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString('es-DO', { month: 'long' }) : ''
  if (!ok) return <div style={{ height: 88, background: '#fff' }} />
  return (
    <div style={{ background: '#fff', borderBottom: '1px solid #E8EBF0', padding: 'clamp(16px,3vw,24px) 24px', textAlign: 'center' }}>

      {/* Label */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', flexShrink: 0 }} className="pulse-dot" />
        <span style={{ fontSize: 'clamp(9px,1.2vw,11px)', fontWeight: 700, color: '#9CA3AF', letterSpacing: '.08em', textTransform: 'uppercase' }}>
          Próximo pago garantizado · 1 de {nextMonth}
        </span>
      </div>

      {/* Dígitos */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(6px,2vw,20px)', marginBottom: 10 }}>
        {[{ v: t.days, l: 'días' }, { v: t.hours, l: 'hrs' }, { v: t.mins, l: 'min' }, { v: t.secs, l: 'seg' }].map((u, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'clamp(6px,2vw,20px)' }}>
            <div style={{ textAlign: 'center', minWidth: 'clamp(36px,6vw,56px)' }}>
              <div key={u.v} className="countdown-digit" style={{ fontSize: 'clamp(1.4rem,3vw,2.4rem)', fontWeight: 800, color: '#0F1F4B', letterSpacing: '-0.04em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {pad(u.v)}
              </div>
              <div style={{ fontSize: 8, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 3 }}>{u.l}</div>
            </div>
            {i < 3 && <span style={{ fontSize: 'clamp(0.9rem,2vw,1.4rem)', color: '#E5E7EB', fontWeight: 700, paddingBottom: 12 }}>:</span>}
          </div>
        ))}
      </div>

      {/* Tagline */}
      <p style={{ fontSize: 'clamp(11px,1.1vw,13px)', color: '#6B7280', margin: 0, lineHeight: 1.5 }}>
        Todos nuestros propietarios reciben su renta ese día.{' '}
        <span style={{ color: '#0EA5E9', fontWeight: 600 }}>Garantizado.</span>
      </p>

    </div>
  )
}

/* ── FAQ item ── */
function FAQ({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid #F1F3F5' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '22px 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: 16 }}>
        <span style={{ fontSize: 'clamp(15px,1.4vw,18px)', fontWeight: 600, color: '#0F1F4B', lineHeight: 1.4 }}>{q}</span>
        <ChevronDown size={18} style={{ color: '#6B7280', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .25s' }} />
      </button>
      {open && <p style={{ fontSize: 'clamp(14px,1.2vw,16px)', color: '#6B7280', lineHeight: 1.75, margin: '0 0 22px', paddingRight: 32 }}>{a}</p>}
    </div>
  )
}

/* ── Login dropdown ── */
function LoginDropdown({ scrolled }: { scrolled: boolean }) {
  const [open, setOpen]         = useState(false)
  const [email, setEmail]       = useState('')
  const [pass, setPass]         = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password: pass })
    if (authErr) { setError('Email o contraseña incorrectos.'); setLoading(false); return }
    const { data: profile } = await supabase.from('users').select('role').eq('id', data.user.id).single()
    const role = profile?.role
    if (role === 'inquilino') router.push('/portal/inquilino')
    else if (role === 'propietario') router.push('/portal/propietario')
    else router.push('/dashboard')
    router.refresh()
  }

  const btnColor = scrolled ? '#0F1F4B' : 'rgba(255,255,255,0.85)'
  const btnBorder = scrolled ? 'rgba(15,31,75,0.15)' : 'rgba(255,255,255,0.2)'
  const btnHover = scrolled ? '#0F1F4B' : '#fff'

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, fontSize: 14, fontWeight: 600, color: btnColor, background: 'transparent', border: `1px solid ${btnBorder}`, cursor: 'pointer', transition: 'all .2s' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = btnHover; (e.currentTarget as HTMLElement).style.color = btnHover }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = btnBorder; (e.currentTarget as HTMLElement).style.color = btnColor }}
      >
        <LogIn size={14} />
        Iniciar sesión
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 320, background: '#fff', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.06)', overflow: 'hidden', zIndex: 200 }}>
          {/* Header */}
          <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #F1F3F5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#0F1F4B', margin: 0 }}>Acceder a mi cuenta</p>
              <p style={{ fontSize: 12, color: '#9CA3AF', margin: '2px 0 0' }}>Propietario · Inquilino · Equipo</p>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4, borderRadius: 6, display: 'flex' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F3F4F6')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
              <X size={16} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} style={{ padding: '16px 20px 20px' }}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Correo electrónico</label>
              <input
                type="email" required autoFocus
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 14, color: '#111827', outline: 'none', boxSizing: 'border-box', transition: 'border .2s' }}
                onFocus={e => (e.target.style.borderColor = '#0EA5E9')}
                onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
              />
            </div>
            <div style={{ marginBottom: 16, position: 'relative' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Contraseña</label>
              <input
                type={showPass ? 'text' : 'password'} required
                value={pass} onChange={e => setPass(e.target.value)}
                placeholder="••••••••"
                style={{ width: '100%', padding: '9px 36px 9px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 14, color: '#111827', outline: 'none', boxSizing: 'border-box', transition: 'border .2s' }}
                onFocus={e => (e.target.style.borderColor = '#0EA5E9')}
                onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
              />
              <button type="button" onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: 10, bottom: 9, background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 0, display: 'flex' }}>
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {error && (
              <p style={{ fontSize: 12, color: '#EF4444', marginBottom: 12, padding: '8px 12px', background: '#FEF2F2', borderRadius: 8, border: '1px solid #FECACA' }}>{error}</p>
            )}

            <button
              type="submit" disabled={loading}
              style={{ width: '100%', padding: '10px', borderRadius: 10, fontSize: 14, fontWeight: 700, color: '#fff', background: loading ? '#93C5FD' : '#0EA5E9', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background .2s' }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = '#0284C7' }}
              onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = '#0EA5E9' }}
            >
              {loading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Entrando…</> : <>Entrar <LogIn size={14} /></>}
            </button>
          </form>

          {/* Footer note */}
          <div style={{ padding: '0 20px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: '#D1D5DB', margin: 0 }}>El sistema detecta tu rol y te lleva a tu espacio automáticamente.</p>
          </div>
        </div>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════ */
export default function HomePage() {
  const [scrolled, setScrolled] = useState(false)
  useReveal()
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 48)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const F = "'Poppins',system-ui,sans-serif"
  const N = '#0F1F4B', B = '#0EA5E9'

  return (
    <div style={{ fontFamily: F, overflowX: 'hidden' }}>

      {/* ── NAV ── */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 64, background: scrolled ? 'rgba(255,255,255,0.97)' : 'transparent', backdropFilter: scrolled ? 'blur(20px)' : 'none', borderBottom: scrolled ? '1px solid #F1F3F5' : 'none', transition: 'all .3s' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.03em', color: scrolled ? N : '#fff' }}>
            Puntual<span style={{ color: B }}>Pago</span>
          </span>
          <div className="hidden md:flex" style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
            {[['Garantía', '#garantia'], ['Plataforma', '#plataforma'], ['Quiénes somos', '#nosotros'], ['FAQ', '#faq']].map(([l, h]) => (
              <a key={l} href={h} style={{ fontSize: 14, fontWeight: 500, color: scrolled ? '#4B5563' : 'rgba(255,255,255,0.8)', textDecoration: 'none', transition: 'color .2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = scrolled ? N : '#fff')}
                onMouseLeave={e => (e.currentTarget.style.color = scrolled ? '#4B5563' : 'rgba(255,255,255,0.8)')}>{l}</a>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <LoginDropdown scrolled={scrolled} />
            <a href={WA_LINK} target="_blank" rel="noopener noreferrer"
              style={{ padding: '9px 22px', borderRadius: 10, fontSize: 14, fontWeight: 700, color: '#fff', background: '#22C55E', textDecoration: 'none', boxShadow: '0 2px 12px rgba(34,197,94,0.35)', transition: 'opacity .2s', display: 'inline-flex', alignItems: 'center', gap: 7 }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                            Habla con nosotros
            </a>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Imagen de fondo con efecto Ken Burns — movimiento lento de drone */}
        <div className="hero-bg-kenburns" style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url('https://images.unsplash.com/photo-1472146936668-d987bf0a6e38?auto=format&fit=crop&w=1920&q=80')`,
          backgroundSize: '120%',
          backgroundPosition: 'center',
        }} />
        {/* Overlay gradiente oscuro */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.65) 50%, rgba(0,0,0,0.60) 100%)' }} />
        {/* Grid sutil */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(14,165,233,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(14,165,233,0.03) 1px,transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 860, margin: '0 auto', padding: 'clamp(90px,12vw,150px) 24px clamp(60px,8vw,100px)', textAlign: 'center', width: '100%' }}>

          <h1 className="hero-line-2" style={{ fontSize: 'clamp(1.7rem,4.5vw,3.8rem)', fontWeight: 900, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.04em', margin: '0 0 20px' }}>
            Cobra tu alquiler<br />aunque el inquilino{' '}
            <span style={{ background: 'linear-gradient(135deg,#0EA5E9,#38BDF8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>no pague.</span>
          </h1>

          <p className="hero-sub" style={{ fontSize: 'clamp(0.95rem,1.6vw,1.2rem)', color: 'rgba(200,215,240,0.65)', lineHeight: 1.75, margin: '0 auto 32px', maxWidth: 500 }}>
            PuntualPago administra tus propiedades y garantiza tu renta el primero de cada mes.
          </p>

          <div className="hero-cta" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 36 }}>
            <a href={WA_LINK} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '15px 32px', borderRadius: 12, fontSize: 15, fontWeight: 700, color: '#fff', background: '#22C55E', textDecoration: 'none', boxShadow: '0 4px 20px rgba(34,197,94,.4)', transition: 'all .2s' }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = '0 8px 28px rgba(34,197,94,.5)' }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'none'; el.style.boxShadow = '0 4px 20px rgba(34,197,94,.4)' }}>
              Comenzar ahora <ArrowRight size={16} />
            </a>
            <a href="#garantia" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '15px 28px', borderRadius: 12, fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.7)', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.12)', transition: 'all .2s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.28)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}>
              <Shield size={15} /> Ver la garantía
            </a>
          </div>

        </div>

      </section>

      {/* ── COUNTDOWN ── */}
      <Countdown />

      {/* ── PAIN POINTS ── */}
      <section style={{ background: '#060C1A', padding: 'clamp(64px,8vw,120px) 24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(239,68,68,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(239,68,68,0.02) 1px,transparent 1px)', backgroundSize: '48px 48px', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
          <div className="reveal" style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#F87171', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>El problema</p>
            <h2 style={{ fontSize: 'clamp(1.8rem,3.5vw,2.8rem)', fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', margin: '0 0 16px', lineHeight: 1.1 }}>
              ¿Te suena familiar?
            </h2>
            <p style={{ fontSize: 'clamp(15px,1.4vw,17px)', color: 'rgba(215,230,245,0.5)', margin: '0 auto', maxWidth: 520, lineHeight: 1.7 }}>
              Ser propietario no debería ser este trabajo de tiempo completo.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,280px),1fr))', gap: 16 }}>
            {[
              { icon: Clock,         title: 'Inquilinos que siempre pagan tarde',  desc: 'Cada mes el mismo ciclo: recordar, esperar, perseguir. El estrés de no saber si llegará el pago.' },
              { icon: Phone,         title: 'Comunicación imposible',              desc: 'No responden mensajes. Las llamadas quedan sin contestar. La incertidumbre es constante.' },
              { icon: AlertTriangle, title: 'Sin seguimiento formal',              desc: 'Sin contratos claros ni sistema de cobro, todo queda en conversaciones informales.' },
              { icon: TrendingUp,    title: 'Pérdida de ingresos reales',         desc: 'Los meses sin cobro afectan tu flujo de caja e inversión directamente.' },
              { icon: FileText,      title: 'Papeleos y burocracia',              desc: 'Contratos, renovaciones, recibos, reportes — gestionarlo todo manualmente consume semanas.' },
              { icon: Globe,         title: 'Imposible desde el extranjero',      desc: 'Si vives fuera de RD, administrar tu propiedad se convierte en un problema logístico enorme.' },
            ].map((p, i) => (
              <div key={p.title} className="reveal-scale" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '28px 24px', border: '1px solid rgba(239,68,68,0.1)', transitionDelay: `${(i % 3) * 0.07}s` }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <p.icon size={18} style={{ color: '#F87171' }} />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 10px' }}>{p.title}</h3>
                <p style={{ fontSize: 13, color: 'rgba(215,230,245,0.45)', lineHeight: 1.7, margin: 0 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOLUTION / GARANTÍA ── */}
      <section id="garantia" style={{ background: '#fff', padding: 'clamp(64px,8vw,120px) 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="reveal" style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: B, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>La solución</p>
            <h2 style={{ fontSize: 'clamp(1.8rem,3.5vw,2.8rem)', fontWeight: 900, color: N, letterSpacing: '-0.04em', margin: '0 0 16px', lineHeight: 1.1 }}>
              Todo lo que necesita un propietario,<br />en una sola plataforma.
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 20, marginBottom: 64 }}>
            {[
              { icon: Shield,    title: 'Cobro garantizado',        desc: 'Si el inquilino no paga, PuntualPago te deposita la renta ese mismo día. Sin excepciones.',   color: '#0EA5E9' },
              { icon: Users,     title: 'Evaluación de inquilinos', desc: 'Analizamos el perfil del candidato antes de firmar. Menos riesgo desde el primer día.',         color: '#8B5CF6' },
              { icon: Building2, title: 'Administración integral',  desc: 'Contratos, renovaciones, seguimiento de pagos y comunicación con el inquilino, todo incluido.',  color: '#059669' },
              { icon: BarChart3, title: 'Transparencia total',      desc: 'Panel en tiempo real con el estado de cada propiedad, pago y movimiento de tu cartera.',         color: '#F59E0B' },
            ].map((c, i) => (
              <div key={c.title} className="reveal-scale" style={{ background: '#FAFBFD', border: '1px solid #E8EBF0', borderRadius: 20, padding: '32px 28px', transitionDelay: `${i * 0.08}s`, transition: 'box-shadow .25s, transform .25s', cursor: 'default' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = '0 12px 32px rgba(0,0,0,0.08)'; el.style.transform = 'translateY(-3px)' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = 'none'; el.style.transform = 'none' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: `${c.color}12`, border: `1px solid ${c.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  <c.icon size={22} style={{ color: c.color }} />
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: N, margin: '0 0 12px', letterSpacing: '-0.01em' }}>{c.title}</h3>
                <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.7, margin: 0 }}>{c.desc}</p>
              </div>
            ))}
          </div>

          {/* Guarantee banner */}
          <div className="reveal landing-prop-grid" style={{ background: `linear-gradient(135deg, ${N} 0%, #1a3a7c 100%)`, borderRadius: 24, padding: 'clamp(32px,4vw,56px) clamp(24px,4vw,56px)', gap: 40, alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#38BDF8', letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 12px' }}>Garantía PuntualPago</p>
              <h3 style={{ fontSize: 'clamp(1.5rem,3vw,2.4rem)', fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', margin: '0 0 16px', lineHeight: 1.15 }}>
                El primero de cada mes,<br />tu renta en tu cuenta. Siempre.
              </h3>
              <p style={{ fontSize: 'clamp(14px,1.3vw,17px)', color: 'rgba(215,230,245,0.65)', lineHeight: 1.75, margin: '0 0 28px', maxWidth: 480 }}>
                No importa si el inquilino pagó o no: el día 1 PuntualPago deposita tu renta. Nosotros asumimos el riesgo de cobro y gestionamos todo el proceso de recuperación. Tú no haces nada.
              </p>
              <a href={WA_LINK} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, color: '#fff', background: '#22C55E', textDecoration: 'none', transition: 'opacity .2s' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '.85')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                Registra tu propiedad <ArrowRight size={14} />
              </a>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: '24px', border: '1px solid rgba(255,255,255,0.1)', minWidth: 220 }}>
              {[{ label: 'Día de pago al propietario', v: 'Día 1' }, { label: 'Cobertura mensual', v: '100%' }, { label: 'Gestión para el propietario', v: 'Cero' }].map((r, i) => (
                <div key={r.label} style={{ padding: '10px 0', borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
                  <div style={{ fontSize: 11, color: 'rgba(215,230,245,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{r.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>{r.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ── */}
      <section style={{ background: '#FAFBFD', padding: 'clamp(64px,8vw,120px) 24px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div className="reveal" style={{ textAlign: 'center', marginBottom: 72 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: B, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>Proceso</p>
            <h2 style={{ fontSize: 'clamp(1.8rem,3.5vw,2.8rem)', fontWeight: 900, color: N, letterSpacing: '-0.04em', margin: '0 0 16px', lineHeight: 1.1 }}>
              Tan simple como 4 pasos.
            </h2>
            <p style={{ fontSize: 'clamp(14px,1.3vw,17px)', color: '#6B7280', margin: 0, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.7 }}>
              Configuración completa en menos de 24 horas. Sin complicaciones.
            </p>
          </div>

          <div style={{ position: 'relative' }}>
            {/* Connector line */}
            <div className="hidden md:block" style={{ position: 'absolute', top: 28, left: 'calc(12.5% + 20px)', right: 'calc(12.5% + 20px)', height: 1, background: 'linear-gradient(90deg, #E8EBF0 0%, #0EA5E9 50%, #E8EBF0 100%)', zIndex: 0 }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 24, position: 'relative', zIndex: 1 }} className="landing-steps-grid-4">
              {[
                { n: '01', icon: Building2,   title: 'Registras tu propiedad', desc: 'En minutos cargamos los datos del inmueble, el propietario y el inquilino.' },
                { n: '02', icon: Users,        title: 'Evaluamos al inquilino',  desc: 'Análisis de perfil financiero antes de firmar para minimizar el riesgo.' },
                { n: '03', icon: FileText,     title: 'Administramos el contrato', desc: 'Gestionamos cobros, recordatorios, comunicación y seguimiento mensual.' },
                { n: '04', icon: TrendingUp,   title: 'Recibes tu pago el día 1', desc: 'El primero de cada mes PuntualPago deposita tu renta. Pagó o no el inquilino. Siempre.' },
              ].map((s, i) => (
                <div key={s.n} className="reveal-scale" style={{ textAlign: 'center', transitionDelay: `${i * 0.1}s` }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: i === 3 ? B : '#fff', border: `2px solid ${i === 3 ? B : '#E8EBF0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: i === 3 ? `0 0 0 8px rgba(14,165,233,0.1)` : 'none' }}>
                    <s.icon size={22} style={{ color: i === 3 ? '#fff' : B }} />
                  </div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: B, letterSpacing: '.08em', margin: '0 0 8px' }}>{s.n}</p>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: N, margin: '0 0 10px', lineHeight: 1.3 }}>{s.title}</h3>
                  <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PARA QUIÉN ── */}
      <section style={{ background: '#fff', padding: 'clamp(64px,8vw,120px) 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="reveal" style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: B, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>Para quién</p>
            <h2 style={{ fontSize: 'clamp(1.8rem,3.5vw,2.8rem)', fontWeight: 900, color: N, letterSpacing: '-0.04em', margin: 0, lineHeight: 1.1 }}>
              Diseñado para propietarios serios.
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 20 }}>
            {[
              { icon: Building2, title: 'Propietarios individuales', desc: 'Desde 1 hasta 20 propiedades. Automatiza tu cobro y vive tranquilo sin perseguir inquilinos.' },
              { icon: TrendingUp, title: 'Inversionistas inmobiliarios', desc: 'Gestiona cartera completa con reportes, métricas y liquidaciones automáticas mensuales.' },
              { icon: Globe, title: 'Dominicanos en el extranjero', desc: 'Tus propiedades en RD administradas profesionalmente aunque vivas en otro país.' },
              { icon: Star, title: 'Empresas y desarrolladoras', desc: 'Solución escalable para carteras grandes con equipos y necesidades corporativas.' },
            ].map((p, i) => (
              <div key={p.title} className="reveal-scale" style={{ padding: '32px 28px', borderRadius: 20, border: '1px solid #E8EBF0', background: '#FAFBFD', transitionDelay: `${i * 0.08}s`, transition: 'all .25s', cursor: 'default' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#fff'; el.style.borderColor = '#0EA5E9'; el.style.boxShadow = '0 8px 32px rgba(14,165,233,0.08)' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#FAFBFD'; el.style.borderColor = '#E8EBF0'; el.style.boxShadow = 'none' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(15,31,75,0.05)', border: '1px solid rgba(15,31,75,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  <p.icon size={20} style={{ color: N }} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: N, margin: '0 0 10px' }}>{p.title}</h3>
                <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.7, margin: 0 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLATAFORMA / TECH ── */}
      <section id="plataforma" style={{ background: `linear-gradient(160deg, #060C1A 0%, ${N} 100%)`, padding: 'clamp(64px,8vw,120px) 24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(14,165,233,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(14,165,233,0.03) 1px,transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div className="reveal" style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#38BDF8', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>Plataforma</p>
            <h2 style={{ fontSize: 'clamp(1.8rem,3.5vw,2.8rem)', fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', margin: '0 0 16px', lineHeight: 1.1 }}>
              Tecnología de nivel empresarial<br />para cualquier propietario.
            </h2>
            <p style={{ fontSize: 'clamp(14px,1.3vw,17px)', color: 'rgba(215,230,245,0.5)', margin: 0, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
              Panel en tiempo real, notificaciones automáticas y reportes ejecutivos en un solo lugar.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16 }}>
            {[
              { icon: BarChart3, title: 'Dashboard ejecutivo',       desc: 'Vista completa de tu cartera: pagos, mora, contratos y métricas en tiempo real.' },
              { icon: Bell,      title: 'Notificaciones automáticas', desc: 'Recordatorios D-5, D-1, D+1, D+3, D+7 sin que el propietario intervenga.' },
              { icon: FileText,  title: 'Contratos digitales',        desc: 'Generación automática de contratos, renovaciones y documentación legal.' },
              { icon: Shield,    title: 'Gestión legal integrada',    desc: 'Expediente legal automático a los 45 días de mora. Proceso claro y trazable.' },
              { icon: Globe,     title: 'Acceso desde cualquier lugar', desc: 'Propietarios e inquilinos con portal propio accesible desde cualquier dispositivo.' },
              { icon: Lock,      title: 'Información segura',         desc: 'Datos encriptados, backups automáticos y acceso controlado por roles.' },
            ].map((f, i) => (
              <div key={f.title} className="reveal-scale" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '24px 22px', transitionDelay: `${(i % 3) * 0.07}s`, transition: 'background .2s', cursor: 'default' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <f.icon size={18} style={{ color: '#38BDF8' }} />
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: 'rgba(215,230,245,0.45)', lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST ── */}
      <section style={{ background: '#fff', padding: 'clamp(64px,8vw,120px) 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="reveal" style={{ textAlign: 'center', marginBottom: 64 }}>
            <h2 style={{ fontSize: 'clamp(1.8rem,3.5vw,2.8rem)', fontWeight: 900, color: N, letterSpacing: '-0.04em', margin: '0 0 16px', lineHeight: 1.1 }}>
              Propietarios que ya cobran sin estrés.
            </h2>
          </div>

          {/* Testimonials */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20, marginBottom: 64 }}>
            {[
              { name: 'Carmen R.', role: 'Propietaria · 3 apartamentos', text: '"Antes pasaba semanas persiguiendo pagos. Ahora el sistema lo gestiona todo y el dinero llega el primer día del mes sin falta."', stars: 5 },
              { name: 'Roberto M.', role: 'Inversor desde Miami', text: '"Tengo 5 propiedades en Santo Domingo y vivo en EEUU. PuntualPago es la única forma en que puedo administrarlas sin volver cada mes."', stars: 5 },
              { name: 'Empresa Cuesta', role: 'Cartera corporativa · 18 unidades', text: '"Los reportes mensuales y la garantía de cobro nos permitieron escalar nuestra cartera con total confianza financiera."', stars: 5 },
            ].map((t, i) => (
              <div key={t.name} className="reveal-scale" style={{ background: '#FAFBFD', border: '1px solid #E8EBF0', borderRadius: 20, padding: '28px 24px', transitionDelay: `${i * 0.08}s` }}>
                <div style={{ display: 'flex', gap: 3, marginBottom: 16 }}>
                  {Array.from({ length: t.stars }).map((_, j) => <Star key={j} size={14} style={{ color: '#F59E0B', fill: '#F59E0B' }} />)}
                </div>
                <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.75, margin: '0 0 20px', fontStyle: 'italic' }}>{t.text}</p>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: N, margin: '0 0 2px' }}>{t.name}</p>
                  <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>{t.role}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── NOSOTROS ── */}
      <section id="nosotros" style={{ background: '#FAFBFD', padding: 'clamp(64px,8vw,120px) 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="landing-prop-grid" style={{ gap: 'clamp(40px,6vw,80px)' }}>
            <div className="reveal-left">
              <p style={{ fontSize: 12, fontWeight: 700, color: B, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 16 }}>Quiénes somos</p>
              <h2 style={{ fontSize: 'clamp(1.8rem,3.5vw,2.8rem)', fontWeight: 900, color: N, letterSpacing: '-0.04em', lineHeight: 1.15, margin: '0 0 20px' }}>
                Tecnología dominicana<br />para propietarios dominicanos.
              </h2>
              <p style={{ fontSize: 'clamp(14px,1.3vw,17px)', color: '#6B7280', lineHeight: 1.8, margin: '0 0 32px' }}>
                Nacimos de una frustración real: ver cómo propietarios en RD perdían dinero e inversión cada mes por falta de herramientas profesionales. Combinamos experiencia en finanzas, tecnología y administración inmobiliaria para crear la plataforma que queríamos usar.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {['Fundada por expertos en tecnología financiera', 'Enfoque 100% en el mercado dominicano', 'Soporte local y respuesta en horas, no días', 'Arquitectura segura y auditable'].map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, color: '#4B5563', fontWeight: 500 }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: `${B}15`, border: `1px solid ${B}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={11} style={{ color: B }} strokeWidth={3} />
                    </div>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="reveal-right">
              <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E8EBF0', overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.06)' }}>
                <div style={{ padding: '14px 20px', background: '#FAFBFD', borderBottom: '1px solid #E8EBF0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500 }}>Portal Propietario · PuntualPago</span>
                </div>
                <div style={{ padding: '24px 20px' }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', letterSpacing: '.08em', textTransform: 'uppercase', margin: '0 0 16px' }}>Mi cartera · Mayo 2026</p>
                  {[
                    { name: 'Apt. Piantini 3B', tenant: 'María García',   amount: 'RD$32,000', tag: 'Pagado día 1', color: '#059669', bg: '#ECFDF5' },
                    { name: 'Apt. Naco 7A',     tenant: 'Pedro Martínez', amount: 'RD$28,500', tag: 'Pagado día 1', color: '#059669', bg: '#ECFDF5' },
                    { name: 'Casa Bella Vista', tenant: 'Ana Rodríguez',  amount: 'RD$45,000', tag: 'Garantía PP',  color: '#0EA5E9', bg: '#EFF8FF' },
                  ].map((r, i) => (
                    <div key={r.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderBottom: i < 2 ? '1px solid #F3F4F6' : 'none' }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 0 3px' }}>{r.name}</p>
                        <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>{r.tenant}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 3px' }}>{r.amount}</p>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: r.bg, color: r.color }}>{r.tag}</span>
                      </div>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTop: '1px solid #F3F4F6' }}>
                    <div>
                      <span style={{ fontSize: 13, color: '#6B7280' }}>Depositado el día 1</span>
                      <p style={{ fontSize: 10, color: '#0EA5E9', margin: '2px 0 0', fontWeight: 600 }}>3 propiedades · 100% garantizado</p>
                    </div>
                    <span style={{ fontSize: 20, fontWeight: 900, color: '#111827', letterSpacing: '-0.03em' }}>RD$105,500</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" style={{ background: '#fff', padding: 'clamp(64px,8vw,120px) 24px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div className="reveal" style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: B, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>FAQ</p>
            <h2 style={{ fontSize: 'clamp(1.8rem,3.5vw,2.8rem)', fontWeight: 900, color: N, letterSpacing: '-0.04em', margin: 0 }}>
              Preguntas frecuentes.
            </h2>
          </div>

          <div className="reveal">
            {[
              { q: '¿Cómo funciona la garantía de cobro?', a: 'El primero de cada mes PuntualPago deposita la renta al propietario, sin importar si el inquilino pagó o no. Nosotros asumimos el riesgo de cobro y gestionamos el proceso de recuperación directamente con el inquilino. El propietario no tiene que hacer nada.' },
              { q: '¿Cuánto tiempo tarda en activarse?', a: 'En menos de 24 horas tu propiedad está activa en la plataforma. El proceso incluye verificación de datos, firma digital del contrato y activación de la garantía.' },
              { q: '¿Puedo administrar más de una propiedad?', a: 'Sí. La plataforma está diseñada para gestionar desde una propiedad individual hasta carteras corporativas. Tienes acceso a un panel centralizado con todas tus propiedades.' },
              { q: '¿Qué pasa si vivo fuera de República Dominicana?', a: 'Es precisamente para eso que existe PuntualPago. Puedes gestionar todo desde el extranjero: ver el estado en tiempo real, recibir pagos y comunicarte con el equipo sin necesidad de estar presente.' },
              { q: '¿Cómo se evalúa a los inquilinos?', a: 'Realizamos un análisis de perfil que incluye historial de referencias, capacidad financiera y otros indicadores relevantes. Esto reduce significativamente el riesgo de impago antes de firmar.' },
              { q: '¿Cuál es el costo del servicio?', a: 'PuntualPago cobra una comisión de gestión mensual sobre la renta administrada. Contacta nuestro equipo para obtener una propuesta personalizada según el tamaño de tu cartera.' },
            ].map(f => <FAQ key={f.q} q={f.q} a={f.a} />)}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section style={{ background: `linear-gradient(150deg, #060C1A 0%, ${N} 60%, #0A1628 100%)`, padding: 'clamp(80px,10vw,140px) 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(14,165,233,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(14,165,233,0.04) 1px,transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)', width: '60vw', height: '50vw', borderRadius: '50%', background: 'radial-gradient(circle,rgba(14,165,233,0.1) 0%,transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 680, margin: '0 auto' }}>
          <div className="reveal">
            <p style={{ fontSize: 12, fontWeight: 700, color: '#38BDF8', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 20 }}>Comienza hoy</p>
            <h2 style={{ fontSize: 'clamp(2.2rem,5vw,4rem)', fontWeight: 900, color: '#fff', letterSpacing: '-0.05em', lineHeight: 1.05, margin: '0 0 20px' }}>
              Cobra con tranquilidad.<br />Siempre.
            </h2>
            <p style={{ fontSize: 'clamp(15px,1.5vw,18px)', color: 'rgba(200,215,240,0.65)', margin: '0 0 44px', lineHeight: 1.75 }}>
              Activa tu cuenta, registra tu propiedad y recibe tu próximo pago garantizado.
            </p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 28 }}>
              <a href={WA_LINK} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '16px 36px', borderRadius: 14, fontSize: 16, fontWeight: 700, color: '#fff', background: '#22C55E', textDecoration: 'none', boxShadow: '0 4px 24px rgba(34,197,94,.45)', transition: 'all .2s' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = '0 8px 32px rgba(34,197,94,.55)' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'none'; el.style.boxShadow = '0 4px 24px rgba(34,197,94,.45)' }}>
                Escríbenos hoy <ArrowRight size={18} />
              </a>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(215,230,245,0.3)', fontWeight: 400 }}>
              Sin compromiso · Sin letra pequeña · Activación en 24 horas
            </p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#07090F', padding: 'clamp(48px,6vw,72px) 24px 36px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr repeat(3,1fr)', gap: 48, marginBottom: 48 }} className="landing-footer-grid">
            <div>
              <p style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 12px', letterSpacing: '-0.02em' }}>
                Puntual<span style={{ color: B }}>Pago</span>
              </p>
              <p style={{ fontSize: 13, color: '#4B5563', lineHeight: 1.8, margin: '0 0 20px', maxWidth: 260 }}>
                Plataforma de administración y protección de alquileres para la República Dominicana.
              </p>
              <a href="https://www.instagram.com/puntualpago/" target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 8, background: '#111827', border: '1px solid #1F2937', color: '#6B7280', textDecoration: 'none', fontSize: 12, fontWeight: 500, transition: 'all .2s' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#fff'; el.style.borderColor = '#374151' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#6B7280'; el.style.borderColor = '#1F2937' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                @puntualpago
              </a>
            </div>
            {[
              { title: 'Plataforma', links: [{ l: 'Garantía PP', h: '#garantia' }, { l: 'Cómo funciona', h: '#garantia' }, { l: 'Para propietarios', h: '#nosotros' }, { l: 'Plataforma', h: '#plataforma' }] },
              { title: 'Empresa',   links: [{ l: 'Quiénes somos', h: '#nosotros' }, { l: 'Contactar', h: WA_LINK }, { l: 'FAQ', h: '#faq' }] },
              { title: 'Acceso',    links: [{ l: 'Portal propietario', h: '/portal/propietario' }, { l: 'Portal inquilino', h: '/portal/inquilino' }, { l: 'Administración', h: '/login' }] },
            ].map(col => (
              <div key={col.title}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#374151', margin: '0 0 16px' }}>{col.title}</p>
                {col.links.map(({ l, h }) => (
                  <p key={l} style={{ margin: '0 0 10px' }}>
                    <a href={h} style={{ fontSize: 13, color: '#6B7280', textDecoration: 'none', transition: 'color .2s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#6B7280')}>{l}</a>
                  </p>
                ))}
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <p style={{ fontSize: 12, color: '#374151', margin: 0 }}>© {new Date().getFullYear()} PuntualPago. Todos los derechos reservados. República Dominicana.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Link href="/login" style={{ fontSize: 11, color: 'rgba(55,65,81,0.5)', textDecoration: 'none', transition: 'color .2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#6B7280')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(55,65,81,0.5)')}>
                Acceso administración
              </Link>
              <span style={{ color: 'rgba(55,65,81,0.2)', fontSize: 11 }}>·</span>
              <Link href="/portal/propietario" style={{ fontSize: 11, color: 'rgba(55,65,81,0.5)', textDecoration: 'none', transition: 'color .2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#6B7280')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(55,65,81,0.5)')}>
                Portal propietario
              </Link>
              <span style={{ color: 'rgba(55,65,81,0.2)', fontSize: 11 }}>·</span>
              <Link href="/portal/inquilino" style={{ fontSize: 11, color: 'rgba(55,65,81,0.5)', textDecoration: 'none', transition: 'color .2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#6B7280')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(55,65,81,0.5)')}>
                Portal inquilino
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
