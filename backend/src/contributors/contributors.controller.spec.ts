import { Test, TestingModule } from '@nestjs/testing';
import { ContributorsController } from './contributors.controller';
import { ContributorsService } from './contributors.service';

describe('ContributorsController', () => {
  let controller: ContributorsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContributorsController],
      providers: [ContributorsService],
    }).compile();

    controller = module.get<ContributorsController>(ContributorsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
