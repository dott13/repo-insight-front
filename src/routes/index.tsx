import { RepoCard } from '@/components/shared/RepoCard'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage,
})

// Mock Data for your repositories
const REPOS = [
  { name: "isac-newton/gravity-engine", contributors: 1, myCommits: 1420, lastContributed: "2026-04-20" },
  { name: "facebook/react", contributors: 1600, myCommits: 12, lastContributed: "2026-03-15" },
  { name: "dott13/repo-insight", contributors: 1, myCommits: 45, lastContributed: "Today" },
  { name: "denoland/deno", contributors: 800, myCommits: 2, lastContributed: "2025-12-01" },
  // ... imagine 6 more here
]

function HomePage() {
  return (
    <div className='flex flex-col min-h-screen'>
      {/*Highlight Section*/}
      <section className='h-1/3 p-6 border-b border-zinc-800 bg-zinc-900/50'>
        <div className='max-w-7xl mx-auto h-full'>
          <h2 className='text-zinc-500 text-s font-bold uppercase mb-4 tracking-widest'>
            Highlights
          </h2>

          <div className='grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100%-2rem)]'>
            <RepoCard 
              name="isac-newton/gravity-engine-in-matlab"
              qualifier="Largest Codebase"
              metric="1.2M LOC"
            />
            <RepoCard 
              name="dott13/repo-insight-front"
              qualifier="Most Time Consumed"
              metric="420 Hours"
            />
            <RepoCard 
              name="facebook/react"
              qualifier="Most Contributions"
              metric="850 Pushes"
            />
          </div>
        </div>
      </section>
      {/*Repos List Section*/}
      <section className="flex-1 p-6 overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col h-full">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">All Contributions</h2>
            <span className="text-sm text-zinc-400">{REPOS.length} Repositories found</span>
          </div>

          <div className="rounded-md border border-zinc-800 bg-zinc-900/30 overflow-auto">
            <Table>
              <TableHeader className="bg-zinc-900/50">
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="w-100 text-zinc-200">Repository Name</TableHead>
                  <TableHead className="text-center text-zinc-200">Total Contributors</TableHead>
                  <TableHead className="text-center text-zinc-200">Your Commits</TableHead>
                  <TableHead className="text-right text-zinc-200">Last Contribution</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {REPOS.map((repo) => (
                  <TableRow key={repo.name} className="border-zinc-800 hover:bg-zinc-800/40 cursor-pointer transition-colors">
                    <TableCell className="font-mono text-blue-400">{repo.name}</TableCell>
                    <TableCell className="text-center text-zinc-300">{repo.contributors}</TableCell>
                    <TableCell className="text-center font-bold text-white">{repo.myCommits}</TableCell>
                    <TableCell className="text-right text-zinc-400">{repo.lastContributed}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination/Load More Placeholder */}
          <div className="mt-6 flex justify-center">
            <Button variant="outline" className="border-zinc-800 hover:bg-zinc-800">
              Load More Repositories
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
