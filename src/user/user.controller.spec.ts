import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { PrismaService } from '../prisma.service';
import { UserVolumeDTO } from './dto/user.dto';

describe('StatisticsController', () => {
  let appController: UserController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [PrismaService],
    }).compile();

    appController = app.get<UserController>(UserController);
  });

  describe('root', () => {
    it('should return user volume', async () => {
      const param = new UserVolumeDTO();
      param.user = '0x0094d7caC1AeaFc2d87E2DF6B97F2400B0527522';
      expect(await appController.userVolume(param)).toEqual(0);
    });
  });
});
