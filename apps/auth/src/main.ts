import { NestFactory } from '@nestjs/core';
import { AuthModule } from './auth.module';
import { CustomLogger } from '@lib/common';

async function bootstrap() {
  const app = await NestFactory.create(AuthModule);

  app.useLogger(app.get(CustomLogger));

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
