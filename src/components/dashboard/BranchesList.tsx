import { TileLabel, TileBadge } from '../shared/TilePrimitives'
import { formatDistanceToNow } from 'date-fns'

interface Branch {
  name: string
  isDefault: boolean
  lastCommitAt?: string | null  // ISO string
  userCommits?: number
}

interface BranchesListProps {
  branches: Branch[]
  maxItems?: number
}

export function BranchesList({ branches, maxItems = 5 }: BranchesListProps) {
  const sorted = [...branches]
    .sort((a, b) => (a.isDefault ? -1 : b.isDefault ? 1 : 0))
    .slice(0, maxItems)

  return (
    <div className="flex flex-col h-full gap-2">
      <TileLabel>Branches</TileLabel>
      <div className="flex flex-col flex-1 justify-center divide-y divide-zinc-800/60">
        {sorted.map(branch => (
          <div key={branch.name} className="flex items-center gap-2 py-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: branch.isDefault ? '#22c55e' : '#3f3f46' }}
            />
            <span className="text-xs font-mono text-zinc-300 flex-1 truncate">
              {branch.name}
            </span>
            {branch.isDefault ? (
              <TileBadge variant="green">default</TileBadge>
            ) : branch.lastCommitAt ? (
              <span className="text-[10px] font-mono text-zinc-600">
                {formatDistanceToNow(new Date(branch.lastCommitAt), { addSuffix: true })}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}