import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Octokit } from 'octokit';
import { GithubStatsService } from '../shared/github-stats.service';
import {
  GetCommitStatsDto,
  SyncCommitStatsDto,
  CompareCommitStatsDto,
  CommitStatGranularity,
  CommitStatResponseDto,
  CommitStatSummaryDto,
  CommitStatsComparisonDto,
} from './dto/commit-stats.dto';
import { PaginatedResponseDto } from '../common/dto/pagination.dto';

@Injectable()
export class CommitStatsService {
  private readonly logger = new Logger(CommitStatsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly githubStats: GithubStatsService
  ) {}

  // Sync
  async syncForRepo(dto: SyncCommitStatsDto): Promise<void> {
    const { repositoryId, fullName, gitHubToken } = dto;
    const [owner, repo] = fullName.split('/');
    const octokit = new Octokit({ auth: gitHubToken });

    this.logger.log(`Syncing commit stats for ${fullName}`);

    const stats = await this.githubStats.getContributorStats(octokit, owner, repo);
    if (!stats.length) return;

    const weekMap = new Map<number, { additions: number; deletions: number; commits: number }>();

    for (const contributor of stats) {
      for (const week of contributor.weeks ?? []) {
        if (!week.w) continue;
        const existing = weekMap.get(week.w) ?? { additions: 0, deletions: 0, commits: 0 };
        existing.additions += week.a ?? 0;
        existing.deletions += week.d ?? 0;
        existing.commits += week.c ?? 0;
        weekMap.set(week.w, existing);
      }
    }

    // Only write weeks that had any activity
    const activeWeeks = Array.from(weekMap.entries()).filter(
      ([, v]) => v.commits > 0 || v.additions > 0,
    );

    for (const [timestamp, data] of activeWeeks) {
      const week = new Date(timestamp * 1000);

      await this.prisma.commitStat.upsert({
        where: { repositoryId_week: { repositoryId, week } },
        update: {
          additions: data.additions,
          deletions: data.deletions,
          commits: data.commits,
        },
        create: {
          week,
          additions: data.additions,
          deletions: data.deletions,
          commits: data.commits,
          repositoryId,
        },
      });
    }

    this.logger.log(`Synced ${activeWeeks.length} weeks of commit stats for ${fullName}`);
  }

  // Reads
  async getCommitStats(
    repositoryId: string,
    dto: GetCommitStatsDto,
    userId: string,
  ): Promise<PaginatedResponseDto<CommitStatResponseDto>> {
    await this.assertOwnership(repositoryId, userId);

    const where = this.buildWhere(repositoryId, dto.from, dto.to);

    const [stats, total] = await Promise.all([
      this.prisma.commitStat.findMany({
        where,
        orderBy: { week: 'desc' },
        skip: dto.skip,
        take: dto.limit,
      }),
      this.prisma.commitStat.count({ where }),
    ]);

    const rows =
      dto.granularity === CommitStatGranularity.MONTH
        ? this.aggregateToMonth(stats.map(this.toDto))
        : stats.map(this.toDto);

    return PaginatedResponseDto.of(rows, total, dto);
  }

  async getSummary(repositoryId: string, userId: string): Promise<CommitStatSummaryDto> {
    await this.assertOwnership(repositoryId, userId);

    const stats = await this.prisma.commitStat.findMany({
      where: { repositoryId },
      orderBy: { week: 'asc' },
    });

    return this.buildSummary(stats.map(this.toDto));
  }

  async compareRepos(
    repoAId: string,
    repoBId: string,
    dto: CompareCommitStatsDto,
    userId: string,
  ): Promise<CommitStatsComparisonDto> {
    await Promise.all([
      this.assertOwnership(repoAId, userId),
      this.assertOwnership(repoBId, userId),
    ]);

    const [rawA, rawB] = await Promise.all([
      this.prisma.commitStat.findMany({
        where: this.buildWhere(repoAId, dto.from, dto.to),
        orderBy: { week: 'asc' },
      }),
      this.prisma.commitStat.findMany({
        where: this.buildWhere(repoBId, dto.from, dto.to),
        orderBy: { week: 'asc' },
      }),
    ]);

    let seriesA = rawA.map(this.toDto);
    let seriesB = rawB.map(this.toDto);

    if (dto.granularity === CommitStatGranularity.MONTH) {
      seriesA = this.aggregateToMonth(seriesA);
      seriesB = this.aggregateToMonth(seriesB);
    }

    const allKeys = new Set([
      ...seriesA.map(s => s.week.toISOString()),
      ...seriesB.map(s => s.week.toISOString()),
    ]);

    const mapA = new Map(seriesA.map(s => [s.week.toISOString(), s]));
    const mapB = new Map(seriesB.map(s => [s.week.toISOString(), s]));

    const zero = (week: string): CommitStatResponseDto => ({
      id: '',
      week: new Date(week),
      additions: 0,
      deletions: 0,
      commits: 0,
      churn: 0,
    });

    const sortedKeys = Array.from(allKeys).sort();
    const alignedA = sortedKeys.map(k => mapA.get(k) ?? zero(k));
    const alignedB = sortedKeys.map(k => mapB.get(k) ?? zero(k));

    const summaryA = this.buildSummary(seriesA);
    const summaryB = this.buildSummary(seriesB);

    return {
      repoAId,
      repoBId,
      repoA: alignedA,
      repoB: alignedB,
      summary: {
        repoA: summaryA,
        repoB: summaryB,
        higherChurnRepo: summaryA.totalChurn >= summaryB.totalChurn ? repoAId : repoBId,
        higherActivityRepo:
          summaryA.totalCommits >= summaryB.totalCommits ? repoAId : repoBId,
      },
    };
  }

  // Shared logic
  private buildSummary(stats: CommitStatResponseDto[]): CommitStatSummaryDto {
    if (!stats.length) {
      return {
        totalCommits: 0,
        totalAdditions: 0,
        totalDeletions: 0,
        totalChurn: 0,
        peakWeek: null,
        avgCommitsPerWeek: 0,
      };
    }

    const totalCommits = stats.reduce((s, w) => s + w.commits, 0);
    const totalAdditions = stats.reduce((s, w) => s + w.additions, 0);
    const totalDeletions = stats.reduce((s, w) => s + w.deletions, 0);
    const totalChurn = totalAdditions + totalDeletions;

    const peakWeek = stats.reduce((max, w) => (w.churn > max.churn ? w : max), stats[0]);

    return {
      totalCommits,
      totalAdditions,
      totalDeletions,
      totalChurn,
      peakWeek,
      avgCommitsPerWeek: Math.round((totalCommits / stats.length) * 10) / 10,
    };
  }

  private aggregateToMonth(stats: CommitStatResponseDto[]): CommitStatResponseDto[] {
    const monthMap = new Map<string, CommitStatResponseDto>();

    for (const s of stats) {
      const key = `${s.week.getFullYear()}-${String(s.week.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthMap.get(key);

      if (existing) {
        existing.additions += s.additions;
        existing.deletions += s.deletions;
        existing.commits += s.commits;
        existing.churn = existing.additions + existing.deletions;
      } else {
        monthMap.set(key, { ...s, churn: s.additions + s.deletions });
      }
    }

    return Array.from(monthMap.values()).sort(
      (a, b) => a.week.getTime() - b.week.getTime(),
    );
  }

  private buildWhere(repositoryId: string, from?: string, to?: string) {
    const where: any = { repositoryId };
    if (from || to) {
      where.week = {};
      if (from) where.week.gte = new Date(from);
      if (to) where.week.lte = new Date(to);
    }
    return where;
  }

  private async assertOwnership(repositoryId: string, userId: string): Promise<void> {
    const repo = await this.prisma.repository.findFirst({
      where: { id: repositoryId, userId },
      select: { id: true },
    });
    if (!repo) throw new NotFoundException(`Repository ${repositoryId} not found`);
  }

  private toDto(s: any): CommitStatResponseDto {
    return {
      id: s.id,
      week: s.week,
      additions: s.additions,
      deletions: s.deletions,
      commits: s.commits,
      churn: s.additions + s.deletions,
    };
  }
}