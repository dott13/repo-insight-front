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

  @Post(':id/parse')
  async parseRepo(@Param('id') id: string, @Body('email') email: string) {
    return { message: "Parsing started", id };
  } 
}
