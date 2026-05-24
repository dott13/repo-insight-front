import { Controller, Get, Query, Req } from '@nestjs/common';
import { HomeService } from './home.service';
import { GetHomeTableDto } from './dto/home.dto';

@Controller('home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  /*
   GET /home/table
   Paginated repo table rows with contributor count and last contribution date.
   Query: page, limit
  */
  @Get('table')
  getTableRows(@Query() dto: GetHomeTableDto, @Req() req: any) {
    return this.homeService.getTableRows(req.user.id, dto);
  }

  /*
   GET /home/highlights
   Three highlight cards: most commits, top score, best PR merge rate.
  */
  @Get('highlights')
  getHighlights(@Req() req: any) {
    return this.homeService.getHighlights(req.user.id);
  }
}