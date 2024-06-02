import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import configurations from './config/configurations';
import { StatisticsModule } from './statistics/statistics.module';
import { ScheduleModule } from '@nestjs/schedule';
import { RankModule } from './rank/rank.module';
import { GalxeModule } from './galxe/galxe.module';
import { TrustaModule } from './trusta/trusta.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
      load: [configurations],
    }),
    StatisticsModule,
    ScheduleModule.forRoot(),
    RankModule,
    GalxeModule,
    TrustaModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
