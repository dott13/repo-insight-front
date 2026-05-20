import { Controller } from '@nestjs/common';
import { ContributorsService } from './contributors.service';

@Controller('contributors')
export class ContributorsController {
  constructor(private readonly contributorsService: ContributorsService) {}
}
