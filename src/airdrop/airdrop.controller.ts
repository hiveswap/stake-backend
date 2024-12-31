import { Controller, Get, Param } from '@nestjs/common';
import { HivpMerkle1 } from './hivpMerkle1';

@Controller('airdrop')
export class AirdropController {
  hivpMerkleM: Map<string, any>;

  constructor() {
    this.hivpMerkleM = new Map(Object.entries(HivpMerkle1.claims));
  }

  @Get('hivp/merkle/:address')
  async getAirdropMerkle(@Param('address') address: string) {
    console.log(address);
    const merkle = this.hivpMerkleM.get(address);
    return [
      {
        index: merkle?.index ?? -1,
        amount: merkle?.amount,
        proof: merkle?.proof ?? [''],
      },
    ];
  }
}
