import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import "./App.css";
import { useAuth } from "@/context/AuthContext";
import { AuthShell } from "./components/auth/AuthShell";
import { useEffect, useState } from "react";
import { api } from "./api";

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  export interface Register {
    router: typeof router;
  }
}

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

function App() {
  const { user, loading: authLoading } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);

  useEffect(() => {
    if (user && !hasSynced) {
      const lastSync = localStorage.getItem("last_sync");
      const now = Date.now();

      if (lastSync && now - parseInt(lastSync) < SYNC_INTERVAL_MS) {
        setHasSynced(true);
        return;
      }

      const initializeData = async () => {
        setIsSyncing(true);
        try {
          await api.repos.syncLocalRepos(user);
          localStorage.setItem("last_sync", now.toString());
          setHasSynced(true);
        } catch (error) {
          console.error("Error syncing local repos:", error);
          setHasSynced(true); // don't block the app on sync failure
        } finally {
          setIsSyncing(false);
        }
      };
      initializeData();
    }
  }, [user, hasSynced]);

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

  if (isSyncing) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-200">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          <p>Syncing repositories...</p>
        </div>
      </div>
    );
  }

  return <RouterProvider router={router} />;
}

export default App;