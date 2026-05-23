import { Module } from '@nestjs/common';
import { CommitStatsService } from './commit-stats.service';
import { CommitStatsController } from './commit-stats.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [CommitStatsController],
  providers: [CommitStatsService, PrismaService],
  exports: [CommitStatsService],
})
export class CommitStatsModule {}
