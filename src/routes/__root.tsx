import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TopBar } from "@/components/layout/TopBar";
import { SideBar } from "@/components/layout/SideBar";
import { useState } from "react";

export const Route = createRootRoute({
  component: () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    return (
      <div className="h-screen bg-zinc-950 flex flex-col overflow-hidden">
        <TopBar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <div className="flex flex-1 overflow-hidden">
          <SideBar isOpen={isSidebarOpen} />
          <main className="flex-1 overflow-y-auto bg-zinc-950">
            <div className="p-6 max-w-400 mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    );
  },
});