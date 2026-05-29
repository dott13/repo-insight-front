import { Link } from "@tanstack/react-router";
import { MdDashboard, MdHome, MdSettings, MdTimeline } from "react-icons/md";
import { useHomeTable } from "@/hooks/useHomeService";

export function SideBar({ isOpen }: { isOpen: boolean }) {
  const { rows } = useHomeTable();

  const randomRepoId = rows.length > 0 
    ? rows[Math.floor(Math.random() * rows.length)].id.toString()
    : null;
  console.log("Randomly selected repoId for dashboard link:", randomRepoId);
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
            to="/repos/$repoId"
            onClick={(e) => {console.log("Dashboard link clicked with repoId:", randomRepoId)}}
            params={{ repoId: randomRepoId ?? "no-repos-loaded" }}
            disabled={!randomRepoId}
            activeProps={{ className: "bg-zinc-900 text-white" }}
            inactiveProps={{ className: "text-zinc-200 hover:text-zinc-100 hover:bg-zinc-900/50" }}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-200 group ${!randomRepoId ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            <MdDashboard className="text-xl shrink-0 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium">
              {!randomRepoId ? "Loading Dashboard..." : "Dashboard"}
            </span>
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