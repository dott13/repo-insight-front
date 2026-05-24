import { useEffect, useCallback, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { repoService, Repository } from "../api/repo.service";

export function useRepoSync(repoId: string) {
  const { socket, syncState } = useAuth();
  const [repo, setRepo] = useState<Repository | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  const refresh = useCallback(async () => {
    if (!repoId) return;
    setIsFetching(true);
    try {
      const data = await repoService.getRepo(repoId);
      setRepo(data);
    } catch (e) {
      console.error(`[useRepoSync] Failed to refresh repo ${repoId}:`, e);
    } finally {
      setIsFetching(false);
    }
  }, [repoId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!socket) return;

    const handler = ({ repoId: updatedId }: { repoId: string }) => {
      if (updatedId === repoId) refresh();
    };

    socket.on("repo:synced", handler);
    return () => { socket.off("repo:synced", handler); };
  }, [socket, repoId, refresh]);

  const isThisRepoSyncing =
    syncState.isSyncing && !syncState.syncedRepoIds.has(repoId);

  return {
    repo,
    isFetching,
    isSyncing: isThisRepoSyncing,
    refresh,
  };
}

export function useRepoList() {
  const { socket, syncState } = useAuth();
  const [repos, setRepos] = useState<Repository[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  const refresh = useCallback(async () => {
    setIsFetching(true);
    try {
      const data = await repoService.getRepos();
      setRepos(data);
    } catch (e) {
      console.error("[useRepoList] Failed to fetch repos:", e);
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Re-fetch the whole list when full sync completes
  useEffect(() => {
    if (!socket) return;

    socket.on("sync:complete", refresh);
    return () => { socket.off("sync:complete", refresh); };
  }, [socket, refresh]);

  return {
    repos,
    isFetching,
    isSyncing: syncState.isSyncing,
    syncedCount: syncState.syncedRepoIds.size,
    refresh,
  };
}