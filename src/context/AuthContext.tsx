import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useState,
} from "react";
import { listen } from "@tauri-apps/api/event";
import { io, Socket } from "socket.io-client";

interface SyncState {
  isSyncing: boolean;
  syncedRepoIds: Set<string>;
  totalRepos: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  socket: Socket | null;
  syncState: SyncState;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  socket: null,
  syncState: { isSyncing: false, syncedRepoIds: new Set(), totalRepos: 0 },
});


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [syncState, setSyncState] = useState<SyncState>({
    isSyncing: false,
    syncedRepoIds: new Set(),
    totalRepos: 0,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const unlistenPromise = listen<string>("deep-link-received", async (event) => {
      const url = event.payload;
      if (!url) return;

      // Parse both hash and query string Supabase uses hash, provider token in query
      const fragment = url.split("#")[1] ?? "";
      const query = url.split("?")[1]?.split("#")[0] ?? "";

      const hashParams = new URLSearchParams(fragment);
      const queryParams = new URLSearchParams(query);

      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const providerToken =
        hashParams.get("provider_token") ?? queryParams.get("provider_token");

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) console.error("[auth] Error setting session from deep link:", error);
      }

      if (providerToken) {
        localStorage.setItem("provider_token", providerToken);
      }
    });

    return () => {
      unlistenPromise.then((fn) => fn());
    };
  }, []);


  useEffect(() => {
    if (!user) return;

    const s = io(import.meta.env.VITE_API_URL, {
      query: { userId: user.id },
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    s.on("connect", () => {
      console.debug("[socket] Connected:", s.id);
    });

    s.on("disconnect", (reason) => {
      console.debug("[socket] Disconnected:", reason);
    });

    // Fired once per repo as the processor finishes it
    s.on("repo:synced", ({ repoId }: { repoId: string }) => {
      setSyncState((prev) => ({
        ...prev,
        isSyncing: true,
        syncedRepoIds: new Set([...prev.syncedRepoIds, repoId]),
      }));
    });

    // Fired once when the entire Bull job finishes
    s.on("sync:complete", ({ totalRepos }: { totalRepos: number }) => {
      setSyncState((prev) => ({
        ...prev,
        isSyncing: false,
        totalRepos,
      }));
    });

    setSocket(s);

    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [user?.id]);

  return (
    <AuthContext.Provider value={{ user, loading, socket, syncState }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}