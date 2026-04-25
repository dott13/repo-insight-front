import { supabase } from "./supabase";
import { open } from "@tauri-apps/plugin-shell";

export const signInWithGitHub = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: "repo-insight://auth-callback",
      skipBrowserRedirect: true,
    },
  });
  if (error) { console.error(error); alert(error.message); return; }
  if (data.url) await open(data.url);
};

export const signInWithGitlab = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "gitlab",
    options: {
      redirectTo: "repo-insight://auth-callback",
      skipBrowserRedirect: true,
    },
  });
  if (error) { console.error(error); alert(error.message); return; }
  if (data.url) await open(data.url);
};