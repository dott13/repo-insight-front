import { useState } from 'react'
import { useBranches, usePullRequests } from '@/hooks/useDashboardService'
import { PRBreakdown } from '@/components/dashboard/PRBreakDown'
import { TileLabel, TileSub, TileBadge } from '@/components/shared/TilePrimitives'
import { CompareHeader } from '@/components/shared/RepoPicker'
import { useReposList } from '@/hooks/useReposList'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface Props { repoId: string; mode: 'overview' | 'compare' }


function BranchRow({ name, isDefault, isProtected, userCommits, totalCommits, commitPercent, lastCommitAt }: {
  name: string; isDefault: boolean; isProtected: boolean
  userCommits: number; totalCommits: number; commitPercent: number
  lastCommitAt: string | null
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: isDefault ? '#22c55e' : '#3f3f46' }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-mono text-zinc-200 truncate">{name}</p>
          {isDefault   && <TileBadge variant="green">default</TileBadge>}
          {isProtected && <TileBadge variant="zinc">protected</TileBadge>}
        </div>
        <TileSub className="mt-0.5">
          {lastCommitAt
            ? `last commit ${formatDistanceToNow(new Date(lastCommitAt), { addSuffix: true })}`
            : 'no commits'}
        </TileSub>
      </div>
      <div className="flex flex-col items-end gap-1 text-right shrink-0">
        <span className="text-xs font-mono text-zinc-300">{userCommits} / {totalCommits} commits</span>
        <div className="flex items-center gap-2">
          <div className="w-20 h-1 bg-zinc-800 rounded-full">
            <div className="h-1 rounded-full bg-blue-500" style={{ width: `${Math.min(commitPercent, 100)}%` }} />
          </div>
          <span className="text-[10px] font-mono text-zinc-500">{commitPercent.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  )
}

function BranchesOverview({ repoId }: { repoId: string }) {
  const { branches, isLoading } = useBranches(repoId)
  if (isLoading) return <div className="text-xs font-mono text-zinc-600 animate-pulse">Loading...</div>

  const totalUserCommits = branches.reduce((s, b) => s + b.userCommits, 0)
  const defaultBranch    = branches.find(b => b.isDefault)

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 border-l-2 border-l-blue-500">
          <TileLabel>Total Branches</TileLabel>
          <p className="text-2xl font-mono font-bold text-zinc-100 mt-1">{branches.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 border-l-2 border-l-green-500">
          <TileLabel>Your Commits (all branches)</TileLabel>
          <p className="text-2xl font-mono font-bold text-zinc-100 mt-1">{totalUserCommits.toLocaleString()}</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 border-l-2 border-l-amber-500">
          <TileLabel>Default Branch</TileLabel>
          <p className="text-2xl font-mono font-bold text-zinc-100 mt-1 truncate">{defaultBranch?.name ?? '—'}</p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <TileLabel className="mb-1 block">All Branches</TileLabel>
        {branches.map(b => <BranchRow key={b.id} {...b} />)}
      </div>
    </div>
  )
}

function BranchesCompare({ repoId }: { repoId: string }) {
  const { items } = useReposList()
  const [repoAId, setRepoAId] = useState(repoId)
  const [repoBId, setRepoBId] = useState('')

  const { branches: branchesA } = useBranches(repoAId)
  const { branches: branchesB } = useBranches(repoBId)

  const repoA = items.find(r => r.id === repoAId)
  const repoB = items.find(r => r.id === repoBId)

  return (
    <div className="flex flex-col gap-6">
      <CompareHeader repoAId={repoAId} repoBId={repoBId} onChangeA={setRepoAId} onChangeB={setRepoBId} />

      {repoBId ? (
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: repoA?.fullName, branches: branchesA },
            { label: repoB?.fullName, branches: branchesB },
          ].map(({ label, branches }) => (
            <div key={label} className="flex flex-col gap-2">
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{label}</p>
              {branches.map(b => <BranchRow key={b.id} {...b} />)}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-48 rounded-xl border border-zinc-800 border-dashed">
          <p className="text-xs font-mono text-zinc-600">Select repo B above to compare</p>
        </div>
      )}
    </div>
  )
}

export function BranchesAnalysis({ repoId, mode }: Props) {
  return mode === 'overview' ? <BranchesOverview repoId={repoId} /> : <BranchesCompare repoId={repoId} />
}

function PRsOverview({ repoId }: { repoId: string }) {
  const { merged, open, closed, mergeRate, isLoading } = usePullRequests(repoId)
  if (isLoading) return <div className="text-xs font-mono text-zinc-600 animate-pulse">Loading...</div>

  const total = merged + open + closed
  const riskColor =
    mergeRate >= 80 ? 'border-l-green-500' :
    mergeRate >= 50 ? 'border-l-amber-500' :
                     'border-l-red-500'

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className={cn('p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 border-l-2', riskColor)}>
          <TileLabel>Merge Rate</TileLabel>
          <p className="text-2xl font-mono font-bold text-zinc-100 mt-1">{mergeRate.toFixed(1)}%</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 border-l-2 border-l-zinc-500">
          <TileLabel>Total PRs</TileLabel>
          <p className="text-2xl font-mono font-bold text-zinc-100 mt-1">{total}</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 border-l-2 border-l-blue-500">
          <TileLabel>Open</TileLabel>
          <p className="text-2xl font-mono font-bold text-zinc-100 mt-1">{open}</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 border-l-2 border-l-green-500">
          <TileLabel>Merged</TileLabel>
          <p className="text-2xl font-mono font-bold text-zinc-100 mt-1">{merged}</p>
        </div>
      </div>
      <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-4" style={{ height: 200 }}>
        <PRBreakdown merged={merged} open={open} closed={closed} />
      </div>
    </div>
  )
}

function PRsCompare({ repoId }: { repoId: string }) {
  const { items } = useReposList()
  const [repoAId, setRepoAId] = useState(repoId)
  const [repoBId, setRepoBId] = useState('')

  const { merged: mergedA, open: openA, closed: closedA, mergeRate: rateA } = usePullRequests(repoAId)
  const { merged: mergedB, open: openB, closed: closedB, mergeRate: rateB } = usePullRequests(repoBId)

  const repoA = items.find(r => r.id === repoAId)
  const repoB = items.find(r => r.id === repoBId)

  return (
    <div className="flex flex-col gap-6">
      <CompareHeader repoAId={repoAId} repoBId={repoBId} onChangeA={setRepoAId} onChangeB={setRepoBId} />

      {repoBId ? (
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: repoA?.fullName, merged: mergedA, open: openA, closed: closedA, rate: rateA },
            { label: repoB?.fullName, merged: mergedB, open: openB, closed: closedB, rate: rateB },
          ].map(({ label, merged, open, closed, rate }) => (
            <div key={label} className="flex flex-col gap-3">
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{label}</p>
              <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-4" style={{ height: 180 }}>
                <PRBreakdown merged={merged} open={open} closed={closed} />
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
                <TileLabel>Merge Rate</TileLabel>
                <p className="text-xl font-mono font-bold text-zinc-100 mt-1">{rate.toFixed(1)}%</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-48 rounded-xl border border-zinc-800 border-dashed">
          <p className="text-xs font-mono text-zinc-600">Select repo B above to compare</p>
        </div>
      )}
    </div>
  )
}

export function PullRequestsAnalysis({ repoId, mode }: Props) {
  return mode === 'overview' ? <PRsOverview repoId={repoId} /> : <PRsCompare repoId={repoId} />
}