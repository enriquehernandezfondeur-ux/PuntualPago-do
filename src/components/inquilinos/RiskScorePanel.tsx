'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import type { RiskScore } from '@/types/database'
import { Shield, RefreshCw, Loader2, TrendingDown, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react'

interface Props {
  scores: (RiskScore & { tenant?: { full_name: string; pending_balance: number } })[]
  tenantCount: number
}

type FilterLevel = 'todos' | 'bajo' | 'medio' | 'alto' | 'critico'

const LEVEL_CONFIG = {
  bajo:    { label: 'Bajo',     color: 'text-emerald-700', bg: 'bg-emerald-100', dot: 'bg-emerald-500', icon: CheckCircle2 },
  medio:   { label: 'Medio',    color: 'text-amber-700',   bg: 'bg-amber-100',   dot: 'bg-amber-500',   icon: AlertCircle },
  alto:    { label: 'Alto',     color: 'text-red-600',     bg: 'bg-red-100',     dot: 'bg-red-500',     icon: AlertTriangle },
  critico: { label: 'Crítico',  color: 'text-red-800',     bg: 'bg-red-200',     dot: 'bg-red-700',     icon: TrendingDown },
}

export function RiskScorePanel({ scores, tenantCount }: Props) {
  const [filter, setFilter] = useState<FilterLevel>('todos')
  const [calculating, setCalculating] = useState(false)
  const [calcResult, setCalcResult] = useState<string | null>(null)

  const criticalCount = scores.filter(s => s.level === 'critico').length
  const highCount     = scores.filter(s => s.level === 'alto').length
  const mediumCount   = scores.filter(s => s.level === 'medio').length
  const lowCount      = scores.filter(s => s.level === 'bajo').length
  const noScoreCount  = tenantCount - scores.length

  const filtered = filter === 'todos' ? scores : scores.filter(s => s.level === filter)

  async function recalculate() {
    setCalculating(true)
    setCalcResult(null)
    try {
      const res = await fetch('/api/risk/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (res.ok) {
        setCalcResult(`Listo: ${data.calculated} inquilinos recalculados. Recarga para ver los cambios.`)
      } else {
        setCalcResult(`Error: ${data.error}`)
      }
    } catch {
      setCalcResult('Error al conectar con el servidor')
    } finally {
      setCalculating(false)
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-slate-500" />
          <h3 className="font-semibold text-slate-800 text-sm">Análisis de Riesgo</h3>
          {(criticalCount > 0 || highCount > 0) && (
            <span className="text-xs bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded-full">
              {criticalCount + highCount} crítico{criticalCount + highCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button
          onClick={recalculate}
          disabled={calculating}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
        >
          {calculating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Recalcular
        </button>
      </div>

      {calcResult && (
        <div className={cn('px-5 py-2 text-xs border-b', calcResult.startsWith('Listo') ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100')}>
          {calcResult}
        </div>
      )}

      {/* Summary strip */}
      <div className="grid grid-cols-4 divide-x divide-slate-100 border-b border-slate-100">
        {(['critico','alto','medio','bajo'] as const).map(level => {
          const c     = LEVEL_CONFIG[level]
          const count = level === 'critico' ? criticalCount : level === 'alto' ? highCount : level === 'medio' ? mediumCount : lowCount
          return (
            <button
              key={level}
              onClick={() => setFilter(filter === level ? 'todos' : level)}
              className={cn('px-4 py-3 text-center transition hover:bg-slate-50', filter === level && 'bg-slate-50')}
            >
              <p className={cn('font-bold text-xl', c.color)}>{count}</p>
              <p className="text-slate-500 text-xs mt-0.5">{c.label}</p>
            </button>
          )
        })}
      </div>

      {/* Scores list */}
      {scores.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-slate-500 text-sm">Sin scores calculados.</p>
          <button onClick={recalculate} className="mt-2 text-blue-600 text-sm hover:underline">Calcular ahora</button>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
          {filtered.map(score => {
            const c   = LEVEL_CONFIG[score.level as keyof typeof LEVEL_CONFIG] ?? LEVEL_CONFIG.bajo
            const Icon = c.icon
            return (
              <div key={score.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-slate-50 transition">
                {/* Score ring */}
                <div className={cn('w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border-2', c.bg, c.color, 'border-current')}>
                  {score.score}
                </div>

                {/* Name + action */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">
                    {score.tenant?.full_name ?? score.entity_id.slice(0, 8) + '…'}
                  </p>
                  {score.recommended_action && (
                    <p className="text-slate-500 text-xs truncate">{score.recommended_action}</p>
                  )}
                </div>

                {/* Score breakdown mini */}
                <div className="hidden sm:flex items-center gap-2 shrink-0">
                  <ScorePip label="Historial" value={score.payment_history_score} max={30} />
                  <ScorePip label="Mora"      value={score.days_overdue_score}    max={25} />
                  <ScorePip label="Recur."    value={score.recurrence_score}      max={20} />
                </div>

                {/* Badge */}
                <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full shrink-0', c.bg, c.color)}>
                  {c.label}
                </span>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="py-8 text-center text-slate-400 text-sm">
              Sin inquilinos con riesgo {LEVEL_CONFIG[filter as keyof typeof LEVEL_CONFIG]?.label.toLowerCase()}
            </div>
          )}
        </div>
      )}

      {noScoreCount > 0 && (
        <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 text-center">
          {noScoreCount} inquilino{noScoreCount !== 1 ? 's' : ''} sin score calculado · <button onClick={recalculate} className="text-blue-600 hover:underline">Calcular</button>
        </div>
      )}
    </div>
  )
}

function ScorePip({ label, value, max }: { label: string; value: number; max: number }) {
  const pct  = Math.round((value / max) * 100)
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="text-center w-12">
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-slate-400 text-[10px] mt-0.5">{label}</p>
    </div>
  )
}
