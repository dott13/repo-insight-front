import { useState } from 'react'
import { formatWeekLabel, useCommitStats } from '@/hooks/useDashboardService'
import { CommitActivityChart } from '@/components/dashboard/CommitActivityChart'
import { ChurnChart } from '@/components/dashboard/ChurnChart'
import { TileLabel, TileValue, TileSub } from '@/components/shared/TilePrimitives'
import { CompareHeader } from '@/components/shared/RepoPicker'
import { useReposList } from '@/hooks/useReposList'
import { cn } from '@/lib/utils'

interface Props {
  repoId: string
  mode: 'overview' | 'compare'
}

function StatCard({ label, value, sub, accent }: {
  label: string; value: string | number; sub?: string; accent?: string
}) {
  return (
    <div className={cn(
      'flex flex-col gap-1.5 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800',
      accent && `border-l-2 ${accent}`,
    )}>
      <TileLabel>{label}</TileLabel>
      <TileValue className="text-2xl">{value}</TileValue>
      {sub && <TileSub>{sub}</TileSub>}
    </div>
  )
}

function CommitsOverview({ repoId }: { repoId: string }) {
  const { weeklyData, summary, isLoading } = useCommitStats(repoId)

  if (isLoading) return <div className="text-xs font-mono text-zinc-600 animate-pulse">Loading...</div>

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Commits"    value={summary?.totalCommits?.toLocaleString() ?? '—'}           accent="border-l-blue-500" />
        <StatCard label="Total Additions"  value={`+${summary?.totalAdditions?.toLocaleString() ?? '—'}`}   accent="border-l-green-500" />
        <StatCard label="Total Deletions"  value={`-${summary?.totalDeletions?.toLocaleString() ?? '—'}`}   accent="border-l-red-500" />
        <StatCard
          label="Avg / Week"
          value={summary?.avgCommitsPerWeek ?? '—'}
          sub={summary?.peakWeek ? `peak: ${summary.peakWeek.commits} on ${formatWeekLabel(summary.peakWeek.week)}` : undefined}
          accent="border-l-amber-500"
        />
      </div>

      <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-4" style={{ height: 280 }}>
        <CommitActivityChart data={weeklyData} />
      </div>

      <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-4" style={{ height: 280 }}>
        <ChurnChart data={weeklyData} />
      </div>
    </div>
  )
}

function CommitsCompare({ repoId }: { repoId: string }) {
  const { items } = useReposList()
  const [repoAId, setRepoAId] = useState(repoId)
  const [repoBId, setRepoBId] = useState('')

  const { weeklyData: dataA, summary: summaryA } = useCommitStats(repoAId)
  const { weeklyData: dataB, summary: summaryB } = useCommitStats(repoBId)

  const repoA = items.find(r => r.id === repoAId)
  const repoB = items.find(r => r.id === repoBId)

  return (
    <div className="flex flex-col gap-6">
      <CompareHeader
        repoAId={repoAId}
        repoBId={repoBId}
        onChangeA={setRepoAId}
        onChangeB={setRepoBId}
      />

      {repoBId ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: repoA?.fullName, summary: summaryA },
              { label: repoB?.fullName, summary: summaryB },
            ].map(({ label, summary: s }) => (
              <div key={label} className="flex flex-col gap-3">
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{label}</p>
                <StatCard label="Total Commits"   value={s?.totalCommits?.toLocaleString() ?? '—'}          accent="border-l-blue-500" />
                <StatCard label="Avg / Week"      value={s?.avgCommitsPerWeek ?? '—'} />
                <StatCard label="Total Additions" value={`+${s?.totalAdditions?.toLocaleString() ?? '—'}`}  accent="border-l-green-500" />
                <StatCard label="Total Deletions" value={`-${s?.totalDeletions?.toLocaleString() ?? '—'}`}  accent="border-l-red-500" />
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-4" style={{ height: 280 }}>
            <div className="flex items-center gap-4 mb-3">
              <TileLabel>Commit Activity</TileLabel>
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
                <span className="w-2 h-2 rounded-sm bg-blue-500 inline-block" />{repoA?.fullName}
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
                <span className="w-2 h-2 rounded-sm bg-amber-500 inline-block" />{repoB?.fullName}
              </span>
            </div>
            <CommitActivityChart data={dataA} compareData={dataB} />
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-48 rounded-xl border border-zinc-800 border-dashed">
          <p className="text-xs font-mono text-zinc-600">Select repo B above to compare</p>
        </div>
      )}
    </div>
  )
}

export function CommitsAnalysis({ repoId, mode }: Props) {
  return mode === 'overview'
    ? <CommitsOverview repoId={repoId} />
    : <CommitsCompare repoId={repoId} />
}