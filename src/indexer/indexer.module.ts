import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { IndexerService } from './indexer.service';

@Module({
  providers: [IndexerService, PrismaService],
})
export class IndexerModule {}
