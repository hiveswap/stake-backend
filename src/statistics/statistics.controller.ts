import { Body, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma.service';
import { retry } from '../utils/retry';
import configurations from '../config/configurations';
import { GetUserPointsDTO, HistoryCreditDto } from './dto/credit.dto';
import { AuthGuard } from '../auth/auth.guard';
import { prices } from '../config/price';
import { Contract, FetchRequest, JsonRpcProvider } from 'ethers';
import { lockTokens } from '../config/tokens';
import { erc20ABI } from '../resources/contract/erc20';

@Controller('statistics')
export class StatisticsController {
  retryTimes: number;
  retryInterval: number;
  constructor(private readonly prisma: PrismaService) {
    this.retryTimes = configurations().retryTimes;
    this.retryInterval = configurations().retryInterval;
  }
  @UseGuards(AuthGuard)
  @Get('history')
  @ApiOperation({ summary: 'Get the credit history of a user' })
  @ApiTags('historyCredit')
  @ApiCreatedResponse({
    description: 'The credit record history of a user',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          amount: {
            type: 'string',
            example: '1000000000000000000',
          },
          timestamp: {
            type: 'string',
            format: 'date',
            example: '2024-03-21T17:32:28Z',
          },
        },
      },
    },
  })
  async historyCredit(@Body() params: HistoryCreditDto) {
    return await retry(this.prisma.pointHistory.findMany, this.retryTimes, this.retryInterval, this, {
      where: {
        userAddr: params.user,
      },
      select: {
        timestamp: true,
        credit: true,
      },
      take: params.pageSize,
      skip: (params.currentPage - 1) * params.pageSize,
    });
  }

  @Get('points')
  @ApiOperation({ summary: 'Get the latest credit of a user' })
  @ApiTags('points')
  @ApiCreatedResponse({
    description: 'The latest credit of a user',
    schema: {
      type: 'object',
      properties: {
        amount: {
          type: 'string',
          example: '1000000000000000000',
        },
        timestamp: {
          type: 'string',
          format: 'date',
          example: '2024-03-21T17:32:28Z',
        },
      },
    },
  })
  async getUserPoints(@Query() params: GetUserPointsDTO) {
    const res = await retry(this.prisma.point.findFirst, this.retryTimes, this.retryInterval, this, {
      where: {
        userAddr: params.user,
      },
      select: {
        hivePoint: true,
        mapoPoint: true,
      },
    });
    return {
      hivePoint: res?.hivePoint ?? 0,
      mapoPoint: res?.mapoPoint ?? 0,
    };
  }

  @Get('tvl')
  async getTVL() {
    /**
     *
     const result: any[] = await this.prisma
     .$queryRaw`SELECT token_addr, REPLACE(FORMAT(SUM(amount), 0), ",", "") AS total_amount FROM lock_events GROUP BY token_addr`;
     */

    const fetchReq = new FetchRequest(configurations().rpcUrl);
    const provider = new JsonRpcProvider(fetchReq);
    const contract = new Contract(lockTokens[0].address, erc20ABI, provider);

    const totalSupply = await contract.totalSupply();

    return [
      {
        token_addr: lockTokens[0].originTokenAddress,
        amount: totalSupply?.toString(),
        symbol: lockTokens[0].originTokenSymbol,
        price: prices[lockTokens[0].originTokenAddress],
      },
    ];
  }
}
