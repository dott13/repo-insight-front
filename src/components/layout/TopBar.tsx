import { Button } from "../ui/button";
import { MdMenu, MdNotificationsNone } from "react-icons/md";
import { HiOutlineUser } from "react-icons/hi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth.tsx";
import { supabase } from "@/lib/supabase.ts";

interface TopBarProps {
    onToggleSidebar: () => void;
}

export function TopBar({onToggleSidebar}: TopBarProps) {
    const { user } = useAuth();
    
    const handleSignOut = async () => {
        await supabase.auth.signOut();
    };
    return (
        <header className="h-16 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between px-4 sticky top-0 z-50">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="text-zinc-200 hover:text-white relative" onClick={onToggleSidebar}>
                    <MdMenu className="text-2xl" />
                </Button>
                <span className="font-semibold text-zinc-100 hidden sm:block">Repo Insight</span>
            </div>

            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="text-zinc-200 hover:text-white relative">
                    <MdNotificationsNone className="text-2xl" />
                    <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-orange-500 rounded-full border-2 border-zinc-950" />
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-9 w-9 rounded-full! p-0 border border-zinc-800 overflow-hidden">
                            {user?.user_metadata?.avatar_url ? (
                                <img src={user.user_metadata.avatar_url} alt="Avatar" className="absolute inset-0 h-full w-full rounded-full object-cover" key={user?.user_metadata?.avatar_url}/>
                            ) : (
                                <HiOutlineUser className="text-xl text-zinc-400" />
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-zinc-900 border-zinc-800 text-zinc-200">
                        <DropdownMenuLabel>
                            <p className="text-sm font-medium text-white truncate">{user?.email}</p>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-zinc-800"/>
                        <DropdownMenuItem className="cursor-pointer">Profile</DropdownMenuItem>
                        <DropdownMenuItem onSelect={handleSignOut} className="text-red-400 cursor-pointer">Sign Out</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            
        </header>
    );
}