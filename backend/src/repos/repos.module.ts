import { Module } from '@nestjs/common';
import { ReposService } from './repos.service';
import { ReposController } from './repos.controller';
import { GitParserService } from './git-parser.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ReposController],
  providers: [ReposService, GitParserService, PrismaService],
})
export class ReposModule {}
