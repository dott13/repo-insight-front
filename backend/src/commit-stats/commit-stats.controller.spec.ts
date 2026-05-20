import { Test, TestingModule } from '@nestjs/testing';
import { CommitStatsController } from './commit-stats.controller';
import { CommitStatsService } from './commit-stats.service';

describe('CommitStatsController', () => {
  let controller: CommitStatsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommitStatsController],
      providers: [CommitStatsService],
    }).compile();

    controller = module.get<CommitStatsController>(CommitStatsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
