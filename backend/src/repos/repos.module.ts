import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ReposService } from './repos.service';
import { ReposController } from './repos.controller';
import { ReposGateway } from './repos.gateway';
import { ReposProcessor } from './repos.processor';
import { GitParserService } from './git-parser.service';
import { PrismaService } from '../prisma/prisma.service';
import { ContributorsModule } from '../contributors/contributors.module';
import { BranchesModule } from '../branches/branches.module';
import { PullRequestsModule } from '../pull-requests/pull-requests.module';
import { CommitStatsModule } from '../commit-stats/commit-stats.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'repos',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
    ContributorsModule,
    BranchesModule,
    PullRequestsModule,
    CommitStatsModule,
  ],
  controllers: [ReposController],
  providers: [ReposService, GitParserService, PrismaService, ReposGateway, ReposProcessor],
  exports: [ReposService],
})
export class ReposModule {}