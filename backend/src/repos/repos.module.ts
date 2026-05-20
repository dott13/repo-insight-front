import { Module } from '@nestjs/common';
import { ReposService } from './repos.service';
import { ReposController } from './repos.controller';
import { GitParserService } from './git-parser.service';
import { PrismaService } from '../prisma/prisma.service';
import { BullModule } from '@nestjs/bull';
import { ReposGateway } from './repos.gateway';
import { ReposProcessor } from './repos.processor';

@Module({
  imports: [
    BullModule.registerQueue({name: 'repos'}),
  ],
  controllers: [ReposController],
  providers: [ReposService, GitParserService, PrismaService, ReposGateway, ReposProcessor],
})
export class ReposModule {}
