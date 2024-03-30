import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import configurations from '../config/configurations';

@Controller('rank')
export class RankController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('h-point')
  async getHivePointRank() {
    return this.prisma.point.findMany({
      orderBy: {
        hivePoint: 'desc',
      },
    });
  }

  @Get('m-point')
  async getMapoPointRank() {
    return this.prisma.point.findMany({
      orderBy: {
        mapoPoint: 'desc',
      },
    });
  }
}
