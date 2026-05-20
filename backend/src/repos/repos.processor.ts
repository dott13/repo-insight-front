import { Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';
import { Octokit } from 'octokit';
import { ReposGateway } from './repos.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { Logger } from '@nestjs/common';

@Processor('repos')
export class ReposProcessor {
  private readonly logger = new Logger(ReposProcessor.name);

  constructor(
    private prisma: PrismaService,
    private gateway: ReposGateway,
  ) {}

  @Process('calculate-scores')
  async handleScoreCalculation(job: Job) {
    const { userId, gitHubToken, userLogin, repos } = job.data;
    const octokit = new Octokit({ auth: gitHubToken });

    for (const repo of repos) {
      const score = await this.calculateScore(
        octokit,
        repo.fullName,
        userLogin,
      );

      await this.prisma.repository.update({
        where: { id: repo.id },
        data: { contributionScore: score },
      });

      this.gateway.emitScoreUpdate(userId, repo.id, score);
    }
  }

  private async calculateScore(
    octokit: Octokit,
    fullName: string,
    userLogin: string,
  ): Promise<number> {
    const [owner, repo] = fullName.split('/');

    for (let i = 0; i < 3; i++) {
      try {
        const res = await octokit.rest.repos.getContributorsStats({
          owner,
          repo,
        });

        if (res.status === 202) {
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }

        const data = res.data;
        if (!Array.isArray(data)) return 0;

        const userStats = data.find(
          (c: any) =>
            c.author?.login?.toLowerCase() === userLogin.toLowerCase(),
        );
        if (!userStats) return 0;

        const commits = userStats.total ?? 0;
        const additions =
          userStats.weeks?.reduce((sum: number, w: any) => sum + w.a, 0) ?? 0;
        const deletions =
          userStats.weeks?.reduce((sum: number, w: any) => sum + w.d, 0) ?? 0;

        return commits * 10 + Math.floor((additions + deletions) / 100);
      } catch (e) {
        this.logger.error(`Failed to get stats for ${fullName}: ${e}`);
        return 0;
      }
    }
    return 0;
  }
}
