import { TileLabel } from '../shared/TilePrimitives'

interface PRBreakdownProps {
  merged: number
  open: number
  closed: number
}

interface BarRowProps {
  label: string
  value: number
  total: number
  color: string
}

function BarRow({ label, value, total, color }: BarRowProps) {
  const pct = total > 0 ? (value / total) * 100 : 0
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono text-zinc-500 w-10 shrink-0">{label}</span>
      <div className="flex-1 h-1 bg-zinc-800 rounded-full">
        <div
          className="h-1 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-[10px] font-mono text-zinc-400 w-5 text-right shrink-0">{value}</span>
    </div>
  )
}

export function PRBreakdown({ merged, open, closed }: PRBreakdownProps) {
  const total = merged + open + closed
  const mergeRate = total > 0 ? Math.round((merged / total) * 100) : 0

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex items-baseline justify-between">
        <TileLabel>PR Status</TileLabel>
        <span className="text-[10px] font-mono text-zinc-500">{mergeRate}% merge rate</span>
      </div>
      <div className="flex flex-col gap-3 flex-1 justify-center">
        <BarRow label="Merged" value={merged} total={total} color="#22c55e" />
        <BarRow label="Open"   value={open}   total={total} color="#3b82f6" />
        <BarRow label="Closed" value={closed} total={total} color="#71717a" />
      </div>
      <div className="flex justify-between pt-1 border-t border-zinc-800">
        <span className="text-[10px] font-mono text-zinc-600">total</span>
        <span className="text-[10px] font-mono text-zinc-400">{total} PRs</span>
      </div>
    </div>
  )
}