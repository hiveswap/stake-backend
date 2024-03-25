import { Test, TestingModule } from '@nestjs/testing';
import { StatisticsController } from './statistics.controller';
import { CurrentCreditDto, HistoryCreditDto } from './dto/credit.dto';
import { PrismaService } from '../prisma.service';
import { DateTime } from 'luxon';

describe('StatisticsController', () => {
  let appController: StatisticsController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [StatisticsController],
      providers: [PrismaService],
    }).compile();

    appController = app.get<StatisticsController>(StatisticsController);
  });

  describe('root', () => {
    it('should return latest credit', async () => {
      const param = new CurrentCreditDto();
      param.user = '0x0094d7caC1AeaFc2d87E2DF6B97F2400B0527522';
      expect(await appController.latestCredit(param)).toEqual({
        timestamp: DateTime.fromISO('2024-03-25T03:50:10.010Z').toJSDate(),
        curCredit: 10000,
      });
    });

    it('should return credit history', async () => {
      const param = new HistoryCreditDto();
      param.user = '0x0094d7caC1AeaFc2d87E2DF6B97F2400B0527522';
      param.pageSize = 10;
      param.currentPage = 1;
      expect(await appController.historyCredit(param)).toEqual([
        {
          timestamp: DateTime.fromISO('2024-03-25T03:50:10.010Z').toJSDate(),
          credit: 10000,
        },
      ]);
    });
  });
});
