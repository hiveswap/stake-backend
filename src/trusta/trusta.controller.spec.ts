import { Test, TestingModule } from '@nestjs/testing';
import { TrustaController } from './trusta.controller';
import { HttpModule } from '@nestjs/axios';

describe('TrustaController', () => {
  let controller: TrustaController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [TrustaController],
      imports: [HttpModule],
    }).compile();

    controller = app.get<TrustaController>(TrustaController);
  });

  it('should be defined', async () => {
    const addr = '0x9cAdb2D7a2c33d49A31f1168a40Bf21871cE7106';
    const res = await controller.getPoint(addr);
    console.log(res);
  });
});
