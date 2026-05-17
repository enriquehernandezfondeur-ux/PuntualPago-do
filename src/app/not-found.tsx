import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg,#060C1A 0%,#0A1628 60%,#0F1F4B 100%)' }}>
      {/* Grid */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(rgba(14,165,233,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(14,165,233,0.03) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />

      <div className="relative text-center max-w-md">
        <p className="text-2xl font-bold text-white mb-10 tracking-tight">
          Puntual<span style={{ color: '#0EA5E9' }}>Pago</span>
        </p>

        <p className="font-black text-white select-none"
          style={{ fontSize: 'clamp(6rem,18vw,10rem)', lineHeight: 0.9, letterSpacing: '-0.05em', opacity: 0.08, marginBottom: '-1rem' }}>
          404
        </p>

        <h1 className="text-2xl font-bold text-white mb-3">Página no encontrada</h1>
        <p className="text-sm mb-8" style={{ color: 'rgba(200,215,240,0.55)', lineHeight: 1.75 }}>
          La página que buscas no existe o fue movida.<br />
          Si crees que es un error, contáctanos.
        </p>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition"
            style={{ background: '#0EA5E9', boxShadow: '0 4px 20px rgba(14,165,233,0.4)' }}
          >
            Ir al inicio
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition"
            style={{ color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  )
}
