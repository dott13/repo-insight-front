import { TileLabel } from '../shared/TilePrimitives'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'

interface ChurnWeek {
  week: string
  additions: number
  deletions: number  // pass as positive; component negates for display
}

interface ChurnChartProps {
  data: ChurnWeek[]
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const additions = payload.find((p: any) => p.dataKey === 'additions')?.value ?? 0
  const deletions = payload.find((p: any) => p.dataKey === 'deletionsNeg')?.value ?? 0
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-xs font-mono space-y-0.5">
      <p className="text-zinc-400 mb-1">{label}</p>
      <p className="text-green-400">+{additions} additions</p>
      <p className="text-red-400">{Math.abs(deletions)} deletions</p>
    </div>
  )
}

export function ChurnChart({ data }: ChurnChartProps) {
  const chartData = data.map(d => ({
    ...d,
    deletionsNeg: -Math.abs(d.deletions),
  }))

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex items-center justify-between">
        <TileLabel>Code Churn</TileLabel>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[10px] font-mono text-zinc-500">
            <span className="w-2 h-2 rounded-sm bg-green-500/70 inline-block" />
            additions
          </span>
          <span className="flex items-center gap-1 text-[10px] font-mono text-zinc-500">
            <span className="w-2 h-2 rounded-sm bg-red-500/70 inline-block" />
            deletions
          </span>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <XAxis
              dataKey="week"
              tick={{ fill: '#52525b', fontSize: 9, fontFamily: 'monospace' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#52525b', fontSize: 9, fontFamily: 'monospace' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => (v > 0 ? `+${v}` : String(v))}
            />
            <ReferenceLine y={0} stroke="#3f3f46" />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#27272a' }} />
            <Bar dataKey="additions"   fill="#22c55e" fillOpacity={0.7} radius={[2, 2, 0, 0]} maxBarSize={14} />
            <Bar dataKey="deletionsNeg" fill="#ef4444" fillOpacity={0.7} radius={[0, 0, 2, 2]} maxBarSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}