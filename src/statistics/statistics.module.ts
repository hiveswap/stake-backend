import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { StatisticsController } from './statistics.controller';

@Module({
  providers: [PrismaService],
  controllers: [StatisticsController],
})
export class StatisticsModule {}
