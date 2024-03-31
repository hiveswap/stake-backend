import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Cron } from '@nestjs/schedule';
import configurations from 'src/config/configurations';
import BigNumber from 'bignumber.js';
import { Prisma } from '@prisma/client';
import { P_POINT_PER_HOUR } from '../config/point';

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
      const firstAddEvent = await this.prisma.addLiquidityEvent.findFirst({
        orderBy: {
          timestamp: 'asc',
        },
      });

      if (!firstAddEvent) {
        return;
      }

      started = firstAddEvent.timestamp;
    }

    const ended = Math.floor(new Date().getTime() / 1000);
    for (let i = started; i < ended; i = i + 60 * 60) {
      const rightTick = i + 60 * 60;
      const addLiquidityEvents = await this.prisma.addLiquidityEvent.findMany({
        where: {
          timestamp: {
            gte: started,
            lt: rightTick,
          },
        },
      });
      const removeLiquidityEvents = await this.prisma.removeLiquidityEvent.findMany({
        where: {
          timestamp: {
            gte: started,
            lt: rightTick,
          },
        },
      });
      if (!addLiquidityEvents && !removeLiquidityEvents) continue;

      const userAddLiquidities = addLiquidityEvents.reduce((acc, cur) => {
        if (acc.has(cur.userAddr)) {
          acc.set(
            cur.userAddr,
            new BigNumber(this.#getTokenInUSD(cur.tokenX, cur.tokenY, cur.amountX, cur.amountY)).plus(acc.get(cur.userAddr) ?? 0),
          );
        } else {
          acc.set(cur.userAddr, this.#getTokenInUSD(cur.tokenX, cur.tokenY, cur.amountX, cur.amountY));
        }
        return acc;
      }, new Map<string, BigNumber>());

      const userRemoveLiquidities = removeLiquidityEvents.reduce((acc, cur) => {
        if (acc.has(cur.userAddr)) {
          acc.set(
            cur.userAddr,
            new BigNumber(this.#getTokenInUSD(cur.tokenX, cur.tokenY, cur.amountX, cur.amountY)).negated().plus(acc.get(cur.userAddr) ?? 0),
          );
        } else {
          acc.set(cur.userAddr, new BigNumber(this.#getTokenInUSD(cur.tokenX, cur.tokenY, cur.amountX, cur.amountY)).negated());
        }
        return acc;
      }, new Map<string, BigNumber>());

      const userLiquidities = StatisticsService.mergeMaps(userAddLiquidities, userRemoveLiquidities);
      const userLastTotal = await this.prisma.userCurrentLPAmount.findMany({});
      const userNewTotal = userLastTotal.reduce((acc, cur) => {
        if (userLiquidities.has(cur.userAddr)) {
          acc.set(cur.userAddr, userLiquidities.get(cur.userAddr)?.plus(cur.amount) ?? new BigNumber(0));
        } else {
          acc.set(cur.userAddr, userLiquidities.get(cur.userAddr) ?? new BigNumber(0));
        }
        return acc;
      }, new Map<string, BigNumber>());

      const totalLockAmount = Array.from(userNewTotal.values()).reduce((acc, cur) => acc.plus(cur), new BigNumber(0));
      const userPoints = Array.from(userNewTotal.keys()).reduce((acc, cur) => {
        acc.set(cur, (userNewTotal.get(cur) ?? new BigNumber(0)).multipliedBy(P_POINT_PER_HOUR).div(totalLockAmount));
        return acc;
      }, new Map<string, BigNumber>());
      const action = 0;
      await this.prisma.$transaction([
        // update index record
        this.prisma.indexedRecord.update({
          where: {
            id: record.id,
          },
          data: {
            pointCheckpoint: ended,
          },
        }),
        // update point history
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
              point: new Prisma.Decimal((userPoints.get(userAddr) ?? 0).toFixed(2)),
            },
            update: {
              hivePoint: {
                increment: new Prisma.Decimal((userPoints.get(userAddr) ?? 0).toFixed(2)),
              },
              point: {
                increment: new Prisma.Decimal((userPoints.get(userAddr) ?? 0).toFixed(2)),
              },
            },
          });
        }),
        ...Array.from(userNewTotal.keys()).map((userAddr) => {
          return this.prisma.userCurrentLPAmount.upsert({
            where: {
              userAddr: userAddr,
            },
            create: {
              id: 0,
              userAddr: userAddr,
              amount: (userLiquidities.get(userAddr) ?? new BigNumber(0)).toFixed(2),
            },
            update: {
              amount: (userLiquidities.get(userAddr) ?? new BigNumber(0)).toFixed(2),
            },
          });
        }),
      ]);
    }
  }

  #getTokenInUSD(tokenX: string, tokenY: string, amountX: string, amountY: string): BigNumber {
    console.log(tokenX, tokenY, amountX, amountY);
    return new BigNumber(1);
  }

  static mergeMaps<T>(map1: Map<T, BigNumber>, map2: Map<T, BigNumber>): Map<T, BigNumber> {
    const res = new Map([...map1]);
    for (const [key, value] of map2) {
      res.set(key, (res.get(key) ?? new BigNumber(0)).plus(value));
    }
    return res;
  }
}
