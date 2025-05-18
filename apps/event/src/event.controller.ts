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
import { CreateEventDto, CreateRewardDto, RequestRewardDto } from '@lib/common';
import { JwtAuthGuard, Roles, RolesGuard } from '@lib/common';

@Controller('event')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  @Roles('OPERATOR')
  createEvent(@Body() dto: CreateEventDto) {
    return this.eventService.createEvent(dto);
  }

  @Get()
  getEvents() {
    return this.eventService.getEvents();
  }

  @Post(':eventId/rewards')
  @Roles('OPERATOR')
  createReward(
    @Param('eventId') eventId: string,
    @Body() dto: CreateRewardDto,
  ) {
    return this.eventService.createReward(eventId, dto);
  }

  @Post(':eventId/request')
  @Roles('USER')
  requestReward(
    @Param('eventId') eventId: string,
    @Req() req,
    @Body() dto: RequestRewardDto,
  ) {
    return this.eventService.requestReward(eventId, req.user.sub, dto);
  }

  @Get('requests')
  @Roles('AUDITOR')
  getAllRequests() {
    return this.eventService.getAllRequests();
  }

  @Get('requests/me')
  @Roles('USER')
  getMyRequests(@Req() req) {
    return this.eventService.getRequestsByUser(req.user.sub);
  }
}
