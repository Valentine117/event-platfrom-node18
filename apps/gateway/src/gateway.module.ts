import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { GatewayController } from './gateway.controller';
import { GatewayService } from './gateway.service';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGO_URI),
    HttpModule,
  ],
  controllers: [GatewayController, HealthController],
  providers: [GatewayService, HealthService],
})
export class GatewayModule {}
