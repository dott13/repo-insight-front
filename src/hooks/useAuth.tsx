import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";

export function useAuth() {
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
                if (error) console.error("Session error:", error);
            }
        });

        return () => {
            subscription.unsubscribe();
            unlistenPromise.then((fn) => fn());
        };
    }, []);

    return { user, loading };
}