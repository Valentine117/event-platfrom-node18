import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { EventController } from './event.controller';
import { EventService } from './event.service';
import { HealthController } from './health/health.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import {
  RewardEvent,
  RewardEventSchema,
  Reward,
  RewardSchema,
  RewardRequest,
  RewardRequestSchema,
} from '@lib/common';
import { IpWhitelistMiddleware } from './config/whitelist.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGO_URI),
    MongooseModule.forFeature([
      { name: RewardEvent.name, schema: RewardEventSchema },
      { name: Reward.name, schema: RewardSchema },
      { name: RewardRequest.name, schema: RewardRequestSchema },
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
  ],
  controllers: [EventController, HealthController],
  providers: [EventService],
})
export class EventModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(IpWhitelistMiddleware).forRoutes('*'); // 모든 경로 보호
  }
}
