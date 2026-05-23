import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export enum PRState {
  OPEN = 'open',
  CLOSED = 'closed',
  MERGED = 'merged',
}

export enum PRSortField {
  CREATED = 'createdAt',
  UPDATED = 'updatedAt',
  MERGED = 'mergedAt',
  ADDITIONS = 'additions',
  DELETIONS = 'deletions',
  CHANGED_FILES = 'changedFiles',
}

export class GetPullRequestsDto extends PaginationDto {
  @IsOptional()
  @IsEnum(PRState)
  state?: PRState;

  @IsOptional()
  @IsEnum(PRSortField)
  sortBy?: PRSortField = PRSortField.CREATED;

  // Filter by date range — useful for trend charts
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class GetPRReviewStatsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  reviewerLogin?: string;
}

export class SyncPullRequestsDto {
  repositoryId!: string;
  fullName!: string;
  gitHubToken!: string;
}


export class PullRequestResponseDto {
  id!: string;
  externalId!: number;
  title!: string;
  state!: string;
  isDraft!: boolean;
  additions!: number;
  deletions!: number;
  changedFiles!: number;
  commitsInPR!: number;
  createdAt!: Date;
  updatedAt!: Date;
  mergedAt!: Date | null;
  closedAt!: Date | null;
  targetBranchId!: string | null;
}

export class PRReviewStatResponseDto {
  id!: string;
  reviewerLogin!: string;
  reviewCount!: number;
  approvalsGiven!: number;
  commentsGiven!: number;
  avgTimeToReview!: number | null;
}

export class PRSummaryDto {
  totalPRs!: number;
  openPRs!: number;
  mergedPRs!: number;
  closedPRs!: number;
  mergeRate!: number;
  avgAdditions!: number;
  avgDeletions!: number;
  avgTimeToMergeHours!: number | null;
}

export class PRTrendPointDto {
  week!: string;
  opened!: number;
  merged!: number;
  closed!: number;
}