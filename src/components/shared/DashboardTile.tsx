import { cn } from '@/lib/utils'
import { ArrowUpRight } from 'lucide-react'

type AccentColor = 'green' | 'blue' | 'amber' | 'purple' | 'red' | 'none'

interface DashboardTileProps {
  children: React.ReactNode
  colSpan?: 3 | 4 | 5 | 6 | 7 | 8 | 12
  rowSpan?: 2 | 3 | 4 | 5
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

const colSpanClasses: Record<number, string> = {
  3:  'col-span-3',
  4:  'col-span-4',
  5:  'col-span-5',
  6:  'col-span-6',
  7:  'col-span-7',
  8:  'col-span-8',
  12: 'col-span-12',
}

const rowSpanClasses: Record<number, string> = {
  2: 'row-span-2',
  3: 'row-span-3',
  4: 'row-span-4',
  5: 'row-span-5',
}

export function DashboardTile({
  children,
  colSpan = 4,
  rowSpan = 2,
  accent = 'none',
  onClick,
  className,
}: DashboardTileProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl',
        'bg-zinc-900/50 border border-zinc-800',
        'p-4 transition-all duration-150',
        onClick && 'cursor-pointer hover:border-zinc-600 hover:bg-zinc-900',
        accentClasses[accent],
        colSpanClasses[colSpan],
        rowSpanClasses[rowSpan],
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