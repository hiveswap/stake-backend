import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Cron } from '@nestjs/schedule';
import { retry } from 'src/utils/retry';
import { CreditHistory, PrismaPromise } from '@prisma/client';
import configurations from 'src/config/configurations';
import { DateTime } from 'luxon';

@Injectable()
export class StatisticsService {
  retryTimes: number;
  retryInterval: number;
  constructor(private readonly prisma: PrismaService) {
    this.retryTimes = configurations().retryTimes;
    this.retryInterval = configurations().retryInterval;
  }

  // traverse the raw event data, update history credit and current credit.
  // worked at 00:00 everyday in Singapore time
  @Cron('* 0 0 * * 1-7', {
    timeZone: 'Asia/Singapore',
  })
  async update() {
    const curTime = DateTime.now().setZone('Asia/Singapore');

    // get the latest update time in case we lost some important update
    const latestUpdateRecord = await this.prisma.indexedRecord.findFirst({});
    if (!latestUpdateRecord) {
      return;
    }
    const latestUpdateTime = DateTime.fromJSDate(latestUpdateRecord.updateTime);

    // to check the update times, usually it should be 1, but if there are several days left to be updated,
    // this could be greater than 1
    const gap = curTime.toMillis() - latestUpdateTime.toMillis();
    const updateTimes = Math.ceil(gap / (24 * 60 * 60 * 1000));

    for (let i = 0; i < updateTimes; i++) {
      // we should start at the latest update time
      const startTime = latestUpdateTime.setZone('Asia/Singapore');

      // end with the next nearest 00:00
      const endTime = startTime.startOf('day').plus({ days: 1 });

      await this.#getAndParse(startTime, endTime);
    }
  }

  async #getAndParse(startTime: DateTime, endTime: DateTime) {
    const rawData = await retry(
      this.prisma.rawEvents.findMany,
      this.retryTimes,
      this.retryInterval,
      this,
      {
        where: {
          timestamp: {
            gte: startTime.toJSDate(),
            lte: endTime.toJSDate(),
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
    // aggregate all user, get the user total stake data
    const userMap: Map<string, bigint> = new Map();
    rawData.forEach((data) => {
      count += BigInt(data.amount);
      userMap.get(data.userAddr)
        ? userMap.set(
            data.userAddr,
            // @ts-expect-error ts(2322)
            userMap.get(data.userAddr) + BigInt(data.amount),
          )
        : userMap.set(data.userAddr, BigInt(data.amount));
    });

    const txs: PrismaPromise<any>[] = [];
    // update the history credit data
    const userHistory: CreditHistory[] = [];
    userMap.forEach((value, key) => {
      userHistory.push({
        id: 0,
        userAddr: key,
        credit: Number((BigInt(configurations().scores) * value) / count),
        timestamp: new Date(),
      });
    });

    // update history data
    txs.push(this.prisma.creditHistory.createMany({ data: userHistory }));

    const creditChange = new Map<string, number>();
    userHistory.forEach(async (data) => {
      creditChange.get(data.userAddr)
        ? creditChange.set(
            data.userAddr,
            // @ts-expect-error ts(2322)
            creditChange.get(data.userAddr) + data.credit,
          )
        : creditChange.set(data.userAddr, data.credit);
      // update current credit
      txs.push(
        this.prisma.credits.upsert({
          where: {
            userAddr: data.userAddr,
          },
          create: {
            userAddr: data.userAddr,
            curCredit: data.credit,
            timestamp: DateTime.now().setZone('Asia/Singapore').toJSDate(),
          },
          update: {
            curCredit: {
              increment: data.credit,
            },
            timestamp: DateTime.now().setZone('Asia/Singapore').toJSDate(),
          },
        }),
      );
    });

    txs.push(
      this.prisma.indexedRecord.updateMany({
        data: {
          updateTime: DateTime.now().setZone('Asia/Singapore').toJSDate(),
        },
      }),
    );

    // write to database
    // this.prisma.$transaction(txs);
    await retry(
      this.prisma.$transaction,
      this.retryTimes,
      this.retryInterval,
      this.prisma,
      // @ts-expect-error ts(2033)
      txs,
    );
    Logger.log(`parsed from ${startTime} to ${endTime} success`, 'Statistics');
  }
}
