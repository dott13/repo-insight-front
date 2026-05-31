import { formatWeekLabel } from '@/hooks/useDashboardService'
import { TileLabel } from '../shared/TilePrimitives'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export interface WeeklyCommit {
  week: string
  commits: number
}

interface ChartItem {
  week: string
  commits?: number
  repoA?: number
  repoB?: number
}

interface CommitActivityChartProps {
  data: WeeklyCommit[]
  compareData?: WeeklyCommit[]
  hideLabel?: boolean
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-xs font-mono space-y-0.5">
      <p className="text-zinc-400 mb-1">{formatWeekLabel(label)}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name || p.dataKey}: {p.value} commits
        </p>
      ))}
    </div>
  )
}

export function CommitActivityChart({ data, compareData, hideLabel }: CommitActivityChartProps) {
  const chartData: ChartItem[] = compareData
    ? (() => {
        const mapA = new Map(data.map(d => [d.week, d.commits]))
        const mapB = new Map(compareData.map(d => [d.week, d.commits]))
        const allWeeks = Array.from(new Set([...mapA.keys(), ...mapB.keys()])).sort(
          (a, b) => new Date(a).getTime() - new Date(b).getTime()
        )

        return allWeeks.map(week => ({
          week,
          repoA: mapA.get(week) ?? 0,
          repoB: mapB.get(week) ?? 0,
        }))
      })()
    : data

  return (
    <div className="flex flex-col h-full gap-2">
      {!hideLabel && <TileLabel>Commit Activity</TileLabel>}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <XAxis
              dataKey="week"
              tick={{ fill: '#52525b', fontSize: 9, fontFamily: 'monospace' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              tickFormatter={formatWeekLabel}
            />
            <YAxis
              tick={{ fill: '#52525b', fontSize: 9, fontFamily: 'monospace' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#27272a' }} />
            
            {compareData ? (
              <>
                <Bar dataKey="repoA" name="Repo A" fill="#3b82f6" fillOpacity={0.7} radius={[2, 2, 0, 0]} maxBarSize={12} />
                <Bar dataKey="repoB" name="Repo B" fill="#f59e0b" fillOpacity={0.7} radius={[2, 2, 0, 0]} maxBarSize={12} />
              </>
            ) : (
              <Bar dataKey="commits" name="Commits" fill="#3b82f6" fillOpacity={0.7} radius={[2, 2, 0, 0]} maxBarSize={16} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}