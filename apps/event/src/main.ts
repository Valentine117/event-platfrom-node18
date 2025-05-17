import { NestFactory } from '@nestjs/core';
import { EventModule } from './event.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
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

  // MQ Consumer 설정 (Event 서버에서만)
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: ['amqp://guest:guest@rabbitmq:5672'],
      queue: 'user.logged_in',
      queueOptions: {
        durable: true,
      },
    },
  });

  await app.startAllMicroservices();
  await app.listen(process.env.PORT ?? 3002);
}
bootstrap();
