import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { useHomeTable } from "@/hooks/useHomeService";
import { RepoTableRow } from "@/api/home.service";

function formatDate(dateStr: string | null): string {
  if (!dateStr) {
    return "—";
  }

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function PRMergeRateBadge({ rate, total }: { rate: number; total: number }) {
  if (total === 0) return <span className="text-zinc-600">—</span>;
  const color =
    rate >= 70
      ? "text-emerald-400"
      : rate >= 40
        ? "text-yellow-400"
        : "text-red-400";
  return <span className={`${color} font-mono text-sm`}>{rate}%</span>;
}

function RowSkeleton() {
  return (
    <TableRow className="border-zinc-800">
      {Array.from({ length: 5 }).map((_, i) => (
        <TableCell key={i}>
          <div
            className="h-4 rounded bg-zinc-800/70 animate-pulse"
            style={{ width: `${60 + i * 10}%` }}
          />
        </TableCell>
      ))}
    </TableRow>
  );
}

export function ContributionTable() {
  const { rows, total, hasMore, isFetching, loadMore } = useHomeTable();

  return (
    <section className="flex-1 p-6 overflow-hidden">
      <div className="max-w-7xl mx-auto flex flex-col h-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">All Contributions</h2>
          <span className="text-sm text-zinc-400">
            {total} Repositories found
          </span>
        </div>

        <div className="rounded-md border border-zinc-800 bg-zinc-900/30 overflow-auto">
          <Table>
            <TableHeader className="bg-zinc-900/50">
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="w-100 text-zinc-200">
                  Repository
                </TableHead>
                <TableHead className="text-center text-zinc-200">
                  Contributors
                </TableHead>
                <TableHead className="text-center text-zinc-200">
                  Your Commits
                </TableHead>
                <TableHead className="text-center text-zinc-200">
                  PR Merge Rate
                </TableHead>
                <TableHead className="text-right text-zinc-200">
                  Last Contribution
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <RepoRow key={row.id} row={row} />
              ))}
              
              {isFetching && rows.length === 0 && (
                <>
                  <RowSkeleton />
                  <RowSkeleton />
                  <RowSkeleton />
                  <RowSkeleton />
                  <RowSkeleton />
                </>
              )}
              {!isFetching && rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-12 text-zinc-500 "
                  >
                    No repositories found. Sync will populate this list.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {hasMore && (
          <div className="flex justify-center mt-6">
            <Button
              variant="outline"
              className="bordder-zinc-800 hover:bg-zinc-800/40"
              onClick={loadMore}
              disabled={isFetching}
            >
              {isFetching ? "Loading..." : "Load More"}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

function RepoRow({ row }: { row: RepoTableRow;}) {
  const navigate = useNavigate();

  return (
    <TableRow
      className="border-zinc-800 hover:bg-zinc-800/40 cursor-pointer transition-colors"
      onClick={() => 
        navigate({
          to: "/repos/$repoId",
          params: { repoId: row.id.toString() }
        })
      }
    >
      <TableCell>
        <div className="flex flex-col">
          <span className="font-mono text-blue-400">{row.fullName}</span>
          {row.description && (
            <span className="text-xs text-zinc-500 truncate max-w-xs mt-0.5">
              {row.description}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-center text-zinc-300">
        {row.contributorCount}
      </TableCell>
      <TableCell className="text-center font-bold text-white">
        {row.userCommits.toLocaleString()}
      </TableCell>
      <TableCell className="text-center">
        <PRMergeRateBadge rate={row.prMergeRate} total={row.totalPRs} />
      </TableCell>
      <TableCell className="text-right text-zinc-400 text-sm">
        {formatDate(row.lastContributedAt)}
      </TableCell>
    </TableRow>
  );
}