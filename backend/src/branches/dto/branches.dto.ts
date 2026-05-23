import { IsString, IsOptional, IsEnum } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { SortDto } from '../../common/dto/sort.dto';

export enum BranchSortField {
  USER_COMMITS = 'userCommits',
  TOTAL_COMMITS = 'totalCommits',
  COMMIT_PERCENT = 'commitPercent',
  LAST_COMMIT = 'lastCommitAt',
  NAME = 'name',
}

export class GetBranchesDto extends PaginationDto {
  @IsOptional()
  @IsEnum(BranchSortField)
  sortBy?: BranchSortField = BranchSortField.USER_COMMITS;
}

export class CompareBranchesDto extends SortDto {
  @IsString()
  branchAId!: string;

  @IsString()
  branchBId!: string;
}

export class SyncBranchesDto {
  repositoryId!: string;
  fullName!: string;
  gitHubToken!: string;
  userLogin!: string;
  defaultBranch!: string;
}

export class BranchResponseDto {
  id!: string;
  name!: string;
  isDefault!: boolean;
  isProtected!: boolean;
  userCommits!: number;
  totalCommits!: number;
  commitPercent!: number;
  userAdditions!: number;
  userDeletions!: number;
  lastCommitAt!: Date | null;
}

export class BranchComparisonDto {
  branchA!: BranchResponseDto;
  branchB!: BranchResponseDto;
  diff!: {
    userCommitsDelta: number; 
    commitPercentDelta: number;
    additionsDelta: number;
    deletionsDelta: number;
    moreActiveBranch: string; 
  };
}