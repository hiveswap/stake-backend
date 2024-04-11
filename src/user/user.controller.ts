import { Body, Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { UserVolumeDTO } from './dto/user.dto';

@Controller('user')
export class UserController {
  @UseGuards(AuthGuard)
  @Get('volume')
  @ApiOperation({ summary: 'Get the user volume' })
  @ApiTags('userVolume')
  async userVolume(@Body() params: UserVolumeDTO) {
    console.log(params.user);
    return 0;
  }
}
