import { ApiProperty } from '@nestjs/swagger';
import { IsEthereumAddress, IsInt } from 'class-validator';

export class CurrentCreditDto {
  @ApiProperty()
  @IsEthereumAddress()
  user: string;
}

export class HistoryCreditDto {
  @ApiProperty()
  @IsEthereumAddress()
  user: string;
  @ApiProperty()
  @IsInt()
  currentPage: number;
  @ApiProperty()
  @IsInt()
  pageSize: number;
}
