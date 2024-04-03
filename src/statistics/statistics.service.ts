import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import configurations from 'src/config/configurations';
import BigNumber from 'bignumber.js';
import { Prisma } from '@prisma/client';
import { P_POINT_EPOLL_START_TIME, P_POINT_PER_HOUR } from '../config/config';
import { tokenAddrToPrice } from 'src/config/tokens';

@Injectable()
export class StatisticsService {
  retryTimes: number;
  retryInterval: number;

  onModuleInit() {
    this.handlePointHistory();
  }

  constructor(private readonly prisma: PrismaService) {
    this.retryTimes = configurations().retryTimes;
    this.retryInterval = configurations().retryInterval;
  }

  @Cron(CronExpression.EVERY_HOUR)
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
    const timeGap = 60 * 60;
    for (let i = started; i < ended; i = i + timeGap) {
      const rightTick = i + timeGap;
      const addLiquidityEvents = await this.prisma.addLiquidityEvent.findMany({
        where: {
          timestamp: {
            gte: i,
            lt: rightTick,
          },
        },
      });
      const removeLiquidityEvents = await this.prisma.removeLiquidityEvent.findMany({
        where: {
          timestamp: {
            gte: i,
            lt: rightTick,
          },
        },
      });

      // if (addLiquidityEvents.length === 0 && removeLiquidityEvents.length === 0) continue;

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

      const userLiquidities = this.#mergeMaps(userAddLiquidities, userRemoveLiquidities);

      const userLastTotal = await this.prisma.userCurrentLPAmount.findMany({});

      const userLastTotalMap = userLastTotal.reduce((acc, cur) => {
        acc.set(cur.userAddr, new BigNumber(cur.amount));
        return acc;
      }, new Map<string, BigNumber>());
      const userNewTotal: Map<string, BigNumber> = userLastTotalMap;
      userLiquidities.forEach((value, key) => {
        if (userLastTotalMap.has(key)) {
          userNewTotal.set(key, userLastTotalMap.get(key)?.plus(value) ?? new BigNumber(0));
        } else {
          userNewTotal.set(key, value);
        }
      });

      const totalLockAmount = Array.from(userNewTotal.values()).reduce((acc, cur) => acc.plus(cur), new BigNumber(0));
      const userPoints = Array.from(userNewTotal.keys()).reduce((acc, cur) => {
        acc.set(cur, (userNewTotal.get(cur) ?? new BigNumber(0)).multipliedBy(P_POINT_PER_HOUR).div(totalLockAmount));
        return acc;
      }, new Map<string, BigNumber>());
      const action = 0;
      const txs = [];
      txs.push(
        this.prisma.indexedRecord.update({
          where: {
            id: record.id,
          },
          data: {
            pointCheckpoint: ended,
          },
        }),
        ...Array.from(userNewTotal.keys()).map((userAddr) => {
          const amount = (userNewTotal.get(userAddr) ?? new BigNumber(0)).toFixed(6);
          return this.prisma.userCurrentLPAmount.upsert({
            where: {
              userAddr: userAddr,
            },
            create: {
              userAddr: userAddr,
              amount: amount,
            },
            update: {
              amount: amount,
            },
          });
        }),
      );
      if (i > P_POINT_EPOLL_START_TIME) {
        txs.push(
          this.prisma.pointHistory.createMany({
            data: Array.from(userPoints.keys()).map((up) => ({
              id: 0,
              userAddr: up,
              point: new Prisma.Decimal((userPoints.get(up) ?? 0).toFixed(6)),
              action: action,
              timestamp: new Date().getTime() / 1000,
              epollId: rightTick,
              eventId: `${up}-${rightTick}-${action}`,
            })),
            skipDuplicates: true,
          }),
          ...Array.from(userPoints.keys()).map((userAddr) => {
            const point = new Prisma.Decimal((userPoints.get(userAddr) ?? 0).toFixed(6));
            return this.prisma.point.upsert({
              where: {
                userAddr: userAddr,
              },
              create: {
                userAddr: userAddr,
                hivePoint: point,
                point: point,
              },
              update: {
                hivePoint: {
                  increment: point,
                },
                point: {
                  increment: point,
                },
              },
            });
          }),
        );
      }
      await this.prisma.$transaction(txs);
    }
  }

  #getTokenInUSD(tokenX: string, tokenY: string, amountX: string, amountY: string): BigNumber {
    const amountXNum = new BigNumber(amountX);
    const amountYNum = new BigNumber(amountY);
    const decimal = new BigNumber(10 ** 18);
    const res = tokenAddrToPrice
      .get(tokenX)
      ?.multipliedBy(amountXNum)
      .div(decimal)
      .plus(tokenAddrToPrice.get(tokenY)?.multipliedBy(amountYNum).div(decimal) ?? new BigNumber(0));
    return res ?? new BigNumber(0);
  }

  #mergeMaps<T>(map1: Map<T, BigNumber>, map2: Map<T, BigNumber>): Map<T, BigNumber> {
    const res = new Map([...map1]);
    for (const [key, value] of map2) {
      res.set(key, (res.get(key) ?? new BigNumber(0)).plus(value));
    }
    return res;
  }
}
