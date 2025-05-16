import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import axios from 'axios';

@Injectable()
export class HealthService {
  constructor(
    private readonly httpService: HttpService,
    @InjectConnection() private readonly mongoConnection: Connection,
  ) {}

  async getHealthStatus() {
    const authUrl = process.env.AUTH_SERVICE_URL;
    const eventUrl = process.env.EVENT_SERVICE_URL;

    console.log(`authUrl: ${authUrl}`);
    console.log(`eventUrl: ${eventUrl}`);

    const results: Record<string, 'ok' | 'fail'> = {
      gateway: 'ok',
      auth: 'fail',
      event: 'fail',
      mongo: 'fail',
    };

    // Check MongoDB connection
    if (this.mongoConnection.readyState === 1) {
      results.mongo = 'ok';
    }

    try {
      const authRes = await axios.get(`${authUrl}/health`);
      if (authRes.status === 200) {
        results.auth = 'ok';
      }
    } catch (err) {
      console.error('Auth Health Check Error:', err.message);
    }

    try {
      const eventRes = await axios.get(`${eventUrl}/health`);
      if (eventRes.status === 200) {
        results.event = 'ok';
      }
    } catch (err) {
      console.error('Event Health Check Error:', err.message);
    }

    return results;
  }
}
