import { Module } from '@nestjs/common';
import { ContributorsService } from './contributors.service';
import { ContributorsController } from './contributors.controller';

@Module({
  controllers: [ContributorsController],
  providers: [ContributorsService],
})
export class ContributorsModule {}
