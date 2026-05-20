import { Module } from '@nestjs/common';
import { CommitStatsService } from './commit-stats.service';
import { CommitStatsController } from './commit-stats.controller';

@Module({
  controllers: [CommitStatsController],
  providers: [CommitStatsService],
})
export class CommitStatsModule {}
