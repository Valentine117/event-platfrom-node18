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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Event (ADMIN 계정은 모든 기능에 대한 접근 권한을 가집니다.)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('event')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  @Roles('OPERATOR')
  @ApiOperation({
    summary: '이벤트 등록 (OPERATOR 전용)',
    description: '운영자가 이벤트를 생성합니다.',
  })
  createEvent(@Body() dto: CreateEventDto, @Req() req) {
    return this.eventService.proxyPost(
      '/event',
      dto,
      req?.headers?.authorization,
    );
  }

  @Post(':eventId/rewards')
  @Roles('OPERATOR')
  @ApiOperation({
    summary: '보상 등록 (OPERATOR 전용)',
    description:
      '특정 이벤트에 보상을 등록합니다. EVENT_ID=<이벤트 ObjectId 수동 입력>',
  })
  createReward(
    @Param('eventId') eventId: string,
    @Body() dto: CreateRewardDto,
    @Req() req,
  ) {
    return this.eventService.proxyPost(
      `/event/${eventId}/rewards`,
      dto,
      req?.headers?.authorization,
    );
  }

  @Get()
  @ApiOperation({
    summary: '이벤트 목록 + 보상 조회 (누구나)',
    description: '모든 이벤트를 조회합니다.',
  })
  getEvents(@Req() req) {
    return this.eventService.proxyGet('/event', req?.headers?.authorization);
  }

  @Post(':eventId/request')
  @Roles('USER')
  @ApiOperation({
    summary: '보상 요청 (USER 전용)',
    description:
      '유저가 이벤트 보상을 요청합니다. EVENT_ID=<이벤트 ObjectId>, rewardId =<보상 ObjectId>',
  })
  requestReward(
    @Param('eventId') eventId: string,
    @Req() req,
    @Body() dto: RequestRewardDto,
  ) {
    return this.eventService.proxyPost(
      `/event/${eventId}/request`,
      dto,
      req?.headers?.authorization,
    );
  }

  @Get('requests')
  @Roles('AUDITOR')
  @ApiOperation({
    summary: '전체 보상 요청 조회 (AUDITOR 전용)',
    description: '모든 보상 요청 이력을 조회합니다.',
  })
  getAllRequests(@Req() req) {
    return this.eventService.proxyGet(
      '/event/requests',
      req?.headers?.authorization,
    );
  }

  @Get('requests/me')
  @Roles('USER')
  @ApiOperation({
    summary: '나의 보상 요청 조회 (USER 전용)',
    description: '현재 로그인한 유저의 보상 요청 이력을 조회합니다.',
  })
  getMyRequests(@Req() req) {
    return this.eventService.proxyGet(
      '/event/requests/me',
      req?.headers?.authorization,
    );
  }
}
