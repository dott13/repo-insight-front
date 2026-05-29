import { TileLabel } from '../shared/TilePrimitives'
import { cn } from '@/lib/utils'

type RiskLevel = 'critical' | 'high' | 'medium' | 'low'

interface BusFactorGaugeProps {
  busFactor: number
  riskLevel: RiskLevel
  totalContributors: number
}

const riskConfig: Record<RiskLevel, { color: string; stroke: string; label: string }> = {
  critical: { color: 'text-red-400',    stroke: '#ef4444', label: 'CRITICAL' },
  high:     { color: 'text-amber-400',  stroke: '#f59e0b', label: 'HIGH RISK' },
  medium:   { color: 'text-yellow-400', stroke: '#eab308', label: 'MEDIUM' },
  low:      { color: 'text-green-400',  stroke: '#22c55e', label: 'LOW RISK' },
}

// Draws a partial arc. busFactor 1 = ~25% filled, 2 = ~50%, 3 = ~75%, 4+ = full
function arcDashArray(busFactor: number): string {
  const circumference = 2 * Math.PI * 38  // r=38
  const fill = Math.min(busFactor / 5, 1)
  const filled = circumference * fill
  return `${filled} ${circumference}`
}

export function BusFactorGauge({ busFactor, riskLevel, totalContributors }: BusFactorGaugeProps) {
  const { color, stroke, label } = riskConfig[riskLevel]

  return (
    <div className="flex flex-col h-full gap-2">
      <TileLabel>Bus Factor</TileLabel>
      <div className="flex-1 flex flex-col items-center justify-center gap-2">
        <div className="relative w-25 h-25 flex items-center justify-center">
          <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90">
            <circle cx="50" cy="50" r="38" fill="none" stroke="#27272a" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="38"
              fill="none"
              stroke={stroke}
              strokeWidth="8"
              strokeDasharray={arcDashArray(busFactor)}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn('text-2xl font-bold font-mono leading-none', color)}>
              {busFactor}
            </span>
            <span className="text-[9px] font-bold font-mono text-zinc-500 mt-0.5">
              {label}
            </span>
          </div>
        </div>
        <p className="text-[10px] font-mono text-zinc-500 text-center">
          {busFactor} of {totalContributors} contributors
          <br />own 50%+ of commits
        </p>
      </div>
    </div>
  )
}