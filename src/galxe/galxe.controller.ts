import { Controller, Get, Param } from '@nestjs/common';

@Controller('galxe')
export class GalxeController {
  @Get('user/volume/:address')
  async getUserVolume(@Param('address') address: string) {
    const res = await fetch(`https://game-daas.izumi.finance/api/v1/ipoints/info/?chainId=22776&address=${address}`).then((r) => r.json());

    return res;
  }
}
