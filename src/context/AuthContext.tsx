import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useState,
  useRef,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { io, Socket } from "socket.io-client";
import { router } from "@/App";

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
  const handledAuthRef = useRef(false);

const handleDeepLinkUrl = async (url: string) => {
  if (handledAuthRef.current) return;
  handledAuthRef.current = true;

  try {
    console.log("[DeepLink] Received URL raw payload:", url);
    
    // Split safely on either hash or query parameters without relying on strict URL parsing
    const normUrl = url.replace("repo-insight://", "");
    const credentialPart = normUrl.includes("#") ? normUrl.split("#")[1] : normUrl.split("?")[1];
    
    if (!credentialPart) {
      console.warn("[DeepLink] No auth payload token segment discovered.");
      handledAuthRef.current = false;
      return;
    }

    const params = new URLSearchParams(credentialPart);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const providerToken = params.get("provider_token");

    if (accessToken && refreshToken) {
      console.log("[DeepLink] Attempting Supabase session initialization...");
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        console.error("[DeepLink] Supabase session assignment failed:", error);
        handledAuthRef.current = false;
        return;
      }
      
      console.log("[DeepLink] Supabase session synchronized successfully!");
      
      if (providerToken) {
        localStorage.setItem("provider_token", providerToken);
      }

      // Defer navigation slightly so App.tsx can mount the RouterProvider 
      // reactive to the new user state update
      setTimeout(() => {
        router.navigate({ to: "/" })
          .catch((err) => console.error("[DeepLink] TanStack navigation rejected:", err));
      }, 150);

    } else {
      console.warn("[DeepLink] Tokens missing from payload parameters.");
      handledAuthRef.current = false;
    }
  } catch (err) {
    console.error("[DeepLink] Fatal parsing breakdown:", err);
    handledAuthRef.current = false;
  }
};

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
    invoke<string | null>("get_pending_deep_link")
      .then(async (url) => {
        if (url) {
          await handleDeepLinkUrl(url);
        }
      })
      .catch(console.error);
    const unlistenPromise = listen<string>(
      "deep-link-received",
      async (event) => {
        console.log("Deep link received while running:", event.payload);

        handledAuthRef.current = false;
        await handleDeepLinkUrl(event.payload);
      },
    );

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
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

    s.on("repo:synced", ({ repoId }: { repoId: string }) => {
      setSyncState((prev) => ({
        ...prev,
        isSyncing: true,
        syncedRepoIds: new Set([...prev.syncedRepoIds, repoId]),
      }));
    });

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
