import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  GetHomeTableDto,
  RepoTableRowDto,
  HomeHighlightsDto,
  HighlightDto,
} from './dto/home.dto';
import { PaginatedResponseDto } from '../common/dto/pagination.dto';

@Injectable()
export class HomeService {
  private readonly logger = new Logger(HomeService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getTableRows(
    userId: string,
    dto: GetHomeTableDto,
  ): Promise<PaginatedResponseDto<RepoTableRowDto>> {
    const [repos, total] = await Promise.all([
      this.prisma.repository.findMany({
        where: { userId },
        orderBy: { contributionScore: 'desc' },
        skip: dto.skip,
        take: dto.limit,
        include: {
          // Count contributors in one query
          _count: {
            select: { contributors: true },
          },
          // Get the most recently active branch for last contribution date
          branches: {
            where: {
              lastCommitAt: { not: null },
            },
            orderBy: { lastCommitAt: 'desc' },
            take: 1,
            select: { lastCommitAt: true },
          },
        },
      }),
      this.prisma.repository.count({ where: { userId } }),
    ]);

    const rows: RepoTableRowDto[] = repos.map((repo) => ({
      id: repo.id,
      fullName: repo.fullName,
      description: repo.description,
      contributorCount: repo._count.contributors,
      userCommits: repo.totalCommits,
      lastContributedAt: repo.branches[0]?.lastCommitAt ?? null,
      prMergeRate: repo.prMergeRate,
      totalPRs: repo.totalPRs,
      contributionScore: repo.contributionScore,
      isLocal: repo.isLocal,
      isRemote: repo.isRemote,
    }));
    this.logger.log(`Fetched ${rows.length} repos for user ${userId} (total: ${total})`);
    return PaginatedResponseDto.of(rows, total, dto);
  }

  async getHighlights(userId: string): Promise<HomeHighlightsDto> {
    // Three targeted queries each fetches only the top repo for that metric
    const [mostCommitsRepo, topScoreRepo, bestMergeRepo] = await Promise.all([
      this.prisma.repository.findFirst({
        where: { userId },
        orderBy: { totalCommits: 'desc' },
        select: { id: true, fullName: true, totalCommits: true },
      }),
      this.prisma.repository.findFirst({
        where: { userId },
        orderBy: { contributionScore: 'desc' },
        select: { id: true, fullName: true, contributionScore: true },
      }),
      this.prisma.repository.findFirst({
        where: { userId, totalPRs: { gt: 0 } },
        orderBy: { prMergeRate: 'desc' },
        select: { id: true, fullName: true, prMergeRate: true, totalPRs: true },
      }),
    ]);

    const mostCommits: HighlightDto | null = mostCommitsRepo
      ? {
          repoId: mostCommitsRepo.id,
          fullName: mostCommitsRepo.fullName,
          qualifier: 'Most Commits',
          metric: `${mostCommitsRepo.totalCommits.toLocaleString()} commits`,
          metricRaw: mostCommitsRepo.totalCommits,
        }
      : null;

    const topScore: HighlightDto | null = topScoreRepo
      ? {
          repoId: topScoreRepo.id,
          fullName: topScoreRepo.fullName,
          qualifier: 'Top Contribution Score',
          metric: topScoreRepo.contributionScore.toLocaleString(),
          metricRaw: topScoreRepo.contributionScore,
        }
      : null;

    const bestMergeRate: HighlightDto | null = bestMergeRepo
      ? {
          repoId: bestMergeRepo.id,
          fullName: bestMergeRepo.fullName,
          qualifier: 'Best PR Merge Rate',
          metric: `${bestMergeRepo.prMergeRate}%`,
          metricRaw: bestMergeRepo.prMergeRate,
        }
      : null;
    this.logger.log(`Highlights for user ${userId} - Commits: ${mostCommits?.metricRaw ?? 'N/A'}, Score: ${topScore?.metricRaw ?? 'N/A'}, Merge Rate: ${bestMergeRate?.metricRaw ?? 'N/A'}`);
    return {
      mostCommits: mostCommits ?? this.emptyHighlight('Most Commits'),
      topScore: topScore ?? this.emptyHighlight('Top Contribution Score'),
      bestMergeRate,
    };
  }

  private emptyHighlight(qualifier: string): HighlightDto {
    return {
      repoId: '',
      fullName: '—',
      qualifier,
      metric: 'No data yet',
      metricRaw: 0,
    };
  }
}