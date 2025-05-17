import { HttpService } from '@nestjs/axios';
import { HttpException, Injectable } from '@nestjs/common';
import { RegisterDto, LoginDto, LoginEventPublisher } from '@lib/common';
import { lastValueFrom } from 'rxjs';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class GatewayService {
  private readonly authBaseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly loginEventPublisher: LoginEventPublisher,
    private readonly jwtService: JwtService,
  ) {
    this.authBaseUrl = process.env.AUTH_SERVICE_URL;
  }

  async forwardRegister(dto: RegisterDto) {
    try {
      const response = await lastValueFrom(
        this.httpService.post(`${this.authBaseUrl}/auth/register`, dto),
      );
      return response.data;
    } catch (error) {
      throw new HttpException(
        error?.response?.data || '회원가입 실패.',
        error?.response?.status || 500,
      );
    }
  }

  async forwardLogin(dto: LoginDto) {
    try {
      const response = await lastValueFrom(
        this.httpService.post(`${this.authBaseUrl}/auth/login`, dto),
      );

      const accessToken = response.data?.accessToken;
      const decoded = this.jwtService.decode(accessToken) as {
        sub: string;
        email: string;
      };

      const userId = decoded?.sub;
      if (userId) {
        this.loginEventPublisher.publishLoginEvent(userId).catch(console.error);
      }

      return response.data;
    } catch (error) {
      throw new HttpException(
        error?.response?.data || '로그인 실패.',
        error?.response?.status || 500,
      );
    }
  }
}
