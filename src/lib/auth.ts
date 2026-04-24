import { supabase } from "./supabase";

export const signInWithGitHub = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
            redirectTo: 'repo-insight://auth-callback',
            skipBrowserRedirect: true,
        }
    });
    if (error) {
        console.error("Error signing in with GitHub:", error);
    }
}

export const signInWithGitlab = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'gitlab',
        options: {
            redirectTo: 'repo-insight://auth-callback',
            skipBrowserRedirect: true,
        }
    });
    if (error) {
        console.error("Error signing in with GitLab:", error);
    }
}