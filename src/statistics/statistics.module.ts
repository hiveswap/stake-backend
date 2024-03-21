import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';

@Module({
  providers: [PrismaService, StatisticsService],
  controllers: [StatisticsController],
})
export class StatisticsModule {}
