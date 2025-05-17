import { NestFactory } from '@nestjs/core';
import { GatewayModule } from './gateway.module';
import * as fs from 'fs';
import {
  AllExceptionsFilter,
  CustomLogger,
  LoggingInterceptor,
} from '@lib/common';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

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

  const config = new DocumentBuilder()
    .setTitle('Event Platform API')
    .setDescription('이벤트/보상 플랫폼 Swagger 문서')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('apis', app, document); // http://localhost:3000/apis

  await app.listen(3000);
}
bootstrap();
