import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Controller('rank')
export class RankController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('point')
  async getHivePointRank() {
    console.log();
    return this.prisma.point.findMany({
      orderBy: {
        point: 'desc',
      },
    });
  }
}
