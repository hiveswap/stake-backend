import { Test, TestingModule } from '@nestjs/testing';
import { GalxeController } from './galxe.controller';

describe('GalxeController', () => {
  let controller: GalxeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GalxeController],
    }).compile();

    controller = module.get<GalxeController>(GalxeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
