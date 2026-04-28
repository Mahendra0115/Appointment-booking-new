import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { APP_CONSTANTS } from './common/constants/app.constants';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.setGlobalPrefix(
    configService.get<string>('API_PREFIX') || APP_CONSTANTS.API_PREFIX,
  );

  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = Number(configService.get<string>('PORT') || 3000);
  await app.listen(port, '0.0.0.0');
}
void bootstrap();
