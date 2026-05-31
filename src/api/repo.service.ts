import { homeDir } from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api/core";
import { supabase } from "@/lib/supabase";

// Types

export interface Repository {
  id: string;
  name: string;
  fullName: string;
  isLocal: boolean;
  isRemote: boolean;
  provider: string;
  externalId: string | null;
  localPaths: Record<string, string>;
  htmlUrl: string | null;
  description: string | null;
  isContributed: boolean;
  contributionScore: number;
  totalPRs: number;
  mergedPRs: number;
  openPRs: number;
  closedPRs: number;
  prMergeRate: number;
  totalCommits: number;
  totalAdditions: number;
  totalDeletions: number;
  lastParsed: string;
  createdAt: string;
}

// Helpers

async function getAuthHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) throw new Error("No active session");

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  };
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${import.meta.env.VITE_API_URL}${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers ?? {}) },
  });
 
  const text = await res.text();
 
  if (!res.ok) {
    throw new Error(`API Error (${res.status}): ${text}`);
  }
 
  if (!text || !text.trim()) {
    throw new Error(`API Error (${res.status}): empty response from ${path}`);
  }
 
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`API Error: invalid JSON from ${path} — ${text.slice(0, 100)}`);
  }
}

// Repo Service 

export const repoService = {
  // Sync 

  async syncLocalRepos(user: any): Promise<Repository[]> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const gitHubToken =
      session?.provider_token ?? localStorage.getItem("provider_token") ?? undefined;

    const searchEmails = [
      user.email,
      ...(user.user_metadata?.secondary_emails ?? []),
    ].filter(Boolean) as string[];

    const baseDir = await homeDir();

    const localPaths = await invoke<string[]>("run_git_scan", {
      basePath: baseDir,
      userEmails: searchEmails,
    });

    console.debug(`[repoService] Scanned ${localPaths.length} local repos from ${baseDir}`);

    return apiFetch<Repository[]>("/repos/sync-forced", {
      method: "POST",
      body: JSON.stringify({
        localPaths,
        userEmail: user.email,
        userId: user.id,
        userLogin:
          user.user_metadata?.preferred_username ??
          user.user_metadata?.user_name ??
          user.email,
        deviceId: await getDeviceId(),
        gitHubToken,
        allUserEmails: searchEmails,
      }),
    });
  },

  // Repos

  async getRepos(): Promise<Repository[]> {
    return apiFetch<Repository[]>("/repos");
  },

  async getRepo(repoId: string): Promise<Repository> {
    return apiFetch<Repository>(`/repos/${repoId}`);
  },

  // Contributors

  async getContributors(
    repositoryId: string,
    params?: { page?: number; limit?: number; sortBy?: string; order?: string },
  ) {
    const query = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    ).toString();
    return apiFetch(`/contributors/${repositoryId}${query ? `?${query}` : ""}`);
  },

  async getBusFactor(repositoryId: string) {
    return apiFetch(`/contributors/${repositoryId}/bus-factor`);
  },

  async compareContributors(repoAId: string, repoBId: string) {
    return apiFetch(`/contributors/compare?repoAId=${repoAId}&repoBId=${repoBId}`);
  },

  // Branches

  async getBranches(
    repositoryId: string,
    params?: { page?: number; limit?: number; sortBy?: string },
  ) {
    const query = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    ).toString();
    return apiFetch(`/branches/${repositoryId}${query ? `?${query}` : ""}`);
  },

  async getBranch(branchId: string) {
    return apiFetch(`/branches/detail/${branchId}`);
  },

  async compareBranches(branchAId: string, branchBId: string) {
    return apiFetch(`/branches/compare?branchAId=${branchAId}&branchBId=${branchBId}`);
  },

  // Pull Requests

  async getPullRequests(
    repositoryId: string,
    params?: {
      page?: number;
      limit?: number;
      state?: "open" | "closed" | "merged";
      sortBy?: string;
      from?: string;
      to?: string;
    },
  ) {
    const query = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    ).toString();
    return apiFetch(`/pull-requests/${repositoryId}${query ? `?${query}` : ""}`);
  },

  async getPRSummary(repositoryId: string) {
    return apiFetch(`/pull-requests/${repositoryId}/summary`);
  },

  async getPRTrends(repositoryId: string) {
    return apiFetch(`/pull-requests/${repositoryId}/trends`);
  },

  async getPRReviewStats(
    repositoryId: string,
    params?: { page?: number; limit?: number; reviewerLogin?: string },
  ) {
    const query = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    ).toString();
    return apiFetch(`/pull-requests/${repositoryId}/reviews${query ? `?${query}` : ""}`);
  },

  // Commit Stats

  async getCommitStats(
    repositoryId: string,
    params?: {
      page?: number;
      limit?: number;
      from?: string;
      to?: string;
      granularity?: "week" | "month";
    },
  ) {
    const query = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    ).toString();
    return apiFetch(`/commit-stats/${repositoryId}${query ? `?${query}` : ""}`);
  },

  async getCommitStatsSummary(repositoryId: string) {
    return apiFetch(`/commit-stats/${repositoryId}/summary`);
  },

  async compareCommitStats(
    repoAId: string,
    repoBId: string,
    params?: { from?: string; to?: string; granularity?: "week" | "month" },
  ) {
    const query = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    ).toString();
    return apiFetch(
      `/commit-stats/compare/${repoAId}/${repoBId}${query ? `?${query}` : ""}`,
    );
  },
};

async function getDeviceId(): Promise<string> {
  const stored = localStorage.getItem("device_id");
  if (stored) return stored;

  const id = `tauri-${crypto.randomUUID()}`;
  localStorage.setItem("device_id", id);
  return id;
}
