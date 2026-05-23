import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { PullRequestsService } from './pull-requests.service';
import { GetPullRequestsDto, GetPRReviewStatsDto } from './dto/pull-requests.dto';

@Controller('pull-requests')
export class PullRequestsController {
  constructor(private readonly pullRequestsService: PullRequestsService) {}

  /*
   GET /pull-requests/:repositoryId
   Paginated PR list. Filter by state, date range, sort by any field.
   Query: page, limit, state, sortBy, from, to
  */
  @Get(':repositoryId')
  getPullRequests(
    @Param('repositoryId') repositoryId: string,
    @Query() dto: GetPullRequestsDto,
    @Req() req: any,
  ) {
    return this.pullRequestsService.getPullRequests(repositoryId, dto, req.user.id);
  }

  /*
   GET /pull-requests/:repositoryId/summary
   Aggregate stats: totals, merge rate, avg size, avg time-to-merge.
   Used for the dashboard stat cards.
  */
  @Get(':repositoryId/summary')
  getSummary(
    @Param('repositoryId') repositoryId: string,
    @Req() req: any,
  ) {
    return this.pullRequestsService.getSummary(repositoryId, req.user.id);
  }

  /*
   GET /pull-requests/:repositoryId/trends
   Weekly bucketed open/merged/closed counts.
   Used for the trend line chart.
  */
  @Get(':repositoryId/trends')
  getTrends(
    @Param('repositoryId') repositoryId: string,
    @Req() req: any,
  ) {
    return this.pullRequestsService.getTrends(repositoryId, req.user.id);
  }

  /*
   GET /pull-requests/:repositoryId/reviews
   Paginated reviewer stats. Filter by specific reviewer login.
   Query: page, limit, reviewerLogin
  */
  @Get(':repositoryId/reviews')
  getReviewStats(
    @Param('repositoryId') repositoryId: string,
    @Query() dto: GetPRReviewStatsDto,
    @Req() req: any,
  ) {
    return this.pullRequestsService.getReviewStats(repositoryId, dto, req.user.id);
  }
}