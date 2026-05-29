import { RepoCard } from '@/components/shared/RepoCard'
import { useHomeHighlights } from '@/hooks/useHomeService';
import { useNavigate } from '@tanstack/react-router';

function HighlightSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 animate-pulse h-full">
      <div className="h-3 w-24 bg-zinc-800 rounded mb-3"></div>
      <div className="h-5 w-48 bg-zinc-700 rounded mb-2"></div>
      <div className="h-7 w-20 bg-zinc-600 rounded"></div>
    </div>
  );
}

export function HighlightsSection() {
  const { highlights, isFetching } = useHomeHighlights();
  const navigate = useNavigate();

  return (
    <section className="h-1/3 p-6 border-b border-zinc-800 bg-zinc-900/50">
      <div className="max-w-7xl mx-auto h-full">
        <h2 className="text-zinc-500 text-s font-bold uppercase mb-4 tracking-widest">
          Highlights
        </h2>
 
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100%-2rem)]">
          {isFetching && !highlights ? (
            <>
              <HighlightSkeleton />
              <HighlightSkeleton />
              <HighlightSkeleton />
            </>
          ) : highlights ? (
            <>
              <RepoCard
                name={highlights.mostCommits.fullName}
                qualifier={highlights.mostCommits.qualifier}
                metric={highlights.mostCommits.metric}
                onClick={() => navigate({to: "/repos/$repoId", params: { repoId: highlights.mostCommits.repoId.toString() }})}
              />
              <RepoCard
                name={highlights.topScore.fullName}
                qualifier={highlights.topScore.qualifier}
                metric={highlights.topScore.metric}
                onClick={() => navigate({to: "/repos/$repoId", params: { repoId: highlights.topScore.repoId.toString() }})}
              />
              {highlights.bestMergeRate ? (
                <RepoCard
                  name={highlights.bestMergeRate.fullName}
                  qualifier={highlights.bestMergeRate.qualifier}
                  metric={highlights.bestMergeRate.metric} 
                  onClick={() => navigate({to: "/repos/$repoId", params: { repoId: highlights.bestMergeRate!.repoId.toString() }})}
                />
              ) : (
                <RepoCard
                  name="—"
                  qualifier="Best PR Merge Rate"
                  metric="No PR data yet"
                />
              )}
            </>
          ) : (
            <>
              <RepoCard name="—" qualifier="Most Commits" metric="Syncing..." />
              <RepoCard name="—" qualifier="Top Contribution Score" metric="Syncing..." />
              <RepoCard name="—" qualifier="Best PR Merge Rate" metric="Syncing..." />
            </>
          )}
        </div>
      </div>
    </section>
  );
}