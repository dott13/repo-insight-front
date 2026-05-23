import { IsString, IsOptional, IsEnum } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { SortDto } from '../../common/dto/sort.dto';

export enum ContributorSortField {
  COMMITS = 'totalCommits',
  ADDITIONS = 'totalAdditions',
  DELETIONS = 'totalDeletions',
  PERCENT = 'commitPercent',
  LAST_ACTIVE = 'lastCommitAt',
}


export class GetContributorsDto extends PaginationDto {
  @IsOptional()
  @IsEnum(ContributorSortField)
  sortBy?: ContributorSortField = ContributorSortField.COMMITS;
}

export class CompareContributorsDto extends SortDto {
  @IsString()
  repoAId!: string;

  @IsString()
  repoBId!: string;
}

export class SyncContributorsDto {
  repositoryId!: string;
  fullName!: string;
  gitHubToken!: string;
  userLogin!: string;
}


export class ContributorResponseDto {
  id!: string;
  login!: string;
  avatarUrl!: string | null;
  totalCommits!: number;
  totalAdditions!: number;
  totalDeletions!: number;
  commitPercent!: number;
  firstCommitAt!: Date | null;
  lastCommitAt!: Date | null;
}

export class BusFactorResponseDto {
  busFactor!: number;
  riskLevel!: 'critical' | 'high' | 'medium' | 'low';
  ownershipBreakdown!: Array<{
    login: string;
    avatarUrl: string | null;
    commitPercent: number;
    cumulativePercent: number;
  }>;
  totalContributors!: number;
}

export class ContributorComparisonDto {
  repoAId!: string;
  repoBId!: string;
  shared!: Array<{
    login: string;
    avatarUrl: string | null;
    repoA: { commitPercent: number; totalCommits: number };
    repoB: { commitPercent: number; totalCommits: number };
  }>;
  onlyInA!: ContributorResponseDto[];
  onlyInB!: ContributorResponseDto[];
}