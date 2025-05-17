import { NestFactory } from '@nestjs/core';
import { AuthModule } from './auth.module';
import {
  AllExceptionsFilter,
  CustomLogger,
  LoggingInterceptor,
} from '@lib/common';

async function bootstrap() {
  const app = await NestFactory.create(AuthModule);

  app.useLogger(app.get(CustomLogger));
  app.useGlobalInterceptors(app.get(LoggingInterceptor));
  app.useGlobalFilters(app.get(AllExceptionsFilter));

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
