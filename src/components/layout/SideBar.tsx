import { Link } from "@tanstack/react-router";
import { MdDashboard, MdHome, MdSettings, MdTimeline } from "react-icons/md";

const navItems = [
    { name: "Home", to: "/", icon: MdHome },
    { name: "Dashboard", to: "/dashboard", icon: MdDashboard},
    { name: "Gitgraph", to: "/graph", icon: MdTimeline },
];

export function SideBar({ isOpen }: { isOpen: boolean }) {
    return (
        <aside
            className={`sidebar-transition border-zinc-800 bg-zinc-950 flex flex-col h-full border-r ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`}
        >
            <div className="w-64 flex flex-col h-full">
                <nav className="flex-1 px-3 py-4 space-y-1">
                    {navItems.map((item) => (
                        <Link
                            key={item.to}
                            to={item.to}
                            activeProps={{ className: "bg-zinc-900 text-white" }}
                            inactiveProps={{ className: "text-zinc-200 hover:text-zinc-100 hover:bg-zinc-900/50" }}
                            className="flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-200 group"
                        >
                            <item.icon className="text-xl shrink-0 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-medium">{item.name}</span>
                        </Link>
                    ))}
                </nav>
                <div className="p-4 border-t border-zinc-800">
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