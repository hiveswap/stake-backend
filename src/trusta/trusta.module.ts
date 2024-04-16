import { Module } from '@nestjs/common';
import { TrustaController } from './trusta.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  controllers: [TrustaController],
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
  ],
})
export class TrustaModule {}
