import { ApiProperty } from '@nestjs/swagger';
import { IsEthereumAddress } from 'class-validator';

export class GetUserPointsDTO {
  @ApiProperty()
  @IsEthereumAddress()
  user: string;
}
