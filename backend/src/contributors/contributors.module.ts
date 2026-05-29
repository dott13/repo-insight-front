import { Module } from '@nestjs/common';
import { ContributorsService } from './contributors.service';
import { ContributorsController } from './contributors.controller';
import { PrismaService } from '../prisma/prisma.service';
import { SharedModule } from '../shared/shared.module';

@Module({
  controllers: [ContributorsController],
  providers: [ContributorsService, PrismaService],
  exports: [ContributorsService],
})
export class ContributorsModule {}
