import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { CommitStatsService } from './commit-stats.service';
import { GetCommitStatsDto, CompareCommitStatsDto } from './dto/commit-stats.dto';

@Controller('commit-stats')
export class CommitStatsController {
  constructor(private readonly commitStatsService: CommitStatsService) {}

  /*
   GET /commit-stats/:repositoryId
   Paginated weekly (or monthly) commit activity for one repo.
   Query: page, limit, from, to, granularity (week|month)
  */
  @Get(':repositoryId')
  getCommitStats(
    @Param('repositoryId') repositoryId: string,
    @Query() dto: GetCommitStatsDto,
    @Req() req: any,
  ) {
    return this.commitStatsService.getCommitStats(repositoryId, dto, req.user.id);
  }

  /*
   GET /commit-stats/:repositoryId/summary
   Totals, peak week, avg commits/week  for the dashboard stat cards.
  */
  @Get(':repositoryId/summary')
  getSummary(
    @Param('repositoryId') repositoryId: string,
    @Req() req: any,
  ) {
    return this.commitStatsService.getSummary(repositoryId, req.user.id);
  }

  /*
   GET /commit-stats/compare/:repoAId/:repoBId
   Aligned time-series for two repos with churn and activity comparison.
   Query: from, to, granularity
  */
  @Get('compare/:repoAId/:repoBId')
  compareRepos(
    @Param('repoAId') repoAId: string,
    @Param('repoBId') repoBId: string,
    @Query() dto: CompareCommitStatsDto,
    @Req() req: any,
  ) {
    return this.commitStatsService.compareRepos(repoAId, repoBId, dto, req.user.id);
  }
}