import { createFileRoute } from '@tanstack/react-router'
import { DashboardTile } from '@/components/shared/DashboardTile'
import { StatTileContent } from '@/components/dashboard/StatTileContent'
import { CommitActivityChart } from '@/components/dashboard/CommitActivityChart'
import { ChurnChart } from '@/components/dashboard/ChurnChart'
import { BusFactorGauge } from '@/components/dashboard/BusFactorGauge'
import { ContributorsList } from '@/components/dashboard/ContributorsList'
import { PRBreakdown } from '@/components/dashboard/PRBreakDown'
import { BranchesList } from '@/components/dashboard/BranchesList'

import {
  useRepoDashboard,
  useCommitStats,
  useContributors,
  useBusFactor,
  useBranches,
  usePullRequests,
} from '@/hooks/useDashboardService'

export const Route = createFileRoute('/repos/$repoId')({
  component: RepoDashboard,
})

function DashboardSkeleton() {
  const tiles = [
    { col: '1 / 4',  row: '1 / 3'  },
    { col: '4 / 9',  row: '1 / 4'  },
    { col: '9 / 13', row: '1 / 3'  },
    { col: '1 / 4',  row: '3 / 7'  },
    { col: '9 / 13', row: '3 / 5'  },
    { col: '4 / 9',  row: '4 / 7'  },
    { col: '9 / 13', row: '5 / 7'  },
    { col: '1 / 5',  row: '7 / 12' },
    { col: '5 / 9',  row: '7 / 10' },
    { col: '9 / 13', row: '7 / 10' },
    { col: '5 / 13', row: '10 / 12'},
  ]
  return (
    <div className="grid grid-cols-12 gap-3" style={{ gridAutoRows: '80px' }}>
      {tiles.map((t, i) => (
        <div
          key={i}
          style={{ gridColumn: t.col, gridRow: t.row }}
          className="rounded-xl bg-zinc-900/50 border border-zinc-800 animate-pulse"
        />
      ))}
    </div>
  )
}

function RepoDashboard() {
  const { repoId } = Route.useParams()

  const { repo, isLoading: repoLoading }                 = useRepoDashboard(repoId)
  const { weeklyData, summary, isLoading: statsLoading } = useCommitStats(repoId)
  const { contributors, isLoading: contribLoading }      = useContributors(repoId)
  const { busFactor, isLoading: busLoading }             = useBusFactor(repoId)
  const { branches, isLoading: branchLoading }           = useBranches(repoId)
  const { merged, open, closed, isLoading: prLoading }   = usePullRequests(repoId)

  const isLoading =
    repoLoading || statsLoading || contribLoading ||
    busLoading  || branchLoading || prLoading

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <DashboardSkeleton />
        </div>
      </div>
    )
  }

  const totalPRs = (merged ?? 0) + (open ?? 0) + (closed ?? 0)
  const mergeRatePct = totalPRs > 0
    ? Math.round(((merged ?? 0) / totalPRs) * 100)
    : null

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-sm font-mono font-bold text-zinc-200">{repo?.fullName}</h1>
            <p className="text-xs font-mono text-zinc-600 mt-0.5">
              last synced {repo?.lastParsed
                ? new Date(repo.lastParsed).toLocaleString()
                : '—'}
            </p>
          </div>
          <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
            Dashboard
          </span>
        </div>

        <div className="grid grid-cols-12 gap-3" style={{ gridAutoRows: '80px' }}>

          {/* Total Commits */}
          <DashboardTile gridColumn="1 / 4" gridRow="1 / 3" accent="green">
            <StatTileContent
              label="Total Commits"
              value={repo?.totalCommits?.toLocaleString() ?? '—'}
              sub="across all branches"
              badge={
                summary?.avgCommitsPerWeek != null
                  ? { text: `${summary.avgCommitsPerWeek} avg / week`, variant: 'zinc' }
                  : undefined
              }
            />
          </DashboardTile>

          <DashboardTile gridColumn="4 / 9" gridRow="1 / 4">
            <CommitActivityChart data={weeklyData ?? []} />
          </DashboardTile>

          <DashboardTile gridColumn="9 / 13" gridRow="1 / 3" accent="blue">
            <StatTileContent
              label="Open PRs"
              value={open ?? '—'}
              sub={`${merged ?? 0} merged · ${closed ?? 0} closed`}
              badge={
                mergeRatePct != null
                  ? { text: `${mergeRatePct}% merge rate`, variant: 'blue' }
                  : undefined
              }
            />
          </DashboardTile>

          <DashboardTile gridColumn="1 / 4" gridRow="3 / 7">
            {busFactor && (
              <BusFactorGauge
                busFactor={busFactor.busFactor}
                riskLevel={busFactor.riskLevel}
                totalContributors={busFactor.totalContributors}
              />
            )}
          </DashboardTile>

          <DashboardTile gridColumn="9 / 13" gridRow="3 / 5" accent="purple">
            <StatTileContent
              label="Contribution Score"
              value={repo?.contributionScore?.toLocaleString() ?? '—'}
              sub="your personal score"
            />
          </DashboardTile>

          <DashboardTile gridColumn="4 / 9" gridRow="4 / 7">
            <PRBreakdown
              merged={merged ?? 0}
              open={open ?? 0}
              closed={closed ?? 0}
            />
          </DashboardTile>

          <DashboardTile gridColumn="9 / 13" gridRow="5 / 7" accent="amber">
            <StatTileContent
              label="Peak Week"
              value={
                summary?.peakWeek?.commits != null
                  ? `${summary.peakWeek.commits} commits`
                  : '—'
              }
              sub={
                summary?.peakWeek?.week
                  ? new Date(summary.peakWeek.week).toLocaleDateString()
                  : 'no data yet'
              }
            />
          </DashboardTile>

          <DashboardTile gridColumn="1 / 5" gridRow="7 / 12">
            <ContributorsList contributors={contributors ?? []} />
          </DashboardTile>

          <DashboardTile gridColumn="5 / 9" gridRow="7 / 10">
            <BranchesList branches={branches ?? []} />
          </DashboardTile>

          <DashboardTile gridColumn="9 / 13" gridRow="7 / 10">
            <ChurnChart data={weeklyData ?? []} />
          </DashboardTile>

          <DashboardTile gridColumn="5 / 13" gridRow="10 / 12">
            <CommitActivityChart data={weeklyData ?? []} />
          </DashboardTile>

        </div>
      </div>
    </div>
  )
}