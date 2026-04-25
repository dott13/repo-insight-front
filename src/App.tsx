import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import "./App.css";
import { useAuth } from "@/context/AuthContext";
import { AuthShell } from "./components/auth/AuthShell";

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  export interface Register {
    router: typeof router;
  }
}

function App() {
  const { user, loading } = useAuth();

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

  return <RouterProvider router={router} />;
}

export default App;