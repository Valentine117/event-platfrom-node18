import { NestFactory } from '@nestjs/core';
import { AuthModule } from './auth.module';

async function bootstrap() {
  const app = await NestFactory.create(AuthModule);

  app.enableCors({
    origin: ['https://gateway:3000'], // Gateway만 허용하는 화이트 리스트
  });

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
