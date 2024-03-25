import { Test, TestingModule } from '@nestjs/testing';
import { StatisticsController } from './statistics.controller';
import { CurrentCreditDto, HistoryCreditDto } from './dto/credit.dto';
import { PrismaService } from '../prisma.service';
import { DateTime } from 'luxon';

describe('StatisticsController', () => {
  let appController: StatisticsController;
  const mockData = {
    timestamp: DateTime.fromISO('2024-03-25T03:50:10.010Z').toJSDate(),
    curCredit: 10000,
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [StatisticsController],
      providers: [PrismaService],
    }).compile();

    appController = app.get<StatisticsController>(StatisticsController);
    const prisma = app.get<PrismaService>(PrismaService);
    prisma.creditHistory.findMany = jest.fn().mockReturnValueOnce([mockData]);
    prisma.credits.findFirst = jest.fn().mockReturnValueOnce(mockData);
  });

  describe('root', () => {
    it('should return latest credit', async () => {
      const param = new CurrentCreditDto();
      param.user = '0x0094d7caC1AeaFc2d87E2DF6B97F2400B0527522';
      expect(await appController.latestCredit(param)).toEqual(mockData);
    });

    it('should return credit history', async () => {
      const param = new HistoryCreditDto();
      param.user = '0x0094d7caC1AeaFc2d87E2DF6B97F2400B0527522';
      param.pageSize = 10;
      param.currentPage = 1;
      expect(await appController.historyCredit(param)).toEqual([mockData]);
    });
  });
});
