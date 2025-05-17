import { NestFactory } from '@nestjs/core';
import { GatewayModule } from './gateway.module';
import * as fs from 'fs';
import {
  AllExceptionsFilter,
  CustomLogger,
  LoggingInterceptor,
} from '@lib/common';

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

  await app.listen(3000);
}
bootstrap();
