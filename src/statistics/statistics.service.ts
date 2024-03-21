import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Cron } from '@nestjs/schedule';
import { retry } from 'src/utils/retry';
import { CreditHistory } from '@prisma/client';
import configurations from 'src/config/configurations';

@Injectable()
export class StatisticsService {
  retryTimes: number;
  retryInterval: number;
  constructor(private readonly prisma: PrismaService) {
    this.retryTimes = configurations().retryTimes;
    this.retryInterval = configurations().retryInterval;
  }

  @Cron('* 0 0 * * 1-7')
  async update() {
    // get raw event data
    const rawData = await retry(
      this.prisma.rawEvents.findMany,
      this.retryTimes,
      this.retryInterval,
      this,
      {
        where: {
          timestamp: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        select: {
          amount: true,
          userAddr: true,
          timestamp: true,
        },
      },
    );

    let count = 0n;
    const userMap: Map<string, bigint> = new Map();
    rawData.forEach((data) => {
      count += BigInt(data.amount);
      userMap.has(data.userAddr)
        ? userMap.set(data.userAddr, BigInt(data.amount))
        : userMap.set(
            data.userAddr,
            // @ts-expect-error ts(2322)
            userMap.get(data.userAddr) + BigInt(data.amount),
          );
    });
    const userHistory: CreditHistory[] = [];
    userMap.forEach((value, key) => {
      userHistory.push({
        id: '',
        userAddr: key,
        credit: Number((10n * value) / count),
        timestamp: new Date(),
      });
    });
  }
}
