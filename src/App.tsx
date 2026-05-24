import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import "./App.css";
import { useAuth } from "@/context/AuthContext";
import { AuthShell } from "./components/auth/AuthShell";
import { useEffect, useRef } from "react";
import { repoService } from "./api/repo.service";

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  export interface Register {
    router: typeof router;
  }
}

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

function App() {
  const { user, loading: authLoading, syncState } = useAuth();
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    if (!user || hasSyncedRef.current) return;

    const lastSync = localStorage.getItem("last_sync");
    const now = Date.now();

    if (lastSync && now - parseInt(lastSync) < SYNC_INTERVAL_MS) {
      hasSyncedRef.current = true;
      return;
    }

    hasSyncedRef.current = true;

    repoService.syncLocalRepos(user).then(() => {
      localStorage.setItem("last_sync", String(Date.now()));
    }).catch((err: any) => {
      console.error("[App] Sync failed:", err);
    });
  }, [user]);

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-950 text-zinc-500">
        Initializing...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-950">
        <AuthShell />
      </div>
    );
  }

  return (
    <>
      {syncState.isSyncing && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-zinc-900 border border-zinc-700 px-4 py-2 text-sm text-zinc-300 shadow-lg">
          <span className="animate-spin rounded-full h-3 w-3 border-b border-white" />
          Syncing repos… ({syncState.syncedRepoIds.size} done)
        </div>
      )}
      <RouterProvider router={router} />
    </>
  );
}

export default App;