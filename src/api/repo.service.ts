import { homeDir } from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api/core";
import { supabase } from "@/lib/supabase";

export const repoService = {
    async syncLocalRepos(user: any) {
        const { data: { session } } = await supabase.auth.getSession();
        const gitHubToken = session?.provider_token ?? localStorage.getItem("provider_token");
        const searchEmails = [
            user.email,
            ...(user.user_metadata?.secondary_emails || [])
        ].filter(Boolean);

        const baseDir = await homeDir();

        const localPaths = await invoke<string[]>("run_git_scan", {
            basePath: baseDir,
            userEmails: searchEmails
        });
        console.log("baseDir:", baseDir);
        console.log("Found local paths:", localPaths);

        const res = await fetch(`${import.meta.env.VITE_API_URL}/repos/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            localPaths, 
            userEmail: user.email, 
            deviceId: "tauri-device",
            gitHubToken,
            allUserEmails: searchEmails 
            }),
        });

        const text = await res.text();
        if (!res.ok) throw new Error(`Server Error (${res.status}): ${text}`);
        return JSON.parse(text);
    }
}