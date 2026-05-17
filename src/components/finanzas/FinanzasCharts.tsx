'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from 'recharts'
import { formatCurrency } from '@/lib/utils/format'

interface MonthlyData {
  mes: string
  cobrado: number
  comisiones: number
  neto: number
}

export function CashFlowChart({ data }: { data: MonthlyData[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barSize={20} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle,#f1f5f9)" vertical={false} />
        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'var(--text-tertiary,#94a3b8)' }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--text-tertiary,#94a3b8)' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
        />
        <Tooltip
          contentStyle={{ background: 'var(--surface-raised,#fff)', border: '1px solid var(--border,#E4E7EC)', borderRadius: 12, color: 'var(--text,#101828)', fontSize: 12 }}
          formatter={(value: number, name: string) => [formatCurrency(value), name]}
          cursor={{ fill: 'var(--surface-subtle,#F9FAFB)', opacity: 0.6 }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
        <Bar dataKey="cobrado"    name="Renta cobrada"    fill="#1570EF" radius={[4,4,0,0]} />
        <Bar dataKey="comisiones" name="Comisiones PP"    fill="#7C3AED" radius={[4,4,0,0]} />
        <Bar dataKey="neto"       name="Neto propietarios" fill="#059669" radius={[4,4,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

interface CollectionRateData {
  name: string
  value: number
  color: string
}

export function CollectionRateBar({ data }: { data: CollectionRateData[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={i} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-600 font-medium">{d.name}</span>
            <span className="text-slate-800 font-bold">{formatCurrency(d.value)}</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: total > 0 ? `${(d.value / total) * 100}%` : '0%', background: d.color }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
