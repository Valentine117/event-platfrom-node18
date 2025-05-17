import { Body, Controller, Post } from '@nestjs/common';
import { GatewayService } from './gateway.service';
import { LoginDto, RegisterDto } from '@lib/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller()
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) {}

  @Post('auth/register')
  @ApiOperation({
    summary: '회원가입',
    description: '새로운 사용자를 등록합니다.',
  })
  register(@Body() dto: RegisterDto) {
    return this.gatewayService.forwardRegister(dto);
  }

  @Post('auth/login')
  @ApiOperation({ summary: '로그인', description: 'JWT 토큰을 발급받습니다.' })
  login(@Body() dto: LoginDto) {
    return this.gatewayService.forwardLogin(dto);
  }
}
