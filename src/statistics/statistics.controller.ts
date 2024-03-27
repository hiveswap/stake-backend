import { Body, Controller, Get, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma.service';
import { retry } from '../utils/retry';
import configurations from '../config/configurations';
import { CurrentCreditDto, HistoryCreditDto } from './dto/credit.dto';
import { AuthGuard } from '../auth/auth.guard';

@Controller('statisctics')
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
    return await retry(
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

  @UseGuards(AuthGuard)
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
  async latestCredit(@Body() params: CurrentCreditDto) {
    return await retry(
      this.prisma.credits.findFirst,
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
