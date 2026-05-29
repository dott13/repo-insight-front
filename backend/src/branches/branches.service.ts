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

@Injectable()
export class BranchesService {
  private readonly logger = new Logger(BranchesService.name);

  constructor(private readonly prisma: PrismaService) {}

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

    for (const branch of branches) {
      try {
        await this.syncSingleBranch({
          octokit,
          owner,
          repo,
          branch,
          userLogin,
          repositoryId,
          defaultBranch,
        });
      } catch (e: any) {
        this.logger.warn(
          `Skipping branch ${branch.name} for ${fullName}: ${e.message}`,
        );
      }
    }

    this.logger.log(`Synced ${branches.length} branches for ${fullName}`);
  }

  private async syncSingleBranch(params: {
    octokit: Octokit;
    owner: string;
    repo: string;
    branch: { name: string; protected: boolean };
    userLogin: string;
    repositoryId: string;
    defaultBranch: string;
  }): Promise<void> {
    const {
      octokit,
      owner,
      repo,
      branch,
      userLogin,
      repositoryId,
      defaultBranch,
    } = params;
    const allBranchCommits = await octokit.paginate(
      octokit.rest.repos.listCommits,
      {
        owner,
        repo,
        sha: branch.name,
        per_page: 100,
      },
    );
    const totalCommits = allBranchCommits.length;
    const userCommitsList = allBranchCommits.filter(
      (c) =>
        c.author?.login?.toLowerCase() === userLogin.toLowerCase() ||
        c.commit?.author?.name?.toLowerCase() === userLogin.toLowerCase(),
    );
    const userCommits = userCommitsList.length;
    let userAdditions = 0;
    let userDeletions = 0;

    if (userCommitsList.length > 0) {
      try {
        const { data: headDetail } = await octokit.rest.repos.getCommit({
          owner,
          repo,
          ref: userCommitsList[0].sha,
        });
        userAdditions = headDetail.stats?.additions ?? 0;
        userDeletions = headDetail.stats?.deletions ?? 0;
      } catch {
        /* Fail-silent to keep sync active */
      }
    }

    const commitPercent =
      totalCommits > 0
        ? Math.round((userCommits / totalCommits) * 10000) / 100
        : 0;
    const lastCommit = userCommitsList[0] || allBranchCommits[0];
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
        userAdditions,
        userDeletions,
        lastCommitAt,
      },
      create: {
        name: branch.name,
        isDefault: branch.name === defaultBranch,
        isProtected: branch.protected,
        userCommits,
        totalCommits,
        commitPercent,
        userAdditions,
        userDeletions,
        lastCommitAt,
        repositoryId,
      },
    });
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