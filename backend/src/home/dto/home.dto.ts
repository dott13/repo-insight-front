import { PaginationDto } from '../../common/dto/pagination.dto';

export class GetHomeTableDto extends PaginationDto {}


export class RepoTableRowDto {
  id!: string;
  fullName!: string;
  description!: string | null;
  contributorCount!: number;
  userCommits!: number;
  lastContributedAt!: Date | null;  // last commit date from the user's most active branch
  prMergeRate!: number;
  totalPRs!: number;
  contributionScore!: number;
  isLocal!: boolean;
  isRemote!: boolean;
}

export class HighlightDto {
  fullName!: string;
  qualifier!: string;
  metric!: string;
  metricRaw!: number;       // raw number for sorting/display flexibility
  repoId!: string;
}

export class HomeHighlightsDto {
  mostCommits!: HighlightDto;
  topScore!: HighlightDto;
  bestMergeRate!: HighlightDto | null;
}