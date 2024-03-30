import { Module } from '@nestjs/common';
import { RankController } from './rank.controller';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [PrismaService],
  controllers: [RankController],
})
export class RankModule {}
