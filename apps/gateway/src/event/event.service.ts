import { HttpException, Injectable } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EventService {
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('EVENT_SERVICE_URL');
  }

  async proxyGet(path: string, user?: any) {
    const headers = user
      ? { Authorization: `Bearer ${user.accessToken}` }
      : undefined;
    console.log(`gateway user.accessToken: ${user.accessToken}`);
    try {
      const { data } = await axios.get(`${this.baseUrl}${path}`, { headers });
      return data;
    } catch (error) {
      if (error.response) {
        throw new HttpException(
          error?.response?.data || 'Internal Server Error.',
          error?.response?.status || 500,
        );
      }
    }
  }

  async proxyPost(path: string, body: any, user?: any) {
    const headers = user
      ? { Authorization: `Bearer ${user.accessToken}` }
      : undefined;

    try {
      const { data } = await axios.post(`${this.baseUrl}${path}`, body, {
        headers,
      });
      return data;
    } catch (error) {
      if (error.response) {
        throw new HttpException(
          error?.response?.data || 'Internal Server Error.',
          error?.response?.status || 500,
        );
      }
    }
  }
}
