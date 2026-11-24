import { useState, type ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Table2, ChartColumn } from 'lucide-react'
import { Card } from '@/components/ui/primitives'

// Categorical slots (validated reference palette), assigned in fixed order.
export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100']
export const NAVY = '#1e3a5f'
const AXIS = { fontSize: 11, fill: '#64748b' }
const GRID = '#eef2f6'

type Row = Record<string, string | number>
export interface SeriesDef { key: string; label: string; color?: string }

function TooltipBox({ active, payload, label, unit }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string; unit?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-border rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-text-primary mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} className="flex items-center gap-2 text-text-secondary">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: p.color }} />{p.name}: <span className="font-semibold text-text-primary tabular-nums">{p.value}{unit}</span>
        </p>
      ))}
    </div>
  )
}

export function ChartCard({ title, rows, series, xKey, children, empty }: { title: string; rows: Row[]; series: SeriesDef[]; xKey: string; children: ReactNode; empty?: boolean }) {
  const [table, setTable] = useState(false)
  return (
    <Card title={title} bodyClassName="p-4" actions={
      <button className="btn-ghost btn-sm" onClick={() => setTable(t => !t)} aria-pressed={table}>{table ? <><ChartColumn className="w-3.5 h-3.5" />Chart</> : <><Table2 className="w-3.5 h-3.5" />Table</>}</button>
    }>
      {empty ? <p className="h-[240px] flex items-center justify-center text-sm text-text-secondary">No data for the current filters.</p> : table ? (
        <div className="max-h-[260px] overflow-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-text-secondary border-b border-border"><th className="py-1.5 pr-2">{xKey === 'name' ? 'Category' : xKey}</th>{series.map(s => <th key={s.key} className="py-1.5 pr-2 text-right">{s.label}</th>)}</tr></thead>
            <tbody>{rows.map((r, i) => <tr key={i} className="border-b border-border/60"><td className="py-1.5 pr-2">{r[xKey]}</td>{series.map(s => <td key={s.key} className="py-1.5 pr-2 text-right tabular-nums">{r[s.key]}</td>)}</tr>)}</tbody>
          </table>
        </div>
      ) : <div className="h-[260px]">{children}</div>}
    </Card>
  )
}

export function VBar({ title, rows, series, xKey = 'name', unit = '' }: { title: string; rows: Row[]; series: SeriesDef[]; xKey?: string; unit?: string }) {
  return (
    <ChartCard title={title} rows={rows} series={series} xKey={xKey} empty={!rows.length}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barGap={2}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey={xKey} tick={AXIS} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} interval={0} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip content={<TooltipBox unit={unit} />} cursor={{ fill: 'rgba(30,58,95,0.06)' }} />
          {series.length > 1 && <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12 }} />}
          {series.map((s, i) => <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color ?? (series.length === 1 ? NAVY : SERIES[i])} radius={[4, 4, 0, 0]} maxBarSize={32} stroke="#fff" strokeWidth={series.length > 1 ? 1 : 0} />)}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function HBar({ title, rows, series, xKey = 'name', unit = '' }: { title: string; rows: Row[]; series: SeriesDef[]; xKey?: string; unit?: string }) {
  return (
    <ChartCard title={title} rows={rows} series={series} xKey={xKey} empty={!rows.length}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke={GRID} />
          <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
          <YAxis type="category" dataKey={xKey} tick={AXIS} tickLine={false} axisLine={false} width={130} />
          <Tooltip content={<TooltipBox unit={unit} />} cursor={{ fill: 'rgba(30,58,95,0.06)' }} />
          {series.length > 1 && <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12 }} />}
          {series.map((s, i) => <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color ?? (series.length === 1 ? NAVY : SERIES[i])} radius={[0, 4, 4, 0]} maxBarSize={18} stackId={series.length > 1 ? 'a' : undefined} stroke="#fff" strokeWidth={series.length > 1 ? 1 : 0} />)}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function TrendLine({ title, rows, series, xKey = 'name', unit = '' }: { title: string; rows: Row[]; series: SeriesDef[]; xKey?: string; unit?: string }) {
  return (
    <ChartCard title={title} rows={rows} series={series} xKey={xKey} empty={!rows.length}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey={xKey} tick={AXIS} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip content={<TooltipBox unit={unit} />} cursor={{ stroke: '#94a3b8', strokeDasharray: '3 3' }} />
          {series.length > 1 && <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />}
          {series.map((s, i) => <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color ?? (series.length === 1 ? NAVY : SERIES[i])} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 5 }} />)}
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
