import { homeDir } from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api/core";

export const repoService = {
    async syncLocalRepos(user: any) {
        const searchEmails = [
            user.email,
            ...(user.user_metadata?.secondary_emails || [])
        ].filter(Boolean);

        const baseDir = await homeDir();

        const localPaths = await invoke<string[]>("run_git_scan", {
            basePath: baseDir,
            user_emails: searchEmails
        });

        const res = await fetch(`${import.meta.env.VITE_API_URL}/repos/sync`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              localPaths, 
              userEmail: user.email, 
              allUserEmails: searchEmails 
            }),
        });

        return res.json();
    }
}