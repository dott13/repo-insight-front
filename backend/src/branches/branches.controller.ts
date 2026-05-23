import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { GetBranchesDto, CompareBranchesDto } from './dto/branches.dto';

@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  /*
   GET /branches/:repositoryId
   Paginated branch list for a repo, sorted by user activity by default.
   Query: page, limit, sortBy, order
  */
  @Get(':repositoryId')
  getBranches(
    @Param('repositoryId') repositoryId: string,
    @Query() dto: GetBranchesDto,
    @Req() req: any,
  ) {
    return this.branchesService.getBranches(repositoryId, dto, req.user.id);
  }

  /*
   GET /branches/detail/:branchId
   Single branch detail.
  */
  @Get('detail/:branchId')
  getBranch(
    @Param('branchId') branchId: string,
    @Req() req: any,
  ) {
    return this.branchesService.getBranch(branchId, req.user.id);
  }

  /*
   GET /branches/compare?branchAId=:id&branchBId=:id
   Side-by-side diff of two branches — user contribution deltas.
  */
  @Get('compare')
  compareBranches(
    @Query() dto: CompareBranchesDto,
    @Req() req: any,
  ) {
    return this.branchesService.compareBranches(dto, req.user.id);
  }
}