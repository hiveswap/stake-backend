import { Controller, Get, Body } from '@nestjs/common';
import { GetUserPointsDTO } from './dto/point.dto';
import { HttpService } from '@nestjs/axios';
import BigNumber from 'bignumber.js';

@Controller('trusta')
export class TrustaController {
  graphqlUrl: string;
  constructor(private readonly httpService: HttpService) {
    this.graphqlUrl = 'https://graph-node-api.izumi.finance/query/subgraphs/name/izi-swap-map';
  }

  @Get('point')
  async getPoint(@Body() params: GetUserPointsDTO) {
    let data = `query MyQuery($addr: Bytes = "${params.user}") {
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

    data = `query MyQuery($addr: Bytes = "${params.user}") {
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
