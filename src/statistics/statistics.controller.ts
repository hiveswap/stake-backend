import { Body, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma.service';
import configurations from '../config/configurations';
import { GetUserPointsDTO, HistoryCreditDto } from './dto/credit.dto';
import { AuthGuard } from '../auth/auth.guard';
import { prices } from '../config/price';
import { ethers, FetchRequest, JsonRpcProvider } from 'ethers';
import { lockTokens } from '../config/tokens';
import { erc20ABI } from '../resources/contract/erc20';
import { MULTICALL_ADDRESS } from '../config/contracts';
import { MulticallABI } from '../resources/abis/multicall';

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
      },
    });
    return {
      hivePoint: res?.hivePoint ?? 0,
      mapoPoint: res?.mapoPoint ?? 0,
    };
  }

  @Get('tvl')
  async getTVL() {
    const fetchReq = new FetchRequest(configurations().rpcUrl);
    const provider = new JsonRpcProvider(fetchReq);

    const multicallInterface = new ethers.Interface(MulticallABI);
    const finalCalldata: any = [];
    lockTokens.map((token) => {
      const erc20Interface = new ethers.Interface(erc20ABI);
      const calldata = erc20Interface.encodeFunctionData('totalSupply');

      // const encodedData = AbiCoder.defaultAbiCoder().encode(['tuple(address target,uint256 gasLimit,bytes callData)'], [cb]);
      // finalCalldata.push(encodedData);
      finalCalldata.push([token.address, calldata]);
    });

    const resp = await provider.call({
      to: MULTICALL_ADDRESS,
      data: multicallInterface.encodeFunctionData('aggregate', [finalCalldata]),
    });

    const callResult = multicallInterface.decodeFunctionResult('aggregate', resp);
    const results = callResult?.[1];
    results.forEach((result: any, index: number) => {
      console.log(BigInt(result), index);
    });

    return results.map((result: any, index: number) => {
      return {
        token_addr: lockTokens[index].originTokenAddress,
        amount: BigInt(result).toString(),
        symbol: lockTokens[index].originTokenSymbol,
        price: prices[lockTokens[index].originTokenAddress],
      };
    });
  }
}
