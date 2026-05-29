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

// Define the route with the dynamic $repoId parameter
export const Route = createFileRoute('/repos/$repoId')({
  component: RepoDashboard,
})

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-12 gap-3" style={{ gridAutoRows: '80px' }}>
      {[
        { col: 3, row: 2 }, { col: 5, row: 3 }, { col: 4, row: 2 }, { col: 3, row: 3 },
        { col: 3, row: 2 }, { col: 4, row: 3 }, { col: 8, row: 3 }, { col: 4, row: 5 },
        { col: 4, row: 3 }, { col: 4, row: 2 },
      ].map((s, i) => (
        <div
          key={i}
          className={`col-span-${s.col} row-span-${s.row} rounded-xl bg-zinc-900/50 border border-zinc-800 animate-pulse`}
        />
      ))}
    </div>
  )
}

function RepoDashboard() {
  // Grab the validated param from the route context
  const { repoId } = Route.useParams()

  // Use the actual URL route param for your dashboard data hooks
  const { repo, isLoading: repoLoading }       = useRepoDashboard(repoId)
  const { weeklyData, summary, isLoading: statsLoading } = useCommitStats(repoId)
  const { contributors, isLoading: contribLoading }      = useContributors(repoId)
  const { busFactor, isLoading: busLoading }             = useBusFactor(repoId)
  const { branches, isLoading: branchLoading }           = useBranches(repoId)
  const { merged, open, closed, isLoading: prLoading }   = usePullRequests(repoId)

  const isLoading = repoLoading || statsLoading || contribLoading || busLoading || branchLoading || prLoading

  if (isLoading) return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <DashboardSkeleton />
      </div>
    </div>
  )

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-sm font-mono font-bold text-zinc-200">{repo?.fullName}</h1>
            <p className="text-xs font-mono text-zinc-600 mt-0.5">
              last synced {repo?.lastParsed ? new Date(repo.lastParsed).toLocaleString() : '—'}
            </p>
          </div>
          <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
            Dashboard
          </span>
        </div>

        <div className="grid grid-cols-12 gap-3" style={{ gridAutoRows: '80px' }}>

          {/* FIXED: Removed all navigation actions. Tiles are now purely presentational dummy displays */}
          <DashboardTile colSpan={3} rowSpan={2} accent="green">
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

          <DashboardTile colSpan={5} rowSpan={3}>
            <CommitActivityChart data={weeklyData ?? []} />
          </DashboardTile>

          <DashboardTile colSpan={4} rowSpan={2} accent="blue">
            <StatTileContent
              label="Open PRs"
              value={open ?? '—'}
              sub={`${merged ?? 0} merged · ${closed ?? 0} closed`}
              badge={
                merged != null && (merged + open + closed) > 0
                  ? { text: `${Math.round((merged / (merged + open + closed)) * 100)}% merge rate`, variant: 'blue' }
                  : undefined
              }
            />
          </DashboardTile>

          <DashboardTile colSpan={3} rowSpan={3}>
            {busFactor && (
              <BusFactorGauge
                busFactor={busFactor.busFactor}
                riskLevel={busFactor.riskLevel}
                totalContributors={busFactor.totalContributors}
              />
            )}
          </DashboardTile>

          <DashboardTile colSpan={3} rowSpan={2} accent="purple">
            <StatTileContent
              label="Contribution Score"
              value={repo?.contributionScore?.toLocaleString() ?? '—'}
              sub="your personal score"
            />
          </DashboardTile>

          <DashboardTile colSpan={4} rowSpan={3}>
            <PRBreakdown merged={merged ?? 0} open={open ?? 0} closed={closed ?? 0} />
          </DashboardTile>

          <DashboardTile colSpan={8} rowSpan={3}>
            <ChurnChart data={weeklyData ?? []} />
          </DashboardTile>

          <DashboardTile colSpan={4} rowSpan={5}>
            <ContributorsList contributors={contributors ?? []} />
          </DashboardTile>

          <DashboardTile colSpan={4} rowSpan={3}>
            <BranchesList branches={branches ?? []} />
          </DashboardTile>

          <DashboardTile colSpan={4} rowSpan={2} accent="amber">
            <StatTileContent
              label="Peak Week"
              value={summary?.peakWeek?.commits != null ? `${summary.peakWeek.commits} commits` : '—'}
              sub={summary?.peakWeek?.week ? new Date(summary.peakWeek.week).toLocaleDateString() : 'no data yet'}
            />
          </DashboardTile>

        </div>
      </div>
    </div>
  )
}