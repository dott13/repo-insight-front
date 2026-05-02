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

function App() {
  const { user, loading: authLoading } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);

  useEffect(() => {
    if(user && !hasSynced && !isSyncing) {
      const initializeData = async () => {
        setIsSyncing(true);
        try {
          await api.repos.syncLocalRepos(user);
          setHasSynced(true);
        } catch (error) {
          console.error("Error syncing local repos:", error);
        } finally {
          setIsSyncing(false);
        }
      };
      initializeData();
    }
  }, [user, hasSynced, isSyncing]);

  if (authLoading) {
    return <div className="h-screen flex items-center justify-center bg-zinc-950 text-zinc-500">Initializing...</div>;
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
          <p>Syncing local repositories and syncing with cloud...</p>
        </div>
      </div>
    )
  }

  return <RouterProvider router={router} />;
}

export default App;