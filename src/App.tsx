import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import "./App.css";
import { useAuth } from "./hooks/useAuth";
import { AuthShell } from "./components/auth/AuthShell";
import { useMemo, useState } from "react";
import { TopBar } from "./components/layout/TopBar";
import { SideBar } from "./components/layout/SideBar";



declare module "@tanstack/react-router" {
  export interface Register {
    router: ReturnType<typeof createRouter>;
  }
}

function App() {
  const { user, loading } = useAuth();
  const [ isSidebarOpen, setIsSidebarOpen ] = useState(false);

  const router = useMemo(
    () => createRouter({ routeTree, context: { user: user ?? null } }),
    [user]
  );
  
  if (loading) {
    return <div className="h-screen flex items-center justify-center bg-zinc-950 text-zinc-500">Initializing...</div>;
  }
  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-950">
        <AuthShell />
      </div>
    );
  }


  return(
    <div className="min-h-screen bg-zinc-950 flex flex-col overflow-hidden">
      <TopBar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}/>
      <div className="flex flex-1 overflow-hidden">
        <SideBar isOpen={isSidebarOpen} /> 
        <main className="flex-1 overflow-y-auto bg-zinc-950">
          <div className="p-6 max-w-[1600px] mx-auto">
            <RouterProvider router={router} />
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
