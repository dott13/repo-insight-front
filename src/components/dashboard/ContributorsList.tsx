import { TileLabel } from '../shared/TilePrimitives'
import { cn } from '@/lib/utils'

interface Contributor {
  login: string
  avatarUrl?: string | null
  commitPercent: number
}

interface ContributorsListProps {
  contributors: Contributor[]
  maxItems?: number
}

const AVATAR_COLORS = [
  'bg-purple-950 text-purple-400',
  'bg-blue-950 text-blue-400',
  'bg-green-950 text-green-400',
  'bg-amber-950 text-amber-400',
  'bg-red-950 text-red-400',
]

const BAR_COLORS = ['#a855f7', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444']

function initials(login: string): string {
  return login.slice(0, 2).toUpperCase()
}

export function ContributorsList({ contributors, maxItems = 5 }: ContributorsListProps) {
  const visible = contributors.slice(0, maxItems)

  return (
    <div className="flex flex-col h-full gap-2">
      <TileLabel>Top Contributors</TileLabel>
      <div className="flex flex-col gap-2.5 flex-1 justify-center">
        {visible.map((c, i) => (
          <div key={c.login} className="flex items-center gap-2">
            {c.avatarUrl ? (
              <img
                src={c.avatarUrl}
                alt={c.login}
                className="w-6 h-6 rounded-full border border-zinc-700 shrink-0"
              />
            ) : (
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center',
                'text-[9px] font-bold font-mono shrink-0',
                AVATAR_COLORS[i % AVATAR_COLORS.length],
              )}>
                {initials(c.login)}
              </div>
            )}

            <span className="text-xs font-mono text-zinc-300 flex-1 truncate">{c.login}</span>

            <div className="w-14 h-1 bg-zinc-800 rounded-full shrink-0">
              <div
                className="h-1 rounded-full"
                style={{
                  width: `${Math.min(c.commitPercent, 100)}%`,
                  background: BAR_COLORS[i % BAR_COLORS.length],
                }}
              />
            </div>

            <span className="text-[10px] font-mono text-zinc-500 w-8 text-right shrink-0">
              {c.commitPercent.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}