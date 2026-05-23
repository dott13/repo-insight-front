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
    const { repositoryId, fullName, gitHubToken, userLogin, defaultBranch } = dto;
    const [owner, repo] = fullName.split('/');
    const octokit = new Octokit({ auth: gitHubToken });

    this.logger.log(`Syncing branches for ${fullName}`);

    const { data: branches } = await octokit.rest.repos.listBranches({
      owner,
      repo,
      per_page: 100,
    });

    // Process branches sequentially to stay within GitHub rate limits
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
      } catch (e) {
        this.logger.warn(`Skipping branch ${branch.name} for ${fullName}: ${e}`);
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
    const { octokit, owner, repo, branch, userLogin, repositoryId, defaultBranch } = params;

    // Total commits — GitHub paginates so we parse the Link header for count
    const totalCommitsRes = await octokit.rest.repos.listCommits({
      owner,
      repo,
      sha: branch.name,
      per_page: 1,
    });
    const totalCommits = this.parseTotalFromLink(
      (totalCommitsRes as any).headers?.link ?? '',
    ) || totalCommitsRes.data.length;

    // User commits on this branch (last 100 — enough for percent calculation)
    const userCommitsRes = await octokit.rest.repos.listCommits({
      owner,
      repo,
      sha: branch.name,
      author: userLogin,
      per_page: 100,
    });

    const userCommits = userCommitsRes.data.length;

    // Fetch detailed stats for the 5 most recent user commits only
    // Fetching all would burn rate limit budget fast
    let userAdditions = 0;
    let userDeletions = 0;
    for (const commit of userCommitsRes.data.slice(0, 5)) {
      try {
        const { data } = await octokit.rest.repos.getCommit({
          owner,
          repo,
          ref: commit.sha,
        });
        userAdditions += data.stats?.additions ?? 0;
        userDeletions += data.stats?.deletions ?? 0;
      } catch { /* skip */ }
    }

    const commitPercent =
      totalCommits > 0 ? Math.round((userCommits / totalCommits) * 10000) / 100 : 0;

    const lastCommit = userCommitsRes.data[0];
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

  //Reads 

  async getBranches(
    repositoryId: string,
    dto: GetBranchesDto,
    userId: string,
  ): Promise<PaginatedResponseDto<BranchResponseDto>> {
    await this.assertOwnership(repositoryId, userId);

    const where = { repositoryId };
    const orderBy = { [dto.sortBy ?? BranchSortField.USER_COMMITS]: 'desc' };

    const [branches, total] = await Promise.all([
      this.prisma.branch.findMany({ where, orderBy, skip: dto.skip, take: dto.limit }),
      this.prisma.branch.count({ where }),
    ]);

    return PaginatedResponseDto.of(branches.map(this.toDto), total, dto);
  }

  async getBranch(branchId: string, userId: string): Promise<BranchResponseDto> {
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

    if (!branchA) throw new NotFoundException(`Branch ${dto.branchAId} not found`);
    if (!branchB) throw new NotFoundException(`Branch ${dto.branchBId} not found`);

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

  //Helpers

  private parseTotalFromLink(link: string): number {
    const match = link.match(/page=(\d+)>; rel="last"/);
    return match ? parseInt(match[1], 10) : 0;
  }

  private async assertOwnership(repositoryId: string, userId: string): Promise<void> {
    const repo = await this.prisma.repository.findFirst({
      where: { id: repositoryId, userId },
      select: { id: true },
    });
    if (!repo) throw new NotFoundException(`Repository ${repositoryId} not found`);
  }

  private toDto(b: {
    id: string;
    name: string;
    isDefault: boolean;
    isProtected: boolean;
    userCommits: number;
    totalCommits: number;
    commitPercent: number;
    userAdditions: number;
    userDeletions: number;
    lastCommitAt: Date | null;
  }): BranchResponseDto {
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