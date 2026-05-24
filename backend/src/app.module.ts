import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service.js';
import { ReposModule } from './repos/repos.module.js';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma/prisma.service';
import { BullModule } from '@nestjs/bull';
import { ContributorsModule } from './contributors/contributors.module';
import { BranchesModule } from './branches/branches.module';
import { PullRequestsModule } from './pull-requests/pull-requests.module';
import { CommitStatsModule } from './commit-stats/commit-stats.module';
import { AnalysisModule } from './analysis/analysis.module';
import { HomeModule } from './home/home.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    ReposModule,
    ContributorsModule,
    BranchesModule,
    PullRequestsModule,
    CommitStatsModule,
    AnalysisModule,
    HomeModule],
  controllers: [AppController],
  providers: [PrismaService, AppService],
})
export class AppModule {}
