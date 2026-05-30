import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useRef, useEffect } from 'react'
import {
  useReposList,
  DEFAULT_FILTERS,
  type RepoListItem,
  type RepoSortField,
} from '@/hooks/useReposList'
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  MdSearch, MdTune, MdArrowUpward, MdArrowDownward,
  MdOutlineStorage, MdCloud, MdLaptop, MdOpenInNew,
  MdChevronLeft, MdChevronRight
} from 'react-icons/md'

export const Route = createFileRoute('/repos/')({
  component: ReposListPage,
})

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86_400_000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7)  return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function scoreColor(score: number) {
  if (score > 500) return 'text-emerald-400'
  if (score > 100) return 'text-blue-400'
  if (score > 0)   return 'text-zinc-300'
  return 'text-zinc-600'
}

function mergeRateColor(rate: number, total: number) {
  if (total === 0) return 'text-zinc-600'
  if (rate >= 70)  return 'text-emerald-400'
  if (rate >= 40)  return 'text-yellow-400'
  return 'text-red-400'
}

function ProviderBadge({ isLocal, isRemote, provider }: Pick<RepoListItem, 'isLocal' | 'isRemote' | 'provider'>) {
  return (
    <div className="flex items-center gap-1 mt-1">
      {isRemote && (
        <span className="flex items-center gap-0.5 text-[10px] font-mono text-zinc-500 bg-zinc-800/80 px-1.5 py-0.5 rounded">
          <MdCloud className="text-xs" /> {provider}
        </span>
      )}
      {isLocal && (
        <span className="flex items-center gap-0.5 text-[10px] font-mono text-zinc-500 bg-zinc-800/80 px-1.5 py-0.5 rounded">
          <MdLaptop className="text-xs" /> local
        </span>
      )}
    </div>
  )
}

function SortHeader({
  label, field, currentSort, currentOrder, onSort, className = '',
}: {
  label: string
  field: RepoSortField
  currentSort: RepoSortField
  currentOrder: 'asc' | 'desc'
  onSort: (f: RepoSortField) => void
  className?: string
}) {
  const active = currentSort === field
  return (
    <TableHead
      className={`cursor-pointer select-none text-zinc-400 hover:text-zinc-200 transition-colors ${className}`}
      onClick={() => onSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        {active
          ? currentOrder === 'desc'
            ? <MdArrowDownward className="text-xs text-zinc-300" />
            : <MdArrowUpward   className="text-xs text-zinc-300" />
          : <MdArrowDownward className="text-xs opacity-20" />}
      </span>
    </TableHead>
  )
}

function RowSkeleton() {
  return (
    <TableRow className="border-zinc-800/50">
      {[40, 16, 12, 12, 12, 12, 14].map((w, i) => (
        <TableCell key={i}>
          <div className={`h-3.5 rounded bg-zinc-800/60 animate-pulse`} style={{ width: `${w * 4}px` }} />
        </TableCell>
      ))}
    </TableRow>
  )
}

function RepoRow({ item }: { item: RepoListItem }) {
  const navigate = useNavigate()

  return (
    <TableRow
      className="border-zinc-800/50 hover:bg-zinc-800/30 cursor-pointer transition-colors group"
      onClick={() => navigate({ to: '/repos/$repoId', params: { repoId: item.id } })}
    >
      <TableCell className="py-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-blue-400 group-hover:text-blue-300 transition-colors">
              {item.fullName}
            </span>
            {item.htmlUrl && (
              <a
                href={item.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="text-zinc-600 hover:text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MdOpenInNew className="text-xs" />
              </a>
            )}
          </div>
          {item.description && (
            <span className="text-xs text-zinc-600 truncate max-w-sm mt-0.5">{item.description}</span>
          )}
          <ProviderBadge isLocal={item.isLocal} isRemote={item.isRemote} provider={item.provider} />
        </div>
      </TableCell>

      <TableCell className="text-center">
        <span className={`font-mono text-sm font-bold ${scoreColor(item.contributionScore)}`}>
          {item.contributionScore.toLocaleString()}
        </span>
      </TableCell>

      <TableCell className="text-center">
        <div className="flex flex-col items-center">
          <span className="font-mono text-sm text-zinc-200 font-medium">
            {item.totalCommits.toLocaleString()}
          </span>
          {(item.totalAdditions > 0 || item.totalDeletions > 0) && (
            <span className="text-[10px] font-mono text-zinc-600">
              <span className="text-emerald-700">+{(item.totalAdditions / 1000).toFixed(1)}k</span>
              {' '}
              <span className="text-red-700">-{(item.totalDeletions / 1000).toFixed(1)}k</span>
            </span>
          )}
        </div>
      </TableCell>

      <TableCell className="text-center">
        {item.totalPRs > 0 ? (
          <div className="flex flex-col items-center">
            <span className={`font-mono text-sm font-medium ${mergeRateColor(item.prMergeRate, item.totalPRs)}`}>
              {item.prMergeRate}%
            </span>
            <span className="text-[10px] text-zinc-600 font-mono">
              {item.mergedPRs}m · {item.openPRs}o
            </span>
          </div>
        ) : (
          <span className="text-zinc-700 text-sm">—</span>
        )}
      </TableCell>

      <TableCell className="text-center">
        <span className="font-mono text-sm text-zinc-300">
          {item.contributorCount > 0 ? item.contributorCount : '—'}
        </span>
      </TableCell>

      <TableCell className="text-center">
        <span className="font-mono text-sm text-zinc-400">
          {item.branchCount > 0 ? item.branchCount : '—'}
        </span>
      </TableCell>

      <TableCell className="text-right">
        <span className="text-xs text-zinc-500 font-mono">
          {formatDate(item.lastContributedAt)}
        </span>
      </TableCell>
    </TableRow>
  )
}

function FilterBar({
  filters, onFilter, total, isFetching, page, limit
}: {
  filters: typeof DEFAULT_FILTERS
  onFilter: (f: Partial<typeof DEFAULT_FILTERS>) => void
  total: number
  isFetching: boolean
  page: number
  limit: number
}) {
  const [searchVal, setSearchVal] = useState(filters.search)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (searchVal !== filters.search) onFilter({ search: searchVal })
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchVal])

  const filterBtn = (label: string, active: boolean, onClick: () => void) => (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded text-xs font-mono transition-colors ${
        active
          ? 'bg-zinc-700 text-zinc-100'
          : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
      }`}
    >
      {label}
    </button>
  )

  const fromItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const toItem = Math.min(page * limit, total);

  return (
    <div className="flex flex-col gap-3 mb-5 shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MdOutlineStorage className="text-zinc-500" />
          <h1 className="text-lg font-bold text-zinc-100">Repositories</h1>
          <span className="text-xs font-mono text-zinc-600 ml-1">
            {isFetching ? '…' : `Showing ${fromItem}-${toItem} of ${total}`}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <MdSearch className="absolute left-0.5 top-1/2 -translate-y-1/2 text-zinc-500 text-base z-10" />
          <Input
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            placeholder="Search repositories..."
            className="pl-8 h-8 text-sm bg-zinc-900 border-zinc-800 text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-zinc-700"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <MdTune className="text-zinc-600 text-sm" />
          {filterBtn('All',    !filters.localOnly && !filters.remoteOnly, () => onFilter({ localOnly: false, remoteOnly: false }))}
          {filterBtn('Remote', filters.remoteOnly, () => onFilter({ remoteOnly: !filters.remoteOnly, localOnly: false }))}
          {filterBtn('Local',  filters.localOnly,  () => onFilter({ localOnly: !filters.localOnly, remoteOnly: false }))}
        </div>
      </div>
    </div>
  )
}

function ReposListPage() {
  const { items, total, page, totalPages, limit, isFetching, filters, applyFilters, goToPage } = useReposList()

  const handleSort = (field: RepoSortField) => {
    if (filters.sortBy === field) {
      applyFilters({ order: filters.order === 'desc' ? 'asc' : 'desc' })
    } else {
      applyFilters({ sortBy: field, order: 'desc' })
    }
  }

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] p-6 overflow-hidden">
      <div className="max-w-7xl mx-auto w-full flex flex-col h-full overflow-hidden">
        <FilterBar
          filters={filters}
          onFilter={applyFilters}
          total={total}
          isFetching={isFetching}
          page={page}
          limit={limit}
        />
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/60 overflow-y-auto flex-1 custom-scrollbar">
          <Table>
            <TableHeader className="sticky top-0 bg-zinc-950 z-20 shadow-[0_1px_0_0_rgba(39,39,42,1)]">
              <TableRow className="border-zinc-800/50 hover:bg-transparent">
                <SortHeader label="Repository"  field="fullName"          currentSort={filters.sortBy} currentOrder={filters.order} onSort={handleSort} className="w-[35%]" />
                <SortHeader label="Score"       field="contributionScore" currentSort={filters.sortBy} currentOrder={filters.order} onSort={handleSort} className="text-center" />
                <SortHeader label="Commits"     field="totalCommits"      currentSort={filters.sortBy} currentOrder={filters.order} onSort={handleSort} className="text-center" />
                <SortHeader label="PR Rate"     field="prMergeRate"       currentSort={filters.sortBy} currentOrder={filters.order} onSort={handleSort} className="text-center" />
                <TableHead className="text-center text-zinc-500 text-xs">Contributors</TableHead>
                <TableHead className="text-center text-zinc-500 text-xs">Branches</TableHead>
                <SortHeader label="Last Active" field="lastParsed"        currentSort={filters.sortBy} currentOrder={filters.order} onSort={handleSort} className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isFetching && items.length === 0 ? (
                Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} />)
              ) : items.length > 0 ? (
                items.map(item => <RepoRow key={item.id} item={item} />)
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16 text-zinc-600 font-mono text-sm">
                    {filters.search
                      ? `No repositories matching "${filters.search}"`
                      : 'No repositories found. Trigger a sync to populate.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-5 shrink-0 py-2">
            <Button
              variant="outline"
              size="icon"
              className="w-8 h-8 border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
              onClick={() => goToPage(page - 1)}
              disabled={page === 1 || isFetching}
            >
              <MdChevronLeft className="text-base" />
            </Button>

            {pageNumbers.map(num => (
              <Button
                key={num}
                variant={page === num ? "default" : "outline"}
                className={`w-8 h-8 font-mono text-xs ${
                  page === num 
                    ? "bg-zinc-200 text-zinc-950 hover:bg-zinc-300" 
                    : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                }`}
                onClick={() => goToPage(num)}
                disabled={isFetching}
              >
                {num}
              </Button>
            ))}

            <Button
              variant="outline"
              size="icon"
              className="w-8 h-8 border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
              onClick={() => goToPage(page + 1)}
              disabled={page === totalPages || isFetching}
            >
              <MdChevronRight className="text-base" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}