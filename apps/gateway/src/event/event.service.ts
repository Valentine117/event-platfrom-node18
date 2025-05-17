import { Injectable } from '@nestjs/common';
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

    const { data } = await axios.get(`${this.baseUrl}${path}`, { headers });
    return data;
  }

  async proxyPost(path: string, body: any, user?: any) {
    const headers = user
      ? { Authorization: `Bearer ${user.accessToken}` }
      : undefined;

    const { data } = await axios.post(`${this.baseUrl}${path}`, body, {
      headers,
    });
    return data;
  }
}
