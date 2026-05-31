import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { Octokit } from 'octokit';
import { PrismaService } from '../prisma/prisma.service';
import { GitParserService } from './git-parser.service';
import { SyncReposDto } from './dto/sync-repo.dto';
import { Repo } from './entities/repo.entity';
import { Repository } from '@prisma/client';
import { PaginatedResponseDto } from '../common/dto/pagination.dto';
import { GetReposListDto, RepoListItemDto, RepoSortField, SortOrder } from './dto/repos-list.dto';

@Injectable()
export class ReposService {
  private readonly logger = new Logger(ReposService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gitParser: GitParserService,
    @InjectQueue('repos') private readonly reposQueue: Queue,
  ) {}

  async syncUserProjects(dto: SyncReposDto, forceAll = false): Promise<Repository[]> {
    const {
      localPaths,
      userEmail,
      userId,
      userLogin,
      deviceId,
      gitHubToken,
      allUserEmails = [],
    } = dto;

    this.logger.log(
      `Starting sync for user ${userEmail} — ${localPaths.length} local paths, GitHub: ${!!gitHubToken}`,
    );

    const projectMap = new Map<string, Partial<Repo> & { currentPath?: string }>();
    const searchEmails = allUserEmails.length > 0 ? allUserEmails : [userEmail];

    // Fetch remote repos from GitHub
    if (gitHubToken) {
      try {
        const octokit = new Octokit({ auth: gitHubToken });
        const { data } = await octokit.rest.repos.listForAuthenticatedUser({
          affiliation: 'owner,collaborator,organization_member',
          per_page: 100,
        });

        for (const r of data) {
          projectMap.set(r.full_name.toLowerCase(), {
            name: r.name,
            full_name: r.full_name,
            isRemote: true,
            isLocal: false,
            provider: 'github',
            externalId: r.id.toString(),
            htmlUrl: r.html_url,
            description: r.description || '',
            isContributed: r.permissions?.push || false,
          });
        }
        this.logger.log(`Fetched ${data.length} remote repos from GitHub`);
      } catch (e) {
        this.logger.error(
          `GitHub remote sync failed for ${userEmail}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    // Scan local paths
    for (const path of localPaths) {
      this.logger.debug(`Scanning local path: ${path}`);

      const isOwner = await this.gitParser.isUserProject(path, searchEmails);
      if (!isOwner) continue;

      const metadata = await this.gitParser.parseLocalMetadata(path);
      if (!metadata) continue;

      const fullName = metadata.remoteUrl
        ? this.gitParser.extractFullName(metadata.remoteUrl).toLowerCase()
        : `local/${metadata.name.toLowerCase()}`;

      if (projectMap.has(fullName)) {
        const existing = projectMap.get(fullName)!;
        existing.isLocal = true;
        existing.currentPath = path;
      } else {
        projectMap.set(fullName, {
          name: metadata.name,
          full_name: fullName,
          isLocal: true,
          isRemote: false,
          provider: 'local',
          currentPath: path,
          htmlUrl: metadata.remoteUrl,
          isContributed: false,
        });
      }
    }

    const results: Repository[] = [];
    for (const [, p] of projectMap) {
      const existing = await this.prisma.repository.findUnique({
        where: { fullName_userId: { fullName: p.full_name!, userId } },
        select: { localPaths: true },
      });

      const mergedPaths = (existing?.localPaths as Record<string, string>) || {};
      if (p.currentPath) {
        mergedPaths[deviceId] = p.currentPath;
      }

      const saved = await this.prisma.repository.upsert({
        where: { fullName_userId: { fullName: p.full_name!, userId } },
        update: {
          isLocal: p.isLocal,
          isRemote: p.isRemote,
          localPaths: mergedPaths,
          externalId: p.externalId,
          ...(p.description !== undefined && { description: p.description }),
          ...(p.htmlUrl !== undefined && { htmlUrl: p.htmlUrl }),
        },
        create: {
          name: p.name!,
          fullName: p.full_name!,
          provider: p.provider!,
          isLocal: p.isLocal!,
          isRemote: p.isRemote!,
          externalId: p.externalId,
          localPaths: mergedPaths,
          htmlUrl: p.htmlUrl,
          description: p.description,
          userId,
          isContributed: p.isContributed || false,
          contributionScore: 0,
        },
      });

      results.push(saved);
    }

    if (gitHubToken && userLogin) {
      const remoteRepos = results
        .filter(r => r.isRemote)
        .map(r => ({ id: r.id, fullName: r.fullName }));

      if (remoteRepos.length > 0) {
        await this.reposQueue.add(
          'calculate-scores',
          { userId, gitHubToken, userLogin, repos: remoteRepos, forceAll },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: true,
            removeOnFail: false,
          },
        );

        this.logger.log(`Enqueued deep sync for ${remoteRepos.length} remote repos`);
      }
    }

    this.logger.log(`Sync complete — ${projectMap.size} projects found`);
    return results;
  }

  async getReposList(
  userId: string,
  dto: GetReposListDto,
): Promise<PaginatedResponseDto<RepoListItemDto>> {
  const where: any = { userId };
 
  // Search across fullName and description
  if (dto.search?.trim()) {
    where.OR = [
      { fullName: { contains: dto.search, mode: 'insensitive' } },
      { description: { contains: dto.search, mode: 'insensitive' } },
    ];
  }
  
  if (dto.localOnly)  where.isLocal  = true;
  if (dto.remoteOnly) where.isRemote = true;
  if (dto.provider)   where.provider = dto.provider;
 
  const orderBy = {
    [dto.sortBy ?? RepoSortField.SCORE]: dto.order ?? SortOrder.DESC,
  };
  
  this.logger.log(`Fetching repos list for user ${userId} with filters: ${JSON.stringify(dto)}`);

  const [repos, total] = await Promise.all([
    this.prisma.repository.findMany({
      where,
      orderBy,
      skip: dto.skip,
      take: dto.limit,
      include: {
        _count: {
          select: { contributors: true, branches: true },
        },
        branches: {
          where:   { lastCommitAt: { not: null } },
          orderBy: { lastCommitAt: 'desc' },
          take:    1,
          select:  { lastCommitAt: true },
        },
      },
    }),
    this.prisma.repository.count({ where }),
  ]);
 
  const items: RepoListItemDto[] = repos.map(r => ({
    id:                r.id,
    fullName:          r.fullName,
    name:              r.name,
    description:       r.description,
    htmlUrl:           r.htmlUrl,
    provider:          r.provider,
    isLocal:           r.isLocal,
    isRemote:          r.isRemote,
    isContributed:     r.isContributed,
    contributionScore: r.contributionScore,
    totalCommits:      r.totalCommits,
    totalAdditions:    r.totalAdditions,
    totalDeletions:    r.totalDeletions,
    totalPRs:          r.totalPRs,
    mergedPRs:         r.mergedPRs,
    openPRs:           r.openPRs,
    prMergeRate:       r.prMergeRate,
    contributorCount:  r._count.contributors,
    branchCount:       r._count.branches,
    lastContributedAt: r.branches[0]?.lastCommitAt ?? null,
    lastParsed:        r.lastParsed,
    createdAt:         r.createdAt,
  }));
  
  this.logger.log(`Fetched ${items.length} repos for user ${userId} (total: ${total}) with filters: ${JSON.stringify(dto)}`);
  
  return PaginatedResponseDto.of(items, total, dto);
}

  async getUserRepos(userId: string): Promise<Repository[]> {
    return this.prisma.repository.findMany({
      where: { userId },
      orderBy: { contributionScore: 'desc' },
    });
  }

  async getRepo(repoId: string, userId: string): Promise<Repository | null> {
    return this.prisma.repository.findFirst({
      where: { id: repoId, userId },
    });
  }
}