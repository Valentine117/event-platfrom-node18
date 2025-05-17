import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { GatewayController } from './gateway.controller';
import { GatewayService } from './gateway.service';
import { HealthController } from './health/health.controller';
import { HealthService } from './health/health.service';
import { EventController } from './event/event.controller';
import { JwtModule } from '@nestjs/jwt';
import { EventService } from './event/event.service';
import {
  AllExceptionsFilter,
  CustomLogger,
  LoggingInterceptor,
  LoginEventPublisher,
} from '@lib/common';
import { RedisModule } from './config/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGO_URI),
    HttpModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
    RedisModule,
  ],
  controllers: [GatewayController, HealthController, EventController],
  providers: [
    GatewayService,
    HealthService,
    EventService,
    CustomLogger,
    LoggingInterceptor,
    AllExceptionsFilter,
    LoginEventPublisher,
  ],
})
export class GatewayModule {}
