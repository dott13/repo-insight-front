import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

export enum RepoSortField {
  SCORE        = 'contributionScore',
  COMMITS      = 'totalCommits',
  PR_RATE      = 'prMergeRate',
  TOTAL_PRS    = 'totalPRs',
  LAST_PARSED  = 'lastParsed',
  NAME         = 'fullName',
  CREATED      = 'createdAt',
}

export enum SortOrder {
  ASC  = 'asc',
  DESC = 'desc',
}

export class GetReposListDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;             // matches fullName / description

  @IsOptional()
  @IsEnum(RepoSortField)
  sortBy?: RepoSortField = RepoSortField.SCORE;

  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder = SortOrder.DESC;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  localOnly?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  remoteOnly?: boolean;

  @IsOptional()
  @IsString()
  provider?: string;           // 'github' | 'local' | etc
}

// ─── Response ─────────────────────────────────────────────────────────────────

export class RepoListItemDto {
  id!: string;
  fullName!: string;
  name!: string;
  description!: string | null;
  htmlUrl!: string | null;
  provider!: string;
  isLocal!: boolean;
  isRemote!: boolean;
  isContributed!: boolean;

  // Contribution
  contributionScore!: number;
  totalCommits!: number;
  totalAdditions!: number;
  totalDeletions!: number;

  // PRs
  totalPRs!: number;
  mergedPRs!: number;
  openPRs!: number;
  prMergeRate!: number;

  // Counts from relations
  contributorCount!: number;
  branchCount!: number;

  // Dates
  lastContributedAt!: Date | null;
  lastParsed!: Date;
  createdAt!: Date;
}