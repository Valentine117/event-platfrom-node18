import { Module } from '@nestjs/common';
import { EventController } from './event.controller';
import { EventService } from './event.service';
import { HealthController } from './health.controller';

@Module({
  imports: [],
  controllers: [EventController, HealthController],
  providers: [EventService],
})
export class EventModule {}
