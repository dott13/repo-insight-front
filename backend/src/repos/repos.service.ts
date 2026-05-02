import { Injectable, Logger } from '@nestjs/common';
import { CreateRepoDto } from './dto/create-repo.dto';
import { UpdateRepoDto } from './dto/update-repo.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Octokit } from 'octokit';
import { GitParserService } from './git-parser.service';
import { Repo } from './entities/repo.entity';
import { Repository } from '@prisma/client';

@Injectable()
export class ReposService {
  constructor(
    private prisma: PrismaService,
    private readonly gitParser: GitParserService
  ) {}

  private readonly logger = new Logger(ReposService.name);

  async syncUserProjects(localPaths: string[], userEmail: string, deviceId: string, gitHubToken?: string, allUserEmails: string[] = []) {
    this.logger.log(`Starting sync for user ${userEmail} with ${localPaths.length} local paths and GitHub token: ${!!gitHubToken}`);
    const projectMap = new Map<string, Partial<Repo> & { currentPath?: string }>();
    const searchEmails = allUserEmails.length > 0 ? allUserEmails : [userEmail];
    
    if (gitHubToken) {
      try {
        const octokit = new Octokit({ auth: gitHubToken });
        const { data } = await octokit.rest.repos.listForAuthenticatedUser({
          affiliation: 'owner,collaborator,organization_member',
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
      } catch (e) {
        console.error('Remote sync failed, proceeding with local only.');
        this.logger.error(`GitHub sync failed for user ${userEmail}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    
    for (const path of localPaths) {
    this.logger.debug(`Processing path: ${path}`);
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
    for (const [fullName, p] of projectMap) {
      const existingRecord = await this.prisma.repository.findUnique({
        where: { fullName_userId: { fullName: p.full_name!, userId: userEmail } },
      });

      const mergedPaths = (existingRecord?.localPaths as Record<string, string>) || {};
      if (p.currentPath) {
        mergedPaths[deviceId] = p.currentPath;
      }

      const saved = await this.prisma.repository.upsert({
        where: { fullName_userId: { fullName: p.full_name!, userId: userEmail } },
        update: {
          isLocal: p.isLocal,
          isRemote: p.isRemote,
          localPaths: mergedPaths,
          externalId: p.externalId,
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
          userId: userEmail,
          isContributed: p.isContributed || false,
          contributionScore: 0,
        },
      });
      results.push(saved);
    }
    this.logger.log(`Sync completed.`)
  }
}
