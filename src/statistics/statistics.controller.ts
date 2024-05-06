import { Body, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma.service';
import configurations from '../config/configurations';
import { GetUserPointsDTO, HistoryCreditDto } from './dto/credit.dto';
import { AuthGuard } from '../auth/auth.guard';
import BigNumber from 'bignumber.js';

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
    return await this.prisma.pointHistory.findMany({
      where: {
        userAddr: params.user,
      },
      select: {
        timestamp: true,
        point: true,
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
    const res = await this.prisma.point.findFirst({
      where: {
        userAddr: params.user,
      },
      select: {
        hivePoint: true,
        mapoPoint: true,
        point: true,
      },
    });
    const scale = params.from === 'okx' ? new BigNumber(1.5) : new BigNumber(1);
    return {
      hivePoint: res?.hivePoint ?? 0,
      mapoPoint: res?.mapoPoint ?? 0,
      point: new BigNumber(res?.point.toNumber() ?? 0).multipliedBy(scale).toFixed(6),
    };
  }
}
