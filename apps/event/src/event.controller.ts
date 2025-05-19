import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Req,
  Patch,
} from '@nestjs/common';
import { EventService } from './event.service';
import { CreateEventDto, CreateRewardDto, RequestRewardDto } from '@lib/common';
import { JwtAuthGuard, Roles, RolesGuard } from '@lib/common';
import { UpdateEventDto } from '@lib/common/dtos/event/update-event.dto';

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

  @Patch(':eventId')
  @Roles('OPERATOR')
  updateEvent(@Param('eventId') eventId: string, @Body() dto: UpdateEventDto) {
    return this.eventService.updateEvent(eventId, dto);
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
