import { Controller } from '@nestjs/common';
import { CommitStatsService } from './commit-stats.service';

@Controller('commit-stats')
export class CommitStatsController {
  constructor(private readonly commitStatsService: CommitStatsService) {}
}
