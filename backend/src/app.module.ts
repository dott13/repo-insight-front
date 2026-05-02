import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service.js';
import { ReposModule } from './repos/repos.module.js';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma/prisma.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), ReposModule],
  controllers: [AppController],
  providers: [PrismaService, AppService],
})
export class AppModule {}
