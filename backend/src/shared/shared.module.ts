import { Global, Module } from '@nestjs/common';
import { GithubStatsService } from './github-stats.service';
@Global()
@Module({
  providers: [GithubStatsService],
  exports: [GithubStatsService],
})
export class SharedModule {}
 