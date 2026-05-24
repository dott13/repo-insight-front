import { apiFetch } from "./repo.service";


export interface RepoTableRow {
  id: string;
  fullName: string;
  description: string | null;
  contributorCount: number;
  userCommits: number;
  lastContributedAt: string | null;
  prMergeRate: number;
  totalPRs: number;
  contributionScore: number;
  isLocal: boolean;
  isRemote: boolean;
}

export interface Highlight {
  repoId: string;
  fullName: string;
  qualifier: string;
  metric: string;
  metricRaw: number;
}

export interface HomeHighlights {
  mostCommits: Highlight;
  topScore: Highlight;
  bestMergeRate: Highlight | null;
}

export interface PaginatedRows {
  data: RepoTableRow[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export const homeService = {
  async getTableRows(page = 1, limit = 10): Promise<PaginatedRows> {
    return apiFetch(`/home/table?page=${page}&limit=${limit}`);
  },

  async getHighlights(): Promise<HomeHighlights> {
    return apiFetch(`/home/highlights`);
  },
};