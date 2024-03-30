import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Cron } from '@nestjs/schedule';
import { retry } from 'src/utils/retry';
import { PointHistory, PrismaPromise } from '@prisma/client';
import configurations from 'src/config/configurations';
import { DateTime } from 'luxon';
import { poolMap } from 'src/utils/constants';
import fetch, { RequestInit } from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';
import BigNumber from 'bignumber.js';
import { Prisma } from '@prisma/client';
import { M_POINT_PER_HOUR } from '../config/point';

@Injectable()
export class StatisticsService {
  retryTimes: number;
  retryInterval: number;

  constructor(private readonly prisma: PrismaService) {
    this.retryTimes = configurations().retryTimes;
    this.retryInterval = configurations().retryInterval;
  }

  @Cron('*/30 * * * * *')
  async handlePointHistory() {
    Logger.log('Handle point history', 'StatisticsService');
    const record = await this.prisma.indexedRecord.findFirst({});
    if (!record) {
      return;
    }

    let started = record.pointCheckpoint;
    if (record.pointCheckpoint === 0) {
      const firstLockEvent = await this.prisma.lockEvent.findFirst({
        orderBy: {
          timestamp: 'asc',
        },
      });

      if (!firstLockEvent) {
        return;
      }

      started = firstLockEvent.timestamp;
    }

    const ended = Math.floor(new Date().getTime() / 1000);
    for (let i = started; i < ended; i = i + 60 * 60) {
      const rightTick = i + 60 * 60;
      const lockEvents = await this.prisma.lockEvent.findMany({
        where: {
          timestamp: {
            gte: started,
            lt: rightTick,
          },
        },
      });
      if (!lockEvents) continue;
      const userLocks = lockEvents.reduce((acc, cur) => {
        if (acc.has(cur.userAddr)) {
          acc.set(cur.userAddr, new BigNumber(cur.amount).plus(acc.get(cur.userAddr) ?? 0));
        } else {
          acc.set(cur.userAddr, new BigNumber(cur.amount));
        }
        return acc;
      }, new Map<string, BigNumber>());

      const totalLockAmount = Array.from(userLocks.values()).reduce((acc, cur) => acc.plus(cur), new BigNumber(0));
      const userPoints = Array.from(userLocks.keys()).reduce((acc, cur) => {
        acc.set(cur, (userLocks.get(cur) ?? new BigNumber(0)).multipliedBy(M_POINT_PER_HOUR).div(totalLockAmount));
        return acc;
      }, new Map<string, BigNumber>());
      const action = 0;
      await this.prisma.$transaction([
        this.prisma.indexedRecord.update({
          where: {
            id: record.id,
          },
          data: {
            pointCheckpoint: ended,
          },
        }),
        this.prisma.pointHistory.createMany({
          data: Array.from(userPoints.keys()).map((up) => ({
            id: 0,
            userAddr: up,
            point: new Prisma.Decimal((userPoints.get(up) ?? 0).toFixed(2)),
            action: action,
            timestamp: new Date().getTime() / 1000,
            epollId: rightTick,
            eventId: `${up}-${rightTick}-${action}`,
          })),
          skipDuplicates: true,
        }),
        ...Array.from(userPoints.keys()).map((userAddr) => {
          return this.prisma.point.upsert({
            where: {
              userAddr: userAddr,
            },
            create: {
              userAddr: userAddr,
              hivePoint: new Prisma.Decimal((userPoints.get(userAddr) ?? 0).toFixed(2)),
              timestamp: new Date().getTime() / 1000,
            },
            update: {
              hivePoint: {
                increment: new Prisma.Decimal((userPoints.get(userAddr) ?? 0).toFixed(2)),
              },
              timestamp: new Date().getTime() / 1000,
            },
          });
        }),
      ]);
    }
  }

  // traverse the raw event data, update history credit and current credit.
  // worked at 00:00 everyday in Singapore time
  // @Cron('0 0 0 * * 1-7', {
  //   timeZone: 'Asia/Singapore',
  // })
  async update() {
    const curTime = DateTime.now().setZone('Asia/Singapore');
    Logger.log(`Starts to update at ${curTime.toString()}`, 'Statistics');

    // get the latest update time in case we lost some important update
    const latestUpdateRecord = await this.prisma.indexedRecord.findFirst({});
    if (!latestUpdateRecord) {
      return;
    }
    let latestUpdateTime = DateTime.fromJSDate(latestUpdateRecord.updateTime);

    // to check the update times, usually it should be 1, but if there are several days left to be updated,
    // this could be greater than 1
    const gap = curTime.toMillis() - latestUpdateTime.toMillis();
    const updateTimes = Math.ceil(gap / (24 * 60 * 60 * 1000));

    for (let i = 0; i < updateTimes; i++) {
      // we should start at the latest update time
      const startTime = latestUpdateTime.setZone('Asia/Singapore');

      // end with the next nearest 00:00
      const endTime = startTime.startOf('day').plus({ days: 1 }).setZone('Asia/Singapore');

      const txs: PrismaPromise<any>[] = [];

      // await this.#getAndParseStakeEvents(startTime, endTime, txs);
      // await this.#getAndParseAddLiquidityEvents(startTime, endTime, txs);

      txs.push(
        this.prisma.indexedRecord.update({
          where: {
            id: latestUpdateRecord.id,
          },
          data: {
            updateTime: endTime.toJSDate(),
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

      latestUpdateTime = endTime;
    }
  }

  async #getAndParseStakeEvents(startTime: DateTime, endTime: DateTime, txs: PrismaPromise<any>[]) {
    const rawData = await retry(this.prisma.lockEvent.findMany, this.retryTimes, this.retryInterval, this, {
      where: {
        timestamp: {
          gte: 0,
          // gte: startTime.toJSDate(),
          // lt: endTime.toJSDate(),
        },
      },
      select: {
        amount: true,
        userAddr: true,
        timestamp: true,
      },
    });

    let count = 0;
    // aggregate all user, get the user total stake data
    const userMap: Map<string, number> = new Map();
    rawData.forEach((data) => {
      const amount = Number(BigInt(data.amount));
      count += amount;
      userMap.has(data.userAddr)
        ? userMap.set(
            data.userAddr,
            // @ts-expect-error ts(2322)
            userMap.get(data.userAddr) + amount,
          )
        : userMap.set(data.userAddr, amount);
    });

    // update the history credit data
    const userHistory: PointHistory[] = [];
    userMap.forEach((value, key) => {
      userHistory.push({
        id: 0,
        userAddr: key,
        point: new Prisma.Decimal((configurations().stakeScores * value) / count),
        action: 0,
        timestamp: new Date().getTime() / 1000,
        epollId: 0,
        eventId: `${key}-${0}-${0}`,
      });
    });

    // update history data
    txs.push(this.prisma.pointHistory.createMany({ data: userHistory }));

    // const creditChange = new Map<string, number>();
    // userHistory.forEach(async (data) => {
    //   creditChange.get(data.userAddr)
    //     ? creditChange.set(
    //         data.userAddr,
    //         // @ts-expect-error ts(2322)
    //         creditChange.get(data.userAddr) + data.credit,
    //       )
    //     : creditChange.set(data.userAddr, data.credit);
    //   // update current credit
    //   txs.push(
    //     this.prisma.point.upsert({
    //       where: {
    //         userAddr: data.userAddr,
    //       },
    //       create: {
    //         userAddr: data.userAddr,
    //         hivePoint: data.credit,
    //         mapoPoint: data.credit,
    //         timestamp: DateTime.now().setZone('Asia/Singapore').toJSDate(),
    //       },
    //       update: {
    //         hivePoint: {
    //           increment: data.credit,
    //         },
    //         timestamp: DateTime.now().setZone('Asia/Singapore').toJSDate(),
    //       },
    //     }),
    //   );
    // });

    Logger.log(`parsed stake events from ${startTime} to ${endTime} success`, 'Statistics');
  }

  async #getAndParseAddLiquidityEvents(startTime: DateTime, endTime: DateTime, txs: PrismaPromise<any>[]) {
    const rawData = await retry(this.prisma.addLiquidityEvent.findMany, this.retryTimes, this.retryInterval, this, {
      where: {
        timestamp: {
          gte: startTime.toMillis(),
          lt: endTime.toMillis(),
        },
      },
      select: {
        userAddr: true,
        tokenX: true,
        tokenY: true,
        amountX: true,
        amountY: true,
      },
    });

    let count = 0;
    const userMap = new Map();
    rawData.forEach(async (data) => {
      const pair = `${data.tokenX},${data.tokenY}`;
      const tokenPair = poolMap.get(pair);
      if (!tokenPair) {
        return;
      }
      const userAmount = await this.#getTokenPriceInUSD({
        tokenX: tokenPair.tokenX,
        tokenY: tokenPair.tokenY,
        amountX: Number(BigInt(data.amountX)),
        amountY: Number(BigInt(data.amountY)),
      });
      count += userAmount;
      userMap.has(data.userAddr)
        ? userMap.set(
            data.userAddr,
            // @ts-expect-error ts(2322)
            userMap.get(data.userAddr) + BigInt(data.amount),
          )
        : userMap.set(data.userAddr, BigInt(userAmount));
    });

    const userHistory: PointHistory[] = [];
    userMap.forEach((value, key) => {
      userHistory.push({
        id: 0,
        userAddr: key,
        point: new Prisma.Decimal((configurations().liquidityScores * value) / count),
        action: 0,
        timestamp: new Date().getTime() / 1000,
        epollId: 0,
        eventId: `${key}-${0}-${0}`,
      });
    });

    // update history data
    txs.push(this.prisma.pointHistory.createMany({ data: userHistory }));

    // const creditChange = new Map<string, number>();
    // userHistory.forEach(async (data) => {
    // creditChange.get(data.userAddr)
    //   ? creditChange.set(
    //       data.userAddr,
    //       // @ts-expect-error ts(2322)
    //       creditChange.get(data.userAddr) + data.credit,
    //     )
    //   : creditChange.set(data.userAddr, data.credit);
    // update current credit
    // txs.push(
    //   this.prisma.point.upsert({
    //     where: {
    //       userAddr: data.userAddr,
    //     },
    //     create: {
    //       userAddr: data.userAddr,
    //       hivePoint: data.credit,
    //       mapoPoint: data.credit,
    //       timestamp: DateTime.now().setZone('Asia/Singapore').toJSDate(),
    //     },
    //     update: {
    //       hivePoint: {
    //         increment: data.credit,
    //       },
    //       timestamp: DateTime.now().setZone('Asia/Singapore').toJSDate(),
    //     },
    //   }),
    // );
    // });

    Logger.log(`parsed addLiquidity events from ${startTime} to ${endTime} success`, 'Statistics');
  }

  async #getTokenPriceInUSD(tokenPair: { tokenX: string; tokenY: string; amountX: number; amountY: number }): Promise<number> {
    return new Promise<number>(async (resolve, reject) => {
      const tokenList = [];
      if (tokenPair.tokenX != 'USDT') {
        tokenList.push(tokenPair.tokenX);
      }
      if (tokenPair.tokenY != 'USDT') {
        tokenList.push(tokenPair.tokenY);
      }
      if (tokenList.length === 0) {
        reject("can't get both USDT price");
      }
      const tokens = tokenList.join(',');
      const targetUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${tokens}&vs_currencies=usd`;
      const proxy = configurations().httpsProxy;
      const opts: RequestInit = {};
      if (proxy !== '') {
        opts.agent = new HttpsProxyAgent(proxy);
      }
      const response = await retry(fetch, this.retryTimes, this.retryInterval, this, targetUrl, opts);
      const json: { [key: string]: { usd: number } } = await response.json();
      const tokenXPrice = json[tokenPair.tokenX] ? json[tokenPair.tokenX]['usd'] : 1;
      const tokenYPrice = json[tokenPair.tokenX] ? json[tokenPair.tokenY]['usd'] : 1;
      resolve(tokenPair.amountX * tokenXPrice + tokenPair.amountY * tokenYPrice);
    });
  }
}
