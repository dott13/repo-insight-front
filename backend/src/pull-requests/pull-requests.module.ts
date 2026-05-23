import { Module } from '@nestjs/common';
import { PullRequestsService } from './pull-requests.service';
import { PullRequestsController } from './pull-requests.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [PullRequestsController],
  providers: [PullRequestsService,PrismaService],
  exports: [PullRequestsService],
})
export class PullRequestsModule {}
