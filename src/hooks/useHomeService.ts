import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  homeService,
  type RepoTableRow,
  type HomeHighlights,
  type PaginatedRows,
} from "@/api/home.service";

const DEFAULT_LIMIT = 10;

export function useHomeTable() {
  const { socket } = useAuth();
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<RepoTableRow[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  // Track latest page in a ref so the socket handler always sees current value
  const pageRef = useRef(1);

  const fetchPage = useCallback(async (p: number, replace = false) => {
    setIsFetching(true);
    try {
      const res: PaginatedRows = await homeService.getTableRows(
        p,
        DEFAULT_LIMIT,
      );
      setRows((prev) => (replace ? res.data : [...prev, ...res.data]));
      setTotal(res.total);
      setHasMore(res.hasMore);
      setPage(p);
      pageRef.current = p;
    } catch (e) {
      console.error("[useHomeTable] fetch failed:", e);
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchPage(1, true);
  }, [fetchPage]);

  // When sync completes, refresh from page 1 to pick up new scores/dates
  useEffect(() => {
    if (!socket) return;

    // Handler for single repo completions
    const handleRepoSynced = (data: { repoId: string }) => {
      console.debug(`[useHomeTable] Real-time update for repo: ${data.repoId}`);
      // Silent background refresh of page 1 to push fresh data into view
      fetchPage(1, true);
    };

    const handleSyncComplete = () => fetchPage(1, true);

    socket.on("repo:synced", handleRepoSynced);
    socket.on("sync:complete", handleSyncComplete);

    return () => {
      socket.off("repo:synced", handleRepoSynced);
      socket.off("sync:complete", handleSyncComplete);
    };
  }, [socket, fetchPage]);

  const loadMore = useCallback(() => {
    if (!isFetching && hasMore) fetchPage(pageRef.current + 1);
  }, [isFetching, hasMore, fetchPage]);

  return { rows, total, hasMore, isFetching, loadMore };
}

export function useHomeHighlights() {
  const { socket } = useAuth();
  const [highlights, setHighlights] = useState<HomeHighlights | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  const fetch = useCallback(async () => {
    setIsFetching(true);
    try {
      const data = await homeService.getHighlights();
      setHighlights(data);
    } catch (e) {
      console.error("[useHomeHighlights] fetch failed:", e);
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Re-fetch when sync completes so metrics update with fresh data
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      console.debug(
        "[useHomeHighlights] Sync update received, refreshing highlights...",
      );
      fetch();
    };

    socket.on("repo:synced", handleUpdate);
    socket.on("sync:complete", handleUpdate);

    return () => {
      socket.off("repo:synced", handleUpdate);
      socket.off("sync:complete", handleUpdate);
    };
  }, [socket, fetch]);
  return { highlights, isFetching };
}
