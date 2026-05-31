import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { CommitsAnalysis } from '@/components/dashboard/analysis/CommitsAnalysis'
import { ContributorsAnalysis } from '@/components/dashboard/analysis/ContributorsAnalysis'
import { BranchesAnalysis, PullRequestsAnalysis } from '@/components/dashboard/analysis/BranchPRAnalysis'
import { useRepoDashboard } from '@/hooks/useDashboardService'
import { MdArrowBack } from 'react-icons/md'

type Section = 'commits' | 'contributors' | 'branches' | 'pull-requests'
type Tab     = 'overview' | 'compare'

interface AnalysisSearch {
  section?: Section
  tab?:     Tab
}

const SECTIONS: { key: Section; label: string }[] = [
  { key: 'commits',       label: 'Commits'       },
  { key: 'contributors',  label: 'Contributors'  },
  { key: 'branches',      label: 'Branches'      },
  { key: 'pull-requests', label: 'Pull Requests' },
]

export const Route = createFileRoute('/repos/$repoId/analysis')({
  validateSearch: (search: Record<string, unknown>): AnalysisSearch => ({
    section: (search.section as Section) ?? 'commits',
    tab:     (search.tab     as Tab)     ?? 'overview',
  }),
  component: AnalysisPage,
})

function AnalysisPage() {
  const { repoId }       = Route.useParams()
  const { section, tab } = Route.useSearch()
  const navigate         = useNavigate({ from: '/repos/$repoId/analysis' })

  const { repo } = useRepoDashboard(repoId)

  const activeSection: Section = section ?? 'commits'
  const activeTab:     Tab     = tab     ?? 'overview'

  function setSection(s: Section) {
    navigate({ search: prev => ({ ...prev, section: s, tab: activeTab }) })
  }

  function setTab(t: Tab) {
    navigate({ search: prev => ({ ...prev, tab: t }) })
  }

  return (
    <div className="flex flex-col h-full">

      <div className="flex items-center gap-3 px-6 py-3 border-b border-zinc-800/60 bg-zinc-950">
        <Link
          to="/repos/$repoId"
          params={{ repoId }}
          className="text-zinc-600 hover:text-zinc-400 transition-colors shrink-0"
        >
          <MdArrowBack className="text-lg" />
        </Link>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-mono font-semibold text-zinc-200 truncate">
            {repo?.fullName ?? '…'}
          </p>
          <p className="text-[10px] font-mono text-zinc-600 mt-0.5">
            {repo?.description ?? 'Analysis'}
          </p>
        </div>

        <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest shrink-0">
          Analysis
        </span>
      </div>

      <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-1 bg-zinc-900/60 border border-zinc-800 rounded-lg p-0.5">
          {SECTIONS.map(s => (
            <button
              key={s.key}
              onClick={() => setSection(s.key)}
              className={cn(
                'text-[11px] font-mono font-semibold px-3 py-1.5 rounded-md transition-all',
                activeSection === s.key
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-zinc-900/60 border border-zinc-800 rounded-lg p-0.5">
          {(['overview', 'compare'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'text-[11px] font-mono font-semibold px-3 py-1.5 rounded-md capitalize transition-all',
                activeTab === t
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300',
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {activeSection === 'commits'       && <CommitsAnalysis       repoId={repoId} mode={activeTab} />}
        {activeSection === 'contributors'  && <ContributorsAnalysis  repoId={repoId} mode={activeTab} />}
        {activeSection === 'branches'      && <BranchesAnalysis      repoId={repoId} mode={activeTab} />}
        {activeSection === 'pull-requests' && <PullRequestsAnalysis  repoId={repoId} mode={activeTab} />}
      </div>
    </div>
  )
}