import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        const unlistenPromise = listen<string>("deep-link-received", async (event) => {
            const url = event.payload;
            if (!url) return;
            const fragment = url.split("#")[1] ?? url.split("?")[1] ?? "";
            const params = new URLSearchParams(fragment);
            const accessToken = params.get("access_token");
            const refreshToken = params.get("refresh_token");
            if (accessToken && refreshToken) {
                const { error } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                });
                if (error) console.error("Error setting session from deep link:", error);
            }   
        });

        return () => {
            subscription.unsubscribe();
            unlistenPromise.then((fn) => fn());
        }
    }, []);

    return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    return useContext(AuthContext);
}