import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

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
  health() {
    return { status: 'ok' };
  }
}
