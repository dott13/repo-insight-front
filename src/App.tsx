import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import "./App.css";
import { useAuth } from "./hooks/useAuth";
import { AuthShell } from "./components/auth/AuthShell";
import { onOpenUrl } from "@tauri-apps/plugin-deep-link";
import { useEffect } from "react";

const router = createRouter({ routeTree });


declare module "@tanstack/react-router" {
  export interface Register {
    router: typeof router;
  }
}

function App() {
  const { user, loading } = useAuth();

  useEffect(() => {
  onOpenUrl((urls) => {
    console.log("deep link received:", urls);
    alert(JSON.stringify(urls)); // ugly but confirms it works
  });
}, []);

  if (loading) {
    return <div className="h-screen flex items-center justify-center bg-zinc-950 text-zinc-500">Initializing...</div>;
  }
  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-950">
        <AuthShell />
      </div>
    );
  }
  return <RouterProvider router={router} context={{user}}/>;
}

export default App;
