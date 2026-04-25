import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { User } from "@supabase/supabase-js";

interface RouterContext {
  user: User | null;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
});