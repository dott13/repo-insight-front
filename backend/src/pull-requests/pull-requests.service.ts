import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Octokit } from 'octokit';
import {
  GetPullRequestsDto,
  GetPRReviewStatsDto,
  SyncPullRequestsDto,
  PRSortField,
  PRState,
  PullRequestResponseDto,
  PRReviewStatResponseDto,
  PRSummaryDto,
  PRTrendPointDto,
} from './dto/pull-requests.dto';
import { PaginatedResponseDto } from '../common/dto/pagination.dto';

@Injectable()
export class PullRequestsService {
  private readonly logger = new Logger(PullRequestsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Sync
  async syncForRepo(dto: SyncPullRequestsDto): Promise<void> {
    const { repositoryId, fullName, gitHubToken } = dto;
    const [owner, repo] = fullName.split('/');
    const octokit = new Octokit({ auth: gitHubToken });

    this.logger.log(`Syncing all historical pull requests for ${fullName}`);

    // Exhaustive pagination capturing all historical iterations
    const allPRs = await octokit.paginate(octokit.rest.pulls.list, {
      owner,
      repo,
      state: 'all',
      per_page: 100,
    });

    const reviewStats = new Map<
      string,
      {
        reviews: number;
        approvals: number;
        comments: number;
        firstReviewMs: number[];
      }
    >();

    for (const pr of allPRs) {
      try {
        await this.syncSinglePR({
          octokit,
          owner,
          repo,
          pr,
          repositoryId,
          reviewStats,
        });
      } catch (e: any) {
        this.logger.warn(
          `Skipping PR #${pr.number} for ${fullName}: ${e.message}`,
        );
      }
    }

    // Upsert review stats per reviewer
    for (const [login, stats] of reviewStats) {
      const avgTimeToReview = stats.firstReviewMs.length
        ? stats.firstReviewMs.reduce((a, b) => a + b, 0) /
          stats.firstReviewMs.length /
          3_600_000
        : null;

      await this.prisma.pRReviewStat.upsert({
        where: {
          repositoryId_reviewerLogin: { repositoryId, reviewerLogin: login },
        },
        update: {
          reviewCount: stats.reviews,
          approvalsGiven: stats.approvals,
          commentsGiven: stats.comments,
          avgTimeToReview,
        },
        create: {
          reviewerLogin: login,
          reviewCount: stats.reviews,
          approvalsGiven: stats.approvals,
          commentsGiven: stats.comments,
          avgTimeToReview,
          repositoryId,
        },
      });
    }

    this.logger.log(
      `Synced ${allPRs.length} total pull requests for ${fullName}`,
    );
  }

  private async syncSinglePR(params: {
    octokit: Octokit;
    owner: string;
    repo: string;
    pr: any;
    repositoryId: string;
    reviewStats: Map<
      string,
      {
        reviews: number;
        approvals: number;
        comments: number;
        firstReviewMs: number[];
      }
    >;
  }): Promise<void> {
    const { octokit, owner, repo, pr, repositoryId, reviewStats } = params;

    const targetBranch = await this.prisma.branch.upsert({
      where: { repositoryId_name: { repositoryId, name: pr.base.ref } },
      update: {},
      create: {
        name: pr.base.ref,
        repositoryId,
        isDefault: pr.base.ref === 'main' || pr.base.ref === 'master',
      },
    });

    const isMerged = !!pr.merged_at;

    const { data: detail } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: pr.number,
    });

    await this.prisma.pullRequest.upsert({
      where: {
        repositoryId_externalId: { repositoryId, externalId: pr.number },
      },
      update: {
        state: isMerged ? PRState.MERGED : pr.state,
        additions: detail.additions ?? 0,
        deletions: detail.deletions ?? 0,
        changedFiles: detail.changed_files ?? 0,
        commitsInPR: detail.commits ?? 0,
        mergedAt: isMerged ? new Date(pr.merged_at) : null,
        closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
        updatedAt: new Date(pr.updated_at),
        targetBranchId: targetBranch.id,
      },
      create: {
        externalId: pr.number,
        title: pr.title,
        state: isMerged ? PRState.MERGED : pr.state,
        isDraft: pr.draft ?? false,
        additions: detail.additions ?? 0,
        deletions: detail.deletions ?? 0,
        changedFiles: detail.changed_files ?? 0,
        commitsInPR: detail.commits ?? 0,
        createdAt: new Date(pr.created_at),
        updatedAt: new Date(pr.updated_at),
        mergedAt: isMerged ? new Date(pr.merged_at) : null,
        closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
        repositoryId,
        targetBranchId: targetBranch.id,
      },
    });

    const { data: reviews } = await octokit.rest.pulls.listReviews({
      owner,
      repo,
      pull_number: pr.number,
    });

    const prCreatedAt = new Date(pr.created_at).getTime();
    const seenReviewers = new Set<string>();

    for (const review of reviews) {
      const login = review.user?.login;
      if (!login) continue;

      const existing = reviewStats.get(login) ?? {
        reviews: 0,
        approvals: 0,
        comments: 0,
        firstReviewMs: [],
      };

      existing.reviews++;
      if (review.state === 'APPROVED') existing.approvals++;
      if (review.state === 'COMMENTED') existing.comments++;

      if (!seenReviewers.has(login) && review.submitted_at) {
        const reviewedAt = new Date(review.submitted_at).getTime();
        existing.firstReviewMs.push(reviewedAt - prCreatedAt);
        seenReviewers.add(login);
      }

      reviewStats.set(login, existing);
    }
  }

  // Reads
  async getPullRequests(
    repositoryId: string,
    dto: GetPullRequestsDto,
    userId: string,
  ): Promise<PaginatedResponseDto<PullRequestResponseDto>> {
    await this.assertOwnership(repositoryId, userId);

    const where: any = { repositoryId };
    if (dto.state) where.state = dto.state;
    if (dto.from || dto.to) {
      where.createdAt = {};
      if (dto.from) where.createdAt.gte = new Date(dto.from);
      if (dto.to) where.createdAt.lte = new Date(dto.to);
    }

    const orderBy = { [dto.sortBy ?? PRSortField.CREATED]: 'desc' };

    const [prs, total] = await Promise.all([
      this.prisma.pullRequest.findMany({
        where,
        orderBy,
        skip: dto.skip,
        take: dto.limit,
      }),
      this.prisma.pullRequest.count({ where }),
    ]);

    return PaginatedResponseDto.of(prs.map(this.toPRDto), total, dto);
  }

  async getSummary(
    repositoryId: string,
    userId: string,
  ): Promise<PRSummaryDto> {
    await this.assertOwnership(repositoryId, userId);

    const prs = await this.prisma.pullRequest.findMany({
      where: { repositoryId },
      select: {
        state: true,
        additions: true,
        deletions: true,
        createdAt: true,
        mergedAt: true,
      },
    });

    const total = prs.length;
    const merged = prs.filter((p) => p.state === PRState.MERGED);
    const open = prs.filter((p) => p.state === PRState.OPEN).length;
    const closed = prs.filter((p) => p.state === PRState.CLOSED).length;

    const avgAdditions = total
      ? Math.round(prs.reduce((s, p) => s + p.additions, 0) / total)
      : 0;
    const avgDeletions = total
      ? Math.round(prs.reduce((s, p) => s + p.deletions, 0) / total)
      : 0;

    const mergedWithTimes = merged.filter((p) => p.mergedAt);
    const avgTimeToMergeHours = mergedWithTimes.length
      ? mergedWithTimes.reduce(
          (s, p) => s + (p.mergedAt!.getTime() - p.createdAt.getTime()),
          0,
        ) /
        mergedWithTimes.length /
        3_600_000
      : null;

    return {
      totalPRs: total,
      openPRs: open,
      mergedPRs: merged.length,
      closedPRs: closed,
      mergeRate:
        total > 0 ? Math.round((merged.length / total) * 10000) / 100 : 0,
      avgAdditions,
      avgDeletions,
      avgTimeToMergeHours: avgTimeToMergeHours
        ? Math.round(avgTimeToMergeHours * 10) / 10
        : null,
    };
  }

  async getTrends(
    repositoryId: string,
    userId: string,
  ): Promise<PRTrendPointDto[]> {
    await this.assertOwnership(repositoryId, userId);

    const prs = await this.prisma.pullRequest.findMany({
      where: { repositoryId },
      select: { state: true, createdAt: true, mergedAt: true, closedAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const weekMap = new Map<
      string,
      { opened: number; merged: number; closed: number }
    >();

    const toWeekKey = (date: Date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - d.getDay());
      return d.toISOString().slice(0, 10);
    };

    for (const pr of prs) {
      const openKey = toWeekKey(pr.createdAt);
      const bucket = weekMap.get(openKey) ?? {
        opened: 0,
        merged: 0,
        closed: 0,
      };
      bucket.opened++;
      weekMap.set(openKey, bucket);

      if (pr.mergedAt) {
        const mergeKey = toWeekKey(pr.mergedAt);
        const mb = weekMap.get(mergeKey) ?? { opened: 0, merged: 0, closed: 0 };
        mb.merged++;
        weekMap.set(mergeKey, mb);
      }

      if (pr.closedAt && pr.state === PRState.CLOSED) {
        const closeKey = toWeekKey(pr.closedAt);
        const cb = weekMap.get(closeKey) ?? { opened: 0, merged: 0, closed: 0 };
        cb.closed++;
        weekMap.set(closeKey, cb);
      }
    }

    return Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, counts]) => ({ week, ...counts }));
  }

  async getReviewStats(
    repositoryId: string,
    dto: GetPRReviewStatsDto,
    userId: string,
  ): Promise<PaginatedResponseDto<PRReviewStatResponseDto>> {
    await this.assertOwnership(repositoryId, userId);

    const where: any = { repositoryId };
    if (dto.reviewerLogin) where.reviewerLogin = dto.reviewerLogin;

    const [stats, total] = await Promise.all([
      this.prisma.pRReviewStat.findMany({
        where,
        orderBy: { reviewCount: 'desc' },
        skip: dto.skip,
        take: dto.limit,
      }),
      this.prisma.pRReviewStat.count({ where }),
    ]);

    return PaginatedResponseDto.of(
      stats.map((s) => ({
        id: s.id,
        reviewerLogin: s.reviewerLogin,
        reviewCount: s.reviewCount,
        approvalsGiven: s.approvalsGiven,
        commentsGiven: s.commentsGiven,
        avgTimeToReview: s.avgTimeToReview,
      })),
      total,
      dto,
    );
  }

  private async assertOwnership(
    repositoryId: string,
    userId: string,
  ): Promise<void> {
    const repo = await this.prisma.repository.findFirst({
      where: { id: repositoryId, userId },
      select: { id: true },
    });
    if (!repo)
      throw new NotFoundException(`Repository ${repositoryId} not found`);
  }

  private toPRDto(p: any): PullRequestResponseDto {
    return {
      id: p.id,
      externalId: p.externalId,
      title: p.title,
      state: p.state,
      isDraft: p.isDraft,
      additions: p.additions,
      deletions: p.deletions,
      changedFiles: p.changedFiles,
      commitsInPR: p.commitsInPR,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      mergedAt: p.mergedAt,
      closedAt: p.closedAt,
      targetBranchId: p.targetBranchId,
    };
  }
}