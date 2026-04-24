import { signInWithGitHub, signInWithGitlab } from "@/lib/auth"
import { Button } from "../ui/button"
import { FaGithub } from "react-icons/fa"
import { SiGitlab } from "react-icons/si"
export function AuthShell() {
    return (
        <div className="flex flex-col items-center justify-center w-full max-w-md p-8 space-y-8 bg-zinc-900/50 border border-zinc-800 rounded-2xl backdrop-blur-sm shadow-2xl">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tighter text-white">
          Repo Insight
        </h1>
        <p className="text-zinc-400 text-sm">
          Connect your git provider to analyze your contributions.
        </p>
      </div>

      <div className="flex flex-col w-full gap-3">
        <Button 
          onClick={() => signInWithGitHub()}
          variant="outline"
          className="h-12 bg-zinc-950 border-zinc-700 hover:bg-zinc-800 hover:text-white transition-all group"
        >
          <FaGithub className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
          Continue with GitHub
        </Button>

        <Button 
          onClick={() => signInWithGitlab()}
          className="h-12 bg-orange-600 hover:bg-orange-700 text-white border-none transition-all group"
        >
          <SiGitlab className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
          Continue with GitLab
        </Button>
      </div>

      <div className="text-center">
        <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold">
          Secure OAuth flow powered by Supabase Auth
        </p>
      </div>
    </div>
    )
}