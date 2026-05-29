import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Octokit } from 'octokit';
import { GithubStatsService } from '../shared/github-stats.service';
import {
  GetContributorsDto,
  SyncContributorsDto,
  CompareContributorsDto,
  ContributorSortField,
  ContributorResponseDto,
  BusFactorResponseDto,
  ContributorComparisonDto,
} from './dto/contributors.dto';
import { PaginatedResponseDto } from '../common/dto/pagination.dto';
import { SortOrder } from '../common/dto/sort.dto';

@Injectable()
export class ContributorsService {
  private readonly logger = new Logger(ContributorsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly githubStats: GithubStatsService
  ) {}

  async syncForRepo(dto: SyncContributorsDto): Promise<void> {
    const { repositoryId, fullName, gitHubToken } = dto;
    const [owner, repo] = fullName.split('/');
    const octokit = new Octokit({ auth: gitHubToken });

    this.logger.log(`Syncing contributors for ${fullName}`);

    const stats = await this.githubStats.getContributorStats(octokit, owner, repo);
    if (!stats.length) return;

    const repoTotal = stats.reduce((sum, c) => sum + (c.total ?? 0), 0);

    for (const contributor of stats) {
      const login = contributor.author?.login;
      if (!login) continue;

      const weeks = contributor.weeks ?? [];
      const additions = weeks.reduce((s: number, w: any) => s + (w.a ?? 0), 0);
      const deletions = weeks.reduce((s: number, w: any) => s + (w.d ?? 0), 0);
      const totalCommits = contributor.total ?? 0;

      const activeWeeks = weeks.filter((w: any) => w.c > 0);
      const firstCommitAt = activeWeeks.length ? new Date(activeWeeks[0].w * 1000) : null;
      const lastCommitAt = activeWeeks.length
        ? new Date(activeWeeks[activeWeeks.length - 1].w * 1000)
        : null;

      const commitPercent =
        repoTotal > 0 ? Math.round((totalCommits / repoTotal) * 10000) / 100 : 0;

      await this.prisma.contributor.upsert({
        where: { repositoryId_login: { repositoryId, login } },
        update: {
          avatarUrl: contributor.author?.avatar_url ?? null,
          totalCommits,
          totalAdditions: additions,
          totalDeletions: deletions,
          commitPercent,
          firstCommitAt,
          lastCommitAt,
        },
        create: {
          login,
          avatarUrl: contributor.author?.avatar_url ?? null,
          totalCommits,
          totalAdditions: additions,
          totalDeletions: deletions,
          commitPercent,
          firstCommitAt,
          lastCommitAt,
          repositoryId,
        },
      });
    }

    this.logger.log(`Synced ${stats.length} contributors for ${fullName}`);
  }

  async getContributors(
    repositoryId: string,
    dto: GetContributorsDto,
    userId: string,
  ): Promise<PaginatedResponseDto<ContributorResponseDto>> {
    await this.assertOwnership(repositoryId, userId);

    const where = { repositoryId };
    const orderBy = { [dto.sortBy ?? ContributorSortField.COMMITS]: 'desc' };

    const [contributors, total] = await Promise.all([
      this.prisma.contributor.findMany({
        where,
        orderBy,
        skip: dto.skip,
        take: dto.limit,
      }),
      this.prisma.contributor.count({ where }),
    ]);

    return PaginatedResponseDto.of(contributors.map(this.toDto), total, dto);
  }

  async getBusFactor(repositoryId: string, userId: string): Promise<BusFactorResponseDto> {
    await this.assertOwnership(repositoryId, userId);

    const contributors = await this.prisma.contributor.findMany({
      where: { repositoryId },
      orderBy: { totalCommits: 'desc' },
    });

    if (!contributors.length) {
      return { busFactor: 0, riskLevel: 'critical', ownershipBreakdown: [], totalContributors: 0 };
    }

    return this.computeBusFactor(contributors);
  }

  async compareContributors(
    dto: CompareContributorsDto,
    userId: string,
  ): Promise<ContributorComparisonDto> {
    await Promise.all([
      this.assertOwnership(dto.repoAId, userId),
      this.assertOwnership(dto.repoBId, userId),
    ]);

    const [contribsA, contribsB] = await Promise.all([
      this.prisma.contributor.findMany({ where: { repositoryId: dto.repoAId } }),
      this.prisma.contributor.findMany({ where: { repositoryId: dto.repoBId } }),
    ]);

    const mapA = new Map(contribsA.map(c => [c.login, c]));
    const mapB = new Map(contribsB.map(c => [c.login, c]));

    const shared: ContributorComparisonDto['shared'] = [];
    const onlyInA: ContributorResponseDto[] = [];
    const onlyInB: ContributorResponseDto[] = [];

    for (const [login, a] of mapA) {
      const b = mapB.get(login);
      if (b) {
        shared.push({
          login,
          avatarUrl: a.avatarUrl,
          repoA: { commitPercent: a.commitPercent, totalCommits: a.totalCommits },
          repoB: { commitPercent: b.commitPercent, totalCommits: b.totalCommits },
        });
      } else {
        onlyInA.push(this.toDto(a));
      }
    }

    for (const [login, b] of mapB) {
      if (!mapA.has(login)) onlyInB.push(this.toDto(b));
    }

    const dir = (dto.order ?? SortOrder.DESC) === SortOrder.DESC ? -1 : 1;
    shared.sort(
      (a, b) =>
        dir *
        (b.repoA.commitPercent +
          b.repoB.commitPercent -
          (a.repoA.commitPercent + a.repoB.commitPercent)),
    );

    return { repoAId: dto.repoAId, repoBId: dto.repoBId, shared, onlyInA, onlyInB };
  }

  computeBusFactor(
    contributors: Array<{
      login: string;
      avatarUrl: string | null;
      totalCommits: number;
      commitPercent: number;
    }>,
  ): BusFactorResponseDto {
    const sorted = [...contributors].sort((a, b) => b.totalCommits - a.totalCommits);

    let cumulative = 0;
    let busFactor = 0;
    const ownershipBreakdown: BusFactorResponseDto['ownershipBreakdown'] = [];

    for (const c of sorted) {
      cumulative += c.commitPercent;
      busFactor++;
      ownershipBreakdown.push({
        login: c.login,
        avatarUrl: c.avatarUrl,
        commitPercent: Math.round(c.commitPercent * 100) / 100,
        cumulativePercent: Math.round(cumulative * 100) / 100,
      });
      if (cumulative >= 50) break;
    }

    const riskLevel =
      busFactor === 1 ? 'critical'
      : busFactor === 2 ? 'high'
      : busFactor <= 4 ? 'medium'
      : 'low';

    return { busFactor, riskLevel, ownershipBreakdown, totalContributors: contributors.length };
  }

  private async assertOwnership(repositoryId: string, userId: string): Promise<void> {
    const repo = await this.prisma.repository.findFirst({
      where: { id: repositoryId, userId },
      select: { id: true },
    });
    if (!repo) throw new NotFoundException(`Repository ${repositoryId} not found`);
  }

  private toDto(c: any): ContributorResponseDto {
    return {
      id: c.id,
      login: c.login,
      avatarUrl: c.avatarUrl,
      totalCommits: c.totalCommits,
      totalAdditions: c.totalAdditions,
      totalDeletions: c.totalDeletions,
      commitPercent: c.commitPercent,
      firstCommitAt: c.firstCommitAt,
      lastCommitAt: c.lastCommitAt,
    };
  }
}