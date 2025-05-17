import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: '헬스 체크',
    description: '모든 서버와 DB의 헬스를 체크합니다.',
  })
  check() {
    return this.healthService.getHealthStatus();
  }
}
