import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { EventService } from './event.service';
import {
  CreateEventDto,
  CreateRewardDto,
  JwtAuthGuard,
  RequestRewardDto,
  Roles,
  RolesGuard,
} from '@lib/common';

@Controller('event')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  @Roles('OPERATOR')
  createEvent(@Body() dto: CreateEventDto) {
    return this.eventService.proxyPost('/event', dto);
  }

  @Get()
  getEvents() {
    return this.eventService.proxyGet('/event');
  }

  @Post(':eventId/rewards')
  @Roles('OPERATOR')
  createReward(
    @Param('eventId') eventId: string,
    @Body() dto: CreateRewardDto,
  ) {
    return this.eventService.proxyPost(`/event/${eventId}/rewards`, dto);
  }

  @Post(':eventId/request')
  @Roles('USER')
  requestReward(
    @Param('eventId') eventId: string,
    @Req() req,
    @Body() dto: RequestRewardDto,
  ) {
    return this.eventService.proxyPost(
      `/event/${eventId}/request`,
      dto,
      req.user,
    );
  }

  @Get('requests')
  @Roles('ADMIN', 'AUDITOR')
  getAllRequests() {
    return this.eventService.proxyGet('/event/requests');
  }

  @Get('requests/me')
  @Roles('USER')
  getMyRequests(@Req() req) {
    return this.eventService.proxyGet('/event/requests/me', req.user);
  }
}
