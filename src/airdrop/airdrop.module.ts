import { Module } from '@nestjs/common';
import { AirdropController } from './airdrop.controller';

@Module({
  controllers: [AirdropController]
})
export class AirdropModule {}
