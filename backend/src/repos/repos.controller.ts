import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ReposService } from './repos.service';
import { CreateRepoDto } from './dto/create-repo.dto';
import { UpdateRepoDto } from './dto/update-repo.dto';

@Controller('repos')
export class ReposController {
  constructor(private readonly reposService: ReposService) {}

  @Post()
  create(@Body() createRepoDto: CreateRepoDto) {
    return this.reposService.create(createRepoDto);
  }

  @Get()
  findAll() {
    return this.reposService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reposService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRepoDto: UpdateRepoDto) {
    return this.reposService.update(+id, updateRepoDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.reposService.remove(+id);
  }
}
