import { Controller, Get, Post, Body, Param, Req, Query } from '@nestjs/common';
import { ReposService } from './repos.service';
import { SyncReposDto } from './dto/sync-repo.dto';
import { GetReposListDto } from './dto/repos-list.dto';

@Controller('repos')
export class ReposController {
  constructor(private readonly reposService: ReposService) {}

  /*
   POST /repos/sync
   Triggers full sync: local path scan + GitHub fetch + enqueues deep sync.
   Returns the upserted repo list immediately; deep stats arrive via socket.
  */
  @Post('sync')
  sync(@Body() dto: SyncReposDto) {
    return this.reposService.syncUserProjects(dto);
  }

  /*
   POST /repos/sync-forced
   Triggers full sync and skips the 15-day activity staleness filter 
   for testing/deep debugging purposes.
  */
  @Post('sync-forced')
  syncForced(@Body() dto: SyncReposDto) {
    return this.reposService.syncUserProjects(dto, true);
  }

  /*
   GET /repos
   All repos for the authenticated user, ordered by contribution score.
  */
  @Get()
  getUserRepos(@Req() req: any) {
    return this.reposService.getUserRepos(req.user.id);
  }
  /*
   GET /repos/list
   Paginated, sortable repo list for the authenticated user.
  */
  @Get('list')
  getReposList(@Query() dto: GetReposListDto, @Req() req: any) {
    return this.reposService.getReposList(req.user.id, dto);
  }

  /*
   GET /repos/:id
   Single repo record.
  */
  @Get(':id')
  getRepo(@Param('id') id: string, @Req() req: any) {
    return this.reposService.getRepo(id, req.user.id);
  }
}
