import { Controller, Get, Param } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from 'src/prisma.service';
import { retry } from 'src/utils/retry';
import configurations from '../config/configurations';
import { CurrentCreditDto, HistoryCreditDto } from './dto/credit.dto';

@Controller('Statisctics')
export class StatisticsController {
  retryTimes: number;
  retryInterval: number;
  constructor(private readonly prisma: PrismaService) {
    this.retryTimes = configurations().retryTimes;
    this.retryInterval = configurations().retryInterval;
  }
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
  historyCredit(@Param() params: HistoryCreditDto) {
    return retry(
      this.prisma.creditHistory.findMany,
      this.retryTimes,
      this.retryInterval,
      this,
      {
        where: {
          userAddr: params.user,
        },
        select: {
          timestamp: true,
          credit: true,
        },
        take: params.pageSize,
        skip: (params.currentPage - 1) * params.pageSize,
      },
    );
  }

  @Get('current')
  @ApiOperation({ summary: 'Get the latest credit of a user' })
  @ApiTags('latestCredit')
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
  latestCredit(@Param() params: CurrentCreditDto) {
    return retry(
      this.prisma.creditHistory.findFirst,
      this.retryTimes,
      this.retryInterval,
      this,
      {
        where: {
          userAddr: params.user,
        },
        select: {
          timestamp: true,
          curCredit: true,
        },
      },
    );
  }
}
