import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/api/repo.service';

export type RepoSortField =
  | 'contributionScore'
  | 'totalCommits'
  | 'prMergeRate'
  | 'totalPRs'
  | 'lastParsed'
  | 'fullName'
  | 'createdAt';

export interface RepoListItem {
  id: string;
  fullName: string;
  name: string;
  description: string | null;
  htmlUrl: string | null;
  provider: string;
  isLocal: boolean;
  isRemote: boolean;
  isContributed: boolean;
  contributionScore: number;
  totalCommits: number;
  totalAdditions: number;
  totalDeletions: number;
  totalPRs: number;
  mergedPRs: number;
  openPRs: number;
  prMergeRate: number;
  contributorCount: number;
  branchCount: number;
  lastContributedAt: string | null;
  lastParsed: string;
  createdAt: string;
}

export interface ReposListFilters {
  search: string;
  sortBy: RepoSortField;
  order: 'asc' | 'desc';
  localOnly: boolean;
  remoteOnly: boolean;
  provider: string;
}

interface PaginatedResponse {
  data: RepoListItem[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

const DEFAULT_LIMIT = 20;

export const DEFAULT_FILTERS: ReposListFilters = {
  search:     '',
  sortBy:     'contributionScore',
  order:      'desc',
  localOnly:  false,
  remoteOnly: false,
  provider:   '',
};

export function useReposList() {
  const { socket } = useAuth();

  const [items, setItems]       = useState<RepoListItem[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [isFetching, setIsFetching] = useState(false);
  const [filters, setFilters]   = useState<ReposListFilters>(DEFAULT_FILTERS);

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetchPage = useCallback(async (p: number, f: ReposListFilters) => {
    setIsFetching(true);
    try {
      const params = new URLSearchParams({
        page:  String(p),
        limit: String(DEFAULT_LIMIT),
        sortBy: f.sortBy,
        order:  f.order,
        ...(f.search     && { search:     f.search }),
        ...(f.localOnly  && { localOnly:  'true' }),
        ...(f.remoteOnly && { remoteOnly: 'true' }),
        ...(f.provider   && { provider:   f.provider }),
      });

      const res = await apiFetch<PaginatedResponse>(`/repos/list?${params}`);
      
      setItems(res.data);
      setTotal(res.total);
      setPage(res.page);
    } catch (e) {
      console.error('[useReposList] fetch failed:', e);
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchPage(1, filters);
  }, [filters, fetchPage]);

  const applyFilters = useCallback((next: Partial<ReposListFilters>) => {
    setFilters(prev => ({ ...prev, ...next }));
  }, []);

  const goToPage = useCallback((targetPage: number) => {
    fetchPage(targetPage, filtersRef.current);
  }, [fetchPage]);

  useEffect(() => {
    if (!socket) return;
    const handler = () => fetchPage(page, filtersRef.current);
    socket.on('sync:complete', handler);
    return () => { socket.off('sync:complete', handler); };
  }, [socket, page, fetchPage]);

  const totalPages = Math.ceil(total / DEFAULT_LIMIT);

  return { 
    items, 
    total, 
    page, 
    totalPages, 
    limit: DEFAULT_LIMIT, 
    isFetching, 
    filters, 
    applyFilters, 
    goToPage 
  };
}