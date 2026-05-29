import { TileLabel } from '../shared/TilePrimitives'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface WeeklyCommit {
  week: string  // e.g. "W1", "Mar 3", ISO string — whatever you pass
  commits: number
}

interface CommitActivityChartProps {
  data: WeeklyCommit[]
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-xs font-mono">
      <p className="text-zinc-400">{label}</p>
      <p className="text-zinc-100 font-bold">{payload[0].value} commits</p>
    </div>
  )
}

export function CommitActivityChart({ data }: CommitActivityChartProps) {
  return (
    <div className="flex flex-col h-full gap-2">
      <TileLabel>Commit Activity</TileLabel>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
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
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#27272a' }} />
            <Bar
              dataKey="commits"
              fill="#3b82f6"
              fillOpacity={0.7}
              radius={[2, 2, 0, 0]}
              maxBarSize={16}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}