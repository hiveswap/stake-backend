import { Controller, Get, Param } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import BigNumber from 'bignumber.js';
import { readFileSync } from 'fs';
import { basename, dirname } from 'path';
import { HistorySwapData } from './history';
import { HistorySwapV3Data } from './history-v3';
import { HistorySwapV2Data } from './history-v2';

@Controller('trusta')
export class TrustaController {
  graphqlUrl: string;
  constructor(private readonly httpService: HttpService) {
    this.graphqlUrl = 'https://graph-node-api.izumi.finance/query/subgraphs/name/izi-swap-map';
  }

  getRobot() {
    const rotbotMap = new Map();
    for (let i = 1; i <= 4; i++) {
      const filename = `addresses-${i}.json`;
      const robotAddress = readFileSync(`${basename(dirname(__dirname))}/resources/robot/${filename}`, 'utf8');
      JSON.parse(robotAddress).results.forEach((record: { address: string; accountIndex: number }) => {
        rotbotMap.set(record.address.toLowerCase(), record.accountIndex);
      });
    }
    return rotbotMap;
  }

  @Get('point/swap-records-v2')
  async getSwapMapV2() {
    const pageSize = 1000;
    let round = 1;
    let flag = true;
    const res = new Map();
    while (flag) {
      const data = `query MyQuery {
        swaps (first: ${pageSize}, skip: ${(round - 1) * pageSize}, orderDirection: asc, orderBy: timestamp) {
          amountUSD
          from
        }
      }`;
      const response = await this.httpService.axiosRef.post('https://makalu-graph.maplabs.io/subgraphs/name/map/hiveswap2', {
        operationName: 'MyQuery',
        query: data,
        timeout: 20000,
      });
      console.log(response);
      const swaps: { from: string; amountUSD: string }[] = response.data.data.swaps;
      console.log(round * pageSize, swaps.length);
      swaps.forEach((record) => {
        const before = res.get(record.from) ?? 0;
        res.set(record.from.toLowerCase(), before + Number(record.amountUSD));
      });
      if (swaps.length < pageSize) {
        flag = false;
      }
      if (round > 150) {
        flag = false;
      }
      round++;
    }
    const finalRes = res;
    // const filter = this.getRobot();
    const filter = new Map<any, any>();
    finalRes.forEach((_, key) => {
      if (filter.has(key)) {
        finalRes.delete(key);
      }
    });
    return {
      totalUser: finalRes.size,
      description: 'total swap record, (user address, swap amount(USD))',
      data: Object.fromEntries(finalRes),
    };
  }

  @Get('point/swap-records-v3')
  async getSwapMapV3() {
    const pageSize = 1000;
    let round = 1;
    let flag = true;
    const res = new Map();
    while (flag) {
      const data = `query MyQuery {
        swaps (first: ${pageSize}, skip: ${(round - 1) * pageSize}, orderDirection: asc, orderBy: timestamp) {
          amountUSD
          recipient
        }
      }`;
      const response = await this.httpService.axiosRef.post('https://graph.mapprotocol.io/subgraphs/name/hiveswap/exchange-v3-test', {
        operationName: 'MyQuery',
        query: data,
      });
      console.log(response);
      const swaps: { recipient: string; amountUSD: string }[] = response.data.data.swaps;
      console.log(round * pageSize, swaps.length);
      swaps.forEach((record) => {
        const before = res.get(record.recipient) ?? 0;
        res.set(record.recipient.toLowerCase(), before + Number(record.amountUSD));
      });
      if (swaps.length < pageSize) {
        flag = false;
      }
      round++;
    }
    const finalRes = res;
    // const filter = this.getRobot();
    const filter = new Map<any, any>();
    finalRes.forEach((_, key) => {
      if (filter.has(key)) {
        finalRes.delete(key);
      }
    });
    return {
      totalUser: finalRes.size,
      description: 'total swap record, (user address, swap amount(USD))',
      data: Object.fromEntries(finalRes),
    };
  }

  @Get('point/swap-records')
  async getSwapMap() {
    const pageSize = 1000;
    let round = 1;
    let flag = true;
    const res = new Map(Object.entries(HistorySwapData.data));
    const v2Res = new Map(Object.entries(HistorySwapV2Data.data));
    const v3Res = new Map(Object.entries(HistorySwapV3Data.data));
    for (const [key, value] of v3Res) {
      if (res.has(key)) {
        res.set(key, res.get(key)! + value);
      } else {
        res.set(key, value);
      }
    }
    for (const [key, value] of v2Res) {
      if (res.has(key)) {
        res.set(key, res.get(key)! + value);
      } else {
        res.set(key, value);
      }
    }
    while (flag) {
      const data = `query MyQuery {
        swaps (first: ${pageSize}, skip: ${(round - 1) * pageSize + 101998}, orderDirection: asc, orderBy: timestamp) {
          amountUSD
          account
        }
      }`;
      const response = await this.httpService.axiosRef.post(this.graphqlUrl, {
        operationName: 'MyQuery',
        query: data,
      });
      const swaps: { account: string; amountUSD: string }[] = response.data.data.swaps;
      swaps.forEach((record) => {
        const before = res.get(record.account) ?? 0;
        res.set(record.account.toLowerCase(), before + Number(record.amountUSD));
      });
      if (swaps.length < pageSize) {
        flag = false;
      }
      round++;
    }
    const finalRes = res;
    // const filter = this.getRobot();
    const filter = new Map<any, any>();
    finalRes.forEach((_, key) => {
      if (filter.has(key)) {
        finalRes.delete(key);
      }
    });
    return {
      totalUser: finalRes.size,
      description: 'total swap record, (user address, swap amount(USD))',
      data: Object.fromEntries(finalRes),
    };
  }

  @Get('point/:address')
  async getPoint(@Param('address') params: string) {
    let data = `query MyQuery($addr: Bytes = "${params}") {
        swaps(where: {account: $addr, timestamp_gte: "1712361600"}) {
            amountUSD
        }
    }`;
    const swapResponse = await this.httpService.axiosRef.post(this.graphqlUrl, {
      operationName: 'MyQuery',
      query: data,
    });
    const swapRes: { amountUSD: string }[] = await swapResponse.data.data.swaps;

    const swapTotal = swapRes.reduce((acc, cur) => {
      return acc.plus(new BigNumber(cur.amountUSD));
    }, new BigNumber(0));
    const swapPoint = this.getPointBySwap(swapTotal);

    data = `query MyQuery($addr: Bytes = "${params}") {
        liquidities(where: {owner: $addr}) {
          depositedTokenX
          depositedTokenY
          tokenX {
            priceUSD
          }
          tokenY {
            priceUSD
          }
          transaction {
            timestamp
          }
          liquidity
        }
      }`;

    const liquidityResponse = await this.httpService.axiosRef.post(this.graphqlUrl, {
      operationName: 'MyQuery',
      query: data,
    });
    const liquidityRes = await liquidityResponse.data.data.liquidities;
    const liquidityTimeCost = this.getLiquidityTimeCost(liquidityRes);
    const liquidityPoints = this.getPointByLiquidity(liquidityTimeCost);

    return {
      swap: {
        swapTotal: swapTotal,
        swapPoint: swapPoint,
      },
      liquidity: {
        liquidityPoint: liquidityPoints,
      },
    };
  }

  getPointBySwap(swapTotal: BigNumber): number {
    let res = 0;
    if (swapTotal.gte(100)) {
      res += 7;
    }
    if (swapTotal.gte(500)) {
      res += 20;
    }
    if (swapTotal.gte(1000)) {
      res += 35;
    }
    return res;
  }

  getPointByLiquidity(liquidityTimeCost: BigNumber): number {
    let res = 0;
    const time = 5 * 24 * 60 * 60;
    if (liquidityTimeCost.gte(100 * time)) {
      res += 7;
    }
    if (liquidityTimeCost.gte(500 * time)) {
      res += 20;
    }
    if (liquidityTimeCost.gte(1000 * time)) {
      res += 35;
    }
    if (liquidityTimeCost.gte(3000 * time)) {
      res += 50;
    }
    return res;
  }

  getLiquidityTimeCost(
    input: {
      depositedTokenX: string;
      depositedTokenY: string;
      tokenX: { priceUSD: string };
      tokenY: { priceUSD: string };
      transaction: { timestamp: string };
      liquidity: string;
    }[],
  ) {
    return input.reduce((acc, cur) => {
      const valueTotal = new BigNumber(cur.depositedTokenX)
        .multipliedBy(cur.tokenX.priceUSD)
        .plus(new BigNumber(cur.depositedTokenY).multipliedBy(cur.tokenY.priceUSD));
      const timeTotal = new BigNumber(Math.round(new Date().getTime() / 1000)).minus(cur.transaction.timestamp);
      if (new BigNumber(cur.liquidity).gt(0)) {
        return acc.plus(valueTotal.multipliedBy(timeTotal));
      } else {
        return acc.minus(valueTotal.multipliedBy(timeTotal));
      }
    }, new BigNumber(0));
  }
}
