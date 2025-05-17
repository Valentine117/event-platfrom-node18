import { NestFactory } from '@nestjs/core';
import { EventModule } from './event.module';
import { CustomLogger } from '@lib/common';

async function bootstrap() {
  const app = await NestFactory.create(EventModule);

  app.enableCors({
    origin: ['https://gateway:3000'], // Gateway만 허용하는 화이트 리스트
  });

  app.useLogger(app.get(CustomLogger));

  await app.listen(process.env.PORT ?? 3002);
}
bootstrap();
