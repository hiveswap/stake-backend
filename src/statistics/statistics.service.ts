import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Cron } from '@nestjs/schedule';
import { retry } from 'src/utils/retry';
import { CreditHistory, PrismaPromise } from '@prisma/client';
import configurations from 'src/config/configurations';
import { DateTime } from 'luxon';
import { poolMap } from 'src/utils/constants';
import fetch, { RequestInit } from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

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
  @Cron('0 0 0 * * 1-7', {
    timeZone: 'Asia/Singapore',
  })
  async update() {
    const curTime = DateTime.now().setZone('Asia/Singapore');
    Logger.log(`Statistics starts to update at ${curTime.toString()}`);

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
      const endTime = startTime
        .startOf('day')
        .plus({ days: 1 })
        .setZone('Asia/Singapore');

      const txs: PrismaPromise<any>[] = [];

      await this.#getAndParseStakeEvents(startTime, endTime, txs);
      await this.#getAndParseAddLiquidityEvents(startTime, endTime, txs);

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

  async #getAndParseStakeEvents(
    startTime: DateTime,
    endTime: DateTime,
    txs: PrismaPromise<any>[],
  ) {
    const rawData = await retry(
      this.prisma.rawStakeEvents.findMany,
      this.retryTimes,
      this.retryInterval,
      this,
      {
        where: {
          timestamp: {
            gte: startTime.toJSDate(),
            lt: endTime.toJSDate(),
          },
        },
        select: {
          amount: true,
          userAddr: true,
          timestamp: true,
        },
      },
    );

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
    const userHistory: CreditHistory[] = [];
    userMap.forEach((value, key) => {
      userHistory.push({
        id: 0,
        userAddr: key,
        credit: (configurations().stakeScores * value) / count,
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

    Logger.log(
      `parsed stake events from ${startTime} to ${endTime} success`,
      'Statistics',
    );
  }

  async #getAndParseAddLiquidityEvents(
    startTime: DateTime,
    endTime: DateTime,
    txs: PrismaPromise<any>[],
  ) {
    const rawData = await retry(
      this.prisma.rawAddLiquidityEvents.findMany,
      this.retryTimes,
      this.retryInterval,
      this,
      {
        where: {
          timestamp: {
            gte: startTime.toJSDate(),
            lt: endTime.toJSDate(),
          },
        },
        select: {
          userAddr: true,
          tokenX: true,
          tokenY: true,
          amountX: true,
          amountY: true,
        },
      },
    );

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

    const userHistory: CreditHistory[] = [];
    userMap.forEach((value, key) => {
      userHistory.push({
        id: 0,
        userAddr: key,
        credit: Number((configurations().liquidityScores * value) / count),
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

    Logger.log(
      `parsed addLiquidity events from ${startTime} to ${endTime} success`,
      'Statistics',
    );
  }

  async #getTokenPriceInUSD(tokenPair: {
    tokenX: string;
    tokenY: string;
    amountX: number;
    amountY: number;
  }): Promise<number> {
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
      const response = await retry(
        fetch,
        this.retryTimes,
        this.retryInterval,
        this,
        targetUrl,
        opts,
      );
      const json: { [key: string]: { usd: number } } = await response.json();
      const tokenXPrice = json[tokenPair.tokenX]
        ? json[tokenPair.tokenX]['usd']
        : 1;
      const tokenYPrice = json[tokenPair.tokenX]
        ? json[tokenPair.tokenY]['usd']
        : 1;
      resolve(
        tokenPair.amountX * tokenXPrice + tokenPair.amountY * tokenYPrice,
      );
    });
  }
}
