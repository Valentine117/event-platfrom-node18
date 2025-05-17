import { HttpService } from '@nestjs/axios';
import { HttpException, Injectable } from '@nestjs/common';
import { RegisterDto, LoginDto } from '@lib/common';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class GatewayService {
  private readonly authBaseUrl: string;

  constructor(private readonly httpService: HttpService) {
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
      return response.data; // accessToken 포함됨
    } catch (error) {
      throw new HttpException(
        error?.response?.data || '로그인 실패.',
        error?.response?.status || 500,
      );
    }
  }
}
