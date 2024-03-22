import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from './auth/auth.guard';

@Controller()
@ApiTags('health')
export class AppController {
  @Get()
  @ApiOperation({ summary: 'Check if the API is up and running' })
  @ApiOkResponse({
    description: 'The API is up and running',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          example: 'ok',
        },
      },
    },
  })
  @UseGuards(AuthGuard)
  health() {
    return { status: 'ok' };
  }
}
