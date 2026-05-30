import { Injectable, Logger } from '@nestjs/common';
import { Octokit } from 'octokit';
import pLimit from 'p-limit';

export interface WeekStat {
  w: number; // ISO Week timestamp
  a: number; // Additions
  d: number; // Deletions
  c: number; // Commit count
}

export interface ContributorStat {
  total: number;
  weeks: WeekStat[];
  author: {
    login: string;
    avatar_url: string;
  } | null;
}

const DIFF_SAMPLE_SIZE = 15;
const DIFF_SINCE_DAYS = 15;

@Injectable()
export class GithubStatsService {
  private readonly logger = new Logger(GithubStatsService.name);
  private readonly cache = new Map<string, { data: ContributorStat[]; expiresAt: number }>();

  async getContributorStats(
    octokit: Octokit,
    owner: string,
    repo: string,
  ): Promise<ContributorStat[]> {
    const key = `${owner}/${repo}`;
    const cached = this.cache.get(key);
    
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    try {
      this.logger.log(`Initiating deep exhaustive scan for ${key} across ALL branches...`);

      const branches = await octokit.paginate(octokit.rest.repos.listBranches, {
        owner,
        repo,
        per_page: 100,
      });

      const statsMap = new Map<string, ContributorStat>();
      const processedCommitShas = new Set<string>();

      for (const branch of branches) {
        this.logger.debug(`Scanning branch [${branch.name}] for ${key}`);

        const commits = await octokit.paginate(octokit.rest.repos.listCommits, {
          owner,
          repo,
          sha: branch.commit.sha, // Force scanning this specific branch timeline
          per_page: 100,
        });

        for (const item of commits) {
          if (processedCommitShas.has(item.sha)) continue;
          processedCommitShas.add(item.sha);

          const login = item.author?.login || item.commit.author?.name || 'Unknown';
          const avatarUrl = item.author?.avatar_url || '';
          
          const commitDate = item.commit.author?.date ? new Date(item.commit.author.date) : new Date();
          const startOfWeekTimestamp = Math.floor(this.getStartOfWeek(commitDate).getTime() / 1000);

          if (!statsMap.has(login)) {
            statsMap.set(login, {
              total: 0,
              weeks: [],
              author: item.author ? { login, avatar_url: avatarUrl } : { login, avatar_url: '' },
            });
          }

          const stats = statsMap.get(login)!;
          stats.total += 1;

          let weekBlock = stats.weeks.find((w) => w.w === startOfWeekTimestamp);
          if (!weekBlock) {
            weekBlock = { w: startOfWeekTimestamp, a: 0, d: 0, c: 0 };
            stats.weeks.push(weekBlock);
          }
          weekBlock.c += 1;
        }
      }

      await this.hydrateDiffStats(octokit, owner, repo, statsMap, processedCommitShas);
      
      const result = Array.from(statsMap.values());
      result.forEach(stat => stat.weeks.sort((a, b) => a.w - b.w));

      this.cache.set(key, {
        data: result,
        expiresAt: Date.now() + 5 * 60 * 1000, // Cache for 5 minutes
      });

      this.logger.log(`Deep scan complete. Found ${processedCommitShas.size} unique commits across ${branches.length} branches.`);
      return result;
    } catch (e: any) {
      this.logger.error(`Exhaustive parsing failed for ${key}: ${e.message}`);
      return [];
    }
  }

  private async hydrateDiffStats(
    octokit: Octokit,
    owner: string,
    repo: string,
    statsMap: Map<string, ContributorStat>,
    allShas: Set<string>,
  ): Promise<void> {
    const since = new Date();
    since.setDate(since.getDate() - DIFF_SINCE_DAYS);
    const sinceTs = since.getTime();
 
    const shaToMeta = new Map<string, { login: string; weekTimestamp: number }>();
 
    for (const [login, stat] of statsMap) {
      for (const week of stat.weeks) {
        const weekMs = week.w * 1000;
        if (weekMs < sinceTs) continue; 
      }
    }
 
    const limit = pLimit(3);
 
    await Promise.all(
      Array.from(statsMap.entries()).map(([login, stat]) =>
        limit(async () => {
          const hasRecentActivity = stat.weeks.some(w => w.w * 1000 >= sinceTs);
          if (!hasRecentActivity) return;
 
          try {
            const recentCommits = await octokit.paginate(octokit.rest.repos.listCommits, {
              owner,
              repo,
              author: login,
              since: since.toISOString(),
              per_page: 100,
            });
 
            const sample = recentCommits.slice(0, DIFF_SAMPLE_SIZE);
            if (!sample.length) return;
 
            const diffLimit = pLimit(5);
            let sampledAdditions = 0;
            let sampledDeletions = 0;
            const sampledWeekMap = new Map<number, { a: number; d: number }>();
 
            await Promise.all(
              sample.map(commit =>
                diffLimit(async () => {
                  try {
                    const { data } = await octokit.rest.repos.getCommit({
                      owner,
                      repo,
                      ref: commit.sha,
                    });
 
                    const additions = data.stats?.additions ?? 0;
                    const deletions = data.stats?.deletions ?? 0;
                    sampledAdditions += additions;
                    sampledDeletions += deletions;
 
                    // Map to week block
                    const commitDate = commit.commit.author?.date
                      ? new Date(commit.commit.author.date)
                      : new Date();
                    const weekTs = Math.floor(
                      this.getStartOfWeek(commitDate).getTime() / 1000,
                    );
 
                    const existing = sampledWeekMap.get(weekTs) ?? { a: 0, d: 0 };
                    existing.a += additions;
                    existing.d += deletions;
                    sampledWeekMap.set(weekTs, existing);
                  } catch {
                    // Skip individual commit failures silently
                  }
                }),
              ),
            );
 
            for (const [weekTs, diff] of sampledWeekMap) {
              const weekBlock = stat.weeks.find(w => w.w === weekTs);
              if (weekBlock) {
                weekBlock.a += diff.a;
                weekBlock.d += diff.d;
              }
            }
 
            const totalCommitsInSample = sample.length;
            const totalCommitsForContributor = stat.total;
 
            if (totalCommitsInSample < totalCommitsForContributor && sampledAdditions > 0) {
              const scaleFactor = totalCommitsForContributor / totalCommitsInSample;
              for (const week of stat.weeks) {
                const weekMs = week.w * 1000;
                if (weekMs < sinceTs && week.a === 0 && week.c > 0) {
                  const avgAdditionsPerCommit = sampledAdditions / totalCommitsInSample;
                  const avgDeletionsPerCommit = sampledDeletions / totalCommitsInSample;
                  week.a = Math.round(avgAdditionsPerCommit * week.c);
                  week.d = Math.round(avgDeletionsPerCommit * week.c);
                }
              }
            }
          } catch (e: any) {
            this.logger.warn(`Could not hydrate diffs for ${login} in ${owner}/${repo}: ${e.message}`);
          }
        }),
      ),
    );
  }

  clearCache(owner: string, repo: string): void {
    this.cache.delete(`${owner}/${repo}`);
  }

  private getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }
}