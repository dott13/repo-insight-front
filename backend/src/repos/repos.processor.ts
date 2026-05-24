import { Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { Octokit } from 'octokit';
import { PrismaService } from '../prisma/prisma.service';
import { ReposGateway } from './repos.gateway';
import { ContributorsService } from '../contributors/contributors.service';
import { BranchesService } from '../branches/branches.service';
import { PullRequestsService } from '../pull-requests/pull-requests.service';
import { CommitStatsService } from '../commit-stats/commit-stats.service';

interface RepoJobData {
  userId: string;
  gitHubToken: string;
  userLogin: string;
  repos: Array<{ id: string; fullName: string }>;
}

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
  ) {}

  @Process('calculate-scores')
  async handleScoreCalculation(job: Job<RepoJobData>): Promise<void> {
    const { userId, gitHubToken, userLogin, repos } = job.data;

    this.logger.log(`Starting deep sync for ${repos.length} repos (user: ${userId})`);

    for (const repo of repos) {
      try {
        await this.processRepo(repo, gitHubToken, userLogin);
        this.gateway.emitScoreUpdate(userId, repo.id);
      } catch (e) {
        this.logger.error(
          `Failed deep sync for ${repo.fullName}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    this.gateway.emitSyncComplete(userId, repos.length);
    this.logger.log(`Deep sync complete for user ${userId}`);
  }

  private async processRepo(
    repo: { id: string; fullName: string },
    gitHubToken: string,
    userLogin: string,
  ): Promise<void> {
    this.logger.log(`Processing ${repo.fullName}`);

    // Fetch the default branch name first — branches service needs it
    const octokit = new Octokit({ auth: gitHubToken });
    const [owner, repoName] = repo.fullName.split('/');

    const { data: repoData } = await octokit.rest.repos.get({ owner, repo: repoName });
    const defaultBranch = repoData.default_branch;

    // Run all four syncs in parallel — each service is fully independent
    const [, , prStats] = await Promise.allSettled([
      this.contributorsService.syncForRepo({
        repositoryId: repo.id,
        fullName: repo.fullName,
        gitHubToken,
        userLogin,
      }),
      this.branchesService.syncForRepo({
        repositoryId: repo.id,
        fullName: repo.fullName,
        gitHubToken,
        userLogin,
        defaultBranch,
      }),
      this.pullRequestsService.syncForRepo({
        repositoryId: repo.id,
        fullName: repo.fullName,
        gitHubToken,
      }),
      this.commitStatsService.syncForRepo({
        repositoryId: repo.id,
        fullName: repo.fullName,
        gitHubToken,
      }),
    ]);

    // Log any individual sync failures without killing the whole repo job
    if (prStats.status === 'rejected') {
      this.logger.warn(`PR sync failed for ${repo.fullName}: ${prStats.reason}`);
    }

    // Roll up fresh DB data into denormalized Repository columns
    await this.updateRepoAggregates(repo.id, userLogin);

    this.logger.log(`Finished processing ${repo.fullName}`);
  }

  private async updateRepoAggregates(repositoryId: string, userLogin: string): Promise<void> {
    const [branches, prGroups, contributors] = await Promise.all([
      this.prisma.branch.findMany({
        where: { repositoryId },
        select: { userCommits: true, userAdditions: true, userDeletions: true },
      }),
      this.prisma.pullRequest.groupBy({
        by: ['state'],
        where: { repositoryId },
        _count: { _all: true },
      }),
      this.prisma.contributor.findMany({
        where: { repositoryId },
        select: {
          login: true,
          totalCommits: true,
          totalAdditions: true,
          totalDeletions: true,
          commitPercent: true,
        },
      }),
    ]);

    // Branch aggregates — sum the user's activity across all branches
    const totalCommits = branches.reduce((s, b) => s + b.userCommits, 0);
    const totalAdditions = branches.reduce((s, b) => s + b.userAdditions, 0);
    const totalDeletions = branches.reduce((s, b) => s + b.userDeletions, 0);

    // PR aggregates
    const prByState = Object.fromEntries(prGroups.map(p => [p.state, p._count._all]));
    const totalPRs = Object.values(prByState).reduce((s, c) => s + c, 0);
    const mergedPRs = prByState['merged'] ?? 0;
    const openPRs = prByState['open'] ?? 0;
    const closedPRs = prByState['closed'] ?? 0;
    const prMergeRate =
      totalPRs > 0 ? Math.round((mergedPRs / totalPRs) * 10000) / 100 : 0;

    // Contribution score — based on the authenticated user's own contributor row
    const userContributor = contributors.find(
      c => c.login.toLowerCase() === userLogin.toLowerCase(),
    );

    const contributionScore = userContributor
      ? userContributor.totalCommits * 10 +
        Math.floor((userContributor.totalAdditions + userContributor.totalDeletions) / 100)
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
        prMergeRate,
        contributionScore,
        lastParsed: new Date(),
      },
    });
  }
}