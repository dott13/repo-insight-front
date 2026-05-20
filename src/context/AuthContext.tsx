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

interface AuthContextType {
  user: User | null;
  loading: boolean;
  socket: Socket | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  socket: null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);

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

    const unlistenPromise = listen<string>(
      "deep-link-received",
      async (event) => {
        const url = event.payload;
        if (!url) return;
        const fragment = url.split("#")[1] ?? url.split("?")[1] ?? "";
        const params = new URLSearchParams(fragment);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        const providerToken = params.get("provider_token");
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error)
            console.error("Error setting session from deep link:", error);
        }

        if (providerToken) {
          localStorage.setItem("provider_token", providerToken);
        }
      },
    );

    return () => {
      subscription.unsubscribe();
      unlistenPromise.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const s = io(import.meta.env.VITE_API_URL, {
      query: { userId: user.id },
      transports: ["websocket"],
    });

    s.on("connect", () => console.log("WS connected"));
    s.on("disconnect", () => console.log("WS disconnected"));

    setSocket(s);

    return () => {s.disconnect();}

  }, [user?.id]);

  return (
    <AuthContext.Provider value={{ user, loading, socket }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
