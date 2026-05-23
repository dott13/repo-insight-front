import { IsOptional, IsDateString, IsEnum } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export enum CommitStatGranularity {
  WEEK = 'week',
  MONTH = 'month',
}

export class GetCommitStatsDto extends PaginationDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsEnum(CommitStatGranularity)
  granularity?: CommitStatGranularity = CommitStatGranularity.WEEK;
}

export class CompareCommitStatsDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsEnum(CommitStatGranularity)
  granularity?: CommitStatGranularity = CommitStatGranularity.WEEK;
}

export class SyncCommitStatsDto {
  repositoryId!: string;
  fullName!: string;
  gitHubToken!: string;
}


export class CommitStatResponseDto {
  id!: string;
  week!: Date;
  additions!: number;
  deletions!: number;
  commits!: number;
  churn!: number;
}

export class CommitStatSummaryDto {
  totalCommits!: number;
  totalAdditions!: number;
  totalDeletions!: number;
  totalChurn!: number;
  peakWeek!: CommitStatResponseDto | null;
  avgCommitsPerWeek!: number;
}

export class RepoCommitSeriesDto {
  repositoryId!: string;
  series!: CommitStatResponseDto[];
}

export class CommitStatsComparisonDto {
  repoAId!: string;
  repoBId!: string;
  repoA!: CommitStatResponseDto[];
  repoB!: CommitStatResponseDto[];
  summary!: {
    repoA: CommitStatSummaryDto;
    repoB: CommitStatSummaryDto;
    higherChurnRepo: string;
    higherActivityRepo: string;
  };
}