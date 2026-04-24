import { RepoCard } from '@/components/shared/RepoCard'

export function HighlightsSection() {
    return (
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
    )
}