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
import {
  CreateEventDto,
  CreateRewardDto,
  JwtAuthGuard,
  RequestRewardDto,
  Roles,
  RolesGuard,
  UpdateEventDto,
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
    description: `
운영자가 새로운 이벤트를 생성합니다.  
아래 항목들이 필수입니다:
- eventType: 'LOGIN' | 'RECOMMEND'
- streak: 1 이상의 숫자
- status: 'ACTIVE' 또는 'INACTIVE'
- code는 고유값이어야 합니다.
`,
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
    description: `
특정 이벤트에 보상을 등록합니다.  
ObjectId 형식의 이벤트 ID를 사용해야 합니다.
`,
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
    summary: '이벤트 목록 + 보상 조회 (공용)',
    description: `
모든 이벤트 및 그에 연결된 보상 목록을 조회합니다.  
- 로그인 없이도 접근 가능하지만 JWT가 있으면 더 안전하게 접근됩니다.
`,
  })
  getEvents(@Req() req) {
    return this.eventService.proxyGet('/event', req?.headers?.authorization);
  }

  @Patch(':eventId')
  @Roles('OPERATOR')
  @ApiOperation({
    summary: '이벤트 수정 (OPERATOR 전용)',
    description: `
이벤트의 이름, 설명, 시작일, 종료일, 상태를 수정합니다.  
eventType, streak는 수정 대상이 아닙니다.  
- 수정할 필드만 부분적으로 보내도 동작합니다.
`,
  })
  updateEvent(
    @Param('eventId') eventId: string,
    @Body() dto: UpdateEventDto,
    @Req() req,
  ) {
    return this.eventService.proxyPatch(
      `/event/${eventId}`,
      dto,
      req?.headers?.authorization,
    );
  }

  @Post(':eventId/request')
  @Roles('USER')
  @ApiOperation({
    summary: '보상 요청 (USER 전용)',
    description: `
현재 로그인한 유저가 특정 이벤트에 대해 보상을 요청합니다.  
RequestRewardDto에는 다음 정보가 필요합니다:
- rewardId (ObjectId)
`,
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
    description: `
모든 유저의 보상 요청 이력을 확인할 수 있습니다.  
보안상 AUDITOR 권한을 가진 사용자만 접근할 수 있습니다.
(ADMIN은 예외)
`,
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
    description: `
현재 로그인한 유저의 보상 요청 내역을 조회합니다.  
- JWT 토큰을 통해 유저 정보 파악 후 자동 조회됩니다.
`,
  })
  getMyRequests(@Req() req) {
    return this.eventService.proxyGet(
      '/event/requests/me',
      req?.headers?.authorization,
    );
  }
}
