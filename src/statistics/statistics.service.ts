import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import configurations from 'src/config/configurations';
import BigNumber from 'bignumber.js';
import { Prisma } from '@prisma/client';
import { P_POINT_EPOLL_START_TIME, P_POINT_PER_HOUR, NEW_RULE_VALID_TIME } from '../config/config';
import { tokenAddrToPrice } from 'src/config/tokens';
import { retry } from 'src/utils/retry';

@Injectable()
export class StatisticsService {
  retryTimes: number;
  retryInterval: number;
  cleanedCredit: boolean;

  onModuleInit() {
    this.handlePointHistory();
  }

  constructor(private readonly prisma: PrismaService) {
    this.retryTimes = configurations().retryTimes;
    this.retryInterval = configurations().retryInterval;
    this.cleanedCredit = false;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handlePointHistory() {
    Logger.log('Handle point history', 'StatisticsService');
    try {
      const record = await retry(this.prisma.indexedRecord.findFirst, this.retryTimes, this.retryInterval, this.prisma, {});
      if (!record) {
        return;
      }

      let started = record.pointCheckpoint;
      if (record.pointCheckpoint === 0) {
        // @ts-expect-error ts(2024)
        const firstAddEvent = await retry(this.prisma.addLiquidityEvent.findFirst, this.retryTimes, this.retryInterval, this.prisma, {
          orderBy: {
            timestamp: 'asc',
          },
        });

        if (!firstAddEvent) {
          return;
        }

        // @ts-expect-error ts(2024)
        started = firstAddEvent.timestamp;
      }

      const ended = Math.floor(new Date().getTime() / 1000);
      const timeGap = 60 * 60;
      for (let i = started; i < ended; i = i + timeGap) {
        const rightTick = i + timeGap;
        if (rightTick > ended || rightTick > 1717341956) {
          Logger.log('Handle point history ended', 'StatisticsService');
          break;
        }
        // reset user lp token value table when the right tick is greater than PENDING_ONE_SIDE_STAKE_TIME
        if (rightTick >= NEW_RULE_VALID_TIME && !this.cleanedCredit) {
          await retry(this.#cleanUserCredit, this.retryTimes, this.retryInterval, this, started, rightTick);
          this.cleanedCredit = true;
        }
        const addLiquidityEvents = await retry(this.prisma.addLiquidityEvent.findMany, this.retryTimes, this.retryInterval, this.prisma, {
          where: {
            timestamp: {
              gte: i,
              lt: rightTick,
            },
          },
        });
        const removeLiquidityEvents = await retry(
          this.prisma.removeLiquidityEvent.findMany,
          this.retryTimes,
          this.retryInterval,
          this.prisma,
          {
            where: {
              timestamp: {
                gte: i,
                lt: rightTick,
              },
            },
          },
        );

        // if (addLiquidityEvents.length === 0 && removeLiquidityEvents.length === 0) continue;

        const userAddLiquidities = addLiquidityEvents.reduce((acc, cur) => {
          // once the credit is cleaned, we don't deal with the invalid events anymore
          if (this.cleanedCredit && !cur.valid) {
            return acc;
          }
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
          // once the credit is cleaned, we don't deal with the invalid events anymore
          if (this.cleanedCredit && !cur.valid) {
            return acc;
          }
          if (acc.has(cur.userAddr)) {
            acc.set(
              cur.userAddr,
              new BigNumber(this.#getTokenInUSD(cur.tokenX, cur.tokenY, cur.amountX, cur.amountY))
                .negated()
                .plus(acc.get(cur.userAddr) ?? 0),
            );
          } else {
            acc.set(cur.userAddr, new BigNumber(this.#getTokenInUSD(cur.tokenX, cur.tokenY, cur.amountX, cur.amountY)).negated());
          }
          return acc;
        }, new Map<string, BigNumber>());

        const userLiquidities = this.#mergeMaps(userAddLiquidities, userRemoveLiquidities);

        const userLastTotal = await retry(this.prisma.userCurrentLPAmount.findMany, this.retryTimes, this.retryInterval, this.prisma, {});

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
              pointCheckpoint: rightTick,
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
        // @ts-expect-error ts(2024)
        await retry(this.prisma.$transaction, this.retryTimes, this.retryInterval, this.prisma, txs);
      }
    } catch (err) {
      console.error(err);
      Logger.error(err);
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

  #mergeMaps<T>(map1: Map<T, BigNumber> | undefined, map2: Map<T, BigNumber> | undefined): Map<T, BigNumber> {
    let res = new Map<T, BigNumber>();
    if (map1) {
      res = new Map([...map1]);
    }
    if (!map2) {
      return res;
    }
    for (const [key, value] of map2) {
      let v = (res.get(key) ?? new BigNumber(0)).plus(value);
      if (v.isNegative()) {
        v = new BigNumber(0);
      }
      res.set(key, v);
    }
    return res;
  }

  // clean user credit
  async #cleanUserCredit(started: number, ended: number) {
    const txs = [];
    // find all valid addLiquidityEvents from started to ended
    const addLiquidityEvents = await retry(this.prisma.addLiquidityEvent.findMany, this.retryTimes, this.retryInterval, this.prisma, {
      where: {
        timestamp: {
          gte: started,
          lt: ended,
        },
        valid: true,
      },
    });
    // find all valid removeLiquidityEvents from started to ended
    const removeLiquidityEvents = await retry(this.prisma.removeLiquidityEvent.findMany, this.retryTimes, this.retryInterval, this.prisma, {
      where: {
        timestamp: {
          gte: started,
          lt: ended,
        },
        valid: true,
      },
    });
    // convert addLiquidityEvents to map
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

    // convert removeLiquidityEvents to map
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

    // merge two arrays
    const userLiquidities = this.#mergeMaps(userAddLiquidities, userRemoveLiquidities);

    // delete original data
    txs.push(this.prisma.userCurrentLPAmount.deleteMany({}));
    const lpArray = Array.from(userLiquidities.keys()).map((userAddr) => {
      const amount = (userLiquidities.get(userAddr) ?? new BigNumber(0)).toFixed(6);
      return {
        id: 0,
        userAddr: userAddr,
        amount: amount,
      };
    });
    txs.push(
      this.prisma.userCurrentLPAmount.createMany({
        data: lpArray,
      }),
    );

    // @ts-expect-error ts(2024)
    await retry(this.prisma.$transaction, this.retryTimes, this.retryInterval, this.prisma, txs);
    Logger.log(`cleanUserCredit ${started}-${ended} success`, 'Statistics');
  }
}
