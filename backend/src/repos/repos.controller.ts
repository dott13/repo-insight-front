import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ReposService } from './repos.service';
import { CreateRepoDto } from './dto/create-repo.dto';
import { UpdateRepoDto } from './dto/update-repo.dto';

@Controller('repos')
export class ReposController {
  constructor(private readonly reposService: ReposService) {}

  @Post('sync')
  async syncProjects( @Body() body: {
    paths: string[],
    email: string, 
    deviceId: string,
    token?: string,
    allEmails?: string[] }) {
      return this.reposService.syncUserProjects(body.paths, body.email, body.deviceId, body.token, body.allEmails);
  }

  @Post(':id/parse')
  async parseRepo(@Param('id') id: string, @Body('email') email: string) {
    return { message: "Parsing started", id };
  } 
}
