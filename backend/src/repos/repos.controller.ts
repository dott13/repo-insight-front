import { Controller, Get, Post, Body, Param, Req } from '@nestjs/common';
import { ReposService } from './repos.service';
import { SyncReposDto } from './dto/sync-repo.dto';

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
   GET /repos
   All repos for the authenticated user, ordered by contribution score.
  */
  @Get()
  getUserRepos(@Req() req: any) {
    return this.reposService.getUserRepos(req.user.id);
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