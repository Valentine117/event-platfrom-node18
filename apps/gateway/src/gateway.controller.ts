import { Body, Controller, Post } from '@nestjs/common';
import { GatewayService } from './gateway.service';
import { LoginDto, RegisterDto } from '@lib/common';

@Controller()
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) {}

  @Post('auth/register')
  register(@Body() dto: RegisterDto) {
    return this.gatewayService.forwardRegister(dto);
  }

  @Post('auth/login')
  login(@Body() dto: LoginDto) {
    return this.gatewayService.forwardLogin(dto);
  }
}
