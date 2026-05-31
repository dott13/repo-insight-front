import { Link, useRouterState } from "@tanstack/react-router";
import { MdDashboard, MdHome, MdSettings, MdTimeline, MdOutlineStorage, MdInsights } from "react-icons/md";
import { useReposList } from "@/hooks/useReposList";

export function SideBar({ isOpen }: { isOpen: boolean }) {
  const { items } = useReposList();
  const defaultRepoId = items[0]?.id ?? null;

  const routerState = useRouterState();
  const pathname = routerState.location.pathname;

  const pathParts = pathname.split('/');
  const reposIndex = pathParts.indexOf('repos');
  const extractedId = reposIndex !== -1 && pathParts[reposIndex + 1] ? pathParts[reposIndex + 1] : null;
  const activeRepoId = extractedId && extractedId !== 'list' ? extractedId : defaultRepoId;

  return (
    <aside
      className={`sidebar-transition border-zinc-800 bg-zinc-950 border-r ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`}
    >
      <div className="w-64 flex flex-col h-full justify-between">
        <nav className="flex-1 px-3 py-4 space-y-1">

          <Link
            to="/"
            activeProps={{ className: "bg-zinc-900 text-white" }}
            inactiveProps={{ className: "text-zinc-200 hover:text-zinc-100 hover:bg-zinc-900/50" }}
            className="flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-200 group"
          >
            <MdHome className="text-xl shrink-0 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium">Home</span>
          </Link>

          <Link
            to={defaultRepoId ? "/repos/$repoId" : "/repos"}
            params={defaultRepoId ? { repoId: defaultRepoId } : undefined}
            activeOptions={{ exact: false }}
            activeProps={{ className: "bg-zinc-900 text-white" }}
            inactiveProps={{ className: "text-zinc-200 hover:text-zinc-100 hover:bg-zinc-900/50" }}
            className="flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-200 group"
          >
            <MdDashboard className="text-xl shrink-0 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium">Dashboard</span>
          </Link>

          {activeRepoId && (
            <Link
              to="/repos/$repoId/analysis"
              params={{ repoId: activeRepoId }}
              search={{ section: 'commits', tab: 'overview' }}
              activeOptions={{ exact: false }}
              activeProps={{ className: "bg-zinc-900 text-white" }}
              inactiveProps={{ className: "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50" }}
              className="flex items-center gap-3 rounded-lg px-3 py-2 pl-9 transition-all duration-200 group"
            >
              <MdInsights className="text-base shrink-0 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium">Analysis</span>
            </Link>
          )}

          <Link
            to="/repos"
            activeOptions={{ exact: true }}
            activeProps={{ className: "bg-zinc-900 text-white" }}
            inactiveProps={{ className: "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50" }}
            className="flex items-center gap-3 rounded-lg px-3 py-2 pl-9 transition-all duration-200 group"
          >
            <MdOutlineStorage className="text-base shrink-0 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium">All Repositories</span>
          </Link>

          <Link
            to="/graph"
            activeProps={{ className: "bg-zinc-900 text-white" }}
            inactiveProps={{ className: "text-zinc-200 hover:text-zinc-100 hover:bg-zinc-900/50" }}
            className="flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-200 group"
          >
            <MdTimeline className="text-xl shrink-0 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium">Gitgraph</span>
          </Link>

        </nav>

        <div className="p-4 mt-auto border-t border-zinc-800">
          <Link
            to="/settings"
            activeProps={{ className: "text-white" }}
            inactiveProps={{ className: "text-zinc-500 hover:text-zinc-200" }}
            className="flex items-center justify-start w-fit transition-colors group"
          >
            <MdSettings className="text-2xl shrink-0 group-hover:rotate-45 transition-transform duration-300" />
          </Link>
        </div>
      </div>
    </aside>
  );
}