import { NestFactory } from '@nestjs/core';
import { GatewayModule } from './gateway.module';
import * as fs from 'fs';
import {
  AllExceptionsFilter,
  CustomLogger,
  LoggingInterceptor,
} from '@lib/common';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const httpsOptions = {
    key: fs.readFileSync('/app/ssl/key.pem'),
    cert: fs.readFileSync('/app/ssl/cert.pem'),
  };

  const app = await NestFactory.create(GatewayModule, {
    httpsOptions,
  });

  app.useLogger(app.get(CustomLogger));
  app.useGlobalInterceptors(app.get(LoggingInterceptor));
  app.useGlobalFilters(app.get(AllExceptionsFilter));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO에 없는 값 제거
      forbidNonWhitelisted: true, // 허용되지 않은 값 있으면 에러
      transform: true, // 타입 자동 변환
    }),
  );

  await app.listen(3000);
}
bootstrap();
