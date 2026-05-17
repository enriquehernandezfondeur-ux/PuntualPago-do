'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts'
import { formatCurrency } from '@/lib/utils/format'

// ─── Monthly Collection Bar Chart ───────────────────────────────────────────
interface MonthlyData { mes: string; cobrado: number; pendiente: number; mora: number }

export function MonthlyCollectionChart({ data }: { data: MonthlyData[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} barSize={18} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
        />
        <Tooltip
          contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 12, color: '#f1f5f9', fontSize: 12 }}
          formatter={(value: number, name: string) => [formatCurrency(value), name]}
          cursor={{ fill: '#f1f5f9', opacity: 0.5 }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
        />
        <Bar dataKey="cobrado"   name="Cobrado"   fill="#2563eb" radius={[4, 4, 0, 0]} />
        <Bar dataKey="pendiente" name="Pendiente" fill="#f59e0b" radius={[4, 4, 0, 0]} />
        <Bar dataKey="mora"      name="En mora"   fill="#ef4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Payment Status Donut Chart ──────────────────────────────────────────────
interface StatusData { name: string; value: number; color: string }

const RADIAN = Math.PI / 180
function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, value, name }: any) {
  if (value === 0) return null
  const r = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {value}
    </text>
  )
}

export function PaymentStatusDonut({ data }: { data: StatusData[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width={160} height={160}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={72}
            paddingAngle={2}
            dataKey="value"
            labelLine={false}
            label={CustomLabel}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 10, color: '#f1f5f9', fontSize: 12 }}
            formatter={(value: number, name: string) => [`${value} pagos`, name]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex-1 space-y-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
              <span className="text-slate-600 text-xs">{d.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-800 text-xs font-semibold">{d.value}</span>
              <span className="text-slate-400 text-xs">{total > 0 ? Math.round(d.value / total * 100) : 0}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Property Status Donut ───────────────────────────────────────────────────
export function PropertyStatusChart({ data }: { data: StatusData[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width={160} height={160}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={72}
            paddingAngle={2}
            dataKey="value"
            labelLine={false}
            label={CustomLabel}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 10, color: '#f1f5f9', fontSize: 12 }}
            formatter={(value: number, name: string) => [`${value} propiedades`, name]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex-1 space-y-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
              <span className="text-slate-600 text-xs">{d.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-800 text-xs font-semibold">{d.value}</span>
              <span className="text-slate-400 text-xs">{total > 0 ? Math.round(d.value / total * 100) : 0}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Area Chart for Cobros trend ─────────────────────────────────────────────
export function CollectionAreaChart({ data }: { data: MonthlyData[] }) {
  return (
    <ResponsiveContainer width="100%" height={120}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="cobradoGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis hide />
        <Tooltip
          contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 10, color: '#f1f5f9', fontSize: 12 }}
          formatter={(v: number) => [formatCurrency(v), 'Cobrado']}
        />
        <Area type="monotone" dataKey="cobrado" stroke="#2563eb" strokeWidth={2} fill="url(#cobradoGrad)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
