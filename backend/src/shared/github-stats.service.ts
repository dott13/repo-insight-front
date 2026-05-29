import { Injectable, Logger } from '@nestjs/common';
import { Octokit } from 'octokit';

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
          // Avoid double-counting commits that exist across merged branches
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