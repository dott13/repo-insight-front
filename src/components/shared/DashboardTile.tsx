import { cn } from '@/lib/utils'
import { ArrowUpRight } from 'lucide-react'

type AccentColor = 'green' | 'blue' | 'amber' | 'purple' | 'red' | 'none'

interface DashboardTileProps {
  children: React.ReactNode
  gridColumn: string   // e.g. "1 / 4"
  gridRow: string      // e.g. "1 / 3"
  accent?: AccentColor
  onClick?: () => void
  className?: string
}

const accentClasses: Record<AccentColor, string> = {
  green:  'border-l-2 border-l-green-500',
  blue:   'border-l-2 border-l-blue-500',
  amber:  'border-l-2 border-l-amber-500',
  purple: 'border-l-2 border-l-purple-500',
  red:    'border-l-2 border-l-red-500',
  none:   '',
}

export function DashboardTile({
  children,
  gridColumn,
  gridRow,
  accent = 'none',
  onClick,
  className,
}: DashboardTileProps) {
  return (
    <div
      onClick={onClick}
      style={{ gridColumn, gridRow }}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl',
        'bg-zinc-900/50 border border-zinc-800',
        'p-4 transition-all duration-150',
        onClick && 'cursor-pointer hover:border-zinc-600 hover:bg-zinc-900',
        accentClasses[accent],
        className,
      )}
    >
      {onClick && (
        <ArrowUpRight
          size={14}
          className="absolute top-3 right-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity"
        />
      )}
      {children}
    </div>
  )
}