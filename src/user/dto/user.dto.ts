import { ApiProperty } from '@nestjs/swagger';
import { IsEthereumAddress } from 'class-validator';

export class UserVolumeDTO {
  @ApiProperty()
  @IsEthereumAddress()
  user: string;
}
