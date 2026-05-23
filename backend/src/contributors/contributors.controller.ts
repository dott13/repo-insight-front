import {
  Controller,
  Get,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { ContributorsService } from './contributors.service';
import { GetContributorsDto, CompareContributorsDto } from './dto/contributors.dto';

// Assumes a guard upstream attaches req.user.id — adjust to your auth setup
@Controller('contributors')
export class ContributorsController {
  constructor(private readonly contributorsService: ContributorsService) {}

  /*
   GET /contributors/:repositoryId
   Paginated contributor list for a single repo.
   Query: page, limit, sortBy, order
  */
  @Get(':repositoryId')
  getContributors(
    @Param('repositoryId') repositoryId: string,
    @Query() dto: GetContributorsDto,
    @Req() req: any,
  ) {
    return this.contributorsService.getContributors(repositoryId, dto, req.user.id);
  }

  /*
    GET /contributors/:repositoryId/bus-factor
    Bus factor score + ownership waterfall for one repo.
  */
  @Get(':repositoryId/bus-factor')
  getBusFactor(
    @Param('repositoryId') repositoryId: string,
    @Req() req: any,
  ) {
    return this.contributorsService.getBusFactor(repositoryId, req.user.id);
  }

  /*
   GET /contributors/compare?repoAId=:id&repoBId=:id
   Side-by-side contributor overlap between two repos.
  */
  @Get('compare')
  compareContributors(
    @Query() dto: CompareContributorsDto,
    @Req() req: any,
  ) {
    return this.contributorsService.compareContributors(dto, req.user.id);
  }
}