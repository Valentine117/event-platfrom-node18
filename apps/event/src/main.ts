import { NestFactory } from '@nestjs/core';
import { EventModule } from './event.module';
import {
  AllExceptionsFilter,
  CustomLogger,
  LoggingInterceptor,
} from '@lib/common';

async function bootstrap() {
  const app = await NestFactory.create(EventModule);

  app.useLogger(app.get(CustomLogger));
  app.useGlobalInterceptors(app.get(LoggingInterceptor));
  app.useGlobalFilters(app.get(AllExceptionsFilter));

  await app.listen(process.env.PORT ?? 3002);
}
bootstrap();
