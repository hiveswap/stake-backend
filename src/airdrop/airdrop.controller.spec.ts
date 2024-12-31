import { Test, TestingModule } from '@nestjs/testing';
import { AirdropController } from './airdrop.controller';

describe('AirdropController', () => {
  let controller: AirdropController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AirdropController],
    }).compile();

    controller = module.get<AirdropController>(AirdropController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
