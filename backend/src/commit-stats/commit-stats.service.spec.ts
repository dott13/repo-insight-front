import { Test, TestingModule } from '@nestjs/testing';
import { CommitStatsService } from './commit-stats.service';

describe('CommitStatsService', () => {
  let service: CommitStatsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CommitStatsService],
    }).compile();

    service = module.get<CommitStatsService>(CommitStatsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
