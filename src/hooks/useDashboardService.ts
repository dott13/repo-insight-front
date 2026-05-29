
export interface WeeklyCommitData {
  week: string       // label shown on x-axis, e.g. "Mar 3"
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
  login: string
  avatarUrl?: string | null
  commitPercent: number
  totalCommits: number
}

export interface BusFactorData {
  busFactor: number
  riskLevel: 'critical' | 'high' | 'medium' | 'low'
  totalContributors: number
}

export interface BranchItem {
  name: string
  isDefault: boolean
  lastCommitAt?: string | null
  userCommits: number
}


export function useRepoDashboard(repoId: string) {
  // GET /repos/:id
  return { repo: null as any, isLoading: false, error: null }
}

export function useCommitStats(repoId: string) {
  // GET /commit-stats/:repositoryId  (granularity=week)
  // GET /commit-stats/:repositoryId/summary
  return {
    weeklyData: [] as WeeklyCommitData[],
    summary: null as CommitSummary | null,
    isLoading: false,
    error: null,
  }
}

export function useContributors(repoId: string) {
  // GET /contributors/:repositoryId
  return { contributors: [] as ContributorItem[], isLoading: false, error: null }
}

export function useBusFactor(repoId: string) {
  // GET /contributors/:repositoryId/bus-factor
  return { busFactor: null as BusFactorData | null, isLoading: false, error: null }
}

export function useBranches(repoId: string) {
  // GET /branches/:repositoryId
  return { branches: [] as BranchItem[], isLoading: false, error: null }
}

export function usePullRequests(repoId: string) {
  // GET /pull-requests/:repositoryId/summary
  return { merged: 0, open: 0, closed: 0, isLoading: false, error: null }
}