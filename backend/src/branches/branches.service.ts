import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Octokit } from 'octokit';
import {
  GetBranchesDto,
  SyncBranchesDto,
  CompareBranchesDto,
  BranchSortField,
  BranchResponseDto,
  BranchComparisonDto,
} from './dto/branches.dto';
import { PaginatedResponseDto } from '../common/dto/pagination.dto';
import { GithubStatsService } from '../shared/github-stats.service';

@Injectable()
export class BranchesService {
  private readonly logger = new Logger(BranchesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly githubStats: GithubStatsService,
  ) {}

  // Sync
  async syncForRepo(dto: SyncBranchesDto): Promise<void> {
    const { repositoryId, fullName, gitHubToken, userLogin, defaultBranch } =
      dto;
    const [owner, repo] = fullName.split('/');
    const octokit = new Octokit({ auth: gitHubToken });

    this.logger.log(`Deep syncing all branches exhaustively for ${fullName}`);

    // Paginate through ALL available branches
    const branches = await octokit.paginate(octokit.rest.repos.listBranches, {
      owner,
      repo,
      per_page: 100,
    });

    const allStats = await this.githubStats.getContributorStats(octokit, owner, repo);

    const userStat = allStats.find(
      s => s?.author?.login?.toLowerCase() === userLogin.toLowerCase(),
    );

    const userTotalCommits = userStat?.total ?? 0;
    const repoTotalCommits = allStats.reduce((s, c) => s + (c.total ?? 0), 0);

    const userAdditions = userStat?.weeks.reduce((s, w) => s + (w.a ?? 0), 0) ?? 0;
    const userDeletions = userStat?.weeks.reduce((s, w) => s + (w.d ?? 0), 0) ?? 0;

    for (const branch of branches) {
      try {

        const branchCommits = await octokit.paginate(octokit.rest.repos.listCommits, {
          owner,
          repo,
          sha: branch.name,
          per_page: 100,
        });

        const totalCommits = branchCommits.length;
        const userBranchCommits = branchCommits.filter(
          (c) =>
            c.author?.login?.toLowerCase() === userLogin.toLowerCase() ||
            c.commit?.author?.name?.toLowerCase() === userLogin.toLowerCase(),
        );
        const userCommits = userBranchCommits.length;

        const proportion = repoTotalCommits > 0 ? userCommits / repoTotalCommits : 0;
        const branchUserAdditions = Math.round(userAdditions * proportion);
        const branchUserDeletions = Math.round(userDeletions * proportion);
 
        const commitPercent =
          totalCommits > 0
            ? Math.round((userCommits / totalCommits) * 10000) / 100
            : 0;
 
        const lastCommit = userBranchCommits[0] ?? branchCommits[0];
        const lastCommitAt = lastCommit?.commit?.author?.date
          ? new Date(lastCommit.commit.author.date)
          : null;

        await this.prisma.branch.upsert({
          where: { repositoryId_name: { repositoryId, name: branch.name } },
          update: {
            isDefault: branch.name === defaultBranch,
            isProtected: branch.protected,
            userCommits,
            totalCommits,
            commitPercent,
            userAdditions: branchUserAdditions,
            userDeletions: branchUserDeletions,
            lastCommitAt,
          },
          create: {
            name: branch.name,
            isDefault: branch.name === defaultBranch,
            isProtected: branch.protected,
            userCommits,
            totalCommits,
            commitPercent,
            userAdditions: branchUserAdditions,
            userDeletions: branchUserDeletions,
            lastCommitAt,
            repositoryId,
          },
        });
      } catch (e: any) {
        this.logger.warn(
          `Skipping branch ${branch.name} for ${fullName}: ${e.message}`,
        );
      }
    }

    this.logger.log(`Synced ${branches.length} branches for ${fullName}`);
  }

  // Reads
  async getBranches(
    repositoryId: string,
    dto: GetBranchesDto,
    userId: string,
  ): Promise<PaginatedResponseDto<BranchResponseDto>> {
    await this.assertOwnership(repositoryId, userId);

    const where = { repositoryId };
    const orderBy = { [dto.sortBy ?? BranchSortField.USER_COMMITS]: 'desc' };

    const [branches, total] = await Promise.all([
      this.prisma.branch.findMany({
        where,
        orderBy,
        skip: dto.skip,
        take: dto.limit,
      }),
      this.prisma.branch.count({ where }),
    ]);

    return PaginatedResponseDto.of(branches.map(this.toDto), total, dto);
  }

  async getBranch(
    branchId: string,
    userId: string,
  ): Promise<BranchResponseDto> {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, repository: { userId } },
    });
    if (!branch) throw new NotFoundException(`Branch ${branchId} not found`);
    return this.toDto(branch);
  }

  async compareBranches(
    dto: CompareBranchesDto,
    userId: string,
  ): Promise<BranchComparisonDto> {
    const [branchA, branchB] = await Promise.all([
      this.prisma.branch.findFirst({
        where: { id: dto.branchAId, repository: { userId } },
      }),
      this.prisma.branch.findFirst({
        where: { id: dto.branchBId, repository: { userId } },
      }),
    ]);

    if (!branchA)
      throw new NotFoundException(`Branch ${dto.branchAId} not found`);
    if (!branchB)
      throw new NotFoundException(`Branch ${dto.branchBId} not found`);

    const userCommitsDelta = branchA.userCommits - branchB.userCommits;
    const commitPercentDelta =
      Math.round((branchA.commitPercent - branchB.commitPercent) * 100) / 100;
    const additionsDelta = branchA.userAdditions - branchB.userAdditions;
    const deletionsDelta = branchA.userDeletions - branchB.userDeletions;

    return {
      branchA: this.toDto(branchA),
      branchB: this.toDto(branchB),
      diff: {
        userCommitsDelta,
        commitPercentDelta,
        additionsDelta,
        deletionsDelta,
        moreActiveBranch: userCommitsDelta >= 0 ? branchA.name : branchB.name,
      },
    };
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

  private toDto(b: any): BranchResponseDto {
    return {
      id: b.id,
      name: b.name,
      isDefault: b.isDefault,
      isProtected: b.isProtected,
      userCommits: b.userCommits,
      totalCommits: b.totalCommits,
      commitPercent: b.commitPercent,
      userAdditions: b.userAdditions,
      userDeletions: b.userDeletions,
      lastCommitAt: b.lastCommitAt,
    };
  }
}