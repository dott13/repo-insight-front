import { Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { Octokit } from 'octokit';
import pLimit from 'p-limit';
import { PrismaService } from '../prisma/prisma.service';
import { ReposGateway } from './repos.gateway';
import { ContributorsService } from '../contributors/contributors.service';
import { BranchesService } from '../branches/branches.service';
import { PullRequestsService } from '../pull-requests/pull-requests.service';
import { CommitStatsService } from '../commit-stats/commit-stats.service';
import { GithubStatsService } from '../shared/github-stats.service';

interface RepoJobData {
  userId: string;
  gitHubToken: string;
  userLogin: string;
  repos: Array<{ id: string; fullName: string }>;
}

const STALE_THRESHOLD_DAYS = 15;

@Processor('repos')
export class ReposProcessor {
  private readonly logger = new Logger(ReposProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: ReposGateway,
    private readonly contributorsService: ContributorsService,
    private readonly branchesService: BranchesService,
    private readonly pullRequestsService: PullRequestsService,
    private readonly commitStatsService: CommitStatsService,
    private readonly githubStats: GithubStatsService,
  ) {}

  @Process({ name: 'calculate-scores', concurrency: 2 })
  async handleScoreCalculation(job: Job<RepoJobData>): Promise<void> {
    const { userId, gitHubToken, userLogin, repos } = job.data;
    this.logger.log(
      `Starting clean sync execution for ${repos.length} repos (user: ${userId})`,
    );

    const limit = pLimit(2);

    const octokit = new Octokit({ auth: gitHubToken });

    const { active, stale} = await this.partitionByActivity(octokit, repos);

    if (stale.length > 0) {
      this.logger.log(`Skipping ${stale.length} stale repos (no activity in ${STALE_THRESHOLD_DAYS} days): ` + 
        stale.map(r => r.fullName).join(', ')
      );
      
      for (const repo of stale) {
        this.gateway.emitScoreUpdate(userId, repo.id);
      }
    }

    this.logger.log(`Processing ${active.length} active repos for user ${userId}`);

    await Promise.allSettled(
      repos.map((repo) =>
        limit(async () => {
          try {
            await this.processRepo(repo, gitHubToken, userLogin);
            this.gateway.emitScoreUpdate(userId, repo.id);
          } catch (e) {
            this.logger.error(
              `Failed deep sync execution for ${repo.fullName}: ${e instanceof Error ? e.message : String(e)}`,
            );
          } finally {
            const [owner, repoName] = repo.fullName.split('/');
            this.githubStats.clearCache(owner, repoName);
          }
        }),
      ),
    );

    this.gateway.emitSyncComplete(userId, repos.length);
    this.logger.log(`Deep sync completely evaluated for user ${userId}`);
  }

  private async partitionByActivity(
    octokit: Octokit,
    repos: Array<{ id: string; fullName: string }>,
  ): Promise<{ 
    active: Array<{ id: string; fullName: string }>;
    stale: Array<{ id: string; fullName: string }>;
  }> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - STALE_THRESHOLD_DAYS);

    const dbRepos = await this.prisma.repository.findMany({
      where: { id: { in: repos.map(r => r.id) } },
      select: { id: true, lastParsed: true },
    });

    const lastParsedMap = new Map(dbRepos.map(r => [r.id, r.lastParsed]));

    const limit = pLimit(10);

    const results = await Promise.all(
      repos.map( repo => limit(async () => {
        const lastParsed = lastParsedMap.get(repo.id);

        if (!lastParsed) return { repo, active: true, reason: 'never synced'};

        try {
          const [owner, repoName] = repo.fullName.split('/');
          const { data } = await octokit.rest.repos.get({owner, repo: repoName});
          const pushedAt = data.pushed_at ? new Date(data.pushed_at) : null;

          if (!pushedAt || pushedAt > cutoff) {
            return { repo, active: true, reason: `pushed ${pushedAt?.toDateString()}` };
          }

          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          if ( lastParsed < sevenDaysAgo && pushedAt > lastParsed) { 
            return { repo, active: true, reason: `db data outdated` };
          }

          return { repo, active: false, reason: `stale (pushed ${pushedAt?.toDateString()}, lastParsed ${lastParsed.toDateString()})` };
        } catch (e) {
          this.logger.warn(`Could not check activity for ${repo.fullName}, including in sync: ${e instanceof Error ? e.message : String(e)}`);
          return { repo, active: true, reason: 'error checking activity' };
        }
      })
      ),
    );

    results.forEach(r => 
      this.logger.debug(`${r.repo.fullName}: ${r.active ? 'ACTIVE' : 'STALE'} (${r.reason})`)
    )

    return {
      active: results.filter(r => r.active).map(r => r.repo),
      stale: results.filter(r => !r.active).map(r => r.repo),
    };
  }

  private async processRepo(
    repo: { id: string; fullName: string },
    gitHubToken: string,
    userLogin: string,
  ): Promise<void> {
    this.logger.log(`Processing ${repo.fullName}`);
    const octokit = new Octokit({ auth: gitHubToken });
    const [owner, repoName] = repo.fullName.split('/');

    const { data: repoData } = await octokit.rest.repos.get({
      owner,
      repo: repoName,
    });
    const defaultBranch = repoData.default_branch;

    const services = [
      {
        name: 'contributors',
        fn: () =>
          this.contributorsService.syncForRepo({
            repositoryId: repo.id,
            fullName: repo.fullName,
            gitHubToken,
            userLogin,
          }),
      },
      {
        name: 'branches',
        fn: () =>
          this.branchesService.syncForRepo({
            repositoryId: repo.id,
            fullName: repo.fullName,
            gitHubToken,
            userLogin,
            defaultBranch,
          }),
      },
      {
        name: 'pull-requests',
        fn: () =>
          this.pullRequestsService.syncForRepo({
            repositoryId: repo.id,
            fullName: repo.fullName,
            gitHubToken,
          }),
      },
      {
        name: 'commit-stats',
        fn: () =>
          this.commitStatsService.syncForRepo({
            repositoryId: repo.id,
            fullName: repo.fullName,
            gitHubToken,
          }),
      },
    ];

    for (const service of services) {
      try {
        await service.fn();
      } catch (error) {
        this.logger.warn(
          `${service.name} sync failed for ${repo.fullName}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    await this.updateRepoAggregates(repo.id, userLogin);
    this.logger.log(`Finished processing ${repo.fullName}`);
  }

  private async updateRepoAggregates(
    repositoryId: string,
    userLogin: string,
  ): Promise<void> {
    const branches = await this.prisma.branch.findMany({
      where: { repositoryId },
      select: { userCommits: true, userAdditions: true, userDeletions: true },
    });

    const prGroups = await this.prisma.pullRequest.groupBy({
      by: ['state'],
      where: { repositoryId },
      _count: { _all: true },
    });

    const contributors = await this.prisma.contributor.findMany({
      where: { repositoryId },
      select: {
        login: true,
        totalCommits: true,
        totalAdditions: true,
        totalDeletions: true,
        commitPercent: true,
      },
    });

    const totalCommits = branches.reduce((s, b) => s + b.userCommits, 0);
    const totalAdditions = branches.reduce((s, b) => s + b.userAdditions, 0);
    const totalDeletions = branches.reduce((s, b) => s + b.userDeletions, 0);

    const prByState = Object.fromEntries(
      prGroups.map((p) => [p.state, p._count._all]),
    );
    const totalPRs = Object.values(prByState).reduce((s, c) => s + c, 0);
    const mergedPRs = prByState['merged'] ?? 0;
    const openPRs = prByState['open'] ?? 0;
    const closedPRs = prByState['closed'] ?? 0;

    const userContributor = contributors.find(
      (c) => c.login.toLowerCase() === userLogin.toLowerCase(),
    );
    const contributionScore = userContributor
      ? userContributor.totalCommits * 10 +
        Math.floor(
          (userContributor.totalAdditions + userContributor.totalDeletions) /
            100,
        )
      : 0;

    await this.prisma.repository.update({
      where: { id: repositoryId },
      data: {
        totalCommits,
        totalAdditions,
        totalDeletions,
        totalPRs,
        mergedPRs,
        openPRs,
        closedPRs,
        prMergeRate:
          totalPRs > 0 ? Math.round((mergedPRs / totalPRs) * 10000) / 100 : 0,
        contributionScore,
        lastParsed: new Date(),
      },
    });
  }
}
