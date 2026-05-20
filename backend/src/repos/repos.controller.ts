import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ReposService } from './repos.service';
import { SyncReposDto } from './dto/sync-repo.dto';

@Controller('repos')
export class ReposController {
  constructor(private readonly reposService: ReposService) {}

  @Post('sync')
  async syncProjects( @Body() dto: SyncReposDto) {
      return this.reposService.syncUserProjects(dto);
  }

  @Get()
  async getRepos( @Param('userId') userId: string) {
      return this.reposService.getUserRepos(userId);
  }
}
