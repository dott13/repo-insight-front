import { useState } from 'react'
import { useContributors, useBusFactor } from '@/hooks/useDashboardService'
import { BusFactorGauge } from '@/components/dashboard/BusFactorGauge'
import { TileLabel, TileSub } from '@/components/shared/TilePrimitives'
import { CompareHeader } from '@/components/shared/RepoPicker'
import { useReposList } from '@/hooks/useReposList'

interface Props { repoId: string; mode: 'overview' | 'compare' }

const BAR_COLORS = ['#a855f7', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444']

function ContributorRow({ login, avatarUrl, totalCommits, commitPercent, totalAdditions, totalDeletions, index }: {
  login: string; avatarUrl?: string | null
  totalCommits: number; commitPercent: number
  totalAdditions: number; totalDeletions: number
  index: number
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
      {avatarUrl ? (
        <img src={avatarUrl} alt={login} className="w-8 h-8 rounded-full border border-zinc-700 shrink-0" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-mono font-bold text-zinc-400 shrink-0">
          {login.slice(0, 2).toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-mono text-zinc-200 truncate">{login}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-[10px] font-mono text-green-400">+{totalAdditions.toLocaleString()}</span>
          <span className="text-[10px] font-mono text-red-400">-{totalDeletions.toLocaleString()}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-sm font-mono font-bold text-zinc-200">{totalCommits.toLocaleString()}</span>
        <TileSub>{commitPercent.toFixed(1)}%</TileSub>
      </div>
      <div className="w-24 shrink-0">
        <div className="h-1.5 bg-zinc-800 rounded-full">
          <div
            className="h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(commitPercent, 100)}%`, background: BAR_COLORS[index % BAR_COLORS.length] }}
          />
        </div>
      </div>
    </div>
  )
}

function ContributorsOverview({ repoId }: { repoId: string }) {
  const { contributors, isLoading: contribLoading } = useContributors(repoId)
  const { busFactor, isLoading: busLoading }         = useBusFactor(repoId)

  if (contribLoading || busLoading) return <div className="text-xs font-mono text-zinc-600 animate-pulse">Loading...</div>

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-4 flex flex-col" style={{ minHeight: 200 }}>
          {busFactor && (
            <BusFactorGauge
              busFactor={busFactor.busFactor}
              riskLevel={busFactor.riskLevel}
              totalContributors={busFactor.totalContributors}
            />
          )}
        </div>

        <div className="md:col-span-2 rounded-xl bg-zinc-900/50 border border-zinc-800 p-4">
          <TileLabel className="mb-3 block">Ownership Breakdown</TileLabel>
          <div className="flex flex-col gap-2">
            {busFactor?.ownershipBreakdown.map((c, i) => (
              <div key={c.login} className="flex items-center gap-2">
                <span className="text-xs font-mono text-zinc-400 w-28 truncate">{c.login}</span>
                <div className="flex-1 h-1.5 bg-zinc-800 rounded-full">
                  <div className="h-1.5 rounded-full" style={{ width: `${c.commitPercent}%`, background: BAR_COLORS[i % BAR_COLORS.length] }} />
                </div>
                <span className="text-[10px] font-mono text-zinc-500 w-10 text-right">{c.commitPercent.toFixed(1)}%</span>
                <span className="text-[10px] font-mono text-zinc-600 w-16 text-right">cum. {c.cumulativePercent.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <TileLabel className="mb-1 block">All Contributors</TileLabel>
        {contributors.map((c, i) => <ContributorRow key={c.login} index={i} {...c} />)}
      </div>
    </div>
  )
}

function ContributorsCompare({ repoId }: { repoId: string }) {
  const { items } = useReposList()
  const [repoAId, setRepoAId] = useState(repoId)
  const [repoBId, setRepoBId] = useState('')

  const { contributors: contribsA } = useContributors(repoAId)
  const { contributors: contribsB } = useContributors(repoBId)
  const { busFactor: busA } = useBusFactor(repoAId)
  const { busFactor: busB } = useBusFactor(repoBId)

  const repoA = items.find(r => r.id === repoAId)
  const repoB = items.find(r => r.id === repoBId)

  const loginsA = new Set(contribsA.map(c => c.login))
  const loginsB = new Set(contribsB.map(c => c.login))
  const shared  = contribsA.filter(c => loginsB.has(c.login))
  const onlyA   = contribsA.filter(c => !loginsB.has(c.login))
  const onlyB   = contribsB.filter(c => !loginsA.has(c.login))

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
              { label: repoA?.fullName, bf: busA },
              { label: repoB?.fullName, bf: busB },
            ].map(({ label, bf }) => (
              <div key={label} className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-4" style={{ minHeight: 180 }}>
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-3">{label}</p>
                {bf && <BusFactorGauge busFactor={bf.busFactor} riskLevel={bf.riskLevel} totalContributors={bf.totalContributors} />}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { label: `Only in ${repoA?.fullName?.split('/')[1]}`, items: onlyA, contribsOther: contribsB },
              { label: 'Shared', items: shared, isShared: true, contribsOther: contribsB },
              { label: `Only in ${repoB?.fullName?.split('/')[1]}`, items: onlyB, contribsOther: contribsA },
            ].map(({ label, items: list, isShared, contribsOther }) => (
              <div key={label} className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-4">
                <TileLabel className="mb-3 block">{label}</TileLabel>
                <div className="flex flex-col gap-2">
                  {list.length === 0 ? (
                    <TileSub>{isShared ? 'No shared contributors' : 'None'}</TileSub>
                  ) : list.map(c => {
                    const other = contribsOther?.find(x => x.login === c.login)
                    return (
                      <div key={c.login} className="flex items-center gap-2">
                        <span className="text-xs font-mono text-zinc-300 truncate flex-1">{c.login}</span>
                        {isShared ? (
                          <>
                            <span className="text-[10px] font-mono text-blue-400">{c.commitPercent.toFixed(0)}%</span>
                            <span className="text-[10px] font-mono text-zinc-600">/</span>
                            <span className="text-[10px] font-mono text-amber-400">{other?.commitPercent.toFixed(0)}%</span>
                          </>
                        ) : (
                          <span className="text-[10px] font-mono text-zinc-600 ml-auto">{c.commitPercent.toFixed(1)}%</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
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

export function ContributorsAnalysis({ repoId, mode }: Props) {
  return mode === 'overview'
    ? <ContributorsOverview repoId={repoId} />
    : <ContributorsCompare repoId={repoId} />
}