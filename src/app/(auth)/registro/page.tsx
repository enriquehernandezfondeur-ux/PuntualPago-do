import { RegistroContent } from '@/components/auth/RegistroContent'

export const metadata = { title: 'Registro — PuntualPago' }

export default function RegistroPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      {/* Background grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }} />

      <div className="relative w-full max-w-md">
        {/* Nombre */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white tracking-tight mb-1">PuntualPago</h1>
          <p className="text-slate-400 text-sm">Alquiler Garantizado · Sistema Interno</p>
        </div>

        {/* Card */}
        <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-1">Registrar nueva administradora</h2>
          <p className="text-slate-400 text-sm mb-6">Crea tu cuenta para comenzar a usar PuntualPago</p>

          <RegistroContent />
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          Sistema interno · Acceso no autorizado prohibido
        </p>
      </div>
    </div>
  )
}
