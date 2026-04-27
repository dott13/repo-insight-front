import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ReposService } from './repos.service';
import { CreateRepoDto } from './dto/create-repo.dto';
import { UpdateRepoDto } from './dto/update-repo.dto';

@Controller('repos')
export class ReposController {
  constructor(private readonly reposService: ReposService) {}

  @Post('repos')
  async syncProjects( @Body() body: {
    paths: string[],
    email: string, 
    token?: string,
    allEmails?: string[] }) {
      return this.reposService.syncUserProjects(body.paths, body.email, body.token, body.allEmails);
  }

  @Post(':id/parse')
  async parseRepo(@Param('id') id: string, @Body('email') email: string) {
    return { message: "Parsing started", id };
  } 
}
