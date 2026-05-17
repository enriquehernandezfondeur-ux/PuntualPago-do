'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <div className="text-center space-y-5 max-w-sm">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto" style={{ background: '#FEF3F2', border: '1px solid #FECDCA' }}>
          <AlertTriangle className="w-6 h-6" style={{ color: '#F04438' }} />
        </div>
        <div className="space-y-2">
          <h1 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Ocurrió un error</h1>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            Algo salió mal al cargar esta página.
          </p>
          {error.digest && <p className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>Código: {error.digest}</p>}
        </div>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#1570EF' }}>
            <RefreshCw className="w-4 h-4" /> Reintentar
          </button>
          <Link href="/" className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium border" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
