import { cn } from '@/lib/utils'

export function TileLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('text-[10px] font-bold uppercase tracking-widest text-zinc-500 font-mono', className)}>
      {children}
    </span>
  )
}

export function TileValue({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('text-3xl font-bold text-zinc-100 font-mono leading-none', className)}>
      {children}
    </span>
  )
}

export function TileSub({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('text-xs text-zinc-500 font-mono', className)}>
      {children}
    </span>
  )
}

type BadgeVariant = 'green' | 'red' | 'blue' | 'amber' | 'zinc'

const badgeVariants: Record<BadgeVariant, string> = {
  green: 'bg-green-950 text-green-400',
  red:   'bg-red-950 text-red-400',
  blue:  'bg-blue-950 text-blue-400',
  amber: 'bg-amber-950 text-amber-400',
  zinc:  'bg-zinc-800 text-zinc-400',
}

export function TileBadge({
  children,
  variant = 'zinc',
  className,
}: {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}) {
  return (
    <span className={cn(
      'inline-flex items-center text-[10px] font-semibold font-mono px-2 py-0.5 rounded',
      badgeVariants[variant],
      className,
    )}>
      {children}
    </span>
  )
}