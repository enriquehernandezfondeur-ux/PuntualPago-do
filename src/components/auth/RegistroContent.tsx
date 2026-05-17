'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export function RegistroContent() {
  const router  = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    company_name: '',
    full_name:    '',
    email:        '',
    password:     '',
    phone:        '',
    city:         '',
  })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  function set(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validaciones cliente
    if (form.password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); setLoading(false); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError('El correo electrónico no es válido.'); setLoading(false); return }
    if (form.company_name.trim().length < 2) { setError('El nombre de la empresa debe tener al menos 2 caracteres.'); setLoading(false); return }

    try {
      // 1. Crear usuario en Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email:    form.email,
        password: form.password,
        options: {
          data: { full_name: form.full_name },
        },
      })

      if (signUpError || !authData.user) {
        const msg = signUpError?.message ?? ''
        if (msg.includes('already registered') || msg.includes('already exists')) {
          setError('Este correo ya está registrado. ¿Quieres iniciar sesión?')
        } else if (msg.includes('password')) {
          setError('La contraseña no cumple los requisitos mínimos de seguridad.')
        } else {
          setError('Error al crear la cuenta. Verifica tus datos e intenta de nuevo.')
        }
        return
      }

      const userId = authData.user.id

      // 2. Insertar en organizations
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name:       form.company_name,
          city:       form.city,
          created_by: userId,
        })
        .select('id')
        .single()

      if (orgError) {
        setError('Cuenta creada pero hubo un error al registrar la organización. Contacta soporte.')
        setLoading(false)
        return
      }

      // 3. Insertar en users con rol admin
      const { error: userError } = await supabase.from('users').insert({
        id:              userId,
        email:           form.email,
        full_name:       form.full_name,
        role:            'admin',
        phone:           form.phone || null,
        is_active:       true,
        organization_id: org.id,
      })

      if (userError) {
        setError('Error al configurar tu perfil. Intenta iniciar sesión en unos momentos.')
        setLoading(false)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Ocurrió un error inesperado. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const inputCls =
    'w-full bg-slate-900/80 border border-slate-600 text-white placeholder-slate-500 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Nombre de la empresa */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          Nombre de la empresa <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={form.company_name}
          onChange={set('company_name')}
          required
          className={inputCls}
          placeholder="Ej. Administradora del Norte"
        />
      </div>

      {/* Nombre del administrador */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          Nombre del administrador <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={form.full_name}
          onChange={set('full_name')}
          required
          className={inputCls}
          placeholder="Nombre completo"
        />
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          Correo electrónico <span className="text-red-400">*</span>
        </label>
        <input
          type="email"
          value={form.email}
          onChange={set('email')}
          required
          className={inputCls}
          placeholder="admin@empresa.com"
        />
      </div>

      {/* Contraseña */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          Contraseña <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <input
            type={showPass ? 'text' : 'password'}
            value={form.password}
            onChange={set('password')}
            required
            minLength={8}
            className={`${inputCls} pr-10`}
            placeholder="Mínimo 8 caracteres"
          />
          <button
            type="button"
            onClick={() => setShowPass(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
          >
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Teléfono + Ciudad */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Teléfono</label>
          <input
            type="tel"
            value={form.phone}
            onChange={set('phone')}
            className={inputCls}
            placeholder="809-000-0000"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Ciudad</label>
          <input
            type="text"
            value={form.city}
            onChange={set('city')}
            className={inputCls}
            placeholder="Santo Domingo"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3.5 py-2.5">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors flex items-center justify-center gap-2"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? 'Creando cuenta...' : 'Crear cuenta'}
      </button>

      <p className="text-center text-sm text-slate-400">
        ¿Ya tienes cuenta?{' '}
        <a href="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
          Inicia sesión
        </a>
      </p>
    </form>
  )
}
