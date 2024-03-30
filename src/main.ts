import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { RedocModule, RedocOptions } from '@juicyllama/nestjs-redoc';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());

  const configService = app.get(ConfigService);
  const port = configService.get('STAKE_BACKEND_PORT');
  const config = buildApiDocument();
  // Creates the API document using the configuration object
  const document = SwaggerModule.createDocument(app, config);
  // Setups the redoc document
  const redocOptions: RedocOptions = {
    // These options are from the redoc document.
    // More info: https://github.com/Redocly/redoc
    sortPropsAlphabetically: true,
    hideDownloadButton: false,
    hideHostname: false,
  };
  // Defines the path where the redoc document will be available
  await RedocModule.setup('/docs', app, document, redocOptions);
  console.log('listening on port', port);
  app.enableCors();
  await app.listen(port);
}

function buildApiDocument() {
  return new DocumentBuilder()
    .setTitle('Stake Backend')
    .setDescription('API for Stake Backend')
    .addBearerAuth(
      // defines the authentication type
      // we have defined the permission role called `admin` in this example,
      // and to use this admin tag, you can include `@ApiBearerAuth('admin')` in your controller
      // and there will be an authentication section shown in the redoc document.
      {
        description: 'Admin permission',
        type: 'http',
        name: 'admin',
      },
      'admin',
    )
    .setVersion('1.0')
    .build();
}

bootstrap();
