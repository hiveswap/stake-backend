import { Module } from '@nestjs/common';
import { GalxeController } from './galxe.controller';

@Module({
  controllers: [GalxeController]
})
export class GalxeModule {}
