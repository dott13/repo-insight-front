import { Module } from '@nestjs/common';
import { PullRequestsService } from './pull-requests.service';
import { PullRequestsController } from './pull-requests.controller';

@Module({
  controllers: [PullRequestsController],
  providers: [PullRequestsService],
})
export class PullRequestsModule {}
