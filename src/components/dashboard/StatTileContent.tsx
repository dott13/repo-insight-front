import { TileBadge, TileLabel, TileSub, TileValue } from '../shared/TilePrimitives'

interface StatTileContentProps {
  label: string
  value: string | number
  sub?: string
  badge?: {
    text: string
    variant?: 'green' | 'red' | 'blue' | 'amber' | 'zinc'
  }
}

export function StatTileContent({ label, value, sub, badge }: StatTileContentProps) {
  return (
    <div className="flex flex-col justify-between h-full gap-2">
      <div className="flex flex-col gap-1.5">
        <TileLabel>{label}</TileLabel>
        <TileValue>{value}</TileValue>
        {sub && <TileSub>{sub}</TileSub>}
      </div>
      {badge && (
        <div>
          <TileBadge variant={badge.variant}>{badge.text}</TileBadge>
        </div>
      )}
    </div>
  )
}