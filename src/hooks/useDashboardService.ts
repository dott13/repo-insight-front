import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/api/repo.service'

export interface RepoDashboard {
  id: string
  fullName: string
  description: string | null
  totalCommits: number
  totalAdditions: number
  totalDeletions: number
  totalPRs: number
  mergedPRs: number
  openPRs: number
  closedPRs: number
  prMergeRate: number
  contributionScore: number
  lastParsed: string | null
  isLocal: boolean
  isRemote: boolean
}

export interface WeeklyCommitData {
  week: string       // ISO date string — used as chart key AND display label
  commits: number
  additions: number
  deletions: number
}

export interface CommitSummary {
  totalCommits: number
  totalAdditions: number
  totalDeletions: number
  avgCommitsPerWeek: number
  peakWeek: { week: string; commits: number } | null
}

export interface ContributorItem {
  id: string
  login: string
  avatarUrl: string | null
  commitPercent: number
  totalCommits: number
  totalAdditions: number
  totalDeletions: number
  firstCommitAt: string | null
  lastCommitAt: string | null
}

export interface BusFactorData {
  busFactor: number
  riskLevel: 'critical' | 'high' | 'medium' | 'low'
  totalContributors: number
  ownershipBreakdown: Array<{
    login: string
    avatarUrl: string | null
    commitPercent: number
    cumulativePercent: number
  }>
}

export interface BranchItem {
  id: string
  name: string
  isDefault: boolean
  isProtected: boolean
  lastCommitAt: string | null
  userCommits: number
  totalCommits: number
  commitPercent: number
  userAdditions: number
  userDeletions: number
}

interface RawCommitStat {
  id: string
  week: string
  commits: number
  additions: number
  deletions: number
  churn: number
}

interface RawCommitStatSummary {
  totalCommits: number
  totalAdditions: number
  totalDeletions: number
  totalChurn: number
  avgCommitsPerWeek: number
  peakWeek: {
    id: string
    week: string
    commits: number
    additions: number
    deletions: number
    churn: number
  } | null
}

interface RawPRSummary {
  totalPRs: number
  mergedPRs: number
  openPRs: number
  closedPRs: number
  mergeRate: number
}

export function formatWeekLabel(isoDate: string | null): string {
  if (!isoDate) return '—'
  const date = new Date(isoDate)
  if (isNaN(date.getTime())) return isoDate 
  
  const now = new Date()
  const sameYear = date.getFullYear() === now.getFullYear()

  const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  if (sameYear) {
    return monthDay
  }

  const shortYear = date.toLocaleDateString('en-US', { year: '2-digit' }) 
  
  return `${monthDay} '${shortYear}`
}

export function useRepoDashboard(repoId: string) {
  const { data, isLoading, error } = useQuery<RepoDashboard>({
    queryKey: ['repo', repoId],
    queryFn: () => apiFetch(`/repos/${repoId}`),
    enabled: !!repoId,
    staleTime: 30_000,
  })

  return { repo: data ?? null, isLoading, error }
}

export function useCommitStats(repoId: string) {
  const statsQuery = useQuery<{ data: RawCommitStat[] }>({
    queryKey: ['commit-stats', repoId],
    queryFn: () => apiFetch(`/commit-stats/${repoId}?limit=52&granularity=week`),
    enabled: !!repoId,
    staleTime: 30_000,
  })

  const summaryQuery = useQuery<RawCommitStatSummary>({
    queryKey: ['commit-stats-summary', repoId],
    queryFn: () => apiFetch(`/commit-stats/${repoId}/summary`),
    enabled: !!repoId,
    staleTime: 30_000,
  })

  const weeklyData: WeeklyCommitData[] = (statsQuery.data?.data ?? [])
    .slice()
    .reverse()
    .map(s => ({
      week:      s.week,
      commits:   s.commits,
      additions: s.additions,
      deletions: s.deletions,
    }))

  const rawSummary = summaryQuery.data
  const summary: CommitSummary | null = rawSummary
    ? {
        totalCommits:      rawSummary.totalCommits,
        totalAdditions:    rawSummary.totalAdditions,
        totalDeletions:    rawSummary.totalDeletions,
        avgCommitsPerWeek: rawSummary.avgCommitsPerWeek,
        peakWeek: rawSummary.peakWeek
          ? {
              week:    rawSummary.peakWeek.week,
              commits: rawSummary.peakWeek.commits,
            }
          : null,
      }
    : null

  return {
    weeklyData,
    summary,
    isLoading: statsQuery.isLoading || summaryQuery.isLoading,
    error:     statsQuery.error    ?? summaryQuery.error,
  }
}

export function useContributors(repoId: string) {
  const { data, isLoading, error } = useQuery<{ data: ContributorItem[] }>({
    queryKey: ['contributors', repoId],
    queryFn: () => apiFetch(`/contributors/${repoId}?limit=10&sortBy=totalCommits`),
    enabled: !!repoId,
    staleTime: 30_000,
  })

  return {
    contributors: data?.data ?? [],
    isLoading,
    error,
  }
}

export function useBusFactor(repoId: string) {
  const { data, isLoading, error } = useQuery<BusFactorData>({
    queryKey: ['bus-factor', repoId],
    queryFn: () => apiFetch(`/contributors/${repoId}/bus-factor`),
    enabled: !!repoId,
    staleTime: 30_000,
  })

  return { busFactor: data ?? null, isLoading, error }
}

export function useBranches(repoId: string) {
  const { data, isLoading, error } = useQuery<{ data: BranchItem[] }>({
    queryKey: ['branches', repoId],
    queryFn: () => apiFetch(`/branches/${repoId}?limit=10`),
    enabled: !!repoId,
    staleTime: 30_000,
  })

  return {
    branches: data?.data ?? [],
    isLoading,
    error,
  }
}

export function usePullRequests(repoId: string) {
  const { data, isLoading, error } = useQuery<RawPRSummary>({
    queryKey: ['pr-summary', repoId],
    queryFn: () => apiFetch(`/pull-requests/${repoId}/summary`),
    enabled: !!repoId,
    staleTime: 30_000,
  })

  return {
    merged:    data?.mergedPRs ?? 0,
    open:      data?.openPRs   ?? 0,
    closed:    data?.closedPRs ?? 0,
    mergeRate: data?.mergeRate ?? 0,
    isLoading,
    error,
  }
}