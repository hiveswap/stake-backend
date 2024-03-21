import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import configurations from './config/configurations';
import { IndexerModule } from './indexer/indexer.module';
import { StatisticsModule } from './statistics/statistics.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
      load: [configurations],
    }),
    StatisticsModule,
    IndexerModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
})
export class AppModule {}
